import { useState, useEffect } from 'react';
import { X, Calendar, User, CheckCircle, Clock, MessageSquare, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface GoalDetailModalProps {
    goalId: string;
    onClose: () => void;
    onUpdate: () => void;
}

export function GoalDetailModal({ goalId, onClose, onUpdate }: GoalDetailModalProps) {
    const { user, membership, profile } = useAuth();
    const [goal, setGoal] = useState<any>(null);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadGoalDetails();
    }, [goalId]);

    const loadGoalDetails = async () => {
        setLoading(true);
        try {
            // Load Goal
            const { data: goalData, error: goalError } = await supabase
                .from('goals')
                .select(`
          *,
          employee:employees(first_name, last_name),
          goal_type:goal_types(name),
          department:departments(name)
        `)
                .eq('id', goalId)
                .single();

            if (goalError) throw goalError;
            setGoal(goalData);

            // Load Milestones
            const { data: milestonesData } = await supabase
                .from('goal_milestones')
                .select('*')
                .eq('goal_id', goalId)
                .order('display_order', { ascending: true });

            setMilestones(milestonesData || []);

            // Load Comments
            const { data: commentsData } = await supabase
                .from('goal_comments')
                .select(`
          *,
          user:employees!user_id(first_name, last_name)
        `)
                .eq('goal_id', goalId)
                .order('created_at', { ascending: true });

            setComments(commentsData || []);

        } catch (err) {
            console.error('Error loading goal details:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProgress = async (newProgress: number) => {
        try {
            const { error } = await supabase
                .from('goals')
                .update({
                    progress_percentage: newProgress,
                    status: newProgress === 100 ? 'completed' : goal.status === 'not_started' && newProgress > 0 ? 'in_progress' : goal.status,
                    completion_date: newProgress === 100 ? new Date().toISOString() : null
                } as any)
                .eq('id', goalId);

            if (error) throw error;
            loadGoalDetails();
            onUpdate();
        } catch (err) {
            console.error('Error updating progress:', err);
        }
    };

    const handleToggleMilestone = async (milestoneId: string, isCompleted: boolean) => {
        try {
            const { error } = await supabase
                .from('goal_milestones')
                .update({
                    is_completed: !isCompleted,
                    completed_date: !isCompleted ? new Date().toISOString() : null,
                    // completed_by: !isCompleted ? user?.id : null // Need to map user.id to employee_id
                } as any)
                .eq('id', milestoneId);

            if (error) throw error;
            loadGoalDetails();
        } catch (err) {
            console.error('Error updating milestone:', err);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setUpdating(true);
        try {
            // Admins without employee_id can add comments, user_id will be null
            const { error } = await supabase
                .from('goal_comments')
                .insert({
                    goal_id: goalId,
                    user_id: membership?.employee_id || profile?.employee_id || null,
                    comment_text: newComment
                } as any);

            if (error) throw error;
            setNewComment('');
            loadGoalDetails();
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setUpdating(false);
        }
    };

    if (loading || !goal) return null;

    const isManagerOrAdmin = ['admin', 'super_admin', 'manager', 'hr'].includes(membership?.role || '');
    const canEdit = isManagerOrAdmin || user?.id === goal.created_by; // Simplified permission check

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600`}>
                                {goal.goal_type?.name}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${goal.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                                goal.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                {goal.priority}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{goal.title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-900 mb-2">Description</h3>
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                {goal.description || 'No description provided.'}
                            </p>
                        </div>

                        {/* Milestones */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-900 mb-3">Milestones</h3>
                            <div className="space-y-2">
                                {milestones.map((milestone) => (
                                    <div
                                        key={milestone.id}
                                        className={`flex items-start gap-3 p-3 rounded-lg border ${milestone.is_completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'
                                            }`}
                                    >
                                        <button
                                            onClick={() => handleToggleMilestone(milestone.id, milestone.is_completed)}
                                            className={`mt-0.5 h-5 w-5 rounded border flex items-center justify-center transition-colors ${milestone.is_completed
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-slate-300 hover:border-blue-500'
                                                }`}
                                        >
                                            {milestone.is_completed && <CheckCircle className="h-3.5 w-3.5" />}
                                        </button>
                                        <div className="flex-1">
                                            <p className={`text-sm font-medium ${milestone.is_completed ? 'text-green-700 line-through' : 'text-slate-900'}`}>
                                                {milestone.title}
                                            </p>
                                            {milestone.due_date && (
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Due: {format(new Date(milestone.due_date), 'MMM d, yyyy')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {milestones.length === 0 && (
                                    <p className="text-sm text-slate-500 italic">No milestones defined.</p>
                                )}
                            </div>
                        </div>

                        {/* Comments */}
                        <div className="border-t border-slate-200 pt-6">
                            <h3 className="text-sm font-medium text-slate-900 mb-4 flex items-center gap-2">
                                <MessageSquare className="h-4 w-4" />
                                Discussion
                            </h3>

                            <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {comment.user?.first_name?.[0]}
                                        </div>
                                        <div className="flex-1 bg-slate-50 p-3 rounded-lg rounded-tl-none">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-900">
                                                    {comment.user?.first_name} {comment.user?.last_name}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700">{comment.comment_text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                <button
                                    onClick={handleAddComment}
                                    disabled={updating || !newComment.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Progress */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h3 className="text-sm font-medium text-slate-900 mb-3">Progress</h3>
                            <div className="mb-2 flex justify-between text-sm">
                                <span className="text-slate-600">Completion</span>
                                <span className="font-medium text-slate-900">{goal.progress_percentage}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={goal.progress_percentage}
                                onChange={(e) => handleUpdateProgress(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-500">Status</span>
                                    <span className={`font-medium ${goal.status === 'completed' ? 'text-green-600' :
                                        goal.status === 'overdue' ? 'text-red-600' :
                                            'text-blue-600'
                                        }`}>{goal.status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</span>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase">Assigned To</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-900">
                                        {goal.employee?.first_name} {goal.employee?.last_name}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase">Department</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-900">{goal.department?.name}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase">Timeline</label>
                                <div className="mt-1 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Start:</span>
                                        <span className="text-slate-900">{format(new Date(goal.start_date), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Due:</span>
                                        <span className="text-slate-900 font-medium">{format(new Date(goal.end_date), 'MMM d, yyyy')}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase">Created By</label>
                                <div className="flex items-center gap-2 mt-1">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm text-slate-900">
                                        {/* created_by references auth.users, not joined here */}
                                        --
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {canEdit && (
                            <div className="pt-4 border-t border-slate-200">
                                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm">
                                    <Trash2 className="h-4 w-4" />
                                    Delete Goal
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
