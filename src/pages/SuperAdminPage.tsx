import { ErrorLogsTable } from '../components/SuperAdmin/ErrorLogsTable';
import { Shield, Building2, Users } from 'lucide-react';

export function SuperAdminPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Super Admin Dashboard</h1>
                    <p className="text-slate-600 mt-1">System monitoring and oversight</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium border border-purple-200">
                    <Shield className="h-4 w-4" />
                    <span>Super Admin Access</span>
                </div>
            </div>

            {/* Quick Stats Row (Placeholder for future stats) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">--</h3>
                    <p className="text-sm text-slate-500">Active Organizations</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Users className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+5%</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">--</h3>
                    <p className="text-sm text-slate-500">Total Users</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    {/* Placeholder for now */}
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                        More stats coming soon
                    </div>
                </div>
            </div>

            {/* Error Logs Section */}
            <div className="mt-8">
                <h2 className="text-lg font-bold text-slate-900 mb-4">System Error Logs</h2>
                <ErrorLogsTable />
            </div>
        </div>
    );
}
