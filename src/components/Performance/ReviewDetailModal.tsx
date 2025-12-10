import { useState, useEffect } from 'react';
import { X, Star, User, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface ReviewDetailModalProps {
    reviewId: string;
    onClose: () => void;
    onUpdate: () => void;
}

export function ReviewDetailModal({ reviewId, onClose, onUpdate }: ReviewDetailModalProps) {
    const { user, membership } = useAuth();
    const [review, setReview] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [ratings, setRatings] = useState<Record<string, { rating: number; comments: string }>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State for Reviewer
    const [strengths, setStrengths] = useState('');
    const [improvements, setImprovements] = useState('');
    const [achievements, setAchievements] = useState('');
    const [nextGoals, setNextGoals] = useState('');
    const [managerComments, setManagerComments] = useState('');
    const [employeeComments, setEmployeeComments] = useState('');

    useEffect(() => {
        loadReviewDetails();
    }, [reviewId]);

    const loadReviewDetails = async () => {
        setLoading(true);
        try {
            // Load Review
            const { data: reviewData, error: reviewError } = await supabase
                .from('performance_reviews')
                .select(`
          *,
          employee:employees!employee_id(first_name, last_name, department:departments(name)),
          reviewer:employees!reviewer_id(first_name, last_name)
        `)
                .eq('id', reviewId)
                .single();

            if (reviewError) throw reviewError;
            setReview(reviewData);

            // Initialize form fields
            setStrengths(reviewData.strengths || '');
            setImprovements(reviewData.areas_for_improvement || '');
            setAchievements(reviewData.achievements || '');
            setNextGoals(reviewData.goals_for_next_period || '');
            setManagerComments(reviewData.manager_comments || '');
            setEmployeeComments(reviewData.employee_comments || '');

            // Load Categories
            const { data: categoriesData } = await supabase
                .from('review_categories')
                .select('*')
                .eq('organization_id', reviewData.organization_id)
                .eq('is_active', true)
                .order('display_order', { ascending: true });

            setCategories(categoriesData || []);

            // Load Existing Ratings
            const { data: ratingsData } = await supabase
                .from('review_ratings')
                .select('*')
                .eq('review_id', reviewId);

            const ratingsMap: Record<string, any> = {};
            ratingsData?.forEach(r => {
                ratingsMap[r.category_id] = { rating: r.rating, comments: r.comments };
            });
            setRatings(ratingsMap);

        } catch (err) {
            console.error('Error loading review details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (categoryId: string, field: 'rating' | 'comments', value: any) => {
        setRatings(prev => ({
            ...prev,
            [categoryId]: {
                ...prev[categoryId],
                [field]: value
            }
        }));
    };

    const handleSave = async (status: 'Draft' | 'Completed') => {
        setSaving(true);
        try {
            // Calculate Overall Rating
            let totalWeightedScore = 0;
            let totalWeight = 0;

            categories.forEach(cat => {
                const rating = ratings[cat.id]?.rating || 0;
                totalWeightedScore += rating * (cat.weight || 1);
                totalWeight += (cat.weight || 1);
            });

            const overallRating = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

            // Update Review
            const { error: reviewError } = await supabase
                .from('performance_reviews')
                .update({
                    status,
                    overall_rating: overallRating,
                    strengths,
                    areas_for_improvement: improvements,
                    achievements,
                    goals_for_next_period: nextGoals,
                    manager_comments: managerComments,
                    reviewed_date: status === 'Completed' ? new Date().toISOString() : null
                })
                .eq('id', reviewId);

            if (reviewError) throw reviewError;

            // Update Ratings
            const ratingsToUpsert = categories.map(cat => ({
                review_id: reviewId,
                category_id: cat.id,
                rating: ratings[cat.id]?.rating || 0,
                comments: ratings[cat.id]?.comments || ''
            }));

            const { error: ratingsError } = await supabase
                .from('review_ratings')
                .upsert(ratingsToUpsert as any, { onConflict: 'review_id,category_id' });

            if (ratingsError) throw ratingsError;

            onUpdate();
            if (status === 'Completed') onClose();
            else loadReviewDetails(); // Reload to show saved state

        } catch (err) {
            console.error('Error saving review:', err);
            alert('Failed to save review.');
        } finally {
            setSaving(false);
        }
    };

    const handleEmployeeResponse = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('performance_reviews')
                .update({
                    employee_comments: employeeComments
                })
                .eq('id', reviewId);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (err) {
            console.error('Error saving response:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading || !review) return null;

    const isReviewer = user?.id === review.reviewer_id || ['admin', 'super_admin'].includes(membership?.role || '');
    const isEmployee = user?.id === review.employee_id; // Need to map user.id to employee_id properly in real app
    const isEditable = isReviewer && review.status !== 'Completed' && review.status !== 'Approved';
    const canRespond = isEmployee && review.status === 'Completed';

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-500">{review.review_type} Review</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${review.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                review.status === 'Approved' ? 'bg-purple-100 text-purple-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                {review.status}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">
                            {review.employee?.first_name} {review.employee?.last_name}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="text-xs font-medium text-slate-500 uppercase mb-1">Review Period</div>
                            <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-slate-400" />
                                {format(new Date(review.review_period_start), 'MMM yyyy')} - {format(new Date(review.review_period_end), 'MMM yyyy')}
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="text-xs font-medium text-slate-500 uppercase mb-1">Reviewer</div>
                            <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                <User className="h-4 w-4 text-slate-400" />
                                {review.reviewer?.first_name} {review.reviewer?.last_name}
                            </div>
                        </div>
                        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                            <div className="text-xs font-medium text-amber-600 uppercase mb-1">Overall Rating</div>
                            <div className="text-2xl font-bold text-amber-700 flex items-center gap-2">
                                <Star className="h-6 w-6 fill-current" />
                                {review.overall_rating ? review.overall_rating.toFixed(2) : 'N/A'}
                            </div>
                        </div>
                    </div>

                    {/* Ratings Section */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Competency Ratings</h3>
                        <div className="space-y-6">
                            {categories.map((cat) => (
                                <div key={cat.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                        <h4 className="font-medium text-slate-900">{cat.name}</h4>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    disabled={!isEditable}
                                                    onClick={() => handleRatingChange(cat.id, 'rating', star)}
                                                    className={`p-1 transition-colors ${(ratings[cat.id]?.rating || 0) >= star
                                                        ? 'text-amber-500'
                                                        : 'text-slate-300 hover:text-amber-400'
                                                        }`}
                                                >
                                                    <Star className={`h-6 w-6 ${(ratings[cat.id]?.rating || 0) >= star ? 'fill-current' : ''
                                                        }`} />
                                                </button>
                                            ))}
                                            <span className="ml-2 text-sm font-medium text-slate-600 w-8 text-center">
                                                {ratings[cat.id]?.rating || 0}
                                            </span>
                                        </div>
                                    </div>
                                    <textarea
                                        disabled={!isEditable}
                                        value={ratings[cat.id]?.comments || ''}
                                        onChange={(e) => handleRatingChange(cat.id, 'comments', e.target.value)}
                                        placeholder="Add comments for this category..."
                                        rows={2}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Qualitative Feedback */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Key Strengths</label>
                            <textarea
                                disabled={!isEditable}
                                value={strengths}
                                onChange={(e) => setStrengths(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50"
                                placeholder="What did the employee do well?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Areas for Improvement</label>
                            <textarea
                                disabled={!isEditable}
                                value={improvements}
                                onChange={(e) => setImprovements(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50"
                                placeholder="Where can the employee grow?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Key Achievements</label>
                            <textarea
                                disabled={!isEditable}
                                value={achievements}
                                onChange={(e) => setAchievements(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50"
                                placeholder="Notable accomplishments during this period..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Goals for Next Period</label>
                            <textarea
                                disabled={!isEditable}
                                value={nextGoals}
                                onChange={(e) => setNextGoals(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50"
                                placeholder="Objectives for the upcoming cycle..."
                            />
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="border-t border-slate-200 pt-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Manager's Final Comments</label>
                            <textarea
                                disabled={!isEditable}
                                value={managerComments}
                                onChange={(e) => setManagerComments(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50"
                                placeholder="Overall summary and final thoughts..."
                            />
                        </div>

                        {(review.status === 'Completed' || review.status === 'Approved') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Employee's Response</label>
                                <textarea
                                    disabled={!canRespond}
                                    value={employeeComments}
                                    onChange={(e) => setEmployeeComments(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none disabled:bg-slate-50"
                                    placeholder="Employee can add their comments here..."
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>

                    {isEditable && (
                        <>
                            <button
                                onClick={() => handleSave('Draft')}
                                disabled={saving}
                                className="px-4 py-2 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                            >
                                Save Draft
                            </button>
                            <button
                                onClick={() => handleSave('Completed')}
                                disabled={saving}
                                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                            >
                                Complete Review
                            </button>
                        </>
                    )}

                    {canRespond && (
                        <button
                            onClick={handleEmployeeResponse}
                            disabled={saving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            Submit Response
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
