import { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertCircle, Calendar, User, Download, Eye, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { logErrorToSupabase } from '../../services/errorLogger';

interface ImportHistoryModalProps {
  onClose: () => void;
}

interface ImportHistoryRecord {
  id: string;
  file_name: string;
  total_rows: number;
  successful_imports: number;
  failed_imports: number;
  imported_employees: Array<{
    name: string;
    email: string;
    mobile: string;
    employment_type: string;
  }>;
  failed_rows?: Array<{
    row_number: number;
    row_data: {
      first_name: string;
      last_name: string;
      company_email: string;
      mobile_number: string;
    };
    error: string;
  }>;
  created_at: string;
  uploaded_by: string;
  uploader_name?: string;
  country?: string;
}

export function ImportHistoryModal({ onClose }: ImportHistoryModalProps) {
  const { organization, user, profile } = useAuth();
  const [history, setHistory] = useState<ImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ImportHistoryRecord | null>(null);

  useEffect(() => {
    loadHistory();
  }, [organization?.id]);

  const loadHistory = async () => {
    if (!organization?.id) return;

    try {
      // 1. Fetch import history first
      const { data: historyData, error: historyError } = await supabase
        .from('employee_import_history')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      if (!historyData) return;

      // 2. Collect all unique uploader IDs
      const uploaderIds = Array.from(new Set(
        historyData
          .map(item => item.uploaded_by)
          .filter(id => id) // remove nulls
      ));

      // 3. Fetch user profiles for these IDs
      let userProfilesMap = new Map();
      if (uploaderIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', uploaderIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(profile => {
            userProfilesMap.set(profile.user_id, profile);
          });
        }
      }

      // 4. Combine data
      const formattedData = historyData.map((record: any) => {
        let uploaderName = 'Unknown User';

        // Try to find in fetched profiles
        const uploader = userProfilesMap.get(record.uploaded_by);
        if (uploader) {
          const firstName = uploader.first_name || '';
          const lastName = uploader.last_name || '';
          if (firstName || lastName) {
            uploaderName = `${firstName} ${lastName}`.trim();
          } else if (uploader.email) {
            uploaderName = uploader.email;
          }
        }

        // Fallback to current user profile if ID matches and we haven't found a name yet
        if ((uploaderName === 'Unknown User' || uploaderName === '') && user && record.uploaded_by === user.id) {
          if (profile && ((profile as any).first_name || (profile as any).last_name)) {
            uploaderName = `${(profile as any).first_name || ''} ${(profile as any).last_name || ''}`.trim();
          } else if (user.email) {
            uploaderName = user.email;
          }
        }

        return {
          ...record,
          uploader_name: uploaderName
        };
      });

      setHistory(formattedData);
    } catch (error) {
      console.error('Error loading import history:', error);
      logErrorToSupabase(error as Error, {
        errorType: 'ImportHistoryLoadError',
        severity: 'error',
        metadata: { source: 'ImportHistoryModal' }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadReport = (record: ImportHistoryRecord) => {
    const timestamp = formatDate(record.created_at);
    let reportContent = `EMPLOYEE IMPORT REPORT\n`;
    reportContent += `${'='.repeat(80)}\n\n`;
    reportContent += `Import Date: ${timestamp}\n`;
    reportContent += `File Name: ${record.file_name}\n`;
    reportContent += `Uploaded By: ${record.uploader_name}\n`;
    reportContent += `Country: ${record.country || organization?.country || 'N/A'}\n`;
    reportContent += `Total Rows: ${record.total_rows}\n`;
    reportContent += `Successfully Imported: ${record.successful_imports}\n`;
    reportContent += `Failed: ${record.failed_imports}\n`;
    reportContent += `\n${'='.repeat(80)}\n\n`;

    if (record.imported_employees && record.imported_employees.length > 0) {
      reportContent += `SUCCESSFULLY IMPORTED EMPLOYEES (${record.successful_imports})\n`;
      reportContent += `${'-'.repeat(80)}\n\n`;

      record.imported_employees.forEach((emp, index) => {
        reportContent += `${index + 1}. ${emp.name}\n`;
        reportContent += `   Email: ${emp.email}\n`;
        reportContent += `   Mobile: ${emp.mobile}\n`;
        reportContent += `   Type: ${emp.employment_type}\n`;
        reportContent += `\n`;
      });
    }

    if (record.failed_rows && record.failed_rows.length > 0) {
      reportContent += `\n${'='.repeat(80)}\n\n`;
      reportContent += `FAILED ROWS (${record.failed_rows.length})\n`;
      reportContent += `${'-'.repeat(80)}\n\n`;

      record.failed_rows.forEach((row) => {
        reportContent += `Row #${row.row_number}\n`;
        reportContent += `  Name: ${row.row_data.first_name} ${row.row_data.last_name}\n`;
        reportContent += `  Email: ${row.row_data.company_email || 'N/A'}\n`;
        reportContent += `  Mobile: ${row.row_data.mobile_number || 'N/A'}\n`;
        reportContent += `  Error: ${row.error}\n`;
        reportContent += `\n`;
      });
    }

    reportContent += `\n${'='.repeat(80)}\n`;
    reportContent += `End of Report\n`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-report-${new Date(record.created_at).getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (record: ImportHistoryRecord) => {
    if (record.failed_imports === 0 && record.successful_imports > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3" />
          Success
        </span>
      );
    } else if (record.successful_imports === 0 && record.failed_imports > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3" />
          Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <AlertCircle className="h-3 w-3" />
          Partial
        </span>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Import History</h2>
              <p className="text-sm text-slate-600">View all employee bulk imports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Import History</h3>
              <p className="text-slate-600">You haven't imported any employees yet.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-auto max-h-[600px]">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 min-w-[200px]">File Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 whitespace-nowrap">Imported By</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 whitespace-nowrap">Date</th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-900 whitespace-nowrap">Total</th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-900 whitespace-nowrap">Success</th>
                    <th className="px-6 py-3 text-center font-semibold text-slate-900 whitespace-nowrap">Failed</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 whitespace-nowrap">Country</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-900 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {history.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[250px]" title={record.file_name}>
                            {record.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          {record.uploader_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          {formatDate(record.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-slate-900 whitespace-nowrap">{record.total_rows}</td>
                      <td className="px-6 py-4 text-center font-medium text-green-600 whitespace-nowrap">{record.successful_imports}</td>
                      <td className="px-6 py-4 text-center font-medium text-red-600 whitespace-nowrap">{record.failed_imports}</td>
                      <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{record.country || organization?.country || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedRecord(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => downloadReport(record)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Download Report"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Import Details</h3>
                <p className="text-sm text-slate-600">{selectedRecord.file_name}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-slate-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-slate-900 mb-3">Import Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold">Date</span>
                    <p className="font-medium text-slate-900">{formatDate(selectedRecord.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold">Uploaded By</span>
                    <p className="font-medium text-slate-900">{selectedRecord.uploader_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold">Country</span>
                    <p className="font-medium text-slate-900">{selectedRecord.country || organization?.country || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 uppercase font-bold">Status</span>
                    <div className="mt-1">{getStatusBadge(selectedRecord)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <span className="text-xs text-slate-500 uppercase font-bold">Total Rows</span>
                    <p className="text-2xl font-bold text-slate-900">{selectedRecord.total_rows}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-500 uppercase font-bold">Success</span>
                    <p className="text-2xl font-bold text-green-600">{selectedRecord.successful_imports}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-500 uppercase font-bold">Failed</span>
                    <p className="text-2xl font-bold text-red-600">{selectedRecord.failed_imports}</p>
                  </div>
                </div>
              </div>

              {selectedRecord.imported_employees && selectedRecord.imported_employees.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Successfully Imported Employees ({selectedRecord.imported_employees.length})
                  </h4>

                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-slate-700">#</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-700">Email</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-700">Mobile</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-700">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedRecord.imported_employees.map((emp, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-2 text-slate-600">{index + 1}</td>
                            <td className="px-4 py-2 font-medium text-slate-900">{emp.name}</td>
                            <td className="px-4 py-2 text-slate-600">{emp.email}</td>
                            <td className="px-4 py-2 text-slate-600">{emp.mobile}</td>
                            <td className="px-4 py-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                {emp.employment_type}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {selectedRecord.failed_rows && selectedRecord.failed_rows.length > 0 && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Failed Rows ({selectedRecord.failed_rows.length})
                  </h4>

                  <div className="border border-red-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 border-b border-red-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-red-900">Row #</th>
                          <th className="px-4 py-2 text-left font-medium text-red-900">Name</th>
                          <th className="px-4 py-2 text-left font-medium text-red-900">Error Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-200">
                        {selectedRecord.failed_rows.map((row, index) => (
                          <tr key={index} className="hover:bg-red-50">
                            <td className="px-4 py-2 text-red-700 font-medium">{row.row_number}</td>
                            <td className="px-4 py-2 font-medium text-red-900">
                              {row.row_data.first_name} {row.row_data.last_name}
                              <div className="text-xs text-red-600 font-normal">
                                {row.row_data.company_email} • {row.row_data.mobile_number}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-red-700 text-sm">{row.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button
                onClick={() => downloadReport(selectedRecord)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                Download Full Report
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
