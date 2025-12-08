import { useState } from 'react';
import { AlertTriangle, X, UserX, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeleteConfirmationModalProps {
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    employee_code: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteConfirmationModal({ employee, onClose, onSuccess }: DeleteConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'exit' | 'delete' | null>(null);

  const handleMarkAsExited = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          employment_status: 'terminated',
          is_active: false,
          last_working_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) throw error;

      alert(`${employee.first_name} ${employee.last_name} has been marked as Exited. You can search for this employee in the future.`);
      onSuccess();
    } catch (error: any) {
      console.error('Error marking employee as exited:', error);
      alert(`Failed to mark employee as exited: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id);

      if (error) throw error;

      alert(`${employee.first_name} ${employee.last_name} has been permanently deleted from the database.`);
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      alert(`Failed to delete employee: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7" />
            <h2 className="text-xl font-bold">Remove Employee</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <p className="text-slate-700 font-medium mb-2">
              What would you like to do with:
            </p>
            <div className="bg-slate-50 rounded-lg p-4 border-2 border-slate-200">
              <p className="font-bold text-slate-900">{employee.first_name} {employee.last_name}</p>
              <p className="text-sm text-slate-600">{employee.employee_code}</p>
            </div>
          </div>

          {!action ? (
            <div className="space-y-3">
              <button
                onClick={() => setAction('exit')}
                className="w-full flex items-center gap-3 p-4 border-2 border-amber-300 bg-amber-50 rounded-xl hover:bg-amber-100 transition-all text-left group"
              >
                <div className="p-3 bg-amber-500 rounded-lg group-hover:scale-110 transition-transform">
                  <UserX className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Mark as Exited</p>
                  <p className="text-sm text-slate-600">Employee can be searched later</p>
                </div>
              </button>

              <button
                onClick={() => setAction('delete')}
                className="w-full flex items-center gap-3 p-4 border-2 border-red-300 bg-red-50 rounded-xl hover:bg-red-100 transition-all text-left group"
              >
                <div className="p-3 bg-red-600 rounded-lg group-hover:scale-110 transition-transform">
                  <Trash2 className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900">Permanently Delete</p>
                  <p className="text-sm text-slate-600">This action cannot be undone</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {action === 'exit' ? (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <UserX className="h-6 w-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-bold text-slate-900 mb-2">Mark as Exited</p>
                      <p className="text-sm text-slate-700">
                        This employee will be marked as "Exited" with their employment status set to "Terminated".
                        Their record will remain in the database, and you can search for them in the future if needed.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Trash2 className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-bold text-slate-900 mb-2">Permanently Delete</p>
                      <p className="text-sm text-slate-700">
                        This employee will be <strong>permanently deleted</strong> from the database.
                        All their data will be lost. This action <strong>cannot be undone</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setAction(null)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-semibold disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={action === 'exit' ? handleMarkAsExited : handlePermanentDelete}
                  disabled={loading}
                  className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                    action === 'exit'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800'
                      : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      {action === 'exit' ? <UserX className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                      Confirm {action === 'exit' ? 'Exit' : 'Delete'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {!action && (
            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-semibold"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
