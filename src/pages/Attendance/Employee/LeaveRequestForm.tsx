import { useState } from 'react';
import {
    Calendar,
    Send,
    AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { parseISO } from 'date-fns';

export function LeaveRequestForm() {
    const { user, organization } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        leave_type: 'Sick Leave',
        start_date: '',
        end_date: '',
        reason: ''
    });

    const calculateDays = () => {
        if (!formData.start_date || !formData.end_date) return 0;
        const start = parseISO(formData.start_date);
        const end = parseISO(formData.end_date);
        if (end < start) return 0;
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.start_date || !formData.end_date || !formData.reason) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            const totalDays = calculateDays();

            const payload = {
                organization_id: organization!.id,
                employee_id: user!.id,
                leave_type: formData.leave_type,
                start_date: formData.start_date,
                end_date: formData.end_date,
                total_days: totalDays,
                reason: formData.reason,
                status: 'Pending'
            };

            const { error } = await supabase
                .from('leave_requests')
                .insert([payload] as any);

            if (error) throw error;

            alert('Leave request submitted successfully');
            setFormData({
                leave_type: 'Sick Leave',
                start_date: '',
                end_date: '',
                reason: ''
            });
        } catch (err) {
            console.error('Error submitting leave request:', err);
            alert('Failed to submit leave request');
        } finally {
            setLoading(false);
        }
    };

    const totalDays = calculateDays();

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-900">Request Leave</h2>
                    <p className="text-sm text-slate-500">Submit a new leave request for approval</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Leave Type *</label>
                        <select
                            value={formData.leave_type}
                            onChange={e => setFormData({ ...formData, leave_type: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="Sick Leave">Sick Leave</option>
                            <option value="Casual Leave">Casual Leave</option>
                            <option value="Vacation">Vacation</option>
                            <option value="Maternity">Maternity Leave</option>
                            <option value="Paternity">Paternity Leave</option>
                            <option value="Unpaid Leave">Unpaid Leave</option>
                            <option value="Compensatory Off">Compensatory Off</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                            <input
                                type="date"
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                min={formData.start_date}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {totalDays > 0 && (
                        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>Total Duration: <strong>{totalDays} days</strong></span>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                        <textarea
                            value={formData.reason}
                            onChange={e => setFormData({ ...formData, reason: e.target.value })}
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Please provide a reason for your leave request..."
                        />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            <Send className="h-4 w-4" />
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                    <h4 className="font-medium text-yellow-800">Note</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                        Leave requests are subject to approval by your manager. You will be notified once your request is reviewed.
                    </p>
                </div>
            </div>
        </div>
    );
}
