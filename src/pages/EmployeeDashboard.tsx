import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Sparkles, Clock, Calendar, LogIn, LogOut, TrendingUp, Activity, Zap, IndianRupee } from 'lucide-react';
import { format, parseISO, differenceInHours, differenceInMinutes } from 'date-fns';

interface AttendanceRecord {
  id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number | null;
  status: string;
  work_type: string | null;
}

interface EmployeeDashboardProps {
  onNavigate: (page: string) => void;
}

export function EmployeeDashboard({ onNavigate }: EmployeeDashboardProps) {
  const { user, profile } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.employee_id) {
      loadDashboardData();
    }
  }, [profile]);

  const loadDashboardData = async () => {
    if (!profile?.employee_id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch today's attendance
      const { data: todayData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .eq('date', today)
        .single();

      setTodayAttendance(todayData);

      // Fetch last 7 days attendance
      const { data: recentData } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .gte('date', sevenDaysAgo)
        .order('date', { ascending: false })
        .limit(7);

      setRecentAttendance(recentData || []);

      // Fetch leave balance
      const currentYear = new Date().getFullYear();
      const { data: balanceData } = await supabase
        .from('leave_balances')
        .select('closing_balance')
        .eq('employee_id', profile.employee_id)
        .eq('year', currentYear);

      // @ts-ignore
      const totalBalance = balanceData?.reduce((sum, record) => sum + (Number(record.closing_balance) || 0), 0) || 0;
      setLeaveBalance(totalBalance);

    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return 'Not checked in';
    try {
      return format(parseISO(timeString), 'hh:mm a');
    } catch {
      return timeString;
    }
  };

  const calculateHoursWorked = (checkIn: string | null, checkOut: string | null) => {
    if (!checkIn) return '0h 0m';
    if (!checkOut) {
      // Calculate hours from check-in to now
      const now = new Date();
      const checkInDate = parseISO(checkIn);
      const hours = differenceInHours(now, checkInDate);
      const minutes = differenceInMinutes(now, checkInDate) % 60;
      return `${hours}h ${minutes}m`;
    }
    const checkInDate = parseISO(checkIn);
    const checkOutDate = parseISO(checkOut);
    const hours = differenceInHours(checkOutDate, checkInDate);
    const minutes = differenceInMinutes(checkOutDate, checkInDate) % 60;
    return `${hours}h ${minutes}m`;
  };

  const totalHoursThisWeek = recentAttendance.reduce((sum, record) => {
    return sum + (record.total_hours || 0);
  }, 0);

  const avgHoursPerDay = recentAttendance.length > 0
    ? (totalHoursThisWeek / recentAttendance.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.user_metadata?.first_name || 'Employee'}!
            </h1>
            <p className="text-blue-100 text-lg">
              Here's what's happening today.
            </p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
            <Sparkles className="h-8 w-8 text-yellow-300" />
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Attendance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Clock className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Attendance Today</p>
              <h3 className="text-xl font-bold text-slate-900">
                {loading ? 'Loading...' : todayAttendance?.check_in_time ? 'Checked In' : 'Not Checked In'}
              </h3>
            </div>
          </div>
          {!loading && todayAttendance && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 flex items-center gap-1">
                  <LogIn className="h-4 w-4" /> Check-in
                </span>
                <span className="font-semibold text-emerald-600">
                  {formatTime(todayAttendance.check_in_time)}
                </span>
              </div>
              {todayAttendance.check_out_time && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-1">
                    <LogOut className="h-4 w-4" /> Check-out
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatTime(todayAttendance.check_out_time)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Hours Worked</span>
                  <span className="font-bold text-indigo-600">
                    {calculateHoursWorked(todayAttendance.check_in_time, todayAttendance.check_out_time)}
                  </span>
                </div>
              </div>
            </div>
          )}
          {!loading && !todayAttendance && (
            <p className="text-sm text-slate-500">No attendance record for today</p>
          )}
        </div>

        {/* Weekly Hours */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-violet-50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">This Week</p>
              <h3 className="text-xl font-bold text-slate-900">{totalHoursThisWeek.toFixed(1)}h</h3>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Average: <span className="font-semibold text-violet-600">{avgHoursPerDay}h/day</span>
          </p>
        </div>

        {/* Leave Balance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Leave Balance</p>
              <h3 className="text-xl font-bold text-slate-900">{leaveBalance} Days</h3>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Remaining annual leave balance.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="h-6 w-6 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => {
              console.log('Navigating to Leave');
              onNavigate('leave');
            }}
            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl hover:shadow-md transition-all hover:scale-105 group cursor-pointer"
          >
            <div className="p-3 bg-emerald-500 rounded-xl group-hover:bg-emerald-600 transition-colors pointer-events-none">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 pointer-events-none">Apply Leave</span>
          </button>

          <button
            type="button"
            onClick={() => {
              console.log('Navigating to Payroll');
              onNavigate('payroll');
            }}
            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl hover:shadow-md transition-all hover:scale-105 group cursor-pointer"
          >
            <div className="p-3 bg-indigo-500 rounded-xl group-hover:bg-indigo-600 transition-colors pointer-events-none">
              <IndianRupee className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 pointer-events-none">View Payslips</span>
          </button>


          <button
            type="button"
            onClick={() => {
              console.log('Navigating to Attendance');
              onNavigate('attendance');
            }}
            className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl hover:shadow-md transition-all hover:scale-105 group cursor-pointer"
          >
            <div className="p-3 bg-violet-500 rounded-xl group-hover:bg-violet-600 transition-colors pointer-events-none">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-900 pointer-events-none">Check Attendance</span>
          </button>
        </div>
      </div>

      {/* Login Insights - Last 7 Days */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-6 w-6 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">Login Insights - Last 7 Days</h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading...</div>
        ) : recentAttendance.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No attendance records for the last 7 days
          </div>
        ) : (
          <div className="space-y-3">
            {recentAttendance.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg">
                    <Calendar className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {format(parseISO(record.date), 'EEEE, MMM dd')}
                    </p>
                    <p className="text-sm text-slate-500">
                      {record.work_type || 'In Office'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Check-in</p>
                    <p className="font-semibold text-emerald-600">
                      {formatTime(record.check_in_time)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Check-out</p>
                    <p className="font-semibold text-red-600">
                      {formatTime(record.check_out_time)}
                    </p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-xs text-slate-500">Hours</p>
                    <p className="font-bold text-indigo-600">
                      {record.total_hours ? `${record.total_hours.toFixed(1)}h` : calculateHoursWorked(record.check_in_time, record.check_out_time)}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${record.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                    record.status === 'Late' ? 'bg-amber-100 text-amber-700' :
                      record.status === 'Absent' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                    }`}>
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
