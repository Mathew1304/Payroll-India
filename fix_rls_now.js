// Emergency RLS Fix Script
// This script fixes the infinite recursion in user_profiles RLS policy

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const fixSQL = `
-- Fix infinite recursion in user_profiles
CREATE OR REPLACE FUNCTION get_auth_user_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;

CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    organization_id = get_auth_user_org_id()
  );
`;

async function fixRLS() {
    console.log('🔧 Fixing RLS recursion in user_profiles...\n');

    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: fixSQL });

        if (error) {
            // If exec_sql doesn't exist, try direct query
            console.log('⚠️  exec_sql RPC not found, trying direct query...\n');

            const { error: queryError } = await supabase.from('_sql').select(fixSQL);

            if (queryError) {
                console.error('❌ Error executing SQL:', queryError.message);
                console.error('\n📋 Please run this SQL manually in Supabase SQL Editor:');
                console.error('\n' + fixSQL);
                process.exit(1);
            }
        }

        console.log('✅ RLS policy fixed successfully!');
        console.log('🔄 Please reload your application now.');

    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
        console.error('\n📋 Please run this SQL manually in Supabase SQL Editor:');
        console.error('\n' + fixSQL);
        process.exit(1);
    }
}

fixRLS();
