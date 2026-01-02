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

    try {
        // Create admin client with service role for all operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { email, password, organization_id, employee_id, first_name, last_name } = await req.json()

        if (!email || !password || !organization_id || !employee_id) {
            throw new Error('Missing required fields')
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

        if (authUserError) throw authUserError

        const userId = userData.user.id

        // 2. Create User Profile (with employee linkage)
        const { error: profileError } = await supabaseAdmin
            .from('user_profiles')
            .insert({
                user_id: userId,
                employee_id: employee_id,
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

        return new Response(
            JSON.stringify({ 
                user: userData.user,
                message: 'User created successfully',
                password: password, // Critical: return password for Admin display
                inviteSent: false
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Edge Function Error:', error)
        
        // Extract detailed error information
        const errorResponse = {
            error: error?.message || 'Unknown error',
            code: error?.code || '',
            details: error?.details || '',
            hint: error?.hint || '',
            stack: error?.stack || '',
            fullError: JSON.stringify(error, null, 2)
        };
        
        console.error('Detailed error:', errorResponse);
        
        return new Response(
            JSON.stringify(errorResponse),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
