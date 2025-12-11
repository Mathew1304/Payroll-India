import { useState, useEffect } from 'react';
import { Download, FileText, CheckCircle, XCircle, AlertTriangle, Calendar, Filter, Trash2, CheckSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getFileGenerationHistory,
    downloadPayrollFile,
    markFileAsSubmitted,
    deleteFileGeneration,
    type PayrollFileGeneration
} from '../../lib/payroll/fileGenerationHistory';

export function FileGenerationHistory() {
    const { organization } = useAuth();
    const [files, setFiles] = useState<PayrollFileGeneration[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({
        year: new Date().getFullYear(),
        month: null as number | null,
        fileType: '' as string,
        validationStatus: '' as string
    });
    const [downloading, setDownloading] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadFiles();
    }, [organization, filter]);

    const loadFiles = async () => {
        if (!organization) return;

        setLoading(true);
        try {
            const data = await getFileGenerationHistory(organization.id, {
                year: filter.year,
                month: filter.month || undefined,
                fileType: filter.fileType || undefined,
                validationStatus: filter.validationStatus || undefined
            });
            setFiles(data);
        } catch (error) {
            console.error('Error loading files:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (fileId: string) => {
        setDownloading(fileId);
        try {
            await downloadPayrollFile(fileId);
            // Refresh to update download count
            await loadFiles();
        } catch (error: any) {
            console.error('Download error:', error);
            alert(`Failed to download file: ${error.message}`);
        } finally {
            setDownloading(null);
        }
    };

    const handleMarkAsSubmitted = async (fileId: string) => {
        const notes = prompt('Add submission notes (optional):');
        try {
            await markFileAsSubmitted(fileId, notes || undefined);
            await loadFiles();
        } catch (error: any) {
            alert(`Failed to mark as submitted: ${error.message}`);
        }
    };

    const handleDelete = async (fileId: string) => {
        if (!confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteFileGeneration(fileId);
            await loadFiles();
        } catch (error: any) {
            alert(`Failed to delete file: ${error.message}`);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'passed':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            default:
                return <Calendar className="h-5 w-5 text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const colors = {
            passed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            warning: 'bg-yellow-100 text-yellow-800',
            pending: 'bg-gray-100 text-gray-800'
        };
        return colors[status as keyof typeof colors] || colors.pending;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        { value: 1, label: 'January' },
        { value: 2, label: 'February' },
        { value: 3, label: 'March' },
        { value: 4, label: 'April' },
        { value: 5, label: 'May' },
        { value: 6, label: 'June' },
        { value: 7, label: 'July' },
        { value: 8, label: 'August' },
        { value: 9, label: 'September' },
        { value: 10, label: 'October' },
        { value: 11, label: 'November' },
        { value: 12, label: 'December' }
    ];

    return (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">File Generation History</h3>
                    <p className="text-sm text-slate-600 mt-1">Track and download generated WPS/SIF files</p>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                    <Filter className="h-4 w-4" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                        <select
                            value={filter.year}
                            onChange={(e) => setFilter({ ...filter, year: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
                        <select
                            value={filter.month || ''}
                            onChange={(e) => setFilter({ ...filter, month: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Months</option>
                            {months.map(month => (
                                <option key={month.value} value={month.value}>{month.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">File Type</label>
                        <select
                            value={filter.fileType}
                            onChange={(e) => setFilter({ ...filter, fileType: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Types</option>
                            <option value="WPS_SIF">WPS SIF</option>
                            <option value="WPS_TXT">WPS TXT</option>
                            <option value="WPS_CSV">WPS CSV</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                        <select
                            value={filter.validationStatus}
                            onChange={(e) => setFilter({ ...filter, validationStatus: e.target.value })}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="passed">Passed</option>
                            <option value="warning">Warning</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
                    <p className="text-slate-600 mt-4">Loading files...</p>
                </div>
            ) : files.length === 0 ? (
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">No files generated yet</p>
                    <p className="text-sm text-slate-500 mt-2">Generated WPS/SIF files will appear here</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Generated</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Pay Period</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Format</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employer ID</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Employees</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Total Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Size</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Downloads</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {files.map((file) => (
                                <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-sm text-slate-900">
                                        <div>
                                            {new Date(file.generated_at).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {new Date(file.generated_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-900">
                                        {months.find(m => m.value === file.pay_period_month)?.label} {file.pay_period_year}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                            {file.file_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {file.employer_id || 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                                        {file.total_employees}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                                        {file.currency} {file.total_amount.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {formatFileSize(file.file_size || 0)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(file.validation_status)}
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(file.validation_status)}`}>
                                                {file.validation_status}
                                            </span>
                                        </div>
                                        {file.is_submitted && (
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                                                Submitted
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {file.downloaded_count || 0}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleDownload(file.id)}
                                                disabled={downloading === file.id}
                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Download file"
                                            >
                                                <Download className="h-4 w-4" />
                                                {downloading === file.id ? 'Downloading...' : 'Download'}
                                            </button>
                                            {!file.is_submitted && (
                                                <button
                                                    onClick={() => handleMarkAsSubmitted(file.id)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Mark as submitted"
                                                >
                                                    <CheckSquare className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Delete file"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Summary */}
            {files.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">{files.length}</p>
                            <p className="text-sm text-slate-600">Total Files</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                                {files.filter(f => f.validation_status === 'passed').length}
                            </p>
                            <p className="text-sm text-slate-600">Passed</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">
                                {files.filter(f => f.is_submitted).length}
                            </p>
                            <p className="text-sm text-slate-600">Submitted</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">
                                {files.reduce((sum, f) => sum + (f.downloaded_count || 0), 0)}
                            </p>
                            <p className="text-sm text-slate-600">Total Downloads</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
