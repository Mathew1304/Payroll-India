import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Clock, Tag, AlertCircle, CheckCircle, XCircle, PlayCircle, StopCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';

interface TicketDetailModalProps {
    ticketId: string;
    onClose: () => void;
    onUpdate: () => void;
}

export function TicketDetailModal({ ticketId, onClose, onUpdate }: TicketDetailModalProps) {
    const { membership } = useAuth();
    const [ticket, setTicket] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const commentsEndRef = useRef<HTMLDivElement>(null);
    const [assignees, setAssignees] = useState<any[]>([]);
    const [showAssignSelect, setShowAssignSelect] = useState(false);
    const [showStatusSelect, setShowStatusSelect] = useState(false);

    const isAdmin = membership?.role === 'admin' || membership?.role === 'super_admin' || membership?.role === 'hr';

    useEffect(() => {
        if (isAdmin) {
            loadAssignees();
        }
    }, [isAdmin]);

    const loadAssignees = async () => {
        const { data } = await supabase
            .from('employees')
            .select('id, first_name, last_name')
            .eq('is_active', true)
            .order('first_name');
        setAssignees(data || []);
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            if (error) throw error;

            await supabase.from('ticket_history').insert({
                ticket_id: ticketId,
                user_id: membership!.employee_id,
                action: 'STATUS_CHANGE',
                old_value: ticket.status,
                new_value: newStatus
            });

            // Notify Ticket Creator
            if (ticket.created_by) {
                await supabase.from('employee_notifications').insert({
                    employee_id: ticket.created_by,
                    title: 'Ticket Updated',
                    message: `Your ticket #${ticket.ticket_number} status has been changed to ${newStatus}`,
                    type: 'info',
                    is_read: false
                });
            }

            setShowStatusSelect(false);
            loadTicketData();
            onUpdate();
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const handleAssign = async (employeeId: string) => {
        try {
            const { error } = await supabase
                .from('tickets')
                .update({ assigned_to: employeeId, updated_at: new Date().toISOString() })
                .eq('id', ticketId);

            if (error) throw error;

            // Notify Assignee
            await supabase.from('employee_notifications').insert({
                employee_id: employeeId,
                title: 'Ticket Assigned',
                message: `You have been assigned ticket #${ticket.ticket_number}`,
                type: 'info',
                is_read: false
            });

            setShowAssignSelect(false);
            loadTicketData();
            onUpdate();
        } catch (err) {
            console.error('Error assigning ticket:', err);
        }
    };

    useEffect(() => {
        loadTicketData();
    }, [ticketId]);

    useEffect(() => {
        scrollToBottom();
    }, [comments]);

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadTicketData = async () => {
        try {
            // Load Ticket Details
            const { data: ticketData, error: ticketError } = await supabase
                .from('tickets')
                .select(`
          *,
          created_by_user:employees!created_by(first_name, last_name),
          assigned_to_user:employees!assigned_to(first_name, last_name),
          category:helpdesk_categories(name, icon)
        `)
                .eq('id', ticketId)
                .single();

            if (ticketError) throw ticketError;
            setTicket(ticketData);

            // Load Comments
            const { data: commentsData, error: commentsError } = await supabase
                .from('ticket_comments')
                .select(`
          *,
          user:employees(first_name, last_name)
        `)
                .eq('ticket_id', ticketId)
                .order('created_at', { ascending: true });

            if (commentsError) throw commentsError;
            setComments(commentsData || []);

        } catch (err) {
            console.error('Error loading ticket data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSending(true);
        try {
            const { error } = await supabase
                .from('ticket_comments')
                .insert({
                    ticket_id: ticketId,
                    user_id: membership!.employee_id,
                    comment_text: newComment.trim()
                });

            if (error) throw error;

            setNewComment('');
            loadTicketData(); // Reload to get new comment
        } catch (err) {
            console.error('Error sending comment:', err);
        } finally {
            setSending(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-blue-100 text-blue-700';
            case 'In Progress': return 'bg-yellow-100 text-yellow-700';
            case 'Resolved': return 'bg-green-100 text-green-700';
            case 'Closed': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-orange-100 text-orange-700';
            case 'Medium': return 'bg-blue-100 text-blue-700';
            case 'Low': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {ticket.ticket_number}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">{ticket.subject}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {isAdmin && (
                            <>
                                <div className="relative">
                                    <button
                                        onClick={() => setShowStatusSelect(!showStatusSelect)}
                                        className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                                    >
                                        Change Status
                                    </button>
                                    {showStatusSelect && (
                                        <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-10">
                                            {['Open', 'In Progress', 'Resolved', 'Closed'].map(status => (
                                                <button
                                                    key={status}
                                                    onClick={() => handleUpdateStatus(status)}
                                                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                                >
                                                    {status}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <button
                                        onClick={() => setShowAssignSelect(!showAssignSelect)}
                                        className="px-3 py-1.5 text-sm font-medium text-pink-600 border border-pink-200 rounded-lg hover:bg-pink-50"
                                    >
                                        Assign Ticket
                                    </button>
                                    {showAssignSelect && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-10 max-h-60 overflow-y-auto">
                                            {assignees.map(emp => (
                                                <button
                                                    key={emp.id}
                                                    onClick={() => handleAssign(emp.id)}
                                                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 truncate"
                                                >
                                                    {emp.first_name} {emp.last_name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto p-6 border-r border-slate-100">
                        {/* Meta Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                            <div>
                                <p className="text-slate-500 mb-1">Created By</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-bold">
                                        {ticket.created_by_user?.first_name?.[0]}
                                    </div>
                                    <span className="font-medium">
                                        {ticket.created_by_user?.first_name} {ticket.created_by_user?.last_name}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">Assigned To</p>
                                {ticket.assigned_to_user ? (
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                                            {ticket.assigned_to_user?.first_name?.[0]}
                                        </div>
                                        <span className="font-medium">
                                            {ticket.assigned_to_user?.first_name} {ticket.assigned_to_user?.last_name}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400 italic">Unassigned</span>
                                )}
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">Category</p>
                                <div className="flex items-center gap-2">
                                    <span>{ticket.category?.icon}</span>
                                    <span>{ticket.category?.name}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 mb-1">Created At</p>
                                <span>{format(new Date(ticket.created_at), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-slate-900 mb-2">Description</h3>
                            <div className="bg-slate-50 p-4 rounded-lg text-slate-700 whitespace-pre-wrap">
                                {ticket.description}
                            </div>
                        </div>

                        {/* Comments */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 mb-4">Comments ({comments.length})</h3>
                            <div className="space-y-4 mb-6">
                                {comments.map((comment) => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
                                            {comment.user?.first_name?.[0]}
                                        </div>
                                        <div className="flex-1">
                                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-medium text-sm">
                                                        {comment.user?.first_name} {comment.user?.last_name}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-slate-700 text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={commentsEndRef} />
                            </div>

                            {/* Add Comment */}
                            <form onSubmit={handleSendComment} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Type a comment..."
                                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !newComment.trim()}
                                    className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Sidebar (History/Actions) - Could be expanded for Admin actions */}
                    {/* For now, just keeping it simple as per design, maybe add history later if needed */}
                </div>
            </div>
        </div>
    );
}
