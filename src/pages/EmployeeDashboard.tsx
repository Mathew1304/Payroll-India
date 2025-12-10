import { useAuth } from '../contexts/AuthContext';
import { Sparkles, Clock, Calendar, CheckSquare } from 'lucide-react';

export function EmployeeDashboard() {
  const { user, profile, membership } = useAuth();

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Clock className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Attendance</p>
              <h3 className="text-xl font-bold text-slate-900">Checked In</h3>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            You checked in at 09:00 AM today.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-violet-50 rounded-xl">
              <CheckSquare className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">My Tasks</p>
              <h3 className="text-xl font-bold text-slate-900">3 Pending</h3>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            You have 3 tasks due this week.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Leave Balance</p>
              <h3 className="text-xl font-bold text-slate-900">12 Days</h3>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Remaining annual leave balance.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-slate-500">
          No recent activity to show.
        </div>
      </div>
    </div>
  );
}
