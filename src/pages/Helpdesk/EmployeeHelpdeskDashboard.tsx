import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Clock, CheckCircle, AlertCircle, PlayCircle, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CreateTicketModal } from '../../components/Helpdesk/CreateTicketModal';
import { TicketDetailModal } from '../../components/Helpdesk/TicketDetailModal';
import { format } from 'date-fns';

export function EmployeeHelpdeskDashboard() {
    const { membership } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

    useEffect(() => {
        if (membership?.employee_id) {
            loadTickets();
        }
    }, [membership?.employee_id]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
          *,
          category:helpdesk_categories(name, icon)
        `)
                .or(`created_by.eq.${membership!.employee_id},assigned_to.eq.${membership!.employee_id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (err) {
            console.error('Error loading tickets:', err);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'Open').length,
        inProgress: tickets.filter(t => t.status === 'In Progress').length,
        resolved: tickets.filter(t => t.status === 'Resolved').length,
        overdue: tickets.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['Resolved', 'Closed'].includes(t.status)).length
    };

    const filteredTickets = tickets.filter(ticket =>
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Helpdesk & Support</h1>
                    <p className="text-slate-500">Track and manage your support requests</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    New Ticket
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                            <FileText className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Open</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.open}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">In Progress</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.inProgress}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 rounded-lg text-green-600">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Resolved</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.resolved}</p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-100 rounded-lg text-red-600">
                            <AlertCircle className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-600">Overdue</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{stats.overdue}</p>
                </div>
            </div>

            {/* Ticket List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tickets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                        />
                    </div>
                    {/* Add filters here if needed */}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Last Update</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading tickets...</td>
                                </tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No tickets found</td>
                                </tr>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-pink-600 font-medium">{ticket.ticket_number}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900 truncate max-w-xs">{ticket.subject}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <span>{ticket.category?.icon}</span>
                                                <span>{ticket.category?.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {format(new Date(ticket.updated_at), 'MMM d, HH:mm')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreateModal && (
                <CreateTicketModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={loadTickets}
                />
            )}

            {selectedTicketId && (
                <TicketDetailModal
                    ticketId={selectedTicketId}
                    onClose={() => setSelectedTicketId(null)}
                    onUpdate={loadTickets}
                />
            )}
        </div>
    );
}
