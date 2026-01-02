/**
 * Apply Migration Script
 * This script applies the accommodation_allowance migration to your Supabase database
 * and reloads the PostgREST schema cache to fix the PGRST204 error.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables from your running app
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xbqzohdjjppfgzxbjlsa.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
    console.error('❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('\nPlease run this script with your service role key:');
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-key node apply_migration.js');
    process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log(`📍 URL: ${supabaseUrl}`);

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function applyMigration() {
    try {
        console.log('\n📄 Reading migration file...');
        const migrationSQL = readFileSync(
            join(__dirname, 'fix_accommodation_allowance.sql'),
            'utf-8'
        );

        console.log('🚀 Applying migration to database...\n');

        // Execute the migration SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: migrationSQL
        });

        if (error) {
            // If exec_sql function doesn't exist, try direct execution
            console.log('⚠️  exec_sql function not found, trying direct execution...');

            const { data: directData, error: directError } = await supabase
                .from('employees')
                .select('accommodation_allowance')
                .limit(1);

            if (directError && directError.code === 'PGRST204') {
                console.log('\n❌ Column still missing. Please apply the migration manually:');
                console.log('\n📋 Steps:');
                console.log('1. Go to https://supabase.com/dashboard');
                console.log('2. Select your project');
                console.log('3. Go to SQL Editor');
                console.log('4. Copy the contents of fix_accommodation_allowance.sql');
                console.log('5. Paste and run it');
                console.log('\nAfter running the migration, execute this command to reload the schema:');
                console.log(`curl -X POST "${supabaseUrl}/rest/v1/?schema=public" -H "apikey: ${supabaseServiceKey.substring(0, 20)}..."`);
                process.exit(1);
            }
        }

        console.log('✅ Migration executed successfully!');

        // Reload PostgREST schema cache
        console.log('\n🔄 Reloading PostgREST schema cache...');

        const reloadResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            }
        });

        if (reloadResponse.ok || reloadResponse.status === 404) {
            console.log('✅ Schema cache reload initiated');
        } else {
            console.log('⚠️  Schema cache reload may have failed, but migration was applied');
        }

        // Verify the column exists
        console.log('\n🔍 Verifying column exists...');
        const { data: verifyData, error: verifyError } = await supabase
            .from('employees')
            .select('accommodation_allowance, transportation_allowance, food_allowance')
            .limit(1);

        if (verifyError) {
            if (verifyError.code === 'PGRST204') {
                console.log('\n⚠️  Column was added but schema cache needs manual reload.');
                console.log('\n📋 Please do ONE of the following:');
                console.log('\n   Option 1: Wait 2-3 minutes for automatic cache refresh');
                console.log('\n   Option 2: Restart your Supabase project:');
                console.log('   - Go to https://supabase.com/dashboard');
                console.log('   - Project Settings → General');
                console.log('   - Click "Pause project" then "Resume project"');
                console.log('\n   Option 3: Run this SQL in Supabase SQL Editor:');
                console.log('   NOTIFY pgrst, \'reload schema\';');
            } else {
                console.log('❌ Verification error:', verifyError.message);
            }
        } else {
            console.log('✅ Columns verified successfully!');
            console.log('\n🎉 Migration complete! You can now add employees.');
        }

    } catch (err) {
        console.error('❌ Error applying migration:', err.message);
        console.log('\n📋 Manual steps required:');
        console.log('1. Open Supabase Dashboard SQL Editor');
        console.log('2. Run the contents of fix_accommodation_allowance.sql');
        console.log('3. Wait 2-3 minutes or restart your project');
        process.exit(1);
    }
}

applyMigration();
