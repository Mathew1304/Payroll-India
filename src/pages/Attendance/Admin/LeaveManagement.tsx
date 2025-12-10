import { useState, useEffect } from 'react';
import {
    Check,
    X,
    Clock,
    Calendar,
    Filter
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';

export function LeaveManagement() {
    const { organization, user } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Pending');

    useEffect(() => {
        if (organization?.id) {
            loadRequests();
        }
    }, [organization?.id, statusFilter]);

    const loadRequests = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('leave_requests')
                .select(`
          *,
          employee:employees(first_name, last_name, department:departments(name))
        `)
                .eq('organization_id', organization!.id)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'All') {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setRequests(data || []);
        } catch (err) {
            console.error('Error loading leave requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'Approved' | 'Rejected') => {
        if (!confirm(`Are you sure you want to mark this request as ${action}?`)) return;

        try {
            const { error } = await supabase
                .from('leave_requests')
                .update({
                    status: action,
                    reviewed_by: user?.id,
                    reviewed_at: new Date().toISOString()
                } as any)
                .eq('id', id);

            if (error) throw error;
            loadRequests();
        } catch (err) {
            console.error('Error updating leave request:', err);
            alert('Failed to update request');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-slate-900">Leave Requests</h2>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border-none bg-transparent text-sm font-medium text-slate-600 focus:ring-0 cursor-pointer"
                    >
                        <option value="Pending">Pending Requests</option>
                        <option value="Approved">Approved History</option>
                        <option value="Rejected">Rejected History</option>
                        <option value="All">All Requests</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">Loading requests...</div>
                ) : requests.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No Requests Found</h3>
                        <p className="text-slate-500">There are no leave requests matching your filter.</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div key={req.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                                        {req.employee?.first_name?.[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">
                                            {req.employee?.first_name} {req.employee?.last_name}
                                        </h3>
                                        <p className="text-slate-500 text-sm mb-2">{req.employee?.department?.name}</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                {req.leave_type}
                                            </span>
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-slate-400" />
                                                <span>
                                                    {format(new Date(req.start_date), 'MMM dd')} - {format(new Date(req.end_date), 'MMM dd, yyyy')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                <span>{req.total_days} days</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between items-end gap-4 min-w-[200px]">
                                    <div className="text-right">
                                        <span className="text-xs text-slate-400">Applied on</span>
                                        <p className="text-sm font-medium text-slate-700">
                                            {format(new Date(req.created_at), 'MMM dd, yyyy')}
                                        </p>
                                    </div>

                                    {req.status === 'Pending' && (
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <button
                                                onClick={() => handleAction(req.id, 'Rejected')}
                                                className="flex-1 md:flex-none px-4 py-2 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <X className="h-4 w-4" />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'Approved')}
                                                className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Check className="h-4 w-4" />
                                                Approve
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-sm text-slate-600">
                                    <span className="font-medium text-slate-900">Reason: </span>
                                    {req.reason}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
