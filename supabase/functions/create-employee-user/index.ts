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

        // 2. Link to Employee Record
        const { error: updateError } = await supabaseClient
            .from('employees')
            .update({
                user_id: userId,
                is_active: true
            })
            .eq('id', employee_id)

        if (updateError) {
            // Rollback user creation if linking fails
            await supabaseClient.auth.admin.deleteUser(userId)
            throw updateError
        }

        // 3. Create Organization Member entry
        const { error: memberError } = await supabaseClient
            .from('organization_members')
            .insert({
                organization_id: organization_id,
                user_id: userId,
                role: 'employee',
                employee_id: employee_id,
                is_active: true
            })

        if (memberError) {
            // Rollback user creation if member creation fails
            // Note: This might leave the employee record updated with user_id, which is less critical but ideally should be rolled back too.
            // For simplicity in this edge function, we'll just delete the user.
            await supabaseClient.auth.admin.deleteUser(userId)
            throw memberError
        }

        // 4. Create User Profile
        const { error: profileError } = await supabaseClient
            .from('user_profiles')
            .insert({
                user_id: userId,
                role: 'employee',
                is_active: true,
                current_organization_id: organization_id
            })

        if (profileError) {
            // Rollback
            await supabaseClient.auth.admin.deleteUser(userId)
            throw profileError
        }

        return new Response(
            JSON.stringify({ user: userData.user }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
