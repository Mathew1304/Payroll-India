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
    AlertTriangle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

export function AttendanceDashboard() {
    const { organization } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        present: 0,
        absent: 0,
        late: 0,
        inOffice: 0,
        remote: 0,
        totalEmployees: 0,
        activeLocations: 0
    });

    useEffect(() => {
        if (organization?.id) {
            loadDashboardStats();
        }
    }, [organization?.id]);

    const loadDashboardStats = async () => {
        setLoading(true);
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. Get Attendance Records for Today
            const { data: attendanceData } = await supabase
                .from('attendance_records')
                .select('status, work_type')
                .eq('organization_id', organization!.id)
                .eq('date', today);

            // 2. Get Total Active Employees
            const { count: employeeCount } = await supabase
                .from('employees')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organization!.id)
                .eq('is_active', true);

            // 3. Get Active Locations
            const { count: locationCount } = await supabase
                .from('office_locations')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', organization!.id)
                .eq('is_active', true);

            const records = attendanceData || [];

            setStats({
                present: records.filter(r => r.status === 'Present' || r.status === 'Late').length,
                absent: records.filter(r => r.status === 'Absent').length,
                late: records.filter(r => r.status === 'Late').length,
                inOffice: records.filter(r => r.work_type === 'In Office').length,
                remote: records.filter(r => r.work_type === 'Remote').length,
                totalEmployees: employeeCount || 0,
                activeLocations: locationCount || 0
            });

        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, subtext }: any) => (
        <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden`}>
            <div className={`absolute top-0 right-0 p-4 opacity-10`}>
                <Icon className={`h-24 w-24 text-${color}-500`} />
            </div>
            <div className="relative z-10">
                <div className={`h-12 w-12 rounded-lg bg-${color}-100 flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 text-${color}-600`} />
                </div>
                <p className="text-slate-500 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
                {subtext && <p className="text-xs text-slate-400 mt-2">{subtext}</p>}
            </div>
        </div>
    );

    if (loading) return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;

    return (
        <div className="space-y-6">
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
        </div>
    );
}
