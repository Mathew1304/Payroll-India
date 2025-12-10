import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Download,
    Calendar,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Clock,
    User
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function AttendanceReport() {
    const { organization } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    useEffect(() => {
        if (organization?.id) {
            loadRecords();
        }
    }, [organization?.id, dateRange, statusFilter]);

    const loadRecords = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('attendance_records')
                .select(`
          *,
          employee:employees(first_name, last_name, employee_code, department:departments(name)),
          location:office_locations(name)
        `)
                .eq('organization_id', organization!.id)
                .gte('date', dateRange.start)
                .lte('date', dateRange.end)
                .order('date', { ascending: false })
                .order('check_in_time', { ascending: true });

            if (statusFilter !== 'All') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error('Error loading attendance records:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const fullName = `${record.employee?.first_name} ${record.employee?.last_name}`.toLowerCase();
        const empCode = record.employee?.employee_code?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || empCode.includes(search);
    });

    const exportCSV = () => {
        const headers = ['Date', 'Employee', 'ID', 'Department', 'Status', 'Check In', 'Check Out', 'Total Hours', 'Location', 'Notes'];
        const csvData = filteredRecords.map(r => [
            r.date,
            `${r.employee?.first_name} ${r.employee?.last_name}`,
            r.employee?.employee_code,
            r.employee?.department?.name,
            r.status,
            r.check_in_time ? format(new Date(r.check_in_time), 'HH:mm') : '-',
            r.check_out_time ? format(new Date(r.check_out_time), 'HH:mm') : '-',
            r.total_hours || 0,
            r.location?.name || 'Remote/N/A',
            r.notes || ''
        ]);

        const csvContent = [headers, ...csvData].map(e => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `attendance_report_${dateRange.start}_${dateRange.end}.csv`;
        link.click();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Present': return 'bg-green-100 text-green-700';
            case 'Absent': return 'bg-red-100 text-red-700';
            case 'Late': return 'bg-orange-100 text-orange-700';
            case 'Half Day': return 'bg-yellow-100 text-yellow-700';
            case 'Remote': return 'bg-purple-100 text-purple-700';
            case 'On Leave': return 'bg-blue-100 text-blue-700';
            case 'Holiday': return 'bg-slate-100 text-slate-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search employee..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="All">All Status</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                        <option value="Late">Late</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Remote">Remote</option>
                        <option value="On Leave">On Leave</option>
                    </select>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                            className="bg-transparent border-none p-0 text-sm focus:ring-0 w-32"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                            className="bg-transparent border-none p-0 text-sm focus:ring-0 w-32"
                        />
                    </div>

                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-900">Employee</th>
                                <th className="px-6 py-4 font-semibold text-slate-900">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-900">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-900">Check In</th>
                                <th className="px-6 py-4 font-semibold text-slate-900">Check Out</th>
                                <th className="px-6 py-4 font-semibold text-slate-900">Total Hrs</th>
                                <th className="px-6 py-4 font-semibold text-slate-900">Location</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading records...</td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No records found matching your filters.</td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                    {record.employee?.first_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {record.employee?.first_name} {record.employee?.last_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{record.employee?.department?.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {format(new Date(record.date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600">
                                            {record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-slate-600">
                                            {record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {record.total_hours ? `${record.total_hours}h` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 flex items-center gap-1">
                                            {record.location?.name ? (
                                                <>
                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                    {record.location.name}
                                                </>
                                            ) : (
                                                record.work_type === 'Remote' ? 'Remote' : '-'
                                            )}
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
