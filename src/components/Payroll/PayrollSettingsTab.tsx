import { useState, useEffect } from 'react';
import { Search, Save, AlertCircle, Shield, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PayrollSettingsTabProps {
    organizationId: string;
    showNotification: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

interface GlobalSettings {
    id: string;
    pf_enabled: boolean;
    esi_enabled: boolean;
}

interface EmployeeSetting {
    id: string; // employee_id
    salary_component_id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    department_name?: string;
    is_pf_applicable: boolean;
    is_esi_applicable: boolean;
}

export function PayrollSettingsTab({ organizationId, showNotification }: PayrollSettingsTabProps) {
    const [loading, setLoading] = useState(true);
    const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
    const [employees, setEmployees] = useState<EmployeeSetting[]>([]);
    const [groupedEmployees, setGroupedEmployees] = useState<{ [key: string]: EmployeeSetting[] }>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (organizationId) {
            loadSettings();
        }
    }, [organizationId]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            // 1. Fetch Global Settings
            let { data: settings, error: settingsError } = await supabase
                .from('payroll_settings')
                .select('*')
                .eq('organization_id', organizationId)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') {
                console.error('Error fetching settings:', settingsError);
            }

            // Create default settings if not exists
            if (!settings) {
                const { data: newSettings, error: createError } = await supabase
                    .from('payroll_settings')
                    .upsert([{
                        organization_id: organizationId,
                        pf_enabled: true,
                        esi_enabled: true
                    }], {
                        onConflict: 'organization_id',
                        ignoreDuplicates: true
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                settings = newSettings;
            }

            setGlobalSettings(settings);

            // 2. Fetch Employees and their Salary Components
            // We need to join employees with departments and salary_components
            const { data: employeeData, error: empError } = await supabase
                .from('employees')
                .select(`
                    id, first_name, last_name, employee_code,
                    department:department_id (name),
                    india_salary_components (id, is_pf_applicable, is_esi_applicable)
                `)
                .eq('organization_id', organizationId)
                .eq('is_active', true)
                .order('first_name');

            if (empError) throw empError;

            // Transform data
            const mappedEmployees: EmployeeSetting[] = (employeeData || []).map((emp: any) => ({
                id: emp.id,
                salary_component_id: emp.india_salary_components?.[0]?.id,
                first_name: emp.first_name,
                last_name: emp.last_name,
                employee_code: emp.employee_code,
                department_name: emp.department?.name || 'No Department',
                is_pf_applicable: emp.india_salary_components?.[0]?.is_pf_applicable ?? false,
                is_esi_applicable: emp.india_salary_components?.[0]?.is_esi_applicable ?? false
            }));

            // Filter out employees without salary components setup
            const validEmployees = mappedEmployees.filter(e => e.salary_component_id);
            setEmployees(validEmployees);

        } catch (err: any) {
            console.error('Error loading payroll settings:', err);
            showNotification('error', 'Error', 'Failed to load payroll settings');
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalToggle = async (field: 'pf_enabled' | 'esi_enabled', value: boolean) => {
        if (!globalSettings) return;

        try {
            const { error } = await supabase
                .from('payroll_settings')
                .update({ [field]: value })
                .eq('id', globalSettings.id);

            if (error) throw error;

            setGlobalSettings({ ...globalSettings, [field]: value });
            showNotification('success', 'Updated', `Global ${field === 'pf_enabled' ? 'PF' : 'ESI'} setting updated`);
        } catch (err) {
            console.error('Error updating global settings:', err);
            showNotification('error', 'Error', 'Failed to update global setting');
        }
    };

    const handleEmployeeToggle = async (salaryComponentId: string, field: 'is_pf_applicable' | 'is_esi_applicable', value: boolean) => {
        try {
            const { error } = await supabase
                .from('india_salary_components')
                .update({ [field]: value })
                .eq('id', salaryComponentId);

            if (error) throw error;

            // Update local state
            setEmployees(prev => prev.map(emp =>
                emp.salary_component_id === salaryComponentId
                    ? { ...emp, [field]: value }
                    : emp
            ));

        } catch (err) {
            console.error('Error updating employee setting:', err);
            showNotification('error', 'Error', 'Failed to update employee setting');
        }
    };

    const filteredEmployees = employees.filter(emp => {
        const search = searchQuery.toLowerCase();
        return (
            emp.first_name.toLowerCase().includes(search) ||
            emp.last_name.toLowerCase().includes(search) ||
            emp.employee_code.toLowerCase().includes(search)
        );
    });

    if (loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Global Settings Card */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Shield className="h-6 w-6 text-emerald-400" />
                            Statutory Compliance Control
                        </h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Master controls for Provident Fund (PF) and Employee State Insurance (ESI).
                            Disabling here will override individual employee settings.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PF Toggle */}
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-white">Provident Fund (PF)</h4>
                                <p className="text-xs text-slate-400 mt-1">Enable/Disable PF calculation for the entire organization</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={globalSettings?.pf_enabled ?? true}
                                    onChange={(e) => handleGlobalToggle('pf_enabled', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                        <div className={`mt-3 text-xs font-medium px-2 py-1 rounded w-fit ${globalSettings?.pf_enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {globalSettings?.pf_enabled ? 'Calculation Active' : 'Calculation Disabled Globally'}
                        </div>
                    </div>

                    {/* ESI Toggle */}
                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-semibold text-white">Employee State Insurance (ESI)</h4>
                                <p className="text-xs text-slate-400 mt-1">Enable/Disable ESI calculation for the entire organization</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={globalSettings?.esi_enabled ?? true}
                                    onChange={(e) => handleGlobalToggle('esi_enabled', e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                            </label>
                        </div>
                        <div className={`mt-3 text-xs font-medium px-2 py-1 rounded w-fit ${globalSettings?.esi_enabled ? 'bg-indigo-500/10 text-indigo-400' : 'bg-red-500/10 text-red-400'}`}>
                            {globalSettings?.esi_enabled ? 'Calculation Active' : 'Calculation Disabled Globally'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Employee List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-lg font-bold text-slate-900">Employee Configuration</h3>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">PF Applicability</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-slate-600 uppercase tracking-wider">ESI Applicability</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No employees found with salary setup configured.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs mr-3">
                                                    {emp.first_name[0]}{emp.last_name[0]}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{emp.first_name} {emp.last_name}</div>
                                                    <div className="text-xs text-slate-500">{emp.employee_code}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium">
                                                {emp.department_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center flex-col items-center gap-1">
                                                <label className={`relative inline-flex items-center cursor-pointer ${!globalSettings?.pf_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={emp.is_pf_applicable}
                                                        onChange={(e) => handleEmployeeToggle(emp.salary_component_id, 'is_pf_applicable', e.target.checked)}
                                                        disabled={!globalSettings?.pf_enabled}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                                </label>
                                                {!globalSettings?.pf_enabled && (
                                                    <span className="text-[10px] text-red-500 font-medium">Disabled Globally</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex justify-center flex-col items-center gap-1">
                                                <label className={`relative inline-flex items-center cursor-pointer ${!globalSettings?.esi_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={emp.is_esi_applicable}
                                                        onChange={(e) => handleEmployeeToggle(emp.salary_component_id, 'is_esi_applicable', e.target.checked)}
                                                        disabled={!globalSettings?.esi_enabled}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                                                </label>
                                                {!globalSettings?.esi_enabled && (
                                                    <span className="text-[10px] text-red-500 font-medium">Disabled Globally</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
