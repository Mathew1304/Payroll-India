import { useState, useEffect } from 'react';
import { Target, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface PerformanceDashboardProps {
    departmentId?: string;
    employeeId?: string;
}

export function PerformanceDashboard({ departmentId, employeeId }: PerformanceDashboardProps) {
    const { organization } = useAuth();
    const [stats, setStats] = useState({
        activeGoals: 0,
        completedGoals: 0,
        totalGoals: 0,
        overdueGoals: 0,
        avgPerformance: 0,
        totalReviews: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (organization?.id) {
            loadStats();
        }
    }, [organization?.id, departmentId, employeeId]);

    const loadStats = async () => {
        setLoading(true);
        try {
            // Build queries
            let goalsQuery = supabase
                .from('goals')
                .select('*', { count: 'exact' })
                .eq('organization_id', organization!.id);

            let reviewsQuery = supabase
                .from('performance_reviews')
                .select('overall_rating', { count: 'exact' })
                .eq('organization_id', organization!.id)
                .eq('status', 'Completed');

            // Apply filters
            if (departmentId) {
                goalsQuery = goalsQuery.eq('department_id', departmentId);
                // For reviews, we need to filter by employee's department, which might require a join or separate fetch
                // For simplicity in this dashboard view, we'll assume reviews are filtered by employeeId if present
            }
            if (employeeId) {
                goalsQuery = goalsQuery.eq('employee_id', employeeId);
                reviewsQuery = reviewsQuery.eq('employee_id', employeeId);
            }

            const [goalsRes, reviewsRes] = await Promise.all([goalsQuery, reviewsQuery]);

            const goals = goalsRes.data || [];
            const reviews = reviewsRes.data || [];

            const activeGoals = goals.filter(g => ['Not Started', 'In Progress'].includes(g.status)).length;
            const completedGoals = goals.filter(g => g.status === 'Completed').length;
            const overdueGoals = goals.filter(g => g.status === 'Overdue').length;

            const totalRating = reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0);
            const avgPerformance = reviews.length > 0 ? totalRating / reviews.length : 0;

            setStats({
                activeGoals,
                completedGoals,
                totalGoals: goals.length,
                overdueGoals,
                avgPerformance,
                totalReviews: reviews.length
            });

        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const completionRate = stats.totalGoals > 0
        ? Math.round((stats.completedGoals / stats.totalGoals) * 100)
        : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Goals */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                        <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                        Goals
                    </span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.activeGoals}</h3>
                <p className="text-sm text-slate-500">Active Goals</p>
            </div>

            {/* Completed Goals */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                        {completionRate}% Rate
                    </span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.completedGoals}</h3>
                <p className="text-sm text-slate-500">Completed Goals</p>
            </div>

            {/* Overdue Goals */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-red-100 rounded-xl">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-1 rounded-full">
                        Attention
                    </span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-1">{stats.overdueGoals}</h3>
                <p className="text-sm text-slate-500">Overdue Goals</p>
            </div>

            {/* Avg Performance */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-amber-100 rounded-xl">
                        <Star className="h-6 w-6 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                        {stats.totalReviews} Reviews
                    </span>
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-1">
                    {stats.avgPerformance > 0 ? stats.avgPerformance.toFixed(2) : 'N/A'}
                </h3>
                <p className="text-sm text-slate-500">Avg Performance</p>
            </div>
        </div>
    );
}
