import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, Clock, Search, RefreshCw, XCircle } from 'lucide-react';

interface ErrorLog {
    id: string;
    user_email: string;
    organization_name: string;
    error_message: string;
    error_type: string;
    page_url: string;
    severity: 'error' | 'warning' | 'critical';
    is_resolved: boolean;
    created_at: string;
    user_agent: string;
    error_stack: string;
}

export function ErrorLogsTable() {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, unresolved, resolved
    const [search, setSearch] = useState('');
    const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('error_logs')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter === 'unresolved') {
                query = query.eq('is_resolved', false);
            } else if (filter === 'resolved') {
                query = query.eq('is_resolved', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filter]);

    const handleResolve = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('error_logs')
                .update({ is_resolved: !currentStatus, resolved_at: !currentStatus ? new Date().toISOString() : null })
                .eq('id', id);

            if (error) throw error;
            fetchLogs();
        } catch (error) {
            console.error('Error updating log:', error);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.error_message.toLowerCase().includes(search.toLowerCase()) ||
        log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
        log.organization_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white rounded-lg shadow border border-slate-200 flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-lg">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    System Error Logs
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchLogs}
                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Refresh Logs"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search errors, users, or organizations..."
                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white shadow text-slate-800' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unresolved')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'unresolved' ? 'bg-white shadow text-red-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Unresolved
                    </button>
                    <button
                        onClick={() => setFilter('resolved')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'resolved' ? 'bg-white shadow text-emerald-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        Resolved
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3">Severity</th>
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Message</th>
                            <th className="px-4 py-3">User / Org</th>
                            <th className="px-4 py-3">Context</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                            <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${log.is_resolved ? 'opacity-75 bg-slate-50/50' : ''}`}>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${log.severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                                        log.severity === 'warning' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                            'bg-slate-100 text-slate-800 border-slate-200'
                                        }`}>
                                        {log.severity}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                    {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs truncate" title={log.error_message}>
                                    {log.error_message}
                                </td>
                                <td className="px-4 py-3 max-w-[150px]">
                                    <div className="truncate font-medium text-slate-800" title={log.organization_name}>{log.organization_name || '-'}</div>
                                    <div className="truncate text-xs text-slate-500" title={log.user_email}>{log.user_email || 'Anonymous'}</div>
                                </td>
                                <td className="px-4 py-3 max-w-[150px]">
                                    <div className="truncate text-xs text-slate-500" title={log.page_url}>{log.page_url?.replace(window.location.origin, '')}</div>
                                    <div className="truncate text-xs font-mono text-slate-400" title={log.error_type}>{log.error_type}</div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => setSelectedLog(log)}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                            title="View Details"
                                        >
                                            <Search className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleResolve(log.id, log.is_resolved)}
                                            className={`p-1 rounded transition-colors ${log.is_resolved ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'}`}
                                            title={log.is_resolved ? "Mark as Unresolved" : "Mark as Resolved"}
                                        >
                                            {log.is_resolved ? <CheckCircle className="h-4 w-4" /> : <div className="h-4 w-4 border-2 border-slate-300 rounded-full"></div>}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-4 py-12 text-center text-slate-500 bg-white">
                                    <div className="flex flex-col items-center justify-center">
                                        <CheckCircle className="h-12 w-12 text-slate-300 mb-2" />
                                        <p className="text-lg font-medium text-slate-900">No logs found</p>
                                        <p className="text-sm">Everything seems to be running smoothly.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                Error Details
                            </h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="font-semibold text-red-900 text-lg mb-1">{selectedLog.error_message}</h4>
                                    <div className="flex items-center gap-3 text-sm text-red-700">
                                        <span className="font-mono bg-red-100 px-2 py-0.5 rounded border border-red-200">{selectedLog.error_type}</span>
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(selectedLog.created_at).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">User Context</h5>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-slate-500">User:</span> <span className="font-medium text-slate-900">{selectedLog.user_email || 'Anonymous'}</span></p>
                                        <p><span className="text-slate-500">Org:</span> <span className="font-medium text-slate-900">{selectedLog.organization_name || 'N/A'}</span></p>
                                        <p className="truncate" title={selectedLog.user_agent}><span className="text-slate-500">Agent:</span> <span className="text-slate-700">{selectedLog.user_agent}</span></p>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">System Context</h5>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-slate-500">URL:</span> <span className="text-blue-600 break-all">{selectedLog.page_url}</span></p>
                                        <p><span className="text-slate-500">Severity:</span> <span className="font-medium capitalize">{selectedLog.severity}</span></p>
                                        <p><span className="text-slate-500">Status:</span> <span className={`font-medium ${selectedLog.is_resolved ? 'text-emerald-600' : 'text-amber-600'}`}>{selectedLog.is_resolved ? 'Resolved' : 'Open'}</span></p>
                                    </div>
                                </div>
                            </div>

                            {selectedLog.error_stack && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Stack Trace</h5>
                                    <pre className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs overflow-x-auto font-mono leading-relaxed border border-slate-800">
                                        {selectedLog.error_stack}
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
                            <button
                                onClick={() => handleResolve(selectedLog.id, selectedLog.is_resolved)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedLog.is_resolved
                                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100 bg-white'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 shadow-sm'
                                    }`}
                            >
                                {selectedLog.is_resolved ? 'Mark as Unresolved' : 'Mark as Resolved'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
