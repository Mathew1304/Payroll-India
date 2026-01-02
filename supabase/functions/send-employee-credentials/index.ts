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
    
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Note: This function doesn't require authentication validation
        // It just sends emails via Resend API
        // The auth header is automatically sent by Supabase client but we don't need to validate it
        
        const { email, password, first_name, last_name, organization_name, login_url, onboarding_token } = await req.json()
        console.log('Email request received for:', email);

        if (!email || !password || !first_name) {
            throw new Error('Missing required fields: email, password, first_name')
        }

        // Use Resend API - check env var first, then fallback to provided key
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_D7YUfF6W_HWmW8RmDWQJtg52ZrwNftKmE'
        const APP_URL = login_url || Deno.env.get('APP_URL') || 'http://localhost:5173'
        const onboardingLink = onboarding_token ? `${APP_URL}/onboarding?token=${onboarding_token}` : null

        const employeeName = `${first_name}${last_name ? ' ' + last_name : ''}`
        const orgName = organization_name || 'your organization'

        const emailSubject = `Welcome to ${orgName} - Your Login Credentials`
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome - Your Login Credentials</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">Welcome to ${orgName}</h1>
    </div>
    
    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 16px; margin-bottom: 20px;">Hello ${first_name},</p>
        
        <p style="font-size: 16px; margin-bottom: 20px;">
            You have been invited to join <strong>${orgName}</strong>. Your account has been created and you can now log in using the credentials below:
        </p>
        
        <div style="background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <div style="margin-bottom: 15px;">
                <strong style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Email:</strong>
                <p style="font-size: 18px; font-family: monospace; margin: 5px 0 0 0; color: #111827; font-weight: 600;">${email}</p>
            </div>
            <div style="margin-bottom: 15px;">
                <strong style="color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Temporary Password:</strong>
                <p style="font-size: 20px; font-family: monospace; margin: 5px 0 0 0; color: #dc2626; font-weight: bold; letter-spacing: 2px;">${password}</p>
            </div>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>⚠️ Important:</strong> For security reasons, please change your password immediately after your first login.
            </p>
        </div>
        
        ${onboardingLink ? `
        <div style="background: #e0f2fe; border: 2px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 25px 0;">
            <h3 style="color: #0c4a6e; margin-top: 0; font-size: 18px;">📋 Complete Your Onboarding</h3>
            <p style="color: #075985; margin-bottom: 15px; font-size: 14px;">
                Please complete your onboarding form to provide additional information required for your employee profile.
            </p>
            <div style="text-align: center;">
                <a href="${onboardingLink}" 
                   style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    Complete Onboarding Form
                </a>
            </div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${APP_URL}" 
               style="display: inline-block; background: #667eea; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Log In Now
            </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            If you have any questions or need assistance, please contact your administrator.
        </p>
        
        <p style="font-size: 14px; color: #9ca3af; margin-top: 20px;">
            This is an automated message. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
        `

        const emailText = `
Welcome to ${orgName}

Hello ${first_name},

You have been invited to join ${orgName}. Your account has been created and you can now log in using the credentials below:

Email: ${email}
Temporary Password: ${password}

⚠️ Important: For security reasons, please change your password immediately after your first login.

${onboardingLink ? `Complete Your Onboarding: ${onboardingLink}\n\n` : ''}Log in at: ${APP_URL}

If you have any questions or need assistance, please contact your administrator.

This is an automated message. Please do not reply to this email.
        `

        if (RESEND_API_KEY) {
            // Use Resend API
            const resendResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                    from: Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev',
                    to: [email],
                    subject: emailSubject,
                    html: emailHtml,
                    text: emailText,
                    reply_to: Deno.env.get('RESEND_REPLY_TO') || undefined,
                }),
            })

            if (!resendResponse.ok) {
                const errorData = await resendResponse.text()
                throw new Error(`Resend API error: ${errorData}`)
            }

            const resendData = await resendResponse.json()
            
            return new Response(
                JSON.stringify({ 
                    success: true,
                    message: 'Email sent successfully via Resend',
                    emailId: resendData.id
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        } else {
            // Fallback: Use Supabase Auth email (if configured)
            // Note: This is a placeholder - Supabase Auth doesn't support custom emails with passwords
            // In production, you should configure Resend or another email service
            console.log('RESEND_API_KEY not configured. Email would be sent with:', {
                to: email,
                subject: emailSubject,
                html: emailHtml.substring(0, 100) + '...'
            })

            return new Response(
                JSON.stringify({ 
                    success: false,
                    message: 'Email service not configured. Please configure RESEND_API_KEY environment variable.',
                    fallback: {
                        to: email,
                        subject: emailSubject,
                        body: emailText
                    }
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200, // Still return 200 as the user was created successfully
                }
            )
        }

    } catch (error: any) {
        console.error('Send Email Error:', error)
        
        return new Response(
            JSON.stringify({
                success: false,
                error: error?.message || 'Unknown error',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})


