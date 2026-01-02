import { useState, useEffect } from 'react';
import { Download, Calendar, TrendingUp, Wallet, ChevronDown, ChevronUp, CheckCircle, Clock, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { downloadPayslipHTML } from '../../utils/payslipGenerator';
import { downloadPayslipPDF } from '../../utils/payslipPDFGenerator';
import { PayslipModal } from '../../components/Payroll/PayslipModal';
import { format } from 'date-fns';

interface PayrollRecord {
    id: string;
    employee_id: string;
    pay_period_month: number;
    pay_period_year: number;
    basic_salary: number;
    dearness_allowance: number;
    house_rent_allowance: number;
    conveyance_allowance: number;
    medical_allowance: number;
    special_allowance: number;
    other_allowances: number;
    overtime_amount: number;
    gross_salary: number;
    pf_employee: number;
    esi_employee: number;
    professional_tax: number;
    tds: number;
    absence_deduction: number;
    loan_deduction: number;
    advance_deduction: number;
    penalty_deduction: number;
    total_statutory_deductions: number;
    total_deductions: number;
    net_salary: number;
    status: string;
    working_days: number;
    days_present: number;
    created_at: string;
}

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    pan_number: string;
    bank_account_number: string;
    ifsc_code: string;
    designation?: string;
    date_of_joining?: string;
}

export function EmployeePayrollPage() {
    console.log('🚀 COMPONENT RENDER START');

    const { user, profile, organization } = useAuth();

    console.log('🔍 Auth Context Values:', {
        hasProfile: !!profile,
        hasUser: !!user,
        userId: user?.id,
        employeeId: profile?.employee_id,
        hasOrg: !!organization
    });

    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        console.log('⚡ useEffect FIRED');
        console.log('⚡ profile?.employee_id:', profile?.employee_id);
        console.log('⚡ Full profile object:', JSON.stringify(profile, null, 2));

        if (profile?.employee_id) {
            console.log('✅ Employee ID found, calling loadData()');
            loadData();
        } else {
            console.log('❌ No employee_id found in profile');
            console.log('❌ No user_id found');
            setLoading(false);
        }
    }, [user?.id]); // Dependency changed to user?.id

    const loadData = async () => {
        console.log('🔄 Loading data...');
        console.log('🔄 User ID from auth:', user?.id);
        console.log('🔄 Profile employee_id:', profile?.employee_id);

        // Set a timeout to prevent infinite loading
        const loadTimeout = setTimeout(() => {
            console.error('⏱️ TIMEOUT: Data loading took too long (30s).');
            setError('Loading timed out. Please refresh the page or contact support.');
            setLoading(false);
        }, 30000);

        try {
            if (!user?.id) {
                console.error('❌ No user ID available');
                setError('Authentication error: No user ID found. Please try logging out and back in.');
                setLoading(false);
                clearTimeout(loadTimeout);
                return;
            }

            // BYPASS STRATEGY: Fetch employee directly by user_id instead of relying on profile.employee_id
            console.log('📋 Step 1: Fetching employee by user_id...');
            console.time('employee-fetch');

            const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('id, first_name, last_name, employee_code, pan_number, bank_account_number, bank_ifsc_code, organization_id, designation_id, date_of_joining, designations(name)')
                .eq('user_id', user.id)
                .maybeSingle();

            console.timeEnd('employee-fetch');
            console.log('📋 Employee query result:', { empData, empError });

            if (empError) {
                clearTimeout(loadTimeout);
                console.error('❌ Employee fetch error:', empError);
                console.error('❌ Error code:', empError.code);
                console.error('❌ Error message:', empError.message);

                if (empError.code === 'PGRST116') {
                    setError(`No employee record found. Your employee profile has not been created yet. Please contact HR.`);
                } else if (empError.code === 'PGRST301') {
                    setError(`Database permission error: You don't have access to view your employee profile. Please contact your administrator.`);
                } else {
                    setError(`Database error (${empError.code}): ${empError.message}`);
                }
                setLoading(false);
                return;
            }

            if (!empData) {
                clearTimeout(loadTimeout);
                console.error('❌ No employee data returned for user_id:', user?.id);
                setError(`No employee record found. Please contact HR to set up your employee profile.`);
                setLoading(false);
                return;
            }

            setEmployee(empData);
            console.log('✅ Employee set successfully:', empData);

            // Load all payroll records for this employee using the fetched employee ID
            console.log('💰 Step 2: Fetching payroll records for employee_id:', empData.id);
            console.time('payroll-fetch');

            const { data: payrollData, error: payrollError } = await supabase
                .from('india_payroll_records')
                .select('*')
                .eq('employee_id', empData.id)
                .order('pay_period_year', { ascending: false })
                .order('pay_period_month', { ascending: false });

            console.timeEnd('payroll-fetch');
            console.log('💰 Payroll query result:', { payrollData, payrollError, count: payrollData?.length });

            if (payrollError) {
                console.error('⚠️ Payroll fetch error:', payrollError);
                console.error('⚠️ Error code:', payrollError.code);
                console.error('⚠️ Error message:', payrollError.message);
                // Don't set error for payroll - employee might just not have records yet
            }

            setPayrollRecords(payrollData || []);
            console.log('✅ Payroll records set successfully, count:', payrollData?.length || 0);

            clearTimeout(loadTimeout);
        } catch (error) {
            clearTimeout(loadTimeout);
            console.error('❌ Error loading payroll data:', error);
            setError(`Unexpected error: ${error}`);
        } finally {
            setLoading(false);
            console.log('✅ Loading complete, loading state set to false');
        }
    };

    const preparePayslipData = (record: PayrollRecord) => {
        if (!employee) return null;

        // Prepare earnings array
        const earnings = [];
        if (record.basic_salary > 0) earnings.push({ name: 'Basic', amount: Number(record.basic_salary), ytd: Number(record.basic_salary) });
        if (record.house_rent_allowance > 0) earnings.push({ name: 'House Rent Allowance', amount: Number(record.house_rent_allowance), ytd: Number(record.house_rent_allowance) });
        if (record.conveyance_allowance > 0) earnings.push({ name: 'Fixed Allowance', amount: Number(record.conveyance_allowance), ytd: Number(record.conveyance_allowance) });
        if (record.dearness_allowance > 0) earnings.push({ name: 'Dearness Allowance', amount: Number(record.dearness_allowance), ytd: Number(record.dearness_allowance) });
        if (record.medical_allowance > 0) earnings.push({ name: 'Medical Allowance', amount: Number(record.medical_allowance), ytd: Number(record.medical_allowance) });
        if (record.special_allowance > 0) earnings.push({ name: 'Special Allowance', amount: Number(record.special_allowance), ytd: Number(record.special_allowance) });
        if (record.other_allowances > 0) earnings.push({ name: 'Other Allowances', amount: Number(record.other_allowances), ytd: Number(record.other_allowances) });
        if (record.overtime_amount > 0) earnings.push({ name: 'Overtime', amount: Number(record.overtime_amount), ytd: Number(record.overtime_amount) });

        // Prepare deductions array
        const deductions = [];
        if (record.professional_tax > 0) deductions.push({ name: 'Professional Tax', amount: Number(record.professional_tax), ytd: Number(record.professional_tax) });
        if (record.pf_employee > 0) deductions.push({ name: 'Provident Fund', amount: Number(record.pf_employee), ytd: Number(record.pf_employee) });
        if (record.esi_employee > 0) deductions.push({ name: 'ESI', amount: Number(record.esi_employee), ytd: Number(record.esi_employee) });
        if (record.tds > 0) deductions.push({ name: 'TDS', amount: Number(record.tds), ytd: Number(record.tds) });
        if (record.absence_deduction > 0) deductions.push({ name: 'Absence Deduction', amount: Number(record.absence_deduction), ytd: Number(record.absence_deduction) });
        if (record.loan_deduction > 0) deductions.push({ name: 'Loan Deduction', amount: Number(record.loan_deduction), ytd: Number(record.loan_deduction) });
        if (record.advance_deduction > 0) deductions.push({ name: 'Advance Deduction', amount: Number(record.advance_deduction), ytd: Number(record.advance_deduction) });
        if (record.penalty_deduction > 0) deductions.push({ name: 'Penalty', amount: Number(record.penalty_deduction), ytd: Number(record.penalty_deduction) });

        const lopDays = record.working_days - record.days_present;

        return {
            companyName: organization?.name || 'Company Name',
            companyAddress: organization?.address || '',
            employeeName: `${employee.first_name} ${employee.last_name}`,
            employeeCode: employee.employee_code,
            designation: (employee as any).designations?.name || employee.designation || 'N/A',
            joiningDate: employee.date_of_joining ? format(new Date(employee.date_of_joining), 'dd/MM/yyyy') : 'N/A',
            payPeriod: `${monthNames[record.pay_period_month - 1]} ${record.pay_period_year}`,
            payDate: format(new Date(record.created_at), 'dd/MM/yyyy'),
            paidDays: record.days_present,
            lopDays: lopDays,
            earnings,
            deductions,
            grossEarnings: Number(record.gross_salary),
            totalDeductions: Number(record.total_deductions),
            netPay: Number(record.net_pay),
        };
    };

    const handleViewPayslip = (record: PayrollRecord) => {
        const payslipData = preparePayslipData(record);
        if (payslipData) {
            setSelectedPayslip(payslipData);
        }
    };

    const handleDownloadPayslip = async (record: PayrollRecord) => {
        if (!employee) return;

        const payslipData = preparePayslipData(record);
        if (!payslipData) return;

        try {
            await downloadPayslipPDF(payslipData);
        } catch (error) {
            console.error('Error downloading payslip:', error);
            alert('Failed to download payslip. Please try again.');
        }
    };

    const toggleExpand = (recordId: string) => {
        setExpandedRecord(expandedRecord === recordId ? null : recordId);
    };

    const totalEarnings = payrollRecords.reduce((sum, r) => sum + Number(r.net_salary), 0);
    const avgSalary = payrollRecords.length > 0 ? totalEarnings / payrollRecords.length : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!employee || error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                <div className="text-center bg-white rounded-2xl shadow-lg p-12 max-w-lg border border-slate-200">
                    <div className="mb-6">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-100 rounded-full mb-4">
                            <Calendar className="h-10 w-10 text-amber-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">No Employee Profile Found</h2>
                    <p className="text-slate-600 mb-4">
                        {error || 'Unable to load your employee profile.'}
                    </p>
                    {profile?.employee_id && (
                        <div className="bg-slate-50 rounded-lg p-4 mb-4">
                            <p className="text-xs text-slate-500 mb-1">Employee ID:</p>
                            <p className="text-sm font-mono text-slate-700 break-all">{profile.employee_id}</p>
                        </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                        <p className="text-sm font-semibold text-blue-900 mb-2">What does this mean?</p>
                        <p className="text-xs text-blue-700">
                            Your user account is linked to an employee ID, but the employee record hasn't been created in the system yet.
                            Please contact your HR administrator to complete your employee profile setup.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Payroll</h1>
                            <p className="text-slate-600">
                                {employee.first_name} {employee.last_name} • {employee.employee_code}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500 mb-1">Total Records</p>
                            <p className="text-3xl font-bold text-indigo-600">{payrollRecords.length}</p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Wallet className="h-6 w-6" />
                            </div>
                            <p className="text-emerald-100 text-sm font-medium">Total Earnings</p>
                        </div>
                        <p className="text-3xl font-bold">₹{totalEarnings.toLocaleString('en-IN')}</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <p className="text-blue-100 text-sm font-medium">Average Salary</p>
                        </div>
                        <p className="text-3xl font-bold">₹{avgSalary.toLocaleString('en-IN')}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <p className="text-purple-100 text-sm font-medium">Latest Month</p>
                        </div>
                        <p className="text-xl font-bold">
                            {payrollRecords.length > 0
                                ? `${monthNames[payrollRecords[0].pay_period_month - 1]} ${payrollRecords[0].pay_period_year}`
                                : 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Payroll History Timeline */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6">Payroll History</h2>

                    {payrollRecords.length === 0 ? (
                        <div className="text-center py-12">
                            <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Payroll Records</h3>
                            <p className="text-sm text-slate-500">Your payroll history will appear here once processed</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {payrollRecords.map((record) => {
                                const isExpanded = expandedRecord === record.id;

                                return (
                                    <div key={record.id} className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="bg-gradient-to-r from-slate-50 to-white p-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-indigo-100 rounded-xl">
                                                        <Calendar className="h-6 w-6 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-slate-900">
                                                            {monthNames[record.pay_period_month - 1]} {record.pay_period_year}
                                                        </h3>
                                                        <p className="text-sm text-slate-500">
                                                            {record.days_present} / {record.working_days} days present
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-sm text-slate-500 mb-1">Net Salary</p>
                                                        <p className="text-2xl font-bold text-emerald-600">
                                                            ₹{Number(record.net_salary).toLocaleString('en-IN')}
                                                        </p>
                                                    </div>

                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${record.status === 'paid'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {record.status === 'paid' ? (
                                                            <span className="flex items-center gap-1">
                                                                <CheckCircle className="h-3 w-3" />
                                                                PAID
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                PENDING
                                                            </span>
                                                        )}
                                                    </span>

                                                    <button
                                                        onClick={() => handleViewPayslip(record)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        View
                                                    </button>

                                                    <button
                                                        onClick={() => handleDownloadPayslip(record)}
                                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                                    >
                                                        <Download className="h-4 w-4" />
                                                        Download
                                                    </button>

                                                    <button
                                                        onClick={() => toggleExpand(record.id)}
                                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-5 w-5 text-slate-600" />
                                                        ) : (
                                                            <ChevronDown className="h-5 w-5 text-slate-600" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-6 bg-white border-t border-slate-200">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Earnings */}
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Earnings</h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Basic Salary</span>
                                                                <span className="text-sm font-semibold text-slate-900">₹{Number(record.basic_salary).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Dearness Allowance (DA)</span>
                                                                <span className="text-sm font-semibold text-slate-900">₹{Number(record.dearness_allowance).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">House Rent Allowance (HRA)</span>
                                                                <span className="text-sm font-semibold text-slate-900">₹{Number(record.house_rent_allowance).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Conveyance</span>
                                                                <span className="text-sm font-semibold text-slate-900">₹{Number(record.conveyance_allowance).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Medical</span>
                                                                <span className="text-sm font-semibold text-slate-900">₹{Number(record.medical_allowance).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Special Allowance</span>
                                                                <span className="text-sm font-semibold text-slate-900">₹{Number(record.special_allowance).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Other Allowances</span>
                                                                <span className="text-sm font-semibold text-slate-900">₹{Number(record.other_allowances).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            {Number(record.overtime_amount) > 0 && (
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                    <span className="text-sm text-slate-600">Overtime</span>
                                                                    <span className="text-sm font-semibold text-slate-900">₹{Number(record.overtime_amount).toLocaleString('en-IN')}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center py-3 bg-emerald-50 px-3 rounded-lg mt-2">
                                                                <span className="text-sm font-bold text-emerald-900">Gross Salary</span>
                                                                <span className="text-lg font-bold text-emerald-700">₹{Number(record.gross_salary).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Deductions */}
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Deductions</h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Provident Fund (PF)</span>
                                                                <span className="text-sm font-semibold text-orange-600">₹{Number(record.pf_employee).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">ESI</span>
                                                                <span className="text-sm font-semibold text-orange-600">₹{Number(record.esi_employee).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">Professional Tax</span>
                                                                <span className="text-sm font-semibold text-orange-600">₹{Number(record.professional_tax).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                <span className="text-sm text-slate-600">TDS</span>
                                                                <span className="text-sm font-semibold text-orange-600">₹{Number(record.tds).toLocaleString('en-IN')}</span>
                                                            </div>
                                                            {Number(record.absence_deduction) > 0 && (
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                    <span className="text-sm text-slate-600">Absence Deduction</span>
                                                                    <span className="text-sm font-semibold text-red-600">₹{Number(record.absence_deduction).toLocaleString('en-IN')}</span>
                                                                </div>
                                                            )}
                                                            {Number(record.loan_deduction) > 0 && (
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                    <span className="text-sm text-slate-600">Loan Deduction</span>
                                                                    <span className="text-sm font-semibold text-red-600">₹{Number(record.loan_deduction).toLocaleString('en-IN')}</span>
                                                                </div>
                                                            )}
                                                            {Number(record.advance_deduction) > 0 && (
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                    <span className="text-sm text-slate-600">Advance Deduction</span>
                                                                    <span className="text-sm font-semibold text-red-600">₹{Number(record.advance_deduction).toLocaleString('en-IN')}</span>
                                                                </div>
                                                            )}
                                                            {Number(record.penalty_deduction) > 0 && (
                                                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                                                    <span className="text-sm text-slate-600">Penalty</span>
                                                                    <span className="text-sm font-semibold text-red-600">₹{Number(record.penalty_deduction).toLocaleString('en-IN')}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between items-center py-3 bg-red-50 px-3 rounded-lg mt-2">
                                                                <span className="text-sm font-bold text-red-900">Total Deductions</span>
                                                                <span className="text-lg font-bold text-red-700">₹{Number(record.total_deductions).toLocaleString('en-IN')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Net Salary Summary */}
                                                <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-xl border-2 border-emerald-200">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-bold text-emerald-900">Net Salary (Take Home)</span>
                                                        <span className="text-3xl font-bold text-emerald-700">₹{Number(record.net_salary).toLocaleString('en-IN')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Payslip Modal */}
        {selectedPayslip && (
            <PayslipModal
                data={selectedPayslip}
                onClose={() => setSelectedPayslip(null)}
            />
        )}
    </div>
    );
}
