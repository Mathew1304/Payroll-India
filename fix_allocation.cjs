const fs = require('fs');
const path = 'src/pages/Leave/AdminLeavePage.tsx';
let content = fs.readFileSync(path, 'utf8');

// The marker for the start of the function body
const startMarker = "console.log('[Allocation] Starting allocation...', { organizationId, leaveTypeId, daysPerYear });";
// The marker for the next function, indicating where our function must have ended
const nextFunctionMarker = "const ConfirmDialog =";

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.error('Start marker not found');
    process.exit(1);
}

const bodyStartIndex = content.indexOf('if (!organizationId) return;', startIndex);
if (bodyStartIndex === -1) {
    console.error('Body start marker not found');
    process.exit(1);
}

const endIndex = content.indexOf(nextFunctionMarker);
if (endIndex === -1) {
    console.error('End marker ConfirmDialog not found');
    process.exit(1);
}

const newBody = `    if (!organizationId) {
        console.error('[Allocation] Missing organization ID');
        return;
    }

    // 1. Fetch all active employees
    console.log('[Allocation] Step 1: Fetching active employees...');
    const { data: employees, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('employment_status', 'active');

    if (empError) {
        console.error('[Allocation] Error fetching employees:', empError);
        return;
    }

    if (!employees || employees.length === 0) {
        console.warn('[Allocation] No active employees found.');
        return;
    }
    console.log(\`[Allocation] Found \${employees.length} active employees.\`);

    // 2. Fetch existing balances for this year to preserve 'used' counts
    const year = new Date().getFullYear();
    console.log(\`[Allocation] Step 2: Fetching existing balances for year \${year}...\`);
    const { data: existingBalances, error: balError } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('leave_type_id', leaveTypeId)
        .eq('year', year);

    if (balError) {
        console.error('[Allocation] Error fetching existing balances:', balError);
    }
    console.log(\`[Allocation] Found \${existingBalances?.length || 0} existing balance records.\`);

    const balanceMap = new Map(existingBalances?.map((b) => [b.employee_id, b]) || []);

    // 3. Prepare bulk upsert data
    console.log('[Allocation] Step 3: Calculating new balances...');
    const balanceData = employees.map((emp) => {
        const existing = balanceMap.get(emp.id);
        const used = Number(existing?.used || 0);
        const encashed = Number(existing?.encashed || 0);
        const carried_forward = Number(existing?.carried_forward || 0);
        const accrued = Number(daysPerYear);

        // New closing balance logic:
        const totalCredits = accrued + carried_forward;
        const totalDebits = used + encashed;
        const closing_balance = Math.max(0, totalCredits - totalDebits);

        return {
            organization_id: organizationId,
            employee_id: emp.id,
            leave_type_id: leaveTypeId,
            year: year,
            opening_balance: Number(existing?.opening_balance || 0),
            accrued: accrued,
            used: used,
            adjustment: Number(existing?.adjustment || 0),
            encashed: encashed,
            carried_forward: carried_forward,
            closing_balance: closing_balance
        };
    });

    console.log('[Allocation] Prepared payload for upsert (first 3 samples):', balanceData.slice(0, 3));

    // 4. Upsert balances
    console.log('[Allocation] Step 4: Performing Upsert...');
    const { data: upsertData, error } = await supabase
        .from('leave_balances')
        .upsert(balanceData, { onConflict: 'employee_id, leave_type_id, year' })
        .select();

    if (error) {
        console.error('[Allocation] Error upserting balances:', error);
        throw error;
    }
    console.log(\`[Allocation] Successfully upserted \${upsertData?.length || 'unknown'} records.\`);
};\n\n`;

const part1 = content.slice(0, bodyStartIndex);
const part3 = content.slice(endIndex);

const finalContent = part1 + newBody + part3;
fs.writeFileSync(path, finalContent);
console.log('File updated successfully');
