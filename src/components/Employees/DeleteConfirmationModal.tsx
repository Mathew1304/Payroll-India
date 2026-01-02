import { useState } from 'react';
import { AlertTriangle, X, UserX, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
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

interface AlertState {
  type: 'success' | 'error';
  title: string;
  message: string;
}

export function DeleteConfirmationModal({ employee, onClose, onSuccess }: DeleteConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<'exit' | 'delete' | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(null);

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

      setAlert({
        type: 'success',
        title: 'Employee Marked as Exited',
        message: `${employee.first_name} ${employee.last_name} has been marked as Exited. You can search for this employee in the future.`
      });
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error marking employee as exited:', error);
      setAlert({
        type: 'error',
        title: 'Failed to Mark as Exited',
        message: `Failed to mark employee as exited: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    setLoading(true);
    try {
      // First, handle foreign key references by setting them to NULL or deleting related records
      
      // 1. Update tasks where employee is assigned_to or assigned_by
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({ 
          assigned_to: null,
          assigned_by: null 
        })
        .or(`assigned_to.eq.${employee.id},assigned_by.eq.${employee.id}`);

      if (tasksError) {
        console.warn('Warning: Could not update tasks:', tasksError);
        // Continue anyway - some tasks might not exist
      }

      // 2. Update expenses where employee is approved_by
      const { error: expensesError } = await supabase
        .from('expenses')
        .update({ approved_by: null })
        .eq('approved_by', employee.id);

      if (expensesError) {
        console.warn('Warning: Could not update expenses:', expensesError);
      }

      // 3. Update tickets where employee is assigned_to
      const { error: ticketsError } = await supabase
        .from('tickets')
        .update({ assigned_to: null })
        .eq('assigned_to', employee.id);

      if (ticketsError) {
        console.warn('Warning: Could not update tickets:', ticketsError);
      }

      // 4. Update employees where this employee is reporting_manager_id
      const { error: reportingError } = await supabase
        .from('employees')
        .update({ reporting_manager_id: null })
        .eq('reporting_manager_id', employee.id);

      if (reportingError) {
        console.warn('Warning: Could not update reporting managers:', reportingError);
      }

      // Now delete the employee
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id);

      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503') {
          const constraintMatch = error.message.match(/constraint "([^"]+)"/);
          const constraintName = constraintMatch ? constraintMatch[1] : 'unknown';
          
          setAlert({
            type: 'error',
            title: 'Cannot Delete Employee',
            message: `This employee cannot be deleted because they are referenced in other records (${constraintName}). Please mark them as "Exited" instead, which will preserve the data while removing them from active lists.`
          });
          return;
        }
        throw error;
      }

      setAlert({
        type: 'success',
        title: 'Employee Deleted',
        message: `${employee.first_name} ${employee.last_name} has been permanently deleted from the database.`
      });
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      setAlert({
        type: 'error',
        title: 'Failed to Delete Employee',
        message: error.message || 'An unexpected error occurred while deleting the employee.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Show alert modal if there's an alert
  if (alert) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className={`p-6 rounded-t-2xl ${
            alert.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' 
              : 'bg-gradient-to-r from-red-500 to-red-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {alert.type === 'success' && <CheckCircle className="h-8 w-8 text-white" />}
                {alert.type === 'error' && <AlertCircle className="h-8 w-8 text-white" />}
                <h3 className="text-xl font-bold text-white">{alert.title}</h3>
              </div>
              <button
                onClick={() => {
                  setAlert(null);
                  if (alert.type === 'success') {
                    onClose();
                  }
                }}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
          <div className="p-6">
            <p className="text-slate-700 text-lg">{alert.message}</p>
            <button
              onClick={() => {
                setAlert(null);
                if (alert.type === 'success') {
                  onClose();
                }
              }}
              className={`mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all ${
                alert.type === 'success' 
                  ? 'bg-emerald-500 hover:bg-emerald-600' 
                  : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

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
