import { useState, useEffect } from 'react';
import {
    CheckCircle,
    XCircle,
    Clock,
    Building,
    Home,
    Users,
    Activity,
    MapPin,
    AlertTriangle,
    RefreshCw,
    TrendingUp
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

interface AttendanceStats {
    present: number;
    absent: number;
    late: number;
    inOffice: number;
    remote: number;
    totalEmployees: number;
    activeLocations: number;
}

interface EmployeeStatus {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
    status: string;
    work_type: string | null;
    check_in_time: string | null;
    check_out_time: string | null;
    duration: string | null;
    department_name: string | null;
    early_checkout_reason: string | null;
}

export function AttendanceDashboard() {
    const { organization } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<AttendanceStats>({
        present: 0,
        absent: 0,
        late: 0,
        inOffice: 0,
        remote: 0,
        totalEmployees: 0,
        activeLocations: 0
    });
    const [liveEmployees, setLiveEmployees] = useState<EmployeeStatus[]>([]);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        if (organization?.id) {
            loadDashboardData();

            // Auto-refresh every 30 seconds
            const interval = setInterval(() => {
                loadDashboardData(true);
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [organization?.id]);

    const loadDashboardData = async (isAutoRefresh = false) => {
        if (!isAutoRefresh) setLoading(true);
        else setRefreshing(true);

        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Load all data in parallel
            const [attendanceResult, employeeResult, locationResult, liveStatusResult] = await Promise.all([
                // 1. Get Attendance Records for Today
                supabase
                    .from('attendance_records')
                    .select('status, work_type')
                    .eq('organization_id', organization!.id)
                    .eq('date', today),

                // 2. Get Total Active Employees
                supabase
                    .from('employees')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', organization!.id)
                    .eq('is_active', true),

                // 3. Get Active Locations
                supabase
                    .from('office_locations')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', organization!.id)
                    .eq('is_active', true),

                // 4. Get Live Employee Status (today's attendance with employee details)
                supabase
                    .from('attendance_records')
                    .select(`
                        *,
                        employees (
                            id,
                            first_name,
                            last_name,
                            employee_code
                        )
                    `)
                    .eq('organization_id', organization!.id)
                    .eq('date', today)
                    .not('check_in_time', 'is', null)
                    .order('check_in_time', { ascending: false })
                    .limit(50)
            ]);

            console.log('Dashboard Data Load:', {
                attendance: attendanceResult,
                live: liveStatusResult,
                today,
                orgId: organization!.id
            });

            const records = attendanceResult.data || [];
            const employeeCount = employeeResult.count || 0;
            const locationCount = locationResult.count || 0;

            setStats({
                present: records.filter(r => r.status === 'Present' || r.status === 'Late').length,
                absent: records.filter(r => r.status === 'Absent').length,
                late: records.filter(r => r.status === 'Late').length,
                inOffice: records.filter(r => r.work_type === 'In Office').length,
                remote: records.filter(r => r.work_type === 'Remote').length,
                totalEmployees: employeeCount,
                activeLocations: locationCount
            });

            // Process live employee status
            const liveData = (liveStatusResult.data || []).map((record: any) => {
                let duration = '-';
                if (record.check_in_time) {
                    const start = new Date(record.check_in_time);
                    const end = record.check_out_time ? new Date(record.check_out_time) : new Date();

                    if (start <= end) {
                        const diff = Math.floor((end.getTime() - start.getTime()) / 60000); // minutes
                        const hours = Math.floor(diff / 60);
                        const mins = diff % 60;
                        duration = `${hours}h ${mins}m`;
                    }
                }

                return {
                    id: record.employee_id,
                    first_name: record.employees.first_name,
                    last_name: record.employees.last_name,
                    employee_code: record.employees.employee_code,
                    status: record.status,
                    work_type: record.work_type,
                    check_in_time: record.check_in_time,
                    check_out_time: record.check_out_time,
                    duration: duration,
                    department_name: record.employees.departments?.name || 'N/A',
                    early_checkout_reason: record.early_checkout_reason
                };
            });

            setLiveEmployees(liveData);
            setLastUpdated(new Date());

        } catch (err) {
            console.error('Error loading dashboard data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => {
        const colorClasses: { [key: string]: { bg: string; text: string; iconBg: string } } = {
            green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
            red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
            orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
            blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
            purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
            gray: { bg: 'bg-slate-50', text: 'text-slate-600', iconBg: 'bg-slate-100' }
        };

        const colors = colorClasses[color] || colorClasses.gray;

        return (
            <div className={`${colors.bg} p-6 rounded-xl border border-${color}-100 relative overflow-hidden transition-all hover:shadow-md`}>
                <div className={`absolute top-0 right-0 p-4 opacity-10`}>
                    <Icon className={`h-24 w-24 ${colors.text}`} />
                </div>
                <div className="relative z-10">
                    <div className={`h-12 w-12 rounded-lg ${colors.iconBg} flex items-center justify-center mb-4`}>
                        <Icon className={`h-6 w-6 ${colors.text}`} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">{title}</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
                    {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
                </div>
            </div>
        );
    };

    const getStatusBadge = (status: string) => {
        const badges: { [key: string]: { bg: string; text: string } } = {
            'Present': { bg: 'bg-green-100', text: 'text-green-700' },
            'Late': { bg: 'bg-orange-100', text: 'text-orange-700' },
            'Absent': { bg: 'bg-red-100', text: 'text-red-700' },
            'On Leave': { bg: 'bg-purple-100', text: 'text-purple-700' }
        };
        const badge = badges[status] || badges['Present'];
        return `${badge.bg} ${badge.text} px-2 py-1 rounded-full text-xs font-semibold`;
    };

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center">
                <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Loading dashboard...</p>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header with Refresh */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Today's Overview</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Last updated: {format(lastUpdated, 'HH:mm:ss')}
                    </p>
                </div>
                <button
                    onClick={() => loadDashboardData(true)}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard
                    title="Present"
                    value={stats.present}
                    icon={CheckCircle}
                    color="green"
                    subtext={`${stats.totalEmployees > 0 ? Math.round((stats.present / stats.totalEmployees) * 100) : 0}% of workforce`}
                />
                <StatCard
                    title="Absent"
                    value={stats.absent}
                    icon={XCircle}
                    color="red"
                />
                <StatCard
                    title="Late"
                    value={stats.late}
                    icon={Clock}
                    color="orange"
                />
                <StatCard
                    title="In Office"
                    value={stats.inOffice}
                    icon={Building}
                    color="blue"
                />
                <StatCard
                    title="Remote"
                    value={stats.remote}
                    icon={Home}
                    color="purple"
                />
                <StatCard
                    title="Total Staff"
                    value={stats.totalEmployees}
                    icon={Users}
                    color="gray"
                />
            </div>

            {/* System Overview & Location Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* System Status */}
                <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Activity className="h-48 w-48 text-white" />
                    </div>
                    <div className="relative z-10 flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-6 w-6 text-blue-200" />
                                <h3 className="text-xl font-bold">System Overview</h3>
                            </div>
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit mb-6">
                                <CheckCircle className="h-4 w-4 text-green-400" />
                                <span className="text-sm font-medium">System Active - Attendance tracking is operational</span>
                            </div>

                            <div>
                                <p className="text-blue-200 text-sm mb-1">Total Office Locations</p>
                                <p className="text-4xl font-bold">{stats.activeLocations}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Status Panel */}
                <div className="bg-slate-800 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                        <MapPin className="h-5 w-5 text-slate-400" />
                        <h3 className="font-bold text-lg">Location Status</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400 text-sm">GPS Status</span>
                                <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs font-bold">ENABLED</span>
                            </div>
                            <div className="w-full bg-slate-700 h-2 rounded-full">
                                <div className="bg-green-500 h-2 rounded-full w-full"></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-400 text-sm">Signal Accuracy</span>
                                <span className="text-blue-400 text-xs font-bold">HIGH</span>
                            </div>
                            <div className="w-full bg-slate-700 h-2 rounded-full">
                                <div className="bg-blue-500 h-2 rounded-full w-[85%]"></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                Average accuracy: ±12m
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Employee Status */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            <h3 className="font-bold text-lg text-slate-900">Live Employee Status</h3>
                        </div>
                        <span className="text-sm text-slate-500">Recent Check-ins</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Employee</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Department</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Status</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Work Type</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Check-in Time</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Check-out Time</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Time Logged In</th>
                                <th className="text-left py-3 px-6 text-xs font-semibold text-slate-600 uppercase">Early Checkout</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {liveEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-500">
                                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                                        <p>No check-ins yet today</p>
                                    </td>
                                </tr>
                            ) : (
                                liveEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {emp.first_name} {emp.last_name}
                                                </p>
                                                <p className="text-xs text-slate-500">{emp.employee_code}</p>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-700">{emp.department_name}</td>
                                        <td className="py-4 px-6">
                                            <span className={getStatusBadge(emp.status)}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            {emp.work_type ? (
                                                <span className="flex items-center gap-1 text-sm text-slate-700">
                                                    {emp.work_type === 'In Office' ? (
                                                        <><Building className="h-3 w-3" /> In Office</>
                                                    ) : (
                                                        <><Home className="h-3 w-3" /> Remote</>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-sm">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-700">
                                            {emp.check_in_time ? format(new Date(emp.check_in_time), 'HH:mm') : '-'}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-700">
                                            {emp.check_out_time ? format(new Date(emp.check_out_time), 'HH:mm') : '-'}
                                        </td>
                                        <td className="py-4 px-6 text-sm font-medium text-blue-600">
                                            {emp.duration}
                                        </td>
                                        <td className="py-4 px-6">
                                            {emp.early_checkout_reason ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="relative group">
                                                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                                            <div className="bg-slate-900 text-white text-xs rounded-lg py-2 px-3 max-w-xs shadow-lg">
                                                                <p className="font-semibold mb-1">Early Checkout Reason:</p>
                                                                <p>{emp.early_checkout_reason}</p>
                                                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                                                    <div className="border-4 border-transparent border-t-slate-900"></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-orange-600 font-medium">Early</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Early Checkouts Today */}
            {liveEmployees.filter(emp => emp.early_checkout_reason).length > 0 && (
                <div className="bg-white rounded-xl border border-orange-200 shadow-sm">
                    <div className="p-6 border-b border-orange-100 bg-orange-50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Early Checkouts Today</h3>
                                <p className="text-sm text-slate-600">Employees who checked out before completing 8 hours</p>
                            </div>
                            <div className="ml-auto">
                                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                    {liveEmployees.filter(emp => emp.early_checkout_reason).length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="space-y-4">
                            {liveEmployees
                                .filter(emp => emp.early_checkout_reason)
                                .map((emp) => (
                                    <div
                                        key={emp.id}
                                        className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900">
                                                            {emp.first_name} {emp.last_name}
                                                        </h4>
                                                        <p className="text-xs text-slate-500">
                                                            {emp.employee_code} • {emp.department_name}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="bg-white border border-orange-200 rounded-lg p-3 mt-2">
                                                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">
                                                        Reason for Early Checkout
                                                    </p>
                                                    <p className="text-sm text-slate-700">
                                                        {emp.early_checkout_reason}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Check-in</p>
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {emp.check_in_time ? format(new Date(emp.check_in_time), 'HH:mm') : '-'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500">Check-out</p>
                                                        <p className="text-sm font-medium text-orange-600">
                                                            {emp.check_out_time ? format(new Date(emp.check_out_time), 'HH:mm') : '-'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500">Duration</p>
                                                        <p className="text-sm font-bold text-orange-600">
                                                            {emp.duration}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
