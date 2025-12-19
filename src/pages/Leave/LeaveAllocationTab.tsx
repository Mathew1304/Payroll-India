import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Save, Search, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface Employee {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    department: { name: string } | null;
}

interface LeaveType {
    id: string;
    name: string;
    code: string;
}

interface LeaveBalance {
    id?: string;
    employee_id: string;
    leave_type_id: string;
    accrued: number;
    used: number;
    closing_balance: number;
    opening_balance: number;
    adjustment: number;
}

export function LeaveAllocationTab() {
    const { organization } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [balances, setBalances] = useState<Record<string, Record<string, LeaveBalance>>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (organization?.id) {
            loadData();
        }
    }, [organization?.id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Employees
            const { data: empData } = await supabase
                .from('employees')
                .select('id, first_name, last_name, employee_code, department:departments!employees_department_id_fkey(name)')
                .eq('organization_id', organization!.id)
                .eq('is_active', true)
                .eq('employment_status', 'active')
                .order('first_name');

            // 2. Fetch Leave Types
            const { data: typeData } = await supabase
                .from('leave_types')
                .select('id, name, code')
                .eq('organization_id', organization!.id)
                .eq('is_active', true)
                .order('name');

            // 3. Fetch Balances for Current Year
            const year = new Date().getFullYear();
            const { data: balanceData } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('organization_id', organization!.id)
                .eq('year', year);

            setEmployees(empData || []);
            setLeaveTypes(typeData || []);

            // Map balances: employee_id -> leave_type_id -> balance
            const balanceMap: Record<string, Record<string, LeaveBalance>> = {};
            if (balanceData) {
                balanceData.forEach((b: any) => {
                    if (!balanceMap[b.employee_id]) balanceMap[b.employee_id] = {};
                    balanceMap[b.employee_id][b.leave_type_id] = b;
                });
            }
            setBalances(balanceMap);

        } catch (error) {
            console.error('Error loading allocation data:', error);
            showNotification('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleAllocationChange = (employeeId: string, leaveTypeId: string, value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        setBalances(prev => {
            const empBalances = { ...prev[employeeId] } || {};
            const existing = empBalances[leaveTypeId] || {
                employee_id: employeeId,
                leave_type_id: leaveTypeId,
                accrued: 0,
                used: 0,
                closing_balance: 0,
                opening_balance: 0,
                adjustment: 0
            };

            // Calculate new closing balance
            // Formula: connection = opening + accrued (new) - used + adjustment
            // We assume opening and adjustment are static for this simple editor, or we could expose them too.
            // For now, let's just edit 'accrued' (Allocation).

            const newBalance = {
                ...existing,
                accrued: numValue,
                closing_balance: (existing.opening_balance || 0) + numValue - (existing.used || 0) + (existing.adjustment || 0)
            };

            return {
                ...prev,
                [employeeId]: {
                    ...prev[employeeId],
                    [leaveTypeId]: newBalance
                }
            };
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates: any[] = [];
            const year = new Date().getFullYear();

            Object.values(balances).forEach(empBalance => {
                Object.values(empBalance).forEach(balance => {
                    updates.push({

                        organization_id: organization!.id,
                        employee_id: balance.employee_id,
                        leave_type_id: balance.leave_type_id,
                        year: year,
                        accrued: balance.accrued,
                        closing_balance: balance.closing_balance,
                        used: balance.used,
                        opening_balance: balance.opening_balance,
                        adjustment: balance.adjustment
                    });
                });
            });

            if (updates.length === 0) return;

            // Process in chunks to avoid request size limits
            const chunkSize = 50;
            for (let i = 0; i < updates.length; i += chunkSize) {
                const chunk = updates.slice(i, i + chunkSize);
                const { error } = await supabase
                    .from('leave_balances')
                    .upsert(chunk, { onConflict: 'employee_id, leave_type_id, year' });

                if (error) throw error;
            }

            showNotification('success', 'Allocations updated successfully');
            await loadData(); // Reload to get fresh IDs and verify

        } catch (error) {
            console.error('Error saving allocations:', error);
            showNotification('error', 'Failed to save allocations');
        } finally {
            setSaving(false);
        }
    };

    const showNotification = (type: 'success' | 'error', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const filteredEmployees = employees.filter(emp => {
        const search = searchTerm.toLowerCase();
        return (
            emp.first_name.toLowerCase().includes(search) ||
            emp.last_name?.toLowerCase().includes(search) ||
            emp.employee_code.toLowerCase().includes(search)
        );
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadData}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            {notification && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <p className="font-medium">{notification.message}</p>
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="sticky left-0 z-10 bg-slate-50 px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-r border-slate-200 min-w-[200px]">
                                    Employee
                                </th>
                                {leaveTypes.map(type => (
                                    <th key={type.id} className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 min-w-[120px]">
                                        {type.name}
                                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">{type.code}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredEmployees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-white px-6 py-4 border-r border-slate-100">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                                            <p className="text-xs text-slate-500">{emp.employee_code} • {emp.department?.name || 'No Dept'}</p>
                                        </div>
                                    </td>
                                    {leaveTypes.map(type => {
                                        const balance = balances[emp.id]?.[type.id];
                                        const accrued = balance?.accrued || 0;
                                        const used = balance?.used || 0;
                                        const closing = balance?.closing_balance || 0;

                                        return (
                                            <td key={type.id} className="px-4 py-3">
                                                <div className="flex flex-col items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={accrued}
                                                        onChange={(e) => handleAllocationChange(emp.id, type.id, e.target.value)}
                                                        className="w-20 px-2 py-1 text-center text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                    <div className="flex gap-2 text-[10px] text-slate-400">
                                                        <span title="Used">Use: {used}</span>
                                                        <span title="Balance">Bal: {closing}</span>
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
