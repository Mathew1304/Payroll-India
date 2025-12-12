import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CreateReviewModalProps {
    onClose: () => void;
}

export function CreateReviewModal({ onClose }: CreateReviewModalProps) {
    const { organization, membership } = useAuth();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        employee_id: '',
        review_type: 'Annual',
        review_period_start: '',
        review_period_end: ''
    });

    useEffect(() => {
        if (organization?.id) {
            loadEmployees();
        }
    }, [organization?.id]);

    const loadEmployees = async () => {
        try {
            const { data } = await supabase
                .from('employees')
                .select('id, first_name, last_name, department_id')
                .eq('is_active', true)
                .order('first_name');

            setEmployees(data || []);
        } catch (err) {
            console.error('Error loading employees:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Admins without employee_id can create reviews, reviewer_id will be null
            const { error } = await supabase
                .from('performance_reviews')
                .insert({
                    organization_id: organization!.id,
                    reviewer_id: membership?.employee_id || null,
                    ...formData,
                    status: 'Draft'
                });

            if (error) throw error;

            onClose();
            // Ideally trigger refresh
        } catch (err) {
            console.error('Error creating review:', err);
            alert('Failed to create review. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">New Performance Review</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Employee *</label>
                        <select
                            required
                            value={formData.employee_id}
                            onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Review Type *</label>
                        <select
                            required
                            value={formData.review_type}
                            onChange={e => setFormData({ ...formData, review_type: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        >
                            <option value="Annual">Annual Review</option>
                            <option value="Mid-Year">Mid-Year Review</option>
                            <option value="Quarterly">Quarterly Review</option>
                            <option value="Probation">Probation Review</option>
                            <option value="Project-Based">Project-Based Review</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Period Start *</label>
                            <input
                                type="date"
                                required
                                value={formData.review_period_start}
                                onChange={e => setFormData({ ...formData, review_period_start: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Period End *</label>
                            <input
                                type="date"
                                required
                                min={formData.review_period_start}
                                value={formData.review_period_end}
                                onChange={e => setFormData({ ...formData, review_period_end: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Start Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
