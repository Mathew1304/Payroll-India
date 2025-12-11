import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Banknote, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  employee_code: string;
  qatar_id: string;
  iban_number: string;
}

interface SalaryComponent {
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  food_allowance: number;
  transport_allowance: number;
  mobile_allowance: number;
  utility_allowance: number;
  other_allowances: number;
}

interface AttendanceData {
  employee_id: string;
  days_present: number;
  days_absent: number;
  days_leave: number;
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
  basic_salary: number;
  allowances: number;
  gross_salary: number;
  overtime_amount: number;
  loan_deduction: number;
  advance_deduction: number;
  absence_deduction: number;
  total_deductions: number;
  net_salary: number;
}

interface Props {
  month: number;
  year: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function QatarPayrollProcessModal({ month, year, onClose, onSuccess }: Props) {
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
        .from('qatar_salary_components')
        .select(`
          *,
          employee:employees(id, first_name, last_name, employee_code, qatar_id, iban_number, date_of_joining)
        `)
        .eq('organization_id', organization!.id)
        .eq('is_active', true);

      if (salaryError) throw salaryError;
      if (!salaryData || salaryData.length === 0) {
        throw new Error('No active salary components found. Please set up employee salaries first.');
      }

      // Fetch attendance data
      const { data: attendanceData } = await supabase
        .from('qatar_monthly_attendance')
        .select('*')
        .eq('organization_id', organization!.id)
        .eq('month', month)
        .eq('year', year);

      // Fetch active loans
      const { data: loansData } = await supabase
        .from('qatar_employee_loans')
        .select('employee_id, installment_amount')
        .eq('organization_id', organization!.id)
        .eq('status', 'active');

      // Fetch active advances
      const { data: advancesData } = await supabase
        .from('qatar_employee_advances')
        .select('employee_id, recovery_amount')
        .eq('organization_id', organization!.id)
        .eq('status', 'active');

      // Get payroll config for default working days
      const { data: configData } = await supabase
        .from('qatar_payroll_config')
        .select('default_working_days_per_month, ot_weekday_rate')
        .eq('organization_id', organization!.id)
        .single();

      const workingDays = configData?.default_working_days_per_month || 26;
      const otRate = configData?.ot_weekday_rate || 1.25;

      // Create attendance map
      const attendanceMap = new Map<string, AttendanceData>();
      attendanceData?.forEach(att => {
        attendanceMap.set(att.employee_id, {
          employee_id: att.employee_id,
          days_present: att.days_present,
          days_absent: att.days_absent,
          days_leave: att.days_leave,
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
        const overtimeHours = attendance?.overtime_hours || 0;

        const basic = Number(comp.basic_salary);
        const housing = Number(comp.housing_allowance);
        const food = Number(comp.food_allowance);
        const transport = Number(comp.transport_allowance);
        const mobile = Number(comp.mobile_allowance);
        const utility = Number(comp.utility_allowance);
        const other = Number(comp.other_allowances);

        const totalAllowances = housing + food + transport + mobile + utility + other;
        const monthlyGross = basic + totalAllowances;

        // Calculate pro-rated salary based on attendance
        const dailyRate = monthlyGross / workingDays;
        const earnedSalary = dailyRate * daysPresent;
        const absenceDeduction = dailyRate * daysAbsent;

        // Calculate overtime
        const hourlyRate = basic / (workingDays * 8);
        const overtimeAmount = hourlyRate * overtimeHours * otRate;

        // Get deductions
        const loanDeduction = loansMap.get(employee.id) || 0;
        const advanceDeduction = advancesMap.get(employee.id) || 0;

        const totalDeductions = absenceDeduction + loanDeduction + advanceDeduction;
        const netSalary = earnedSalary + overtimeAmount - totalDeductions;

        return {
          employee,
          salary: {
            employee_id: employee.id,
            basic_salary: basic,
            housing_allowance: housing,
            food_allowance: food,
            transport_allowance: transport,
            mobile_allowance: mobile,
            utility_allowance: utility,
            other_allowances: other
          },
          attendance,
          working_days: workingDays,
          days_present: daysPresent,
          basic_salary: basic,
          allowances: totalAllowances,
          gross_salary: earnedSalary,
          overtime_amount: overtimeAmount,
          loan_deduction: loanDeduction,
          advance_deduction: advanceDeduction,
          absence_deduction: absenceDeduction,
          total_deductions: totalDeductions,
          net_salary: netSalary
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
        .from('qatar_payroll_records')
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
          basic_salary: calc.salary.basic_salary,
          housing_allowance: calc.salary.housing_allowance,
          food_allowance: calc.salary.food_allowance,
          transport_allowance: calc.salary.transport_allowance,
          mobile_allowance: calc.salary.mobile_allowance,
          utility_allowance: calc.salary.utility_allowance,
          other_allowances: calc.salary.other_allowances,
          overtime_hours: calc.attendance?.overtime_hours || 0,
          overtime_amount: calc.overtime_amount,
          absence_deduction: calc.absence_deduction,
          loan_deduction: calc.loan_deduction,
          advance_deduction: calc.advance_deduction,
          gross_salary: calc.gross_salary,
          total_deductions: calc.total_deductions,
          net_salary: calc.net_salary,
          working_days: calc.working_days,
          days_present: calc.days_present,
          days_absent: calc.attendance?.days_absent || 0,
          days_leave: calc.attendance?.days_leave || 0,
          status: 'approved'
        };

        // Only include id if it exists (for updates), otherwise omit it (for inserts)
        return existingId ? { id: existingId, ...basePayload } : basePayload;
      });

      // 3. Perform bulk upsert
      const { error: upsertError } = await supabase
        .from('qatar_payroll_records')
        .upsert(upsertPayload, {
          onConflict: 'id' // Use ID conflict resolution since we're providing IDs for existing records
        });

      if (upsertError) throw upsertError;

      // 4. Update loans and advances (only for new records or if logic requires)
      // Note: Incrementing paid installments blindly on re-run might be an issue. 
      // Ideally we should track if this specific payroll run already deducted.
      // For now, we'll skip this part on re-runs to avoid double deduction in DB counters, 
      // or we assume the user knows what they are doing when re-processing.
      // A safer approach for re-runs is to NOT increment if record already existed.

      for (const calc of calculations) {
        const existingId = existingRecordMap.get(calc.employee.id);

        // Only update loan/advance counters if this is a NEW record
        if (!existingId) {
          if (calc.loan_deduction > 0) {
            await supabase.rpc('increment', {
              table_name: 'qatar_employee_loans',
              column_name: 'paid_installments',
              filter_column: 'employee_id',
              filter_value: calc.employee.id
            });
          }

          if (calc.advance_deduction > 0) {
            await supabase.rpc('increment', {
              table_name: 'qatar_employee_advances',
              column_name: 'paid_recoveries',
              filter_column: 'employee_id',
              filter_value: calc.employee.id
            });
          }
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

  const totalGross = calculations.reduce((sum, c) => sum + c.gross_salary, 0);
  const totalNet = calculations.reduce((sum, c) => sum + c.net_salary, 0);
  const totalDeductions = calculations.reduce((sum, c) => sum + c.total_deductions, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Process Monthly Payroll</h2>
            <p className="text-emerald-100 text-sm mt-1">
              {monthNames[month - 1]} {year} • {calculations.length} Employees
            </p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-emerald-800 p-2 rounded-lg transition-colors">
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
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
              <p className="mt-4 text-slate-600">Calculating payroll...</p>
            </div>
          )}

          {step === 'review' && !loading && calculations.length > 0 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <p className="text-2xl font-bold text-emerald-600">{totalGross.toLocaleString()} QAR</p>
                </div>
                <div className="bg-red-50 rounded-xl border-2 border-red-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-medium text-red-900">Deductions</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{totalDeductions.toLocaleString()} QAR</p>
                </div>
                <div className="bg-violet-50 rounded-xl border-2 border-violet-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-5 w-5 text-violet-600" />
                    <p className="text-sm font-medium text-violet-900">Net Salary</p>
                  </div>
                  <p className="text-2xl font-bold text-violet-600">{totalNet.toLocaleString()} QAR</p>
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
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">OT</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Gross</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Deductions</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-slate-700 uppercase">Net Salary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {calculations.map((calc) => (
                        <tr key={calc.employee.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                {calc.employee.first_name} {calc.employee.last_name}
                              </p>
                              <p className="text-xs text-slate-500">{calc.employee.employee_code}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-900">{calc.basic_salary.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-900">{calc.allowances.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm text-emerald-600">{calc.overtime_amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{calc.gross_salary.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-sm text-red-600">{calc.total_deductions.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-lg font-bold text-emerald-600">{calc.net_salary.toLocaleString()}</td>
                        </tr>
                      ))}
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
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
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
