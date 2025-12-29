import { useState, useEffect } from 'react';
import { X, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface CreateReviewModalProps {
    onClose: () => void;
}

export function CreateReviewModal({ onClose }: CreateReviewModalProps) {
    const { organization, profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [goals, setGoals] = useState<any[]>([]);
    const [rating, setRating] = useState(0);

    const [formData, setFormData] = useState({
        employee_id: '',
        goal_id: '',
        review_cycle: 'Quarterly',
        review_period: '',
        rating: 0,
        overall_feedback: '',
        strengths: '',
        areas_for_improvement: '',
        goals_met: false
    });

    useEffect(() => {
        if (organization?.id) {
            loadEmployees();
        }
    }, [organization?.id]);

    useEffect(() => {
        if (formData.employee_id) {
            loadEmployeeGoals(formData.employee_id);
        }
    }, [formData.employee_id]);

    const loadEmployees = async () => {
        if (!organization?.id) return;
        try {
            const { data } = await supabase
                .from('employees')
                .select('id, first_name, last_name')
                .eq('organization_id', organization.id)
                .eq('is_active', true)
                .order('first_name');

            setEmployees(data || []);
        } catch (err) {
            console.error('Error loading employees:', err);
        }
    };

    const loadEmployeeGoals = async (employeeId: string) => {
        try {
            const { data } = await supabase
                .from('goals')
                .select('id, title, status')
                .eq('employee_id', employeeId)
                .order('created_at', { ascending: false });

            setGoals(data || []);
        } catch (err) {
            console.error('Error loading goals:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await (supabase
                .from('performance_reviews' as any) as any)
                .insert({
                    organization_id: organization!.id,
                    employee_id: formData.employee_id,
                    goal_id: formData.goal_id || null,
                    reviewer_id: profile?.employee_id || null, // Must be an employee ID or null
                    review_type: formData.review_cycle.toLowerCase() === 'mid-year' ? 'half_yearly' : formData.review_cycle.toLowerCase(),
                    review_period: formData.review_period,
                    overall_rating: rating,
                    final_rating: rating, // Set both for compatibility
                    manager_assessment: formData.overall_feedback,
                    feedback: formData.overall_feedback, // Set both for compatibility
                    strengths: formData.strengths,
                    areas_for_improvement: formData.areas_for_improvement,
                    goals_met: formData.goals_met,
                    reviewed_at: new Date().toISOString(),
                    status: 'completed' // Matches database CHECK constraint (lowercase)
                });

            if (error) throw error;
            onClose();
        } catch (err) {
            console.error('Error creating review:', err);
            alert('Failed to create review. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-6 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Create Performance Review</h2>
                        <p className="text-amber-100 text-sm mt-1">Evaluate employee performance and provide feedback</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Employee Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Employee *</label>
                        <select
                            required
                            value={formData.employee_id}
                            onChange={e => setFormData({ ...formData, employee_id: e.target.value, goal_id: '' })}
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                        >
                            <option value="">Select Employee</option>
                            {employees.map(e => (
                                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Goal Selection */}
                    {formData.employee_id && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Goal (Optional)</label>
                            <select
                                value={formData.goal_id}
                                onChange={e => setFormData({ ...formData, goal_id: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            >
                                <option value="">General Review (No specific goal)</option>
                                {goals.map(goal => (
                                    <option key={goal.id} value={goal.id}>
                                        {goal.title} ({goal.status})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Review Cycle and Period */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Review Cycle *</label>
                            <select
                                required
                                value={formData.review_cycle}
                                onChange={e => setFormData({ ...formData, review_cycle: e.target.value })}
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            >
                                <option value="Quarterly">Quarterly</option>
                                <option value="Annual">Annual</option>
                                <option value="Mid-Year">Mid-Year</option>
                                <option value="Probation">Probation</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Review Period *</label>
                            <input
                                type="text"
                                required
                                value={formData.review_period}
                                onChange={e => setFormData({ ...formData, review_period: e.target.value })}
                                placeholder="e.g., Q1 2025"
                                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Rating (1-5) *</label>
                        <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => {
                                        setRating(star);
                                        setFormData({ ...formData, rating: star });
                                    }}
                                    className="focus:outline-none hover:scale-110 transition-transform"
                                >
                                    <Star
                                        className={`h-10 w-10 ${star <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                                            }`}
                                    />
                                </button>
                            ))}
                            <span className="ml-4 text-2xl font-bold text-amber-600">{rating}/5</span>
                        </div>
                    </div>

                    {/* Overall Feedback */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Overall Feedback *</label>
                        <textarea
                            required
                            value={formData.overall_feedback}
                            onChange={e => setFormData({ ...formData, overall_feedback: e.target.value })}
                            placeholder="Provide general performance feedback..."
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                        />
                    </div>

                    {/* Strengths */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Strengths</label>
                        <textarea
                            value={formData.strengths}
                            onChange={e => setFormData({ ...formData, strengths: e.target.value })}
                            placeholder="What are the employee's key strengths?"
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                        />
                    </div>

                    {/* Areas for Improvement */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Areas for Improvement</label>
                        <textarea
                            value={formData.areas_for_improvement}
                            onChange={e => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                            placeholder="What areas need development?"
                            rows={3}
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                        />
                    </div>

                    {/* Goals Met Checkbox */}
                    <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.goals_met}
                                onChange={e => setFormData({ ...formData, goals_met: e.target.checked })}
                                className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
                            />
                            <span className="text-sm font-semibold text-slate-700">Goals Met</span>
                        </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || rating === 0}
                            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl hover:from-amber-600 hover:to-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
                        >
                            {loading ? 'Creating...' : 'Create Review'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
