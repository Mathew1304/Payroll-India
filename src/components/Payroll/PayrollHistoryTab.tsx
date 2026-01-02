import { useState, useEffect } from 'react';
import { FileText, Eye, Download, Calendar, AlertCircle, TrendingUp, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface PayrollHistoryTabProps {
    employeeId: string;
}

export function PayrollHistoryTab({ employeeId }: PayrollHistoryTabProps) {
    const { organization, profile } = useAuth();
    const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
    const [selectedYear, setSelectedYear] = useState<number | ''>('');
    const [selectedPayslip, setSelectedPayslip] = useState<any>(null);
    const [localOrgId, setLocalOrgId] = useState<string | null>(null);
    const [localCountry, setLocalCountry] = useState<string | null>(null);

    const effectiveOrgId = organization?.id || localOrgId;
    const effectiveCountry = organization?.country || localCountry;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currency = effectiveCountry === 'India' ? 'INR' : 'QAR';
    const currencySymbol = effectiveCountry === 'India' ? '₹' : 'QAR';

    useEffect(() => {
        const recoverOrgData = async () => {
            // If we already have org context, do nothing
            if (organization?.id) return;

            // If we already recovered, do nothing
            if (localOrgId && localCountry) return;

            // Need an employee_id to look up
            const targetEmpId = employeeId || profile?.employee_id;
            if (!targetEmpId) return;

            try {
                // 1. Get org ID from employee record
                const { data: empData } = await supabase
                    .from('employees')
                    .select('organization_id')
                    .eq('id', targetEmpId)
                    .maybeSingle();

                if (empData?.organization_id) {
                    setLocalOrgId(empData.organization_id);

                    // 2. Get country from organizations table
                    const { data: orgData } = await supabase
                        .from('organizations')
                        .select('country')
                        .eq('id', empData.organization_id)
                        .maybeSingle();

                    if (orgData?.country) {
                        setLocalCountry(orgData.country);
                    }
                }
            } catch (err) {
                console.error("Error recovering org data:", err);
            }
        };

        recoverOrgData();
    }, [organization?.id, employeeId, profile?.employee_id, localOrgId, localCountry]);

    useEffect(() => {
        if (effectiveOrgId && effectiveCountry) {
            loadPayrollRecords();
        } else {
            // Safety timeout to stop spinner if data never comes
            const t = setTimeout(() => {
                if (loading && !effectiveOrgId) setLoading(false);
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [employeeId, effectiveOrgId, effectiveCountry]);

    useEffect(() => {
        filterRecords();
    }, [selectedMonth, selectedYear, payrollRecords]);

    const loadPayrollRecords = async () => {
        if (!employeeId || !effectiveOrgId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Determine table based on country
            const tableName = effectiveCountry === 'India' ? 'india_payroll_records' : 'qatar_payroll_records';

            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('employee_id', employeeId)
                .eq('organization_id', effectiveOrgId)
                .order('pay_period_year', { ascending: false })
                .order('pay_period_month', { ascending: false });

            if (error) throw error;
            setPayrollRecords(data || []);
            setFilteredRecords(data || []);
        } catch (error) {
            console.error('Error loading payroll records:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterRecords = () => {
        let filtered = [...payrollRecords];

        if (selectedMonth !== '') {
            filtered = filtered.filter(r => r.pay_period_month === selectedMonth);
        }

        if (selectedYear !== '') {
            filtered = filtered.filter(r => r.pay_period_year === selectedYear);
        }

        setFilteredRecords(filtered);
    };

    const handleDownloadPayslip = async (record: any) => {
        try {
            const { data: employee } = await supabase
                .from('employees')
                .select('*')
                .eq('id', employeeId)
                .single();

            if (!employee) {
                alert('Employee data not found');
                return;
            }

            // Fetch designation separately if employee has designation_id
            let designationTitle = 'N/A';
            if (employee.designation_id) {
                const { data: designation } = await supabase
                    .from('designations')
                    .select('title')
                    .eq('id', employee.designation_id)
                    .single();
                
                if (designation) {
                    designationTitle = designation.title;
                }
            }

            // Check if this is India or Qatar/Saudi
            if (effectiveCountry === 'India') {
                // Use new India PDF format
                const { downloadPayslipPDF } = await import('../../utils/payslipPDFGenerator');

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

                const payslipData = {
                    companyName: organization?.name || 'Company',
                    companyAddress: organization?.address || '',
                    employeeName: `${employee.first_name} ${employee.last_name}`,
                    employeeCode: employee.employee_code || '',
                    designation: designationTitle,
                    joiningDate: employee.date_of_joining ? format(new Date(employee.date_of_joining), 'dd/MM/yyyy') : 'N/A',
                    payPeriod: `${monthNames[record.pay_period_month - 1]} ${record.pay_period_year}`,
                    payDate: record.created_at ? format(new Date(record.created_at), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy'),
                    paidDays: record.days_present || 0,
                    lopDays: lopDays,
                    earnings,
                    deductions,
                    grossEarnings: Number(record.gross_salary) || 0,
                    totalDeductions: Number(record.total_deductions) || 0,
                    netPay: Number(record.net_salary) || 0,
                };

                await downloadPayslipPDF(payslipData);
            } else {
                // Use old Qatar/Saudi format
                const payslipData = {
                    country: 'Qatar' as const,
                    currency: 'QAR' as const,

                    companyName: organization?.name || 'Company',
                    companyAddress: organization?.address || '',
                    establishmentId: '',

                    employeeName: `${employee.first_name} ${employee.last_name}`,
                    employeeCode: employee.employee_code || '',
                    employeeId: employee.id,
                    designation: employee.designation || '',
                    department: employee.department || '',
                    joiningDate: employee.date_of_joining || '',
                    iban: employee.iban_number || '',

                    payPeriod: `${monthNames[record.pay_period_month - 1]} ${record.pay_period_year}`,
                    paymentDate: record.payment_date || '',
                    workingDays: record.working_days || 26,
                    daysPresent: record.days_present || 26,
                    daysAbsent: record.days_absent || 0,

                    basicSalary: Number(record.basic_salary) || 0,
                    housingAllowance: Number(record.housing_allowance) || 0,
                    foodAllowance: Number(record.food_allowance) || 0,
                    transportAllowance: Number(record.transport_allowance) || 0,
                    mobileAllowance: Number(record.mobile_allowance) || 0,
                    utilityAllowance: Number(record.utility_allowance) || 0,
                    otherAllowances: Number(record.other_allowances) || 0,

                    overtimeHours: Number(record.overtime_hours) || 0,
                    overtimeAmount: Number(record.overtime_amount) || 0,
                    bonus: Number(record.bonus) || 0,

                    absenceDeduction: Number(record.absence_deduction) || 0,
                    loanDeduction: Number(record.loan_deduction) || 0,
                    advanceDeduction: Number(record.advance_deduction) || 0,
                    penaltyDeduction: Number(record.penalty_deduction) || 0,
                    otherDeductions: Number(record.other_deductions) || 0,

                    grossSalary: Number(record.gross_salary) || 0,
                    totalEarnings: Number(record.gross_salary) || 0,
                    totalDeductions: Number(record.total_deductions) || 0,
                    netSalary: Number(record.net_salary) || 0,
                };

                const { downloadPayslipHTML } = await import('../../utils/payslipGenerator');
                downloadPayslipHTML(payslipData);
            }
        } catch (error) {
            console.error('Error downloading payslip:', error);
            alert('Failed to download payslip');
        }
    };

    const getUniqueYears = () => {
        const years = new Set(payrollRecords.map(r => r.pay_period_year));
        return Array.from(years).sort((a, b) => b - a);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">Payroll History</h3>
                    <p className="text-sm text-slate-600 mt-1">View and download your payslips</p>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value === '' ? '' : Number(e.target.value))}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Months</option>
                        {monthNames.map((month, idx) => (
                            <option key={idx} value={idx + 1}>{month}</option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value === '' ? '' : Number(e.target.value))}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Years</option>
                        {getUniqueYears().map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Payroll Records */}
            {filteredRecords.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No Payroll Records Found</h4>
                    <p className="text-slate-600 text-sm">
                        {selectedMonth || selectedYear ? 'Try adjusting your search filters' : 'Your payroll records will appear here once processed'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRecords.map((record) => (
                        <div
                            key={record.id}
                            className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Calendar className="h-5 w-5 text-blue-600" />
                                        <h4 className="text-lg font-bold text-slate-900">
                                            {monthNames[record.pay_period_month - 1]} {record.pay_period_year}
                                        </h4>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${record.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            record.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {record.status?.toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                        <div>
                                            <p className="text-xs text-slate-500">Gross Salary</p>
                                            <p className="text-sm font-semibold text-slate-900">{currencySymbol}{Number(record.gross_salary).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Deductions</p>
                                            <p className="text-sm font-semibold text-red-600">-{currencySymbol}{Number(record.total_deductions).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Net Salary</p>
                                            <p className="text-lg font-bold text-emerald-600">{currencySymbol}{Number(record.net_salary).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Working Days</p>
                                            <p className="text-sm font-semibold text-slate-900">{record.days_present}/{record.working_days}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedPayslip(record)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
                                    >
                                        <Eye className="h-4 w-4" />
                                        View
                                    </button>
                                    <button
                                        onClick={() => handleDownloadPayslip(record)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
                                    >
                                        <Download className="h-4 w-4" />
                                        Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Payslip View Modal */}
            {selectedPayslip && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPayslip(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-2xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">Payslip Details</h3>
                                    <p className="text-blue-100 text-sm mt-1">
                                        {monthNames[selectedPayslip.pay_period_month - 1]} {selectedPayslip.pay_period_year}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedPayslip(null)}
                                    className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
                                >
                                    <X className="h-6 w-6 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Earnings */}
                            <div>
                                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                                    Earnings
                                </h4>
                                <div className="space-y-2 bg-emerald-50 rounded-lg p-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-700">Basic Salary</span>
                                        <span className="font-semibold">{currencySymbol}{Number(selectedPayslip.basic_salary).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-700">Housing All owance</span>
                                        <span className="font-semibold">{currencySymbol}{Number(selectedPayslip.housing_allowance || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-700">Transport Allowance</span>
                                        <span className="font-semibold">{currencySymbol}{Number(selectedPayslip.transport_allowance || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-700">Food Allowance</span>
                                        <span className="font-semibold">{currencySymbol}{Number(selectedPayslip.food_allowance || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-700">Other Allowances</span>
                                        <span className="font-semibold">{currencySymbol}{(Number(selectedPayslip.mobile_allowance || 0) + Number(selectedPayslip.utility_allowance || 0) + Number(selectedPayslip.other_allowances || 0)).toLocaleString('en-IN')}</span>
                                    </div>
                                    {selectedPayslip.overtime_amount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700">Overtime</span>
                                            <span className="font-semibold">{currencySymbol}{Number(selectedPayslip.overtime_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold border-t-2 border-emerald-200 pt-2 mt-2">
                                        <span className="text-emerald-900">Gross Salary</span>
                                        <span className="text-emerald-600">{currencySymbol}{Number(selectedPayslip.gross_salary).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Deductions */}
                            <div>
                                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-600" />
                                    Deductions
                                </h4>
                                <div className="space-y-2 bg-red-50 rounded-lg p-4">
                                    {selectedPayslip.absence_deduction > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700">Absence Deduction</span>
                                            <span className="font-semibold text-red-600">-{currencySymbol}{Number(selectedPayslip.absence_deduction).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {selectedPayslip.loan_deduction > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700">Loan Deduction</span>
                                            <span className="font-semibold text-red-600">-{currencySymbol}{Number(selectedPayslip.loan_deduction).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {selectedPayslip.advance_deduction > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700">Advance Recovery</span>
                                            <span className="font-semibold text-red-600">-{currencySymbol}{Number(selectedPayslip.advance_deduction).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {selectedPayslip.other_deductions > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-700">Other Deductions</span>
                                            <span className="font-semibold text-red-600">-{currencySymbol}{Number(selectedPayslip.other_deductions || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {selectedPayslip.total_deductions === 0 && (
                                        <p className="text-sm text-slate-500 text-center py-2">No deductions</p>
                                    )}
                                    {selectedPayslip.total_deductions > 0 && (
                                        <div className="flex justify-between text-base font-bold border-t-2 border-red-200 pt-2 mt-2">
                                            <span className="text-red-900">Total Deductions</span>
                                            <span className="text-red-600">-{currencySymbol}{Number(selectedPayslip.total_deductions).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Net Salary */}
                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-emerald-100 text-lg">Net Salary</span>
                                    <span className="text-3xl font-bold text-white">{currencySymbol}{Number(selectedPayslip.net_salary).toLocaleString('en-IN')}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handleDownloadPayslip(selectedPayslip)}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                                >
                                    <Download className="h-5 w-5" />
                                    Download Payslip
                                </button>
                                <button
                                    onClick={() => setSelectedPayslip(null)}
                                    className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-semibold"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
