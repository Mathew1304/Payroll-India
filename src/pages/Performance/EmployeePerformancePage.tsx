import { useState, useEffect } from 'react';
import { Target, CheckCircle, AlertCircle, TrendingUp, Star, MoreVertical, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { GoalDetailModal } from '../../components/Performance/GoalDetailModal';

interface Goal {
    id: string;
    title: string;
    description: string;
    goal_type: string;
    status: string;
    progress_percentage: number;
    start_date: string;
    end_date: string;
    created_at: string;
}

interface Review {
    id: string;
    review_period_start: string;
    review_period_end: string;
    final_rating: number;
    manager_assessment: string;
    strengths?: string;
    areas_of_improvement?: string;
    reviewed_at: string;
    reviewer: {
        first_name: string;
        last_name: string;
    };
}

export function EmployeePerformancePage() {
    const { profile, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [stats, setStats] = useState({
        activeGoals: 0,
        completed: 0,
        overdue: 0,
        avgProgress: 0,
        avgRating: 0
    });

    useEffect(() => {
        if (!authLoading) {
            if (profile?.employee_id) {
                loadData();
            } else {
                setLoading(false);
            }
        }
    }, [profile?.employee_id, authLoading]);

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadGoals(),
                loadReviews()
            ]);
        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadGoals = async () => {
        if (!profile?.employee_id) return;

        try {
            const { data, error } = await supabase
                .from('goals')
                .select('*')
                .eq('employee_id', profile.employee_id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const goalsData = (data || []) as Goal[];
            setGoals(goalsData);

            // Calculate stats
            const active = goalsData.filter(g => g.status === 'in_progress').length;
            const completed = goalsData.filter(g => g.status === 'completed').length;
            const today = new Date();
            const overdue = goalsData.filter(g =>
                g.status === 'in_progress' && new Date(g.end_date) < today
            ).length;
            const avgProgress = goalsData.length > 0
                ? goalsData.reduce((sum, g) => sum + (g.progress_percentage || 0), 0) / goalsData.length
                : 0;

            setStats(prev => ({
                ...prev,
                activeGoals: active,
                completed,
                overdue,
                avgProgress: Math.round(avgProgress)
            }));
        } catch (error) {
            console.error('Error loading goals:', error);
        }
    };

    const loadReviews = async () => {
        if (!profile?.employee_id) return;

        try {
            const { data, error } = await supabase
                .from('performance_reviews')
                .select(`
          *,
          reviewer:employees!reviewer_id(first_name, last_name)
        `)
                .eq('employee_id', profile.employee_id)
                .order('reviewed_at', { ascending: false });

            if (error) throw error;

            const reviewsData = (data || []) as Review[];
            setReviews(reviewsData);

            // Calculate average rating
            if (reviewsData.length > 0) {
                const avgRating = reviewsData.reduce((sum, r) => sum + (r.final_rating || 0), 0) / reviewsData.length;
                setStats(prev => ({ ...prev, avgRating: Math.round(avgRating * 10) / 10 }));
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-100 text-emerald-700';
            case 'in_progress': return 'bg-blue-100 text-blue-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'not_started': return 'bg-slate-100 text-slate-700';
            case 'overdue': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const handleUpdateGoalStatus = async (goalId: string, newStatus: string) => {
        try {
            // @ts-ignore - Supabase type mismatch
            const { error } = await supabase
                .from('goals')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', goalId);

            if (error) throw error;

            // Reload data to update stats and goals list
            await loadData();
        } catch (error) {
            console.error('Error updating goal status:', error);
            alert('Failed to update goal status');
        }
    };

    const handleUpdateProgress = async (goalId: string, newProgress: number) => {
        try {
            // Auto-complete if progress reaches 100%
            const status = newProgress >= 100 ? 'completed' : 'in_progress';

            // @ts-ignore - Supabase type mismatch
            const { error } = await supabase
                .from('goals')
                .update({
                    progress_percentage: newProgress,
                    status: status,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', goalId);

            if (error) throw error;

            // Reload data to update stats and goals list
            await loadData();
        } catch (error) {
            console.error('Error updating progress:', error);
            alert('Failed to update progress');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <Target className="h-8 w-8 text-blue-600" />
                    My Performance
                </h1>
                <p className="text-slate-600 mt-1">Track your goals and performance reviews</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <Target className="h-8 w-8" />
                        <span className="text-4xl font-bold">{stats.activeGoals}</span>
                    </div>
                    <h3 className="text-sm font-medium opacity-90">Active Goals</h3>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <CheckCircle className="h-8 w-8" />
                        <span className="text-4xl font-bold">{stats.completed}</span>
                    </div>
                    <h3 className="text-sm font-medium opacity-90">Completed</h3>
                </div>

                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <AlertCircle className="h-8 w-8" />
                        <span className="text-4xl font-bold">{stats.overdue}</span>
                    </div>
                    <h3 className="text-sm font-medium opacity-90">Overdue</h3>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <TrendingUp className="h-8 w-8" />
                        <span className="text-4xl font-bold">{stats.avgProgress}%</span>
                    </div>
                    <h3 className="text-sm font-medium opacity-90">Avg Progress</h3>
                </div>

                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center justify-between mb-3">
                        <Star className="h-8 w-8" />
                        <span className="text-4xl font-bold">{stats.avgRating > 0 ? stats.avgRating : 'N/A'}</span>
                    </div>
                    <h3 className="text-sm font-medium opacity-90">Avg Rating</h3>
                </div>
            </div>

            {/* My Goals Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Target className="h-5 w-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-slate-900">My Goals</h2>
                </div>

                {goals.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-block p-4 bg-slate-100 rounded-full mb-4">
                            <Target className="h-12 w-12 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-lg">No goals assigned yet</p>
                        <p className="text-slate-400 text-sm mt-2">Your manager will assign goals for you to track</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {goals.map((goal) => (
                            <div key={goal.id} className="border border-slate-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{goal.title}</h3>
                                        <p className="text-slate-600 text-sm">{goal.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Status Dropdown */}
                                        <select
                                            value={goal.status}
                                            onChange={(e) => handleUpdateGoalStatus(goal.id, e.target.value)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer border-2 ${getStatusColor(goal.status)}`}
                                        >
                                            <option value="not_started">NOT STARTED</option>
                                            <option value="in_progress">IN PROGRESS</option>
                                            <option value="completed">COMPLETED</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Start Date</p>
                                        <p className="text-sm font-medium text-slate-900">
                                            {new Date(goal.start_date).toLocaleDateString('en-GB')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Target Date</p>
                                        <p className="text-sm font-medium text-slate-900">
                                            {new Date(goal.end_date).toLocaleDateString('en-GB')}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-slate-700">Progress</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={goal.progress_percentage || 0}
                                                onChange={(e) => {
                                                    const value = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    handleUpdateProgress(goal.id, value);
                                                }}
                                                className="w-16 px-2 py-1 text-xs font-bold text-blue-600 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <span className="text-xs font-bold text-blue-600">%</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-600 h-2 rounded-full transition-all"
                                            style={{ width: `${goal.progress_percentage || 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                                    <button
                                        onClick={() => setSelectedGoalId(goal.id)}
                                        className="text-sm text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1"
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Discussion & Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Performance Reviews Section */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <Star className="h-5 w-5 text-amber-500" />
                    <h2 className="text-xl font-bold text-slate-900">Performance Reviews</h2>
                </div>

                {reviews.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="inline-block p-4 bg-slate-100 rounded-full mb-4">
                            <Star className="h-12 w-12 text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-lg">No performance reviews yet</p>
                        <p className="text-slate-400 text-sm mt-2">Your reviews will appear here once completed</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="border-2 border-slate-200 rounded-xl p-6 hover:shadow-lg transition-shadow bg-white">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                                            {new Date(review.review_period_start).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} -
                                            {new Date(review.review_period_end).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            Reviewed by: {review.reviewer?.first_name} {review.reviewer?.last_name}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        {/* Rating */}
                                        <div className="flex items-center gap-1 bg-amber-100 px-4 py-2 rounded-full">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-4 w-4 ${i < (review.final_rating || 0) ? 'text-amber-600 fill-amber-600' : 'text-amber-300'}`}
                                                />
                                            ))}
                                            <span className="text-sm font-bold text-amber-700 ml-1">{review.final_rating}/5</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Overall Feedback */}
                                <div className=" mb-4">
                                    <h4 className="text-sm font-bold text-slate-700 mb-2">Overall Feedback</h4>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                        <p className="text-sm text-slate-700 leading-relaxed">{review.manager_assessment || 'No feedback provided'}</p>
                                    </div>
                                </div>

                                {/* Strengths and Areas for Improvement */}
                                {(review.strengths || review.areas_of_improvement) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {review.strengths && (
                                            <div>
                                                <h4 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1">
                                                    <CheckCircle className="h-4 w-4" />
                                                    Strengths
                                                </h4>
                                                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                                                    <p className="text-sm text-slate-700 leading-relaxed">{review.strengths}</p>
                                                </div>
                                            </div>
                                        )}
                                        {review.areas_of_improvement && (
                                            <div>
                                                <h4 className="text-sm font-bold text-amber-700 mb-2 flex items-center gap-1">
                                                    <TrendingUp className="h-4 w-4" />
                                                    Areas for Improvement
                                                </h4>
                                                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                    <p className="text-sm text-slate-700 leading-relaxed">{review.areas_of_improvement}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <p className="text-xs text-slate-500">
                                        Reviewed on: {new Date(review.reviewed_at).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedGoalId && (
                <GoalDetailModal
                    goalId={selectedGoalId}
                    onClose={() => setSelectedGoalId(null)}
                    onUpdate={loadData}
                />
            )}
        </div>
    );
}
