import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    console.log(`Edge Function invoked: ${req.method} ${req.url}`);
    const authHeader = req.headers.get('Authorization');
    console.log(`Auth Header present: ${!!authHeader}`);
    if (authHeader) console.log(`Auth Header starts with: ${authHeader.substring(0, 20)}...`);
    
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Create admin client with service role for all operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing environment variables:', {
            hasUrl: !!supabaseUrl,
            hasServiceKey: !!supabaseServiceKey
        })
        return new Response(
            JSON.stringify({ 
                error: 'Server configuration error',
                details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            }
        )
    }
    
    const supabaseAdmin = createClient(
        supabaseUrl,
        supabaseServiceKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )

    let email = '' // Declare email in outer scope for error handling
    try {
        let body;
        try {
            body = await req.json()
        } catch (jsonError) {
            console.error('Failed to parse request body as JSON:', jsonError)
            return new Response(
                JSON.stringify({ 
                    error: 'Invalid request body. Expected JSON format.',
                    details: jsonError.message
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            )
        }

        console.log('Request body received:', { ...body, password: '***' })

        const { 
            email: emailParam, 
            password, 
            organization_id, 
            employee_id, 
            first_name, 
            last_name,
            organization_name,
            login_url,
            onboarding_token
        } = body
        
        email = emailParam || '' // Assign to outer scope variable for error handling

        if (!email || !password || !organization_id || !employee_id) {
            return new Response(
                JSON.stringify({ 
                    error: 'Missing required fields',
                    details: 'Please provide: email, password, organization_id, and employee_id'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400,
                }
            )
        }

        // 1. Create the Auth User (Explicit Password)
        const { data: userData, error: authUserError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                first_name: first_name,
                last_name: last_name,
                role: 'employee',
                organization_id: organization_id,
                force_password_change: true,
                theme: 'light' 
            }
        })

        if (authUserError) {
            console.error('Auth user creation error:', authUserError)
            // Handle specific auth errors - check both code and message
            const errorCode = (authUserError as any).code || ''
            const errorMessage = authUserError.message || ''
            
            if (errorCode === 'email_exists' || 
                errorMessage.includes('already registered') || 
                errorMessage.includes('already exists') || 
                errorMessage.includes('User already registered')) {
                return new Response(
                    JSON.stringify({ 
                        error: 'User with this email already exists',
                        details: `A user account with email ${email} already exists in the system. Please use a different email or reset the password for the existing account.`,
                        code: 'USER_ALREADY_EXISTS'
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 400,
                    }
                )
            }
            throw authUserError
        }

        const userId = userData.user.id

        // 2. Create User Profile (with employee linkage)
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: userId,
                organization_id: organization_id,
                employee_id: employee_id,
                full_name: `${first_name} ${last_name}`,
                email: email,
                role: 'employee',
                is_active: true
            })

        if (profileError) {
            // Check if profile already exists (handle race conditions or re-invites)
            if (!profileError.message.includes('duplicate key')) {
                 console.error('Profile creation error:', profileError)
                 // Start rollback attempt - strictly speaking we can't "un-invite" easily but we can delete the user
                 await supabaseAdmin.auth.admin.deleteUser(userId)
                 throw new Error(`Failed to create user profile: ${profileError.message}`)
            }
        }

        // 3. Link user_id back to employee record
        const { error: employeeUpdateError } = await supabaseAdmin
            .from('employees')
            .update({ user_id: userId })
            .eq('id', employee_id)

        if (employeeUpdateError) {
            console.error('Employee update error:', employeeUpdateError)
            // Rollback user and profile creation
            await supabaseAdmin.auth.admin.deleteUser(userId)
            throw new Error(`Failed to link user to employee: ${employeeUpdateError.message}`)
        }

        // 4. Generate password reset link for the user to change their password
        const appUrl = login_url || Deno.env.get('APP_URL') || 'https://payroll-india.vercel.app'
        const { data: resetLinkData, error: resetLinkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
                redirectTo: `${appUrl}/auth/reset-password`
            }
        })

        let passwordResetLink = null
        if (resetLinkError) {
            console.warn('Failed to generate password reset link:', resetLinkError)
            // Continue anyway - we'll still send the email with credentials
        } else {
            passwordResetLink = resetLinkData.properties.action_link
        }

        // 5. Send email with login credentials and password reset link
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@loghr.in'
        
        let emailSent = false
        let emailError: Error | null = null

        if (resendApiKey && passwordResetLink) {
            try {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: resendFromEmail,
                        to: email,
                        subject: `Welcome to ${organization_name || 'the Company'} - Your Login Credentials`,
                        html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="utf-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Welcome - Login Credentials</title>
                            </head>
                            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                                    <h1 style="color: white; margin: 0;">Welcome ${first_name}!</h1>
                                </div>
                                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
                                    <p>Hello ${first_name} ${last_name},</p>
                                    <p>Your employee account has been created. Below are your login credentials:</p>
                                    
                                    <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
                                        <p style="margin: 10px 0;"><strong>Email:</strong> ${email}</p>
                                        <p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 14px;">${password}</code></p>
                                    </div>

                                    <p><strong>Important:</strong> For security reasons, you must change your password on first login.</p>
                                    
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${passwordResetLink}" 
                                           style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                            Change Password & Login
                                        </a>
                                    </div>

                                    <p style="color: #666; font-size: 14px; margin-top: 30px;">
                                        If the button doesn't work, copy and paste this link into your browser:<br>
                                        <a href="${passwordResetLink}" style="color: #667eea; word-break: break-all;">${passwordResetLink}</a>
                                    </p>

                                    <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                                        This is an automated email. Please do not reply to this message.<br>
                                        If you did not expect this email, please contact your administrator.
                                    </p>
                                </div>
                            </body>
                            </html>
                        `,
                    }),
                })

                if (!emailResponse.ok) {
                    let errorText = await emailResponse.text()
                    let errorMessage = 'Failed to send email'
                    
                    try {
                        const errorJson = JSON.parse(errorText)
                        if (errorJson.message) {
                            errorMessage = errorJson.message
                        }
                        // Check for domain verification error
                        if (emailResponse.status === 403 || errorJson.name === 'validation_error') {
                            errorMessage = `Domain verification required: The domain in your 'from' email (${resendFromEmail}) needs to be verified in Resend. Please verify your domain at https://resend.com/domains`
                        }
                    } catch (e) {
                        // If parsing fails, use the raw text
                        errorMessage = errorText || errorMessage
                    }
                    
                    console.error('Resend API error:', errorText)
                    emailError = new Error(errorMessage)
                } else {
                    const emailData = await emailResponse.json()
                    console.log('Email sent successfully:', emailData)
                    emailSent = true
                }
            } catch (emailErr: any) {
                console.error('Error sending email:', emailErr)
                emailError = emailErr
            }
        } else {
            console.warn('Resend API key not configured. Email not sent.')
            if (!resendApiKey) {
                emailError = new Error('RESEND_API_KEY environment variable not set')
            }
        }

        return new Response(
            JSON.stringify({ 
                user: userData.user,
                message: 'User created successfully',
                password: password,
                emailSent: emailSent,
                emailError: emailError ? emailError.message : null,
                passwordResetLink: passwordResetLink
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Edge Function Error:', error)
        console.error('Error type:', typeof error)
        console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
        
        // Extract detailed error information - handle Supabase error structure
        let errorMessage = 'Unknown error occurred'
        let errorCode = ''
        let errorDetails = ''
        let errorHint = ''
        
        // Supabase errors often have this structure
        if (error?.message) {
            errorMessage = error.message
        }
        if (error?.code) {
            errorCode = error.code
        }
        if (error?.details) {
            errorDetails = error.details
        }
        if (error?.hint) {
            errorHint = error.hint
        }
        
        // Check for nested error object (some Supabase errors nest the error)
        if (error?.error) {
            const nestedError = error.error
            if (nestedError.message) errorMessage = nestedError.message
            if (nestedError.code) errorCode = nestedError.code
            if (nestedError.details) errorDetails = nestedError.details
            if (nestedError.hint) errorHint = nestedError.hint
        }
        
        // Check for common error patterns - check code first, then message
        if (errorCode === 'email_exists' || 
            errorMessage.includes('duplicate') || 
            errorMessage.includes('already exists') || 
            errorMessage.includes('already registered')) {
            errorMessage = 'User with this email already exists'
            errorDetails = `A user account with email ${email || 'provided email'} already exists in the system. Please use a different email address or reset the password for the existing account.`
            errorCode = errorCode || 'USER_ALREADY_EXISTS'
        }
        
        const errorResponse = {
            error: errorMessage,
            code: errorCode,
            details: errorDetails || errorMessage,
            hint: errorHint,
        };
        
        console.error('Sending error response:', errorResponse);
        
        return new Response(
            JSON.stringify(errorResponse),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
