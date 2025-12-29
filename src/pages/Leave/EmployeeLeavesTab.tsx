import { useState, useEffect } from 'react';
import { Calendar, Users, Download, Filter, Home } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface EmployeeLeaveRecord {
    employee_id: string;
    employee_name: string;
    employee_code: string;
    department: string;
    leave_dates: {
        date: string;
        leave_type: string;
        status: string;
    }[];
    remote_work_dates: string[];
    total_leave_days: number;
    total_remote_days: number;
}

export function EmployeeLeavesTab() {
    const { organization } = useAuth();
    const [loading, setLoading] = useState(true);
    const [employeeRecords, setEmployeeRecords] = useState<EmployeeLeaveRecord[]>([]);
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(1); // First day of current month
        return format(date, 'yyyy-MM-dd');
    });
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() + 1, 0); // Last day of current month
        return format(date, 'yyyy-MM-dd');
    });

    useEffect(() => {
        if (organization?.id) {
            loadEmployeeLeaves();
        }
    }, [organization?.id, startDate, endDate]);

    const loadEmployeeLeaves = async () => {
        setLoading(true);
        try {
            // Get all active employees
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select(`
                    id,
                    first_name,
                    last_name,
                    employee_code,
                    departments!employees_department_id_fkey (name)
                `)
                .eq('organization_id', organization!.id)
                .eq('is_active', true)
                .order('first_name');

            if (empError) throw empError;

            // Get leave applications for date range
            const { data: leaves, error: leaveError } = await supabase
                .from('leave_applications')
                .select(`
                    employee_id,
                    start_date,
                    end_date,
                    status,
                    leave_types (name)
                `)
                .eq('status', 'approved')
                .gte('start_date', startDate)
                .lte('end_date', endDate);

            if (leaveError) throw leaveError;

            // Get remote work dates from attendance
            const { data: attendance, error: attError } = await supabase
                .from('attendance_records')
                .select('employee_id, date, work_type')
                .eq('organization_id', organization!.id)
                .eq('work_type', 'Remote')
                .gte('date', startDate)
                .lte('date', endDate);

            if (attError) throw attError;

            // Process data
            const records: EmployeeLeaveRecord[] = (employees || []).map((emp: any) => {
                // Get employee's leaves
                const empLeaves = (leaves || []).filter((l: any) => l.employee_id === emp.id);
                const leaveDates: { date: string; leave_type: string; status: string }[] = [];

                empLeaves.forEach((leave: any) => {
                    const start = new Date(leave.start_date);
                    const end = new Date(leave.end_date);

                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        leaveDates.push({
                            date: format(new Date(d), 'yyyy-MM-dd'),
                            leave_type: leave.leave_types?.name || 'Leave',
                            status: leave.status
                        });
                    }
                });

                // Get employee's remote work dates
                const remoteDates = (attendance || [])
                    .filter((a: any) => a.employee_id === emp.id)
                    .map((a: any) => a.date);

                return {
                    employee_id: emp.id,
                    employee_name: `${emp.first_name} ${emp.last_name}`,
                    employee_code: emp.employee_code,
                    department: emp.departments?.name || 'N/A',
                    leave_dates: leaveDates,
                    remote_work_dates: remoteDates,
                    total_leave_days: leaveDates.length,
                    total_remote_days: remoteDates.length
                };
            });

            // Filter out employees with no leaves or remote work
            const filteredRecords = records.filter(r => r.total_leave_days > 0 || r.total_remote_days > 0);
            setEmployeeRecords(filteredRecords);

        } catch (error) {
            console.error('Error loading employee leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ['Employee Code', 'Employee Name', 'Department', 'Leave Dates', 'Remote Work Dates', 'Total Leave Days', 'Total Remote Days', 'Total Working Days Affected'];

        const rows = employeeRecords.map(emp => [
            emp.employee_code,
            emp.employee_name,
            emp.department,
            emp.leave_dates.map(l => `${l.date} (${l.leave_type})`).join('; '),
            emp.remote_work_dates.join('; '),
            emp.total_leave_days,
            emp.total_remote_days,
            emp.total_leave_days + emp.total_remote_days
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `employee-leaves-${startDate}-to-${endDate}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const totalLeaveDays = employeeRecords.reduce((sum, emp) => sum + emp.total_leave_days, 0);
    const totalRemoteDays = employeeRecords.reduce((sum, emp) => sum + emp.total_remote_days, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading employee leaves...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Filters */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Users className="h-6 w-6 text-blue-600" />
                            Employee Leaves Summary
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Track all employee leaves and remote work for salary calculation
                        </p>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>

                {/* Date Range Filter */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Date Range:</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <span className="text-slate-500">to</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Employees with Leaves/WFH</p>
                            <p className="text-2xl font-bold text-slate-900">{employeeRecords.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-lg">
                            <Calendar className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Total Leave Days</p>
                            <p className="text-2xl font-bold text-slate-900">{totalLeaveDays}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <Home className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-600">Total Remote Work Days</p>
                            <p className="text-2xl font-bold text-slate-900">{totalRemoteDays}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Employee Records Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {employeeRecords.length === 0 ? (
                    <div className="p-12 text-center">
                        <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-semibold">No leave or remote work records found</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Try adjusting the date range filter
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Employee</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Department</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Leave Days</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Remote Days</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Total Days</th>
                                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {employeeRecords.map((emp) => (
                                    <EmployeeLeaveRow key={emp.employee_id} employee={emp} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function EmployeeLeaveRow({ employee }: { employee: EmployeeLeaveRecord }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <tr className="hover:bg-slate-50 transition-colors">
                <td className="py-4 px-6">
                    <div>
                        <p className="font-medium text-slate-900">{employee.employee_name}</p>
                        <p className="text-xs text-slate-500">{employee.employee_code}</p>
                    </div>
                </td>
                <td className="py-4 px-6 text-sm text-slate-700">{employee.department}</td>
                <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                        <Calendar className="h-3 w-3" />
                        {employee.total_leave_days}
                    </span>
                </td>
                <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                        <Home className="h-3 w-3" />
                        {employee.total_remote_days}
                    </span>
                </td>
                <td className="py-4 px-6">
                    <span className="text-lg font-bold text-slate-900">
                        {employee.total_leave_days + employee.total_remote_days}
                    </span>
                </td>
                <td className="py-4 px-6">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        {expanded ? 'Hide' : 'View'} Details
                    </button>
                </td>
            </tr>
            {expanded && (
                <tr>
                    <td colSpan={6} className="bg-slate-50 px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Leave Dates */}
                            {employee.leave_dates.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-red-600" />
                                        Leave Dates ({employee.total_leave_days})
                                    </h4>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {employee.leave_dates.map((leave, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                                                <span className="text-sm text-slate-700">
                                                    {format(new Date(leave.date), 'MMM dd, yyyy')}
                                                </span>
                                                <span className="text-xs text-slate-500">{leave.leave_type}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Remote Work Dates */}
                            {employee.remote_work_dates.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Home className="h-4 w-4 text-purple-600" />
                                        Work From Home Dates ({employee.total_remote_days})
                                    </h4>
                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                        {employee.remote_work_dates.map((date, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200">
                                                <span className="text-sm text-slate-700">
                                                    {format(new Date(date), 'MMM dd, yyyy')}
                                                </span>
                                                <span className="text-xs text-purple-600 font-medium">WFH</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
