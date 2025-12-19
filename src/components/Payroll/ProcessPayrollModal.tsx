import { useState, useEffect } from 'react';
import { X, Users, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ProcessPayrollModalProps {
    isOpen: boolean;
    onClose: () => void;
    month: string;
    year: number;
    onSuccess?: () => void;
}

interface EmployeePayroll {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    basic: number;
    allowances: number;
    overtime: number;
    gross: number;
    deductions: number;
    net_salary: number;
}

export function ProcessPayrollModal({ isOpen, onClose, month, year, onSuccess }: ProcessPayrollModalProps) {
    const { organization } = useAuth();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [employees, setEmployees] = useState<EmployeePayroll[]>([]);

    useEffect(() => {
        if (isOpen && organization?.id) {
            loadEmployeesForPayroll();
        }
    }, [isOpen, organization?.id, month, year]);

    const loadEmployeesForPayroll = async () => {
        setLoading(true);
        try {
            const { data: salaryData, error } = await supabase
                .from('india_salary_components')
                .select(`
                    id,
                    employee_id,
                    basic_salary,
                    dearness_allowance,
                    house_rent_allowance,
                    conveyance_allowance,
                    medical_allowance,
                    special_allowance,
                    other_allowances,
                    is_pf_applicable,
                    is_esi_applicable,
                    employees (
                        id,
                        employee_code,
                        first_name,
                        last_name
                    )
                `)
                .eq('is_active', true);

            if (error) throw error;

            const payrollData = (salaryData || []).map((comp: any) => {
                const basic = comp.basic_salary || 0;
                const da = comp.dearness_allowance || 0;
                const hra = comp.house_rent_allowance || 0;
                const conveyance = comp.conveyance_allowance || 0;
                const medical = comp.medical_allowance || 0;
                const special = comp.special_allowance || 0;
                const other = comp.other_allowances || 0;

                const allowances = da + hra + conveyance + medical + special + other;
                const overtime = 0; // Can be calculated based on attendance
                const gross = basic + allowances + overtime;

                // Calculate deductions
                const pfWage = Math.min(basic + da, 15000);
                const pf = comp.is_pf_applicable ? pfWage * 0.12 : 0;
                const esi = comp.is_esi_applicable && gross <= 21000 ? gross * 0.0075 : 0;
                const deductions = pf + esi;

                const net_salary = gross - deductions;

                return {
                    id: comp.employee_id,
                    employee_code: comp.employees?.employee_code || '',
                    first_name: comp.employees?.first_name || '',
                    last_name: comp.employees?.last_name || '',
                    basic,
                    allowances,
                    overtime,
                    gross,
                    deductions,
                    net_salary
                };
            });

            setEmployees(payrollData);
        } catch (err) {
            console.error('Error loading payroll data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessPayroll = async () => {
        setProcessing(true);
        try {
            // Get month number from month name
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthNumber = monthNames.indexOf(month) + 1;

            // Create payroll records for each employee
            const payrollRecords = employees.map(emp => ({
                organization_id: organization!.id,
                employee_id: emp.id,
                pay_period_month: monthNumber,
                pay_period_year: year,
                basic_salary: emp.basic,
                dearness_allowance: emp.allowances,
                gross_salary: emp.gross,
                pf_employee: emp.deductions,
                total_deductions: emp.deductions,
                net_salary: emp.net_salary,
                status: 'approved',
                payment_status: 'pending'
            }));

            const { error } = await supabase
                .from('india_payroll_records')
                .upsert(payrollRecords, {
                    onConflict: 'employee_id,pay_period_month,pay_period_year'
                });

            if (error) throw error;

            alert(`✅ Payroll processed successfully for ${employees.length} employees!`);
            if (onSuccess) onSuccess(); // Reload data in parent component
            onClose();
        } catch (err: any) {
            console.error('Error processing payroll:', err);
            alert(`Failed to process payroll: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    // Calculate totals
    const totalEmployees = employees.length;
    const totalGross = employees.reduce((sum, e) => sum + e.gross, 0);
    const totalDeductions = employees.reduce((sum, e) => sum + e.deductions, 0);
    const totalNet = employees.reduce((sum, e) => sum + e.net_salary, 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">Process Monthly Payroll</h2>
                            <p className="text-green-100 mt-1">{month} {year} • {totalEmployees} Employees</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4 p-6 bg-slate-50">
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            <span className="text-sm text-blue-600 font-medium">Total Employees</span>
                        </div>
                        <h3 className="text-3xl font-bold text-blue-900">{totalEmployees}</h3>
                    </div>

                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">Gross Salary</span>
                        </div>
                        <h3 className="text-3xl font-bold text-green-900">₹{totalGross.toLocaleString('en-IN')}</h3>
                    </div>

                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span className="text-sm text-red-600 font-medium">Deductions</span>
                        </div>
                        <h3 className="text-3xl font-bold text-red-900">₹{totalDeductions.toLocaleString('en-IN')}</h3>
                    </div>

                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-purple-600" />
                            <span className="text-sm text-purple-600 font-medium">Net Salary</span>
                        </div>
                        <h3 className="text-3xl font-bold text-purple-900">₹{totalNet.toLocaleString('en-IN')}</h3>
                    </div>
                </div>

                {/* Employee Table */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                            <p className="text-slate-600 mt-4">Loading payroll data...</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-100 sticky top-0">
                                <tr>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Employee</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Basic</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Allowances</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">OT</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Gross</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Deductions</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">Net Salary</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {employees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50">
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                                                <p className="text-xs text-slate-500">FM-{emp.employee_code}</p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                                            ₹{emp.basic.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-slate-700">
                                            ₹{emp.allowances.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-teal-600">
                                            ₹{emp.overtime.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                                            ₹{emp.gross.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 text-right text-red-600">
                                            ₹{emp.deductions.toLocaleString('en-IN')}
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-green-600">
                                            ₹{emp.net_salary.toLocaleString('en-IN')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleProcessPayroll}
                        disabled={processing || loading}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <CheckCircle className="h-5 w-5" />
                        {processing ? 'Processing...' : 'Confirm & Process Payroll'}
                    </button>
                </div>
            </div>
        </div>
    );
}
