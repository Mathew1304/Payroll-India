import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, organization_id, employee_id, first_name, last_name } = await req.json()

        if (!email || !password || !organization_id || !employee_id) {
            throw new Error('Missing required fields')
        }

        // 1. Create the Auth User
        const { data: userData, error: userError } = await supabaseClient.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                first_name: first_name,
                last_name: last_name,
                role: 'employee',
                organization_id: organization_id,
                force_password_change: true
            }
        })

        if (userError) throw userError

        const userId = userData.user.id

        // 2. Create User Profile (with employee linkage)
        const { error: profileError } = await supabaseClient
            .from('user_profiles')
            .insert({
                user_id: userId,
                role: 'employee',
                is_active: true,
                organization_id: organization_id,
                employee_id: employee_id  // Link to employee record
            })

        if (profileError) {
            // Rollback user creation if profile creation fails
            console.error('Profile creation error:', profileError)
            await supabaseClient.auth.admin.deleteUser(userId)
            throw new Error(`Failed to create user profile: ${profileError.message}`)
        }

        // 3. Send welcome email (optional - implement if needed)
        // You can add email sending logic here using Resend, SendGrid, etc.

        return new Response(
            JSON.stringify({ 
                user: userData.user,
                message: 'User created successfully',
                password: password // Return password so frontend can display it
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
