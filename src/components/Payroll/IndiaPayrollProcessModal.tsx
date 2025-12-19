import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Banknote, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCompleteIndiaPayroll, IndiaSalaryComponents, OvertimeRecord, IndiaDeductions } from '../../utils/indiaPayrollCalculations';

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    pan_number: string;
    uan_number: string;
    esi_number: string;
    bank_account_number: string;
    ifsc_code: string;
    tax_regime: string;
    work_state: string;
}

interface SalaryComponent {
    employee_id: string;
    basic_salary: number;
    dearness_allowance: number;
    house_rent_allowance: number;
    conveyance_allowance: number;
    medical_allowance: number;
    special_allowance: number;
    other_allowances: number;
    is_pf_applicable: boolean;
    pf_contribution_type: string;
    pf_wage_ceiling: number;
    is_esi_applicable: boolean;
}

interface AttendanceData {
    employee_id: string;
    days_present: number;
    days_absent: number;
    days_leave: number;
    loss_of_pay_days: number;
    overtime_hours: number;
}

interface LoanData {
    employee_id: string;
    monthly_deduction: number;
}

interface AdvanceData {
    employee_id: string;
    monthly_recovery: number;
}

interface PayrollCalculation {
    employee: Employee;
    salary: SalaryComponent;
    attendance?: AttendanceData;
    working_days: number;
    days_present: number;
    loss_of_pay_days: number;
    basic_salary: number;
    dearness_allowance: number;
    house_rent_allowance: number;
    conveyance_allowance: number;
    medical_allowance: number;
    special_allowance: number;
    other_allowances: number;
    gross_salary: number;
    overtime_amount: number;
    pf_employee: number;
    esi_employee: number;
    professional_tax: number;
    tds: number;
    lwf: number;
    loan_deduction: number;
    advance_deduction: number;
    absence_deduction: number;
    penalty_deduction: number;
    total_statutory_deductions: number;
    total_other_deductions: number;
    total_deductions: number;
    net_salary: number;
    pf_employer: number;
    esi_employer: number;
    ctc: number;
}

interface Props {
    month: number;
    year: number;
    onClose: () => void;
    onSuccess: () => void;
}

export function IndiaPayrollProcessModal({ month, year, onClose, onSuccess }: Props) {
    const { organization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'calculate' | 'review' | 'confirm'>('calculate');
    const [calculations, setCalculations] = useState<PayrollCalculation[]>([]);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    useEffect(() => {
        if (step === 'calculate') {
            calculatePayroll();
        }
    }, [step]);

    const calculatePayroll = async () => {
        setLoading(true);
        setError('');

        try {
            // Fetch all active employees with salary components
            const { data: salaryData, error: salaryError } = await supabase
                .from('india_salary_components')
                .select(`
          *,
          employee:employees(
            id, first_name, last_name, employee_code, pan_number, uan_number, 
            esi_number, bank_account_number, ifsc_code, tax_regime, work_state
          )
        `)
                .eq('organization_id', organization!.id)
                .eq('is_active', true);

            if (salaryError) throw salaryError;
            if (!salaryData || salaryData.length === 0) {
                throw new Error('No active salary components found. Please set up employee salaries first.');
            }

            // Fetch attendance data (assuming you have an attendance table)
            const { data: attendanceData } = await supabase
                .from('india_monthly_attendance')
                .select('*')
                .eq('organization_id', organization!.id)
                .eq('month', month)
                .eq('year', year);

            // Fetch active loans
            const { data: loansData } = await supabase
                .from('india_employee_loans')
                .select('employee_id, installment_amount')
                .eq('organization_id', organization!.id)
                .eq('status', 'active');

            // Fetch active advances
            const { data: advancesData } = await supabase
                .from('india_employee_advances')
                .select('employee_id, recovery_amount')
                .eq('organization_id', organization!.id)
                .eq('status', 'active');

            // Fetch Global Payroll Settings
            const { data: globalSettings } = await supabase
                .from('payroll_settings')
                .select('pf_enabled, esi_enabled')
                .eq('organization_id', organization!.id)
                .single();

            const isGlobalPFEnabled = globalSettings?.pf_enabled ?? true;
            const isGlobalESIEnabled = globalSettings?.esi_enabled ?? true;

            const workingDays = 26; // Default working days, can be made configurable

            // Create attendance map
            const attendanceMap = new Map<string, AttendanceData>();
            attendanceData?.forEach(att => {
                attendanceMap.set(att.employee_id, {
                    employee_id: att.employee_id,
                    days_present: att.days_present,
                    days_absent: att.days_absent,
                    days_leave: att.days_leave,
                    loss_of_pay_days: att.loss_of_pay_days || 0,
                    overtime_hours: att.overtime_hours || 0
                });
            });

            // Create loans map
            const loansMap = new Map<string, number>();
            loansData?.forEach(loan => {
                const current = loansMap.get(loan.employee_id) || 0;
                loansMap.set(loan.employee_id, current + Number(loan.installment_amount));
            });

            // Create advances map
            const advancesMap = new Map<string, number>();
            advancesData?.forEach(adv => {
                const current = advancesMap.get(adv.employee_id) || 0;
                advancesMap.set(adv.employee_id, current + Number(adv.recovery_amount));
            });

            // Deduplicate salary components to ensure one record per employee
            const uniqueSalaryMap = new Map();
            salaryData.forEach((comp: any) => {
                if (!uniqueSalaryMap.has(comp.employee.id)) {
                    uniqueSalaryMap.set(comp.employee.id, comp);
                }
            });

            // Calculate payroll for each unique employee
            const calcs: PayrollCalculation[] = Array.from(uniqueSalaryMap.values()).map((comp: any) => {
                const employee = comp.employee;
                const attendance = attendanceMap.get(employee.id);
                const daysPresent = attendance?.days_present || workingDays;
                const daysAbsent = attendance?.days_absent || 0;
                const lossOfPayDays = attendance?.loss_of_pay_days || 0;
                const overtimeHours = attendance?.overtime_hours || 0;

                // Prepare salary components
                const salaryComponents: IndiaSalaryComponents = {
                    basicSalary: Number(comp.basic_salary),
                    dearnessAllowance: Number(comp.dearness_allowance),
                    houseRentAllowance: Number(comp.house_rent_allowance),
                    conveyanceAllowance: Number(comp.conveyance_allowance),
                    medicalAllowance: Number(comp.medical_allowance),
                    specialAllowance: Number(comp.special_allowance),
                    otherAllowances: Number(comp.other_allowances)
                };

                // Prepare overtime records
                const overtimeRecords: OvertimeRecord[] = overtimeHours > 0 ? [
                    { type: 'weekday', hours: overtimeHours }
                ] : [];

                // Calculate pro-rated salary based on attendance
                const dailyRate = (salaryComponents.basicSalary + salaryComponents.dearnessAllowance +
                    salaryComponents.houseRentAllowance + salaryComponents.conveyanceAllowance +
                    salaryComponents.medicalAllowance + salaryComponents.specialAllowance +
                    salaryComponents.otherAllowances) / workingDays;
                const absenceDeduction = dailyRate * lossOfPayDays;

                // Prepare deductions
                const deductions: IndiaDeductions = {
                    absenceDeduction,
                    loanDeduction: loansMap.get(employee.id) || 0,
                    advanceDeduction: advancesMap.get(employee.id) || 0,
                    penaltyDeduction: 0,
                    otherDeductions: 0
                };

                // Calculate complete payroll
                const result = calculateCompleteIndiaPayroll(
                    salaryComponents,
                    overtimeRecords,
                    deductions,
                    comp.is_pf_applicable && isGlobalPFEnabled,
                    comp.is_esi_applicable && isGlobalESIEnabled,
                    0, // bonus
                    0, // incentive
                    0, // arrears
                    comp.pf_wage_ceiling || 15000,
                    21000 // ESI ceiling
                );

                return {
                    employee,
                    salary: {
                        employee_id: employee.id,
                        basic_salary: salaryComponents.basicSalary,
                        dearness_allowance: salaryComponents.dearnessAllowance,
                        house_rent_allowance: salaryComponents.houseRentAllowance,
                        conveyance_allowance: salaryComponents.conveyanceAllowance,
                        medical_allowance: salaryComponents.medicalAllowance,
                        special_allowance: salaryComponents.specialAllowance,
                        other_allowances: salaryComponents.otherAllowances,
                        is_pf_applicable: comp.is_pf_applicable && isGlobalPFEnabled,
                        pf_contribution_type: comp.pf_contribution_type,
                        pf_wage_ceiling: comp.pf_wage_ceiling,
                        is_esi_applicable: comp.is_esi_applicable && isGlobalESIEnabled
                    },
                    attendance,
                    working_days: workingDays,
                    days_present: daysPresent,
                    loss_of_pay_days: lossOfPayDays,
                    basic_salary: salaryComponents.basicSalary,
                    dearness_allowance: salaryComponents.dearnessAllowance,
                    house_rent_allowance: salaryComponents.houseRentAllowance,
                    conveyance_allowance: salaryComponents.conveyanceAllowance,
                    medical_allowance: salaryComponents.medicalAllowance,
                    special_allowance: salaryComponents.specialAllowance,
                    other_allowances: salaryComponents.otherAllowances,
                    gross_salary: result.grossSalary,
                    overtime_amount: result.overtimeAmount,
                    pf_employee: result.statutoryDeductions.pfEmployee,
                    esi_employee: result.statutoryDeductions.esiEmployee,
                    professional_tax: result.statutoryDeductions.professionalTax,
                    tds: result.statutoryDeductions.tds,
                    lwf: result.statutoryDeductions.lwf,
                    loan_deduction: deductions.loanDeduction,
                    advance_deduction: deductions.advanceDeduction,
                    absence_deduction: deductions.absenceDeduction,
                    penalty_deduction: deductions.penaltyDeduction,
                    total_statutory_deductions: result.totalStatutoryDeductions,
                    total_other_deductions: result.totalOtherDeductions,
                    total_deductions: result.totalDeductions,
                    net_salary: result.netSalary,
                    pf_employer: result.employerContributions.pfEmployer,
                    esi_employer: result.employerContributions.esiEmployer,
                    ctc: result.ctc
                };
            });

            setCalculations(calcs);
            setStep('review');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayroll = async () => {
        setProcessing(true);
        setError('');

        try {
            // 1. Fetch existing records for this period to get their IDs
            const { data: existingRecords, error: fetchError } = await supabase
                .from('india_payroll_records')
                .select('id, employee_id')
                .eq('organization_id', organization!.id)
                .eq('pay_period_month', month)
                .eq('pay_period_year', year);

            if (fetchError) throw fetchError;

            // Create a map of employee_id -> record_id
            const existingRecordMap = new Map<string, string>();
            existingRecords?.forEach(record => {
                existingRecordMap.set(record.employee_id, record.id);
            });

            // 2. Prepare upsert payload with IDs if they exist
            const upsertPayload = calculations.map(calc => {
                const existingId = existingRecordMap.get(calc.employee.id);

                const basePayload = {
                    organization_id: organization!.id,
                    employee_id: calc.employee.id,
                    pay_period_month: month,
                    pay_period_year: year,
                    basic_salary: calc.basic_salary,
                    dearness_allowance: calc.dearness_allowance,
                    house_rent_allowance: calc.house_rent_allowance,
                    conveyance_allowance: calc.conveyance_allowance,
                    medical_allowance: calc.medical_allowance,
                    special_allowance: calc.special_allowance,
                    other_allowances: calc.other_allowances,
                    overtime_hours: calc.attendance?.overtime_hours || 0,
                    overtime_amount: calc.overtime_amount,
                    pf_employee: calc.pf_employee,
                    esi_employee: calc.esi_employee,
                    professional_tax: calc.professional_tax,
                    tds: calc.tds,
                    lwf: calc.lwf,
                    pf_employer: calc.pf_employer,
                    esi_employer: calc.esi_employer,
                    absence_deduction: calc.absence_deduction,
                    loan_deduction: calc.loan_deduction,
                    advance_deduction: calc.advance_deduction,
                    penalty_deduction: calc.penalty_deduction,
                    other_deductions: 0,
                    gross_salary: calc.gross_salary,
                    total_statutory_deductions: calc.total_statutory_deductions,
                    total_deductions: calc.total_deductions,
                    net_salary: calc.net_salary,
                    ctc: calc.ctc,
                    working_days: calc.working_days,
                    days_present: calc.days_present,
                    days_absent: calc.attendance?.days_absent || 0,
                    days_leave: calc.attendance?.days_leave || 0,
                    loss_of_pay_days: calc.loss_of_pay_days,
                    status: 'approved'
                };

                // Only include id if it exists (for updates), otherwise omit it (for inserts)
                return existingId ? { id: existingId, ...basePayload } : basePayload;
            });

            // 3. Perform bulk upsert
            const { error: upsertError } = await supabase
                .from('india_payroll_records')
                .upsert(upsertPayload, {
                    onConflict: 'id'
                });

            if (upsertError) throw upsertError;

            onSuccess();
        } catch (err: any) {
            console.error('Payroll processing error:', err);
            setError(err.message || 'Failed to process payroll');
        } finally {
            setProcessing(false);
        }
    };

    const totalGross = calculations.reduce((sum, c) => sum + c.gross_salary, 0);
    const totalNet = calculations.reduce((sum, c) => sum + c.net_salary, 0);
    const totalStatutoryDeductions = calculations.reduce((sum, c) => sum + c.total_statutory_deductions, 0);
    const totalOtherDeductions = calculations.reduce((sum, c) => sum + c.total_other_deductions, 0);
    const totalDeductions = calculations.reduce((sum, c) => sum + c.total_deductions, 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Process Monthly Payroll</h2>
                        <p className="text-indigo-100 text-sm mt-1">
                            {monthNames[month - 1]} {year} • {calculations.length} Employees
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-indigo-800 p-2 rounded-lg transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {error && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 relative">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 max-h-60 overflow-y-auto pr-8">
                                <h4 className="font-bold text-red-900">Error</h4>
                                <p className="text-sm text-red-700 whitespace-pre-wrap break-words">{error}</p>
                            </div>
                            <button
                                onClick={() => setError('')}
                                className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded-full transition-colors"
                            >
                                <X className="h-4 w-4 text-red-500" />
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                            <p className="mt-4 text-slate-600">Calculating payroll...</p>
                        </div>
                    )}

                    {step === 'review' && !loading && calculations.length > 0 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-blue-50 rounded-xl border-2 border-blue-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        <p className="text-sm font-medium text-blue-900">Total Employees</p>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">{calculations.length}</p>
                                </div>
                                <div className="bg-emerald-50 rounded-xl border-2 border-emerald-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Banknote className="h-5 w-5 text-emerald-600" />
                                        <p className="text-sm font-medium text-emerald-900">Gross Salary</p>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600">₹{totalGross.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-orange-50 rounded-xl border-2 border-orange-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Banknote className="h-5 w-5 text-orange-600" />
                                        <p className="text-sm font-medium text-orange-900">Statutory Deductions</p>
                                    </div>
                                    <p className="text-2xl font-bold text-orange-600">₹{totalStatutoryDeductions.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-red-50 rounded-xl border-2 border-red-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Banknote className="h-5 w-5 text-red-600" />
                                        <p className="text-sm font-medium text-red-900">Other Deductions</p>
                                    </div>
                                    <p className="text-2xl font-bold text-red-600">₹{totalOtherDeductions.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-violet-50 rounded-xl border-2 border-violet-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Banknote className="h-5 w-5 text-violet-600" />
                                        <p className="text-sm font-medium text-violet-900">Net Salary</p>
                                    </div>
                                    <p className="text-2xl font-bold text-violet-600">₹{totalNet.toLocaleString('en-IN')}</p>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Employee</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Basic</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Allowances</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Gross</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">PF</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">ESI</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">PT</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">TDS</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Deductions</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Net Salary</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {calculations.map((calc) => {
                                                const totalAllowances = calc.dearness_allowance + calc.house_rent_allowance +
                                                    calc.conveyance_allowance + calc.medical_allowance +
                                                    calc.special_allowance + calc.other_allowances;

                                                return (
                                                    <tr key={calc.employee.id} className="hover:bg-slate-50">
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-semibold text-slate-900">
                                                                    {calc.employee.first_name} {calc.employee.last_name}
                                                                </p>
                                                                <p className="text-xs text-slate-500">{calc.employee.employee_code}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-slate-900">₹{calc.basic_salary.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-slate-900">₹{totalAllowances.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">₹{calc.gross_salary.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-orange-600">₹{calc.pf_employee.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-orange-600">₹{calc.esi_employee.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-orange-600">₹{calc.professional_tax.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-orange-600">₹{calc.tds.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-red-600">₹{calc.total_deductions.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-lg font-bold text-emerald-600">₹{calc.net_salary.toLocaleString('en-IN')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors">
                        Cancel
                    </button>
                    {step === 'review' && (
                        <button
                            onClick={handleConfirmPayroll}
                            disabled={processing || calculations.length === 0}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-5 w-5" />
                                    Confirm & Process Payroll
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
