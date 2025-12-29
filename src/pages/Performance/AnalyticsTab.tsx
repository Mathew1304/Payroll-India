import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, PieChart, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsTabProps {
    departmentId?: string;
    employeeId?: string;
}

export function AnalyticsTab({ departmentId, employeeId }: AnalyticsTabProps) {
    const { organization } = useAuth();
    const [loading, setLoading] = useState(true);
    const [goalStats, setGoalStats] = useState<any>({});
    const [reviewStats, setReviewStats] = useState<any>({});

    useEffect(() => {
        if (organization?.id) {
            loadAnalytics();
        }
    }, [organization?.id, departmentId, employeeId]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            // 1. Goal Status Distribution
            let goalsQuery = supabase
                .from('goals')
                .select('status, department_id')
                .eq('organization_id', organization!.id);

            // 2. Review Ratings Distribution
            let reviewsQuery = supabase
                .from('performance_reviews')
                .select('overall_rating, status')
                .eq('organization_id', organization!.id)
                .eq('status', 'completed');

            if (departmentId) {
                goalsQuery = goalsQuery.eq('department_id', departmentId);
                // reviewsQuery filtering by dept would need join, skipping for simple demo
            }

            if (employeeId) {
                goalsQuery = goalsQuery.eq('employee_id', employeeId);
                reviewsQuery = reviewsQuery.eq('employee_id', employeeId);
            }

            const [goalsRes, reviewsRes] = await Promise.all([goalsQuery, reviewsQuery]);

            const goals = (goalsRes.data || []) as any[];
            const reviews = (reviewsRes.data || []) as any[];

            // Process Goals
            const goalStatusCounts = goals.reduce((acc: any, g: any) => {
                acc[g.status] = (acc[g.status] || 0) + 1;
                return acc;
            }, {});

            // Process Reviews
            const ratings = reviews.map((r: any) => r.overall_rating || 0);
            const avgRating = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;

            const ratingDistribution = {
                'Excellent (4.5-5)': ratings.filter((r: number) => r >= 4.5).length,
                'Good (3.5-4.49)': ratings.filter((r: number) => r >= 3.5 && r < 4.5).length,
                'Average (2.5-3.49)': ratings.filter((r: number) => r >= 2.5 && r < 3.5).length,
                'Needs Imp. (<2.5)': ratings.filter((r: number) => r < 2.5).length,
            };

            setGoalStats({
                total: goals.length,
                statusCounts: goalStatusCounts,
                completionRate: goals.length ? ((goalStatusCounts['completed'] || goalStatusCounts['Completed'] || 0) / goals.length * 100).toFixed(1) : 0
            });

            setReviewStats({
                total: reviews.length,
                avgRating: avgRating.toFixed(2),
                distribution: ratingDistribution
            });

        } catch (err) {
            console.error('Error loading analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-12 text-slate-500">Loading analytics...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Goal Status Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-slate-900">Goal Status Distribution</h3>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(goalStats.statusCounts || {}).map(([status, count]: [string, any]) => (
                            <div key={status}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600 capitalize">{status.replace('_', ' ')}</span>
                                    <span className="font-medium text-slate-900">{count} ({((count / goalStats.total) * 100).toFixed(0)}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                    <div
                                        className={`h-2.5 rounded-full ${status.toLowerCase() === 'completed' ? 'bg-green-500' :
                                            status.toLowerCase() === 'in_progress' ? 'bg-blue-500' :
                                                status.toLowerCase() === 'overdue' ? 'bg-red-500' :
                                                    'bg-slate-400'
                                            }`}
                                        style={{ width: `${(count / goalStats.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance Distribution */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="h-5 w-5 text-amber-600" />
                        <h3 className="text-lg font-bold text-slate-900">Performance Ratings</h3>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(reviewStats.distribution || {}).map(([label, count]: [string, any]) => (
                            <div key={label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">{label}</span>
                                    <span className="font-medium text-slate-900">{count}</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5">
                                    <div
                                        className="h-2.5 rounded-full bg-amber-500"
                                        style={{ width: `${reviewStats.total ? (count / reviewStats.total) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                        <div>
                            <p className="text-sm text-slate-500">Average Rating</p>
                            <p className="text-2xl font-bold text-slate-900">{reviewStats.avgRating}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Reviews</p>
                            <p className="text-2xl font-bold text-slate-900">{reviewStats.total}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-5 w-5 text-blue-100" />
                        <h3 className="font-medium text-blue-50">Goal Completion Rate</h3>
                    </div>
                    <p className="text-3xl font-bold">{goalStats.completionRate}%</p>
                    <p className="text-sm text-blue-100 mt-1">Across all departments</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-purple-100" />
                        <h3 className="font-medium text-purple-50">Active Participants</h3>
                    </div>
                    <p className="text-3xl font-bold">{goalStats.total}</p>
                    <p className="text-sm text-purple-100 mt-1">Employees with goals</p>
                </div>
            </div>
        </div>
    );
}
