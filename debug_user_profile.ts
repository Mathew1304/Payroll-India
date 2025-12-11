
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

// Manually load env vars since we are running this with tsx/node
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars. Please run with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUser() {
    const email = 'pixelfactory11@gmail.com';
    let output = `Debugging user: ${email}\n`;

    // 1. Check employees by email
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('*')
        .eq('company_email', email);

    if (empError) {
        output += `Error querying employees: ${JSON.stringify(empError)}\n`;
    } else {
        output += `Employees found with email ${email}: ${JSON.stringify(employees, null, 2)}\n`;
    }

    // 2. Check organization_members
    const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('*')
        .limit(5);

    if (orgError) {
        output += `Error querying organization_members: ${JSON.stringify(orgError)}\n`;
    } else {
        output += `Organization members found (first 5): ${JSON.stringify(orgMembers, null, 2)}\n`;
    }

    console.log(output);
    fs.writeFileSync('debug_output.txt', output);
}

debugUser();
