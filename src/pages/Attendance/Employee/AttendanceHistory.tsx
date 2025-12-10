import { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    MapPin
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function AttendanceHistory() {
    const { user } = useAuth();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });

    useEffect(() => {
        if (user?.id) {
            loadHistory();
        }
    }, [user?.id, dateRange]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('attendance_records')
                .select(`
          *,
          location:office_locations(name)
        `)
                .eq('employee_id', user!.id)
                .gte('date', dateRange.start)
                .lte('date', dateRange.end)
                .order('date', { ascending: false });

            if (error) throw error;
            setRecords(data || []);
        } catch (err) {
            console.error('Error loading history:', err);
        } finally {
            setLoading(false);
        }
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
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <h2 className="font-semibold text-slate-900">Attendance Log</h2>
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
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading history...</div>
                ) : records.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No Records Found</h3>
                        <p className="text-slate-500">No attendance records found for the selected period.</p>
                    </div>
                ) : (
                    records.map((record) => (
                        <div key={record.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="h-12 w-12 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-600">
                                        <span className="text-xs font-medium uppercase">{format(new Date(record.date), 'MMM')}</span>
                                        <span className="text-lg font-bold">{format(new Date(record.date), 'dd')}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                                                {record.status}
                                            </span>
                                            {record.work_type && (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                                    {record.work_type}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {record.total_hours ? `${record.total_hours} hrs` : '--'}
                                            </div>
                                            {record.location?.name && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" />
                                                    {record.location.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-4 md:pt-0">
                                    <div className="text-center flex-1 md:flex-none">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Check In</p>
                                        <p className="font-mono font-medium text-slate-900">
                                            {record.check_in_time ? format(new Date(record.check_in_time), 'HH:mm') : '--:--'}
                                        </p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-200 hidden md:block"></div>
                                    <div className="text-center flex-1 md:flex-none">
                                        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Check Out</p>
                                        <p className="font-mono font-medium text-slate-900">
                                            {record.check_out_time ? format(new Date(record.check_out_time), 'HH:mm') : '--:--'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
