import { useEffect, useState } from 'react';
import { Calendar, FileText, Clock, CheckCircle, XCircle, Users, TrendingUp, Settings, Download, Filter, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface LeaveStats {
    totalRequests: number;
    pending: number;
    approved: number;
    rejected: number;
    onLeaveToday: number;
    upcoming: number;
}

interface LeaveType {
    id: string;
    name: string;
    code: string;
    color: string;
    yearly_quota: number;
    min_notice_days: number;
    max_consecutive: number;
    allow_half_day: boolean;
    carry_forward: boolean;
    max_cf_days: number;
    is_active: boolean;
}

interface LeaveApplication {
    id: string;
    employee_id: string;
    from_date: string;
    to_date: string;
    total_days: number;
    status: string;
    applied_date: string;
    employees: {
        first_name: string;
        last_name: string;
        employee_code: string;
    };
    leave_types: {
        name: string;
        code: string;
    };
}

export function AdminLeavePage() {
    const { organization } = useAuth();
    const [stats, setStats] = useState<LeaveStats>({
        totalRequests: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        onLeaveToday: 0,
        upcoming: 0
    });
    const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
    const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
    const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
    const [leaveDistribution, setLeaveDistribution] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'All Status',
        leaveType: 'All Types',
        department: 'All Departments',
        fromDate: '',
        toDate: ''
    });

    useEffect(() => {
        loadData();
    }, [organization]);

    const loadData = async () => {
        try {
            await Promise.all([
                loadStats(),
                loadLeaveTypes(),
                loadLeaveApplications(),
                loadMonthlyTrends(),
                loadLeaveDistribution()
            ]);
        } catch (error) {
            console.error('Error loading leave data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        if (!organization?.id) return;

        try {
            const { data: applications } = await supabase
                .from('leave_applications')
                .select('*')
                .order('applied_date', { ascending: false });

            const today = new Date().toISOString().split('T')[0];

            setStats({
                totalRequests: applications?.length || 0,
                pending: applications?.filter(a => a.status === 'pending').length || 0,
                approved: applications?.filter(a => a.status === 'approved').length || 0,
                rejected: applications?.filter(a => a.status === 'rejected').length || 0,
                onLeaveToday: applications?.filter(a =>
                    a.status === 'approved' &&
                    a.from_date <= today &&
                    a.to_date >= today
                ).length || 0,
                upcoming: applications?.filter(a =>
                    a.status === 'approved' &&
                    a.from_date > today
                ).length || 0
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const loadLeaveTypes = async () => {
        if (!organization?.id) return;

        try {
            const { data } = await supabase
                .from('leave_types')
                .select('*')
                .eq('organization_id', organization.id)
                .order('name');

            setLeaveTypes(data || []);
        } catch (error) {
            console.error('Error loading leave types:', error);
        }
    };

    const loadLeaveApplications = async () => {
        if (!organization?.id) return;

        try {
            const { data } = await supabase
                .from('leave_applications')
                .select(`
          *,
          employees (first_name, last_name, employee_code),
          leave_types (name, code)
        `)
                .order('applied_date', { ascending: false })
                .limit(100);

            setLeaveApplications(data || []);
        } catch (error) {
            console.error('Error loading applications:', error);
        }
    };

    const loadMonthlyTrends = async () => {
        // Mock data for now - implement actual query
        const months = ['Jul 2025', 'Aug 2025', 'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025'];
        const data = months.map((month, idx) => ({
            month,
            count: idx === 4 ? 8 : Math.floor(Math.random() * 3)
        }));
        setMonthlyTrends(data);
    };

    const loadLeaveDistribution = async () => {
        if (!organization?.id) return;

        try {
            const { data: applications } = await supabase
                .from('leave_applications')
                .select(`
          leave_type_id,
          leave_types (name, code)
        `);

            const distribution = applications?.reduce((acc: any, app: any) => {
                const typeName = app.leave_types?.name || 'Unknown';
                acc[typeName] = (acc[typeName] || 0) + 1;
                return acc;
            }, {});

            const distributionArray = Object.entries(distribution || {}).map(([name, count]) => ({
                name,
                count
            }));

            setLeaveDistribution(distributionArray);
        } catch (error) {
            console.error('Error loading distribution:', error);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: { [key: string]: string } = {
            pending: 'bg-amber-100 text-amber-700',
            approved: 'bg-emerald-100 text-emerald-700',
            rejected: 'bg-red-100 text-red-700',
        };
        return badges[status] || badges.pending;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                        Leave Analytics Dashboard
                    </h1>
                    <p className="text-slate-600 mt-1">Complete life-level view of all leave activities</p>
                </div>
                <div className="flex gap-3">
                    <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm">
                        <option>All Departments</option>
                    </select>
                    <select className="px-4 py-2 border border-slate-300 rounded-lg text-sm">
                        <option>All Employees</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard
                    title="Total Requests"
                    value={stats.totalRequests}
                    subtitle="All time"
                    icon={FileText}
                    color="blue"
                />
                <StatCard
                    title="Pending"
                    value={stats.pending}
                    subtitle="Pending approval"
                    icon={Clock}
                    color="orange"
                />
                <StatCard
                    title="Approved"
                    value={stats.approved}
                    subtitle="Granted leaves"
                    icon={CheckCircle}
                    color="green"
                />
                <StatCard
                    title="Rejected"
                    value={stats.rejected}
                    subtitle="Declined rejects"
                    icon={XCircle}
                    color="red"
                />
                <StatCard
                    title="On Leave Today"
                    value={stats.onLeaveToday}
                    subtitle="Currently away"
                    icon={Calendar}
                    color="purple"
                />
                <StatCard
                    title="Upcoming"
                    value={stats.upcoming}
                    subtitle="Scheduled leaves"
                    icon={Users}
                    color="cyan"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <div>
                            <h3 className="font-bold text-slate-900">Monthly Leave Trends</h3>
                            <p className="text-xs text-slate-500">Last 6 months leave statistics</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {monthlyTrends.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <span className="text-xs text-slate-600 w-20">{item.month}</span>
                                <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full flex items-center justify-end pr-2"
                                        style={{ width: `${(item.count / 10) * 100}%` }}
                                    >
                                        {item.count > 0 && (
                                            <span className="text-xs font-bold text-white">{item.count}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Leave Type Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <div>
                            <h3 className="font-bold text-slate-900">Leave Type Distribution</h3>
                            <p className="text-xs text-slate-500">Breakdown by leave type</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {leaveDistribution.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-32 bg-slate-100 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${(item.count / Math.max(...leaveDistribution.map(d => d.count))) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 w-8 text-right">{item.count}</span>
                                </div>
                            </div>
                        ))}
                        {leaveDistribution.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">No data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Leave Configuration */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-purple-600" />
                        <div>
                            <h3 className="font-bold text-slate-900">Leave Configuration</h3>
                            <p className="text-xs text-slate-500">Manage leave types and policies</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
                        + Create Leave Type
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Leave Type</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Code</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Yearly Quota</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Min Notice Days</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Max Consecutive</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Allow Half Day</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Carry Forward</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Max CF Days</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Configure</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaveTypes.map((type) => (
                                <tr key={type.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                        <span className="text-sm font-medium text-blue-600">{type.name}</span>
                                        <span className="ml-2 text-xs text-slate-500">Global</span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-700">{type.code}</td>
                                    <td className="py-3 px-4 text-sm text-slate-700">{type.yearly_quota} days</td>
                                    <td className="py-3 px-4 text-sm text-slate-700">{type.min_notice_days} days</td>
                                    <td className="py-3 px-4 text-sm text-slate-700">{type.max_consecutive} days</td>
                                    <td className="py-3 px-4 text-sm text-slate-700">{type.allow_half_day ? 'Yes' : 'No'}</td>
                                    <td className="py-3 px-4 text-sm text-slate-700">{type.carry_forward ? 'Yes' : 'No'}</td>
                                    <td className="py-3 px-4 text-sm text-slate-700">{type.max_cf_days || '-'}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${type.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                            {type.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <button className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700">
                                            Configure
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* All Leave Requests */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                            <h3 className="font-bold text-slate-900">All Leave Requests</h3>
                            <p className="text-xs text-slate-500">Organization-wide leave applications</p>
                        </div>
                    </div>
                    <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>

                {/* Advanced Filters */}
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-semibold text-slate-700">Advanced Filters</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                            <option>All Status</option>
                            <option>Pending</option>
                            <option>Approved</option>
                            <option>Rejected</option>
                        </select>
                        <select
                            value={filters.leaveType}
                            onChange={(e) => setFilters({ ...filters, leaveType: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                            <option>All Types</option>
                            {leaveTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                        <select
                            value={filters.department}
                            onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        >
                            <option>All Departments</option>
                        </select>
                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                            placeholder="dd-mm-yyyy"
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
                            placeholder="dd-mm-yyyy"
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
                            Apply
                        </button>
                        <button className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50">
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Employee</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Department</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Type</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">From</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">To</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Days</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaveApplications.map((app) => (
                                <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900">
                                        {app.employees?.first_name} {app.employees?.last_name}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-700">IT</td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                            {app.leave_types?.code}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-700">
                                        {new Date(app.from_date).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-700">
                                        {new Date(app.to_date).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-semibold text-slate-900">{app.total_days}</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${getStatusBadge(app.status)}`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-700">-</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
    const colors: { [key: string]: string } = {
        blue: 'from-blue-500 to-blue-600',
        orange: 'from-orange-500 to-orange-600',
        green: 'from-emerald-500 to-emerald-600',
        red: 'from-red-500 to-red-600',
        purple: 'from-purple-500 to-purple-600',
        cyan: 'from-cyan-500 to-cyan-600',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-xs text-slate-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color]}`}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
            </div>
            <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
    );
}
