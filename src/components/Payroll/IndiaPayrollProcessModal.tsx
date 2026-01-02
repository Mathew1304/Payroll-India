import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Banknote, Users, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notifyPayrollProcessed } from '../../utils/notificationService';
import { calculateCompleteIndiaPayroll, IndiaSalaryComponents, OvertimeRecord, IndiaDeductions } from '../../utils/indiaPayrollCalculations';
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSunday,
    format
} from 'date-fns';

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

            // Fetch attendance records for the month
            const monthStart = startOfMonth(new Date(year, month - 1));
            const monthEnd = endOfMonth(monthStart);
            const startStr = format(monthStart, 'yyyy-MM-dd');
            const endStr = format(monthEnd, 'yyyy-MM-dd');

            const { data: attendanceRecords } = await supabase
                .from('attendance_records')
                .select('*')
                .eq('organization_id', organization!.id)
                .gte('date', startStr)
                .lte('date', endStr);

            // Fetch approved leave applications
            const { data: leaveApplications } = await supabase
                .from('leave_applications')
                .select('*, leave_types(*)')
                .eq('status', 'approved')
                .lte('start_date', endStr)
                .gte('end_date', startStr);

            // Fetch holidays
            const { data: holidays } = await (supabase
                .from('holidays') as any)
                .select('*')
                .eq('organization_id', organization!.id)
                .gte('date', startStr)
                .lte('date', endStr);

            // Fetch leave balances for the current year
            const currentYear = new Date().getFullYear();
            const { data: leaveBalances } = await (supabase
                .from('leave_balances') as any)
                .select('*')
                .eq('organization_id', organization!.id)
                .eq('year', currentYear);

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

            const isGlobalPFEnabled = (globalSettings as any)?.pf_enabled ?? true;
            const isGlobalESIEnabled = (globalSettings as any)?.esi_enabled ?? true;

            // Calculate actual working days in the month (excluding Sundays and Holidays)
            const holidaysDates = new Set((holidays as any[] || []).map((h: any) => h.date));
            const allDaysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
            const workingDaysInMonth = allDaysInMonth.filter(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                return !isSunday(day) && !holidaysDates.has(dateStr);
            }).length;

            const workingDaysDenominator = workingDaysInMonth || 26; // Use actual working days as denominator

            // Create loans map
            const loansMap = new Map<string, number>();
            (loansData as any[] || []).forEach((loan: any) => {
                const current = loansMap.get(loan.employee_id) || 0;
                loansMap.set(loan.employee_id, current + Number(loan.installment_amount));
            });

            // Create advances map
            const advancesMap = new Map<string, number>();
            (advancesData as any[] || []).forEach((adv: any) => {
                const current = advancesMap.get(adv.employee_id) || 0;
                advancesMap.set(adv.employee_id, current + Number(adv.recovery_amount));
            });

            // Deduplicate salary components to ensure one record per employee
            const uniqueSalaryMap = new Map<string, any>();
            (salaryData as any[] || []).forEach((comp: any) => {
                if (comp.employee && !uniqueSalaryMap.has(comp.employee.id)) {
                    uniqueSalaryMap.set(comp.employee.id, comp);
                }
            });

            // Calculate payroll for each unique employee
            const calcs: PayrollCalculation[] = Array.from(uniqueSalaryMap.values()).map((comp: any) => {
                const employee = comp.employee;

                // Get this employee's data
                const empAttendance = (attendanceRecords || []).filter((r: any) => r.employee_id === employee.id);
                const empLeaves = (leaveApplications || []).filter((l: any) => l.employee_id === employee.id);

                let daysPresent = 0;
                let lossOfPayDays = 0;
                let overtimeHours = 0;
                const paidLeavesTaken = new Map<string, number>();

                allDaysInMonth.forEach(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');

                    // Skip Sundays and Public Holidays for LOP calculation
                    if (isSunday(day) || holidaysDates.has(dateStr)) {
                        return;
                    }

                    const attendance = (empAttendance as any[]).find((r: any) => r.date === dateStr);
                    const leave = (empLeaves as any[]).find((l: any) => {
                        const lStart = l.start_date;
                        const lEnd = l.end_date;
                        return dateStr >= lStart && dateStr <= lEnd;
                    });

                    if (attendance && (attendance.status === 'Present' || attendance.status === 'Remote' || attendance.status === 'Late' || attendance.status === 'Half Day')) {
                        if (attendance.status === 'Half Day') {
                            daysPresent += 0.5;
                            lossOfPayDays += 0.5;
                        } else {
                            daysPresent++;
                        }
                        // Accumulate overtime if available
                        if (attendance.total_hours && attendance.total_hours > 9) {
                            overtimeHours += (attendance.total_hours - 9);
                        }
                    } else if (leave) {
                        const leaveType = leave.leave_types;
                        if (leaveType && leaveType.is_paid) {
                            // Track paid leaves to check against balance later
                            const typeId = leave.leave_type_id;
                            paidLeavesTaken.set(typeId, (paidLeavesTaken.get(typeId) || 0) + 1);
                            daysPresent++; // Increment for now, adjust later if balance exceeded
                        } else {
                            lossOfPayDays++;
                        }
                    } else {
                        // Not present, no leave -> LOP
                        lossOfPayDays++;
                    }
                });

                // Adjust LOP if paid leaves exceed balance
                paidLeavesTaken.forEach((daysTaken, typeId) => {
                    const balance = (leaveBalances as any[] || []).find(b => b.employee_id === employee.id && b.leave_type_id === typeId);
                    if (balance) {
                        const closingBalance = Number(balance.closing_balance || 0);
                        // If balance is negative, it means they took more than allotted.
                        // We need to find how many of the leaves taken THIS month contributed to that negativity.
                        // Logic:
                        // StartBalanceForMonth = closingBalance + daysTaken (assuming no leaves were taken after this month)
                        // If StartBalanceForMonth <= 0, then all daysTaken are LOP.
                        // If StartBalanceForMonth > 0 and closingBalance < 0, then Math.abs(closingBalance) are LOP.

                        const startMonthBalance = closingBalance + daysTaken;
                        let excessDays = 0;

                        if (startMonthBalance <= 0) {
                            excessDays = daysTaken;
                        } else if (closingBalance < 0) {
                            excessDays = Math.abs(closingBalance);
                        }

                        if (excessDays > 0) {
                            lossOfPayDays += excessDays;
                            daysPresent -= excessDays;
                        }
                    }
                });

                // Calculate pro-rated components based on attendance
                const earnedFactor = Math.max(0, (workingDaysDenominator - lossOfPayDays) / workingDaysDenominator);

                const earnedComponents: IndiaSalaryComponents = {
                    basicSalary: Math.round(Number(comp.basic_salary) * earnedFactor),
                    dearnessAllowance: Math.round(Number(comp.dearness_allowance) * earnedFactor),
                    houseRentAllowance: Math.round(Number(comp.house_rent_allowance) * earnedFactor),
                    conveyanceAllowance: Math.round(Number(comp.conveyance_allowance) * earnedFactor),
                    medicalAllowance: Math.round(Number(comp.medical_allowance) * earnedFactor),
                    specialAllowance: Math.round(Number(comp.special_allowance) * earnedFactor),
                    otherAllowances: Math.round(Number(comp.other_allowances) * earnedFactor)
                };

                const fixedGross = (Number(comp.basic_salary) + Number(comp.dearness_allowance) +
                    Number(comp.house_rent_allowance) + Number(comp.conveyance_allowance) +
                    Number(comp.medical_allowance) + Number(comp.special_allowance) +
                    Number(comp.other_allowances));

                const earnedGross = (earnedComponents.basicSalary + earnedComponents.dearnessAllowance +
                    earnedComponents.houseRentAllowance + earnedComponents.conveyanceAllowance +
                    earnedComponents.medicalAllowance + earnedComponents.specialAllowance +
                    earnedComponents.otherAllowances);

                const absenceDeduction = fixedGross - earnedGross;

                // Prepare overtime records
                const overtimeRecords: OvertimeRecord[] = overtimeHours > 0 ? [
                    { type: 'weekday', hours: overtimeHours }
                ] : [];

                // Prepare deductions (loans/advances stay fixed)
                const deductions: IndiaDeductions = {
                    absenceDeduction: 0,
                    loanDeduction: loansMap.get(employee.id) || 0,
                    advanceDeduction: advancesMap.get(employee.id) || 0,
                    penaltyDeduction: 0,
                    otherDeductions: 0
                };

                // Calculate complete payroll using EARNED components
                const result = calculateCompleteIndiaPayroll(
                    earnedComponents,
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
                        basic_salary: Number(comp.basic_salary),
                        dearness_allowance: Number(comp.dearness_allowance),
                        house_rent_allowance: Number(comp.house_rent_allowance),
                        conveyance_allowance: Number(comp.conveyance_allowance),
                        medical_allowance: Number(comp.medical_allowance),
                        special_allowance: Number(comp.special_allowance),
                        other_allowances: Number(comp.other_allowances),
                        is_pf_applicable: comp.is_pf_applicable && isGlobalPFEnabled,
                        pf_contribution_type: comp.pf_contribution_type,
                        pf_wage_ceiling: comp.pf_wage_ceiling,
                        is_esi_applicable: comp.is_esi_applicable && isGlobalESIEnabled
                    },
                    attendance: undefined, // Dynamic source now
                    working_days: workingDaysDenominator,
                    days_present: daysPresent,
                    loss_of_pay_days: lossOfPayDays,
                    overtimeHours: overtimeHours,
                    basic_salary: Number(comp.basic_salary),
                    dearness_allowance: Number(comp.dearness_allowance),
                    house_rent_allowance: Number(comp.house_rent_allowance),
                    conveyance_allowance: Number(comp.conveyance_allowance),
                    medical_allowance: Number(comp.medical_allowance),
                    special_allowance: Number(comp.special_allowance),
                    other_allowances: Number(comp.other_allowances),
                    gross_salary: fixedGross,
                    overtime_amount: result.overtimeAmount,
                    pf_employee: result.statutoryDeductions.pfEmployee,
                    esi_employee: result.statutoryDeductions.esiEmployee,
                    professional_tax: result.statutoryDeductions.professionalTax,
                    tds: result.statutoryDeductions.tds,
                    lwf: result.statutoryDeductions.lwf,
                    loan_deduction: deductions.loanDeduction,
                    advance_deduction: deductions.advanceDeduction,
                    absence_deduction: absenceDeduction,
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
            (existingRecords as any[] || [])?.forEach(record => {
                existingRecordMap.set(record.employee_id, record.id);
            });

            // 2. Prepare upsert payload with IDs if they exist
            const upsertPayload = calculations.map(calc => {
                const existingId = (existingRecordMap as any).get(calc.employee.id);

                const basePayload: any = {
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
                    overtime_hours: overtimeRecordHours(calc),
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
                    days_absent: Math.max(0, calc.working_days - calc.days_present),
                    days_leave: 0,
                    loss_of_pay_days: calc.loss_of_pay_days,
                    status: 'approved'
                };

                // Only include id if it exists (for updates), otherwise omit it (for inserts)
                return existingId ? { id: existingId, ...basePayload } : basePayload;
            });

            // 3. Perform bulk upsert
            const { data: insertedRecords, error: upsertError } = await (supabase
                .from('india_payroll_records') as any)
                .upsert(upsertPayload, {
                    onConflict: 'id'
                })
                .select();

            if (upsertError) throw upsertError;

            // 4. Send notifications to all employees
            if (insertedRecords && organization?.id) {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                const monthName = monthNames[month - 1];
                
                for (const record of insertedRecords) {
                    await notifyPayrollProcessed(
                        record.employee_id,
                        monthName,
                        year,
                        record.net_salary,
                        organization.id,
                        record.id
                    );
                }
            }

            onSuccess();
        } catch (err: any) {
            console.error('Payroll processing error:', err);
            setError(err.message || 'Failed to process payroll');
        } finally {
            setProcessing(false);
        }
    };

    const totalGross = calculations.reduce((sum, c) => sum + (c as any).gross_salary, 0);
    const totalNet = calculations.reduce((sum, c) => sum + c.net_salary, 0);
    const totalStatutoryDeductions = calculations.reduce((sum, c) => sum + c.total_statutory_deductions, 0);
    const totalAbsenceDeductions = calculations.reduce((sum, c) => sum + (c as any).absence_deduction, 0);

    const overtimeRecordHours = (calc: PayrollCalculation) => {
        // Prepare overtime records for calculation - return total hours
        return (calc as any).overtimeHours || 0;
    };

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
                                        <Clock className="h-5 w-5 text-red-600" />
                                        <p className="text-sm font-medium text-red-900">Absence/LOP</p>
                                    </div>
                                    <p className="text-2xl font-bold text-red-600">₹{totalAbsenceDeductions.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="bg-violet-50 rounded-xl border-2 border-violet-200 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Banknote className="h-5 w-5 text-violet-600" />
                                        <p className="text-sm font-medium text-violet-900">Net Payable</p>
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
                                                <th className="px-4 py-3 text-right text-xs font-bold text-red-600 uppercase">Absence/LOP</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Statutory</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Other Deductions</th>
                                                <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Net Payable</th>
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
                                                        <td className="px-4 py-3 text-right text-sm font-bold text-red-600">₹{calc.absence_deduction.toLocaleString('en-IN')}</td>
                                                        <td className="px-4 py-3 text-right text-sm text-orange-600">
                                                            <div className="text-[10px] text-slate-500">PF+ESI+PT+TDS</div>
                                                            ₹{calc.total_statutory_deductions.toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-sm text-slate-600">₹{(calc.loan_deduction + calc.advance_deduction + calc.penalty_deduction).toLocaleString('en-IN')}</td>
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
