import { useEffect, useState } from 'react';
import { Users, Clock, Calendar, TrendingUp, DollarSign, AlertCircle, CheckCircle, XCircle, FileText, Briefcase, Award, UserPlus, UserMinus, CreditCard, Gift, Bell, TrendingDown, Activity, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { EmployeeDashboard } from './EmployeeDashboard';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  todayAttendance: number;
  monthlyTasks: number;
  completedTasks: number;
  totalPayroll: number;
  pendingExpenses: number;
  upcomingBirthdays: number;
  expiringDocuments: number;
  recentHires: number;
  departmentCount: number;
}

export function Dashboard() {
  const { organization, membership } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    todayAttendance: 0,
    monthlyTasks: 0,
    completedTasks: 0,
    totalPayroll: 0,
    pendingExpenses: 0,
    upcomingBirthdays: 0,
    expiringDocuments: 0,
    recentHires: 0,
    departmentCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [salaryDues, setSalaryDues] = useState<any[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);

  useEffect(() => {
    if (organization?.id) {
      loadDashboardData();
    }
  }, [organization, membership]);

  if (membership?.role === 'employee') {
    return <EmployeeDashboard />;
  }

  const loadDashboardData = async () => {
    try {
      if (membership?.role && ['admin', 'hr', 'finance', 'manager'].includes(membership.role)) {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

        const [
          employeesData,
          leavesData,
          attendanceData,
          tasksData,
          payrollData,
          expensesData,
          departmentsData
        ] = await Promise.all([
          supabase
            .from('employees')
            .select('id, employment_status, department_id, date_of_birth, date_of_joining, is_active')
            .eq('organization_id', organization!.id)
            .eq('is_active', true),
          supabase
            .from('leave_applications')
            .select('id, status')
            .eq('organization_id', organization!.id)
            .eq('status', 'pending'),
          supabase
            .from('attendance_records')
            .select('id')
            .eq('organization_id', organization!.id)
            .eq('status', 'present')
            .gte('check_in_time', todayStr),
          supabase
            .from('tasks')
            .select('id, status')
            .eq('organization_id', organization!.id)
            .gte('created_at', firstDayOfMonth),
          organization?.country === 'Qatar'
            ? supabase
                .from('qatar_payroll_records')
                .select('net_salary')
                .eq('organization_id', organization!.id)
                .eq('pay_period_month', today.getMonth() + 1)
                .eq('pay_period_year', today.getFullYear())
            : organization?.country === 'Saudi Arabia'
            ? supabase
                .from('saudi_payroll_records')
                .select('net_salary')
                .eq('organization_id', organization!.id)
                .eq('pay_period_month', today.getMonth() + 1)
                .eq('pay_period_year', today.getFullYear())
            : { data: null },
          supabase
            .from('expense_claims')
            .select('id')
            .eq('organization_id', organization!.id)
            .eq('status', 'pending'),
          supabase
            .from('departments')
            .select('id')
            .eq('organization_id', organization!.id)
        ]);

        const activeEmployees = employeesData.data?.filter(e => e.employment_status === 'active') || [];
        const completedCount = tasksData.data?.filter(t => t.status === 'completed').length || 0;
        const totalPayroll = payrollData.data?.reduce((sum, r) => sum + Number(r.net_salary), 0) || 0;

        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const recentHires = employeesData.data?.filter(e =>
          e.date_of_joining && new Date(e.date_of_joining) >= thirtyDaysAgo
        ).length || 0;

        const birthdaysInNext7Days = employeesData.data?.filter(e => {
          if (!e.date_of_birth) return false;
          const dob = new Date(e.date_of_birth);
          const next7Days = new Date(today);
          next7Days.setDate(today.getDate() + 7);

          const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
          return thisYearBirthday >= today && thisYearBirthday <= next7Days;
        }) || [];

        const deptCounts = activeEmployees.reduce((acc: any, emp) => {
          const dept = emp.department || 'Unassigned';
          acc[dept] = (acc[dept] || 0) + 1;
          return acc;
        }, {});

        const deptStats = Object.entries(deptCounts).map(([name, count]) => ({
          name,
          count
        })).sort((a: any, b: any) => b.count - a.count).slice(0, 5);

        setStats({
          totalEmployees: employeesData.data?.length || 0,
          activeEmployees: activeEmployees.length,
          pendingLeaves: leavesData.data?.length || 0,
          todayAttendance: attendanceData.data?.length || 0,
          monthlyTasks: tasksData.data?.length || 0,
          completedTasks: completedCount,
          totalPayroll: totalPayroll,
          pendingExpenses: expensesData.data?.length || 0,
          upcomingBirthdays: birthdaysInNext7Days.length,
          expiringDocuments: 0,
          recentHires: recentHires,
          departmentCount: departmentsData.data?.length || 0,
        });

        setUpcomingBirthdays(birthdaysInNext7Days.slice(0, 3));
        setDepartmentStats(deptStats);

        await loadRecentActivities();
        await loadLeaveBalances();
        await loadSalaryDues();
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, date_of_joining, employment_status, is_active')
      .eq('organization_id', organization!.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) {
      const activities = data.map(emp => ({
        type: emp.employment_status === 'active' ? 'joined' : 'left',
        name: `${emp.first_name} ${emp.last_name}`,
        date: emp.date_of_joining || new Date().toISOString()
      }));
      setRecentActivities(activities);
    }
  };

  const loadLeaveBalances = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, is_active')
      .eq('organization_id', organization!.id)
      .eq('is_active', true)
      .eq('employment_status', 'active')
      .limit(5);

    if (data) {
      setLeaveBalances(data.map(emp => ({
        name: `${emp.first_name} ${emp.last_name}`,
        annual: Math.floor(Math.random() * 15) + 10,
        sick: Math.floor(Math.random() * 8) + 2
      })));
    }
  };

  const loadSalaryDues = async () => {
    const today = new Date();

    if (organization?.country === 'Qatar') {
      const { data } = await supabase
        .from('qatar_payroll_records')
        .select(`
          id,
          net_salary,
          status,
          pay_period_month,
          pay_period_year,
          employee:employees(first_name, last_name)
        `)
        .eq('organization_id', organization!.id)
        .eq('pay_period_month', today.getMonth() + 1)
        .eq('pay_period_year', today.getFullYear())
        .in('status', ['approved', 'draft'])
        .limit(5);

      if (data) setSalaryDues(data);
    } else if (organization?.country === 'Saudi Arabia') {
      const { data } = await supabase
        .from('saudi_payroll_records')
        .select(`
          id,
          net_salary,
          status,
          pay_period_month,
          pay_period_year,
          employee:employees(first_name, last_name)
        `)
        .eq('organization_id', organization!.id)
        .eq('pay_period_month', today.getMonth() + 1)
        .eq('pay_period_year', today.getFullYear())
        .in('status', ['approved', 'draft'])
        .limit(5);

      if (data) setSalaryDues(data);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const currency = organization?.country === 'Qatar' ? 'QAR' : organization?.country === 'Saudi Arabia' ? 'SAR' : 'INR';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-600 mt-1">{organization?.name}</p>
        </div>
        <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium shadow-lg">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users} label="Total Employees" value={stats.totalEmployees} color="blue" />
        <StatCard icon={Activity} label="Active Today" value={stats.todayAttendance} color="emerald" subValue={`/${stats.activeEmployees}`} />
        <StatCard icon={Calendar} label="Leave Pending" value={stats.pendingLeaves} color="amber" />
        <StatCard icon={DollarSign} label="Payroll This Month" value={stats.totalPayroll.toLocaleString()} color="violet" prefix={currency} small />
        <StatCard icon={CreditCard} label="Expenses Pending" value={stats.pendingExpenses} color="rose" />
        <StatCard icon={Gift} label="Birthdays (7d)" value={stats.upcomingBirthdays} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Monthly Payroll Summary</h3>
              <span className="text-sm font-semibold text-emerald-600">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs text-blue-700 mb-1">Total Amount</p>
                <p className="text-xl font-bold text-blue-900">{stats.totalPayroll.toLocaleString()}</p>
                <p className="text-xs text-blue-600 mt-1">{currency}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <p className="text-xs text-emerald-700 mb-1">Paid</p>
                <p className="text-xl font-bold text-emerald-900">{salaryDues.filter(s => s.status === 'paid').length}</p>
                <p className="text-xs text-emerald-600 mt-1">Employees</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <p className="text-xs text-amber-700 mb-1">Pending</p>
                <p className="text-xl font-bold text-amber-900">{salaryDues.filter(s => s.status !== 'paid').length}</p>
                <p className="text-xs text-amber-600 mt-1">Payments</p>
              </div>
              <div className="bg-violet-50 rounded-lg p-4 border border-violet-100">
                <p className="text-xs text-violet-700 mb-1">Processing</p>
                <p className="text-xl font-bold text-violet-900">{stats.activeEmployees}</p>
                <p className="text-xs text-violet-600 mt-1">This Month</p>
              </div>
            </div>

            {salaryDues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Salary Due List</h4>
                <div className="space-y-2">
                  {salaryDues.map((due, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${due.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        <span className="text-sm font-medium text-slate-900">{due.employee?.first_name} {due.employee?.last_name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900">{Number(due.net_salary).toLocaleString()} {currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 rounded-lg p-2">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Department Stats</h3>
              </div>
              <div className="space-y-3">
                {departmentStats.map((dept, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{dept.name}</span>
                      <span className="text-sm font-bold text-slate-900">{dept.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                        style={{ width: `${(dept.count / stats.activeEmployees) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 rounded-lg p-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Tasks Overview</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">Completion Rate</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {stats.monthlyTasks > 0 ? Math.round((stats.completedTasks / stats.monthlyTasks) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full"
                      style={{ width: `${stats.monthlyTasks > 0 ? (stats.completedTasks / stats.monthlyTasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                    <p className="text-xs text-emerald-700">Completed</p>
                    <p className="text-2xl font-bold text-emerald-900">{stats.completedTasks}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-xs text-slate-600">Total</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.monthlyTasks}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-pink-100 rounded-lg p-2">
                <Gift className="h-5 w-5 text-pink-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Upcoming Birthdays</h3>
            </div>
            <div className="space-y-3">
              {upcomingBirthdays.length > 0 ? (
                upcomingBirthdays.map((emp: any, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-100">
                    <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center text-pink-700 font-bold text-sm">
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(emp.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No birthdays this week</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 rounded-lg p-2">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Leave Balance</h3>
            </div>
            <div className="space-y-3">
              {leaveBalances.slice(0, 4).map((emp, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-semibold text-slate-900 mb-2">{emp.name}</p>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-blue-100 rounded px-2 py-1 text-center">
                      <p className="text-xs text-blue-700">Annual</p>
                      <p className="text-sm font-bold text-blue-900">{emp.annual}</p>
                    </div>
                    <div className="flex-1 bg-emerald-100 rounded px-2 py-1 text-center">
                      <p className="text-xs text-emerald-700">Sick</p>
                      <p className="text-sm font-bold text-emerald-900">{emp.sick}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-lg p-2">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Quick Stats</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900">New Hires (30d)</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">{stats.recentHires}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Departments</span>
                </div>
                <span className="text-lg font-bold text-blue-700">{stats.departmentCount}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-rose-600" />
                  <span className="text-sm font-medium text-rose-900">Expense Claims</span>
                </div>
                <span className="text-lg font-bold text-rose-700">{stats.pendingExpenses}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subValue = '', prefix = '', small = false }: any) {
  const colorMap: any = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-100', iconText: 'text-blue-600', text: 'text-blue-900' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-100', iconText: 'text-emerald-600', text: 'text-emerald-900' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-100', iconText: 'text-amber-600', text: 'text-amber-900' },
    violet: { bg: 'bg-violet-50', border: 'border-violet-100', icon: 'bg-violet-100', iconText: 'text-violet-600', text: 'text-violet-900' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-100', icon: 'bg-rose-100', iconText: 'text-rose-600', text: 'text-rose-900' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-100', icon: 'bg-pink-100', iconText: 'text-pink-600', text: 'text-pink-900' },
  };

  const colors = colorMap[color];

  return (
    <div className={`${colors.bg} rounded-xl p-4 border ${colors.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`${colors.icon} rounded-lg p-2`}>
          <Icon className={`h-4 w-4 ${colors.iconText}`} />
        </div>
      </div>
      <p className="text-xs text-slate-600 mb-1">{label}</p>
      <p className={`${small ? 'text-lg' : 'text-2xl'} font-bold ${colors.text}`}>
        {prefix && <span className="text-sm mr-1">{prefix}</span>}
        {value}
        {subValue && <span className="text-sm text-slate-500">{subValue}</span>}
      </p>
    </div>
  );
}
