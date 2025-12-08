import { useEffect, useState } from 'react';
import { User, Calendar, Clock, DollarSign, FileText, Bell, CheckCircle, AlertCircle, TrendingUp, Activity, Gift, Briefcase } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EmployeeStats {
  attendanceThisMonth: number;
  leaveBalance: number;
  pendingLeaves: number;
  tasksAssigned: number;
  tasksCompleted: number;
  lastPayslip: any;
  notifications: number;
}

export function EmployeeDashboard() {
  const { user, membership, organization } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [stats, setStats] = useState<EmployeeStats>({
    attendanceThisMonth: 0,
    leaveBalance: 0,
    pendingLeaves: 0,
    tasksAssigned: 0,
    tasksCompleted: 0,
    lastPayslip: null,
    notifications: 0,
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingHolidays, setUpcomingHolidays] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (membership?.employee_id) {
      loadEmployeeDashboard();
    }
  }, [membership]);

  const loadEmployeeDashboard = async () => {
    if (!membership?.employee_id || !organization?.id) return;

    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [
        employeeData,
        attendanceData,
        leaveBalanceData,
        pendingLeavesData,
        tasksData,
        completedTasksData,
        notificationsData,
        payrollData
      ] = await Promise.all([
        supabase
          .from('employees')
          .select('*')
          .eq('id', membership.employee_id)
          .single(),
        supabase
          .from('attendance_records')
          .select('id')
          .eq('employee_id', membership.employee_id)
          .eq('status', 'present')
          .gte('check_in_time', firstDayOfMonth),
        supabase
          .from('leave_balances')
          .select('total_balance')
          .eq('employee_id', membership.employee_id)
          .maybeSingle(),
        supabase
          .from('leave_applications')
          .select('id')
          .eq('employee_id', membership.employee_id)
          .eq('status', 'pending'),
        supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', membership.employee_id),
        supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', membership.employee_id)
          .eq('status', 'completed'),
        supabase
          .from('employee_notifications')
          .select('*')
          .eq('employee_id', membership.employee_id)
          .eq('is_read', false)
          .order('created_at', { ascending: false }),
        organization.country === 'Qatar'
          ? supabase
              .from('qatar_payroll_records')
              .select('*')
              .eq('employee_id', membership.employee_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : supabase
              .from('saudi_payroll_records')
              .select('*')
              .eq('employee_id', membership.employee_id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
      ]);

      if (employeeData.data) setEmployee(employeeData.data);

      setStats({
        attendanceThisMonth: attendanceData.data?.length || 0,
        leaveBalance: leaveBalanceData.data?.total_balance || 0,
        pendingLeaves: pendingLeavesData.data?.length || 0,
        tasksAssigned: tasksData.data?.length || 0,
        tasksCompleted: completedTasksData.data?.length || 0,
        lastPayslip: payrollData.data,
        notifications: notificationsData.data?.length || 0,
      });

      setNotifications(notificationsData.data || []);
    } catch (error) {
      console.error('Error loading employee dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('employee_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      loadEmployeeDashboard();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No Employee Profile Found</h3>
        <p className="text-slate-600">Please contact your HR administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {employee.first_name}!
            </h1>
            <p className="text-blue-100">
              {employee.designations?.title || 'Employee'} • {employee.employee_code}
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-blue-100">Today's Date</p>
              <p className="text-lg font-semibold">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 mb-1">You have {notifications.length} new notification(s)</h3>
              <p className="text-sm text-slate-600">Please review and take necessary actions</p>
            </div>
          </div>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="bg-white rounded-lg p-4 flex items-start justify-between gap-4 border border-amber-100"
              >
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">{notif.title}</h4>
                  <p className="text-sm text-slate-600">{notif.message}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => markNotificationAsRead(notif.id)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Mark Read
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Attendance This Month"
          value={stats.attendanceThisMonth}
          suffix="days"
          color="blue"
        />
        <StatCard
          icon={Calendar}
          label="Leave Balance"
          value={stats.leaveBalance}
          suffix="days"
          color="green"
        />
        <StatCard
          icon={Briefcase}
          label="Tasks Assigned"
          value={stats.tasksAssigned}
          suffix={`${stats.tasksCompleted} completed`}
          color="purple"
        />
        <StatCard
          icon={DollarSign}
          label="Last Payslip"
          value={stats.lastPayslip ? `QAR ${stats.lastPayslip.net_salary?.toLocaleString()}` : 'N/A'}
          suffix=""
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Quick Actions
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton
              icon={Calendar}
              label="Apply Leave"
              href="/leave"
            />
            <ActionButton
              icon={Clock}
              label="Attendance"
              href="/attendance"
            />
            <ActionButton
              icon={FileText}
              label="View Payslips"
              href="/payroll"
            />
            <ActionButton
              icon={User}
              label="My Profile"
              href="/profile"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Your Stats
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Pending Leave Requests</span>
              <span className="text-lg font-bold text-amber-600">{stats.pendingLeaves}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Task Completion Rate</span>
              <span className="text-lg font-bold text-blue-600">
                {stats.tasksAssigned > 0
                  ? `${Math.round((stats.tasksCompleted / stats.tasksAssigned) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-sm font-medium text-slate-700">Unread Notifications</span>
              <span className="text-lg font-bold text-red-600">{stats.notifications}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, color }: any) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <p className="text-sm font-medium text-slate-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
      {suffix && <p className="text-xs text-slate-500">{suffix}</p>}
    </div>
  );
}

function ActionButton({ icon: Icon, label, href }: any) {
  return (
    <a
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl hover:from-blue-50 hover:to-blue-100 transition-all border border-slate-200 hover:border-blue-300 group"
    >
      <div className="p-3 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow border border-slate-200">
        <Icon className="h-5 w-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors text-center">
        {label}
      </span>
    </a>
  );
}
