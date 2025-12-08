import { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, AlertCircle, Calendar, User, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
}

export function ImportHistoryModal({ onClose }: ImportHistoryModalProps) {
  const { organization } = useAuth();
  const [history, setHistory] = useState<ImportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ImportHistoryRecord | null>(null);

  useEffect(() => {
    loadHistory();
  }, [organization?.id]);

  const loadHistory = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('employee_import_history')
        .select(`
          *,
          uploader:uploaded_by (
            id,
            user_profiles (
              first_name,
              last_name
            )
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedData = data?.map((record: any) => ({
        ...record,
        uploader_name: record.uploader?.user_profiles?.[0]
          ? `${record.uploader.user_profiles[0].first_name} ${record.uploader.user_profiles[0].last_name}`
          : 'Unknown User'
      })) || [];

      setHistory(formattedData);
    } catch (error) {
      console.error('Error loading import history:', error);
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
              <div className="text-slate-600">Loading import history...</div>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Import History</h3>
              <p className="text-slate-600">You haven't imported any employees yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-slate-900">{record.file_name}</h3>
                        {record.failed_imports === 0 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Success
                          </span>
                        ) : record.successful_imports === 0 ? (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                            Failed
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                            Partial
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{formatDate(record.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{record.uploader_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-slate-600">
                            {record.successful_imports} imported
                          </span>
                        </div>
                        {record.failed_imports > 0 && (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-slate-600">
                              {record.failed_imports} failed
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-green-500 rounded-full h-2"
                            style={{
                              width: `${(record.successful_imports / record.total_rows) * 100}%`
                            }}
                          />
                        </div>
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {record.successful_imports}/{record.total_rows}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => downloadReport(record)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Download Report"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-600">Date:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {formatDate(selectedRecord.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Uploaded By:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {selectedRecord.uploader_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Total Rows:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {selectedRecord.total_rows}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Successfully Imported:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {selectedRecord.successful_imports}
                    </span>
                  </div>
                  {selectedRecord.failed_imports > 0 && (
                    <div>
                      <span className="text-slate-600">Failed:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {selectedRecord.failed_imports}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedRecord.imported_employees && selectedRecord.imported_employees.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Successfully Imported Employees ({selectedRecord.imported_employees.length})
                  </h4>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-slate-700">#</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700">Name</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700">Email</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700">Mobile</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-700">Type</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedRecord.imported_employees.map((emp, index) => (
                          <tr key={index} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{emp.name}</td>
                            <td className="px-4 py-3 text-slate-600">{emp.email}</td>
                            <td className="px-4 py-3 text-slate-600">{emp.mobile}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
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

                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 border-b border-red-200">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-red-900">Row #</th>
                          <th className="px-4 py-3 text-left font-medium text-red-900">Name</th>
                          <th className="px-4 py-3 text-left font-medium text-red-900">Email</th>
                          <th className="px-4 py-3 text-left font-medium text-red-900">Mobile</th>
                          <th className="px-4 py-3 text-left font-medium text-red-900">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-200">
                        {selectedRecord.failed_rows.map((row, index) => (
                          <tr key={index} className="hover:bg-red-50">
                            <td className="px-4 py-3 text-red-700 font-medium">{row.row_number}</td>
                            <td className="px-4 py-3 font-medium text-red-900">
                              {row.row_data.first_name} {row.row_data.last_name}
                            </td>
                            <td className="px-4 py-3 text-red-800">{row.row_data.company_email || '-'}</td>
                            <td className="px-4 py-3 text-red-800">{row.row_data.mobile_number || '-'}</td>
                            <td className="px-4 py-3 text-red-700 text-xs">{row.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => downloadReport(selectedRecord)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Report
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
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
