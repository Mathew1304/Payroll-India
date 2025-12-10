import { useState, useEffect } from 'react';
import { Search, Filter, Clock, CheckCircle, AlertCircle, FileText, Download, Calendar as CalendarIcon, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TicketDetailModal } from '../../components/Helpdesk/TicketDetailModal';
import { CategoryManagementModal } from '../../components/Helpdesk/CategoryManagementModal';
import { format } from 'date-fns';

export function AdminHelpdeskDashboard() {
    const { organization } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

    // Filters
    const [statusFilter, setStatusFilter] = useState('All');
    const [priorityFilter, setPriorityFilter] = useState('All');

    useEffect(() => {
        if (organization?.id) {
            loadTickets();
        }
    }, [organization?.id]);

    const loadTickets = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select(`
          *,
          created_by_user:employees!created_by(first_name, last_name),
          assigned_to_user:employees!assigned_to(first_name, last_name),
          category:helpdesk_categories(name, icon)
        `)
                .eq('organization_id', organization!.id)
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

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.created_by_user?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.created_by_user?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || ticket.status === statusFilter;
        const matchesPriority = priorityFilter === 'All' || ticket.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
    });

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

    const exportCSV = () => {
        const headers = ['Ticket ID', 'Subject', 'Category', 'Priority', 'Status', 'Created By', 'Assigned To', 'Created', 'Last Update'];
        const csvContent = [
            headers.join(','),
            ...filteredTickets.map(t => [
                t.ticket_number,
                `"${t.subject.replace(/"/g, '""')}"`,
                t.category?.name,
                t.priority,
                t.status,
                `${t.created_by_user?.first_name} ${t.created_by_user?.last_name}`,
                t.assigned_to_user ? `${t.assigned_to_user.first_name} ${t.assigned_to_user.last_name}` : 'Unassigned',
                format(new Date(t.created_at), 'yyyy-MM-dd'),
                format(new Date(t.updated_at), 'yyyy-MM-dd HH:mm')
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `tickets_export_${format(new Date(), 'yyyyMMdd')}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Helpdesk Administration</h1>
                    <p className="text-slate-500">Manage support tickets across the organization</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <List className="h-4 w-4" />
                        Categories
                    </button>
                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Export CSV
                    </button>
                </div>
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

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-pink-50 text-pink-600' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <List className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-lg ${viewMode === 'calendar' ? 'bg-pink-50 text-pink-600' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            <CalendarIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex flex-1 gap-4 max-w-3xl">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                        >
                            <option value="All">All Status</option>
                            <option value="Open">Open</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                        </select>
                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                        >
                            <option value="All">All Priority</option>
                            <option value="High">High</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Ticket ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Priority</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created By</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assigned To</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">Loading tickets...</td>
                                    </tr>
                                ) : filteredTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500">No tickets found</td>
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {ticket.created_by_user?.first_name} {ticket.created_by_user?.last_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                                {ticket.assigned_to_user ? (
                                                    `${ticket.assigned_to_user.first_name} ${ticket.assigned_to_user.last_name}`
                                                ) : (
                                                    <span className="text-slate-400 italic">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                                {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-12 text-center text-slate-500">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900">Calendar View</h3>
                        <p>Coming soon: Visual timeline of ticket due dates and SLAs.</p>
                    </div>
                )}
            </div>

            {selectedTicketId && (
                <TicketDetailModal
                    ticketId={selectedTicketId}
                    onClose={() => setSelectedTicketId(null)}
                    onUpdate={loadTickets}
                />
            )}

            {showCategoryModal && (
                <CategoryManagementModal
                    onClose={() => setShowCategoryModal(false)}
                />
            )}
        </div>
    );
}
