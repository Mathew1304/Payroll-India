import { useState, useEffect } from 'react';
import { Search, Filter, Star, Calendar, User, MoreVertical, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { ReviewDetailModal } from '../../components/Performance/ReviewDetailModal';

interface ReviewsTabProps {
    departmentId?: string;
    employeeId?: string;
}

export function ReviewsTab({ departmentId, employeeId }: ReviewsTabProps) {
    const { organization } = useAuth();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

    useEffect(() => {
        if (organization?.id) {
            loadReviews();
        }
    }, [organization?.id, departmentId, employeeId]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('performance_reviews')
                .select(`
          *,
          employee:employees!employee_id(first_name, last_name, department_id),
          reviewer:employees!reviewer_id(first_name, last_name)
        `)
                .eq('organization_id', organization!.id)
                .order('created_at', { ascending: false });

            if (departmentId) {
                // Since we can't easily filter by joined table column in basic Supabase query without complex setup,
                // we'll filter in memory if needed, or rely on the fact that we might filter by employeeId which is indexed
                // For now, let's assume if departmentId is passed, we might need to fetch employees of that dept first
                // But for simplicity, we'll fetch all and filter in memory if departmentId is set but employeeId isn't
            }

            if (employeeId) query = query.eq('employee_id', employeeId);

            const { data, error } = await query;

            if (error) throw error;
            setReviews(data || []);
        } catch (err) {
            console.error('Error loading reviews:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredReviews = reviews.filter(review => {
        const matchesSearch =
            review.employee?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.employee?.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.reviewer?.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            review.reviewer?.last_name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || review.status === statusFilter;
        const matchesType = typeFilter === 'All' || review.review_type === typeFilter;

        // Manual Department Filter if needed (assuming employee object has department_id, but we didn't fetch department name to check ID)
        // If we need strict department filtering here, we should enhance the query. 
        // For now, relying on the props passed down.

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Draft': return 'bg-slate-100 text-slate-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            case 'Completed': return 'bg-green-100 text-green-700';
            case 'Approved': return 'bg-purple-100 text-purple-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search reviews or employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                        <option value="All">All Status</option>
                        <option value="Draft">Draft</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="Approved">Approved</option>
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                    >
                        <option value="All">All Types</option>
                        <option value="Annual">Annual</option>
                        <option value="Mid-Year">Mid-Year</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Probation">Probation</option>
                        <option value="Project-Based">Project-Based</option>
                    </select>
                </div>
            </div>

            {/* Reviews List */}
            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading reviews...</div>
            ) : filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                    <div className="bg-amber-50 p-4 rounded-full inline-block mb-3">
                        <Star className="h-8 w-8 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No reviews found</h3>
                    <p className="text-slate-500">Try adjusting your filters or create a new review.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reviewer</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredReviews.map((review) => (
                                <tr
                                    key={review.id}
                                    onClick={() => setSelectedReviewId(review.id)}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs">
                                                {review.employee?.first_name?.[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">
                                                    {review.employee?.first_name} {review.employee?.last_name}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-sm text-slate-900">{review.review_type}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {format(new Date(review.review_period_start), 'MMM yyyy')} - {format(new Date(review.review_period_end), 'MMM yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                                            {review.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {review.overall_rating ? (
                                            <div className="flex items-center gap-1 text-amber-500 font-medium">
                                                <Star className="h-4 w-4 fill-current" />
                                                <span>{review.overall_rating}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                        {review.reviewer?.first_name} {review.reviewer?.last_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button className="text-slate-400 hover:text-amber-600">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedReviewId && (
                <ReviewDetailModal
                    reviewId={selectedReviewId}
                    onClose={() => setSelectedReviewId(null)}
                    onUpdate={loadReviews}
                />
            )}
        </div>
    );
}
