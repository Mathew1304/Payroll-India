import { useState, useEffect } from 'react';
import { X, Users, Upload, Send, CheckCircle, AlertCircle, Download, Copy, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BulkInviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface EmployeeInvite {
  first_name: string;
  last_name: string;
  email: string;
  department_id?: string;
  designation_id?: string;
  date_of_joining: string;
}

export function BulkInviteModal({ onClose, onSuccess }: BulkInviteModalProps) {
  const { organization, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitations, setInvitations] = useState<EmployeeInvite[]>([
    { first_name: '', last_name: '', email: '', date_of_joining: '' }
  ]);
  const [results, setResults] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  useEffect(() => {
    if (organization?.id) {
      loadMasterData();
    }
  }, [organization]);

  const loadMasterData = async () => {
    if (!organization?.id) return;

    const [deptResult, desigResult] = await Promise.all([
      supabase
        .from('departments')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('designations')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name')
    ]);

    if (deptResult.data) setDepartments(deptResult.data);
    if (desigResult.data) setDesignations(desigResult.data);
  };

  const addRow = () => {
    setInvitations([...invitations, { first_name: '', last_name: '', email: '', date_of_joining: '' }]);
  };

  const removeRow = (index: number) => {
    setInvitations(invitations.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof EmployeeInvite, value: string) => {
    const updated = [...invitations];
    updated[index] = { ...updated[index], [field]: value };
    setInvitations(updated);
  };

  const downloadTemplate = () => {
    const csv = 'First Name,Last Name,Personal Email,Joining Date\nJohn,Doe,john.doe@gmail.com,2025-01-15\nJane,Smith,jane.smith@gmail.com,2025-01-20';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_invite_template.csv';
    a.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const validInvitations = invitations.filter(
      inv => inv.first_name && inv.last_name && inv.email && inv.date_of_joining
    );

    if (validInvitations.length === 0) {
      setError('Please fill at least one complete employee invitation');
      setLoading(false);
      return;
    }

    try {
      const resultsList = [];

      for (const inv of validInvitations) {
        try {
          const employeeCode = `EMP${Math.floor(10000 + Math.random() * 90000)}`;

          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .insert({
              organization_id: organization!.id,
              first_name: inv.first_name,
              last_name: inv.last_name,
              personal_email: inv.email,
              company_email: inv.email,
              mobile_number: '0000000000', // Placeholder for bulk invite
              employee_code: employeeCode,
              department_id: inv.department_id || null,
              designation_id: inv.designation_id || null,
              date_of_joining: inv.date_of_joining,
              employment_status: 'probation',
              employment_type: 'full_time',
              is_active: true
            })
            .select()
            .single();

          if (employeeError) throw employeeError;

          const { data: inviteCodeData } = await supabase.rpc('generate_invitation_code');
          const { data: tokenData } = await supabase.rpc('generate_onboarding_token');
          const onboardingToken = tokenData || crypto.randomUUID();

          await supabase
            .from('employee_invitations')
            .insert({
              organization_id: organization!.id,
              employee_id: employeeData.id,
              email: inv.email,
              invitation_code: inviteCodeData,
              onboarding_token: onboardingToken,
              invitation_type: 'full_onboarding',
              created_by: user!.id
            });

          await supabase
            .from('employees')
            .update({ invitation_sent: true })
            .eq('id', employeeData.id);

          const link = `${window.location.origin}/onboarding?token=${onboardingToken}`;

          resultsList.push({
            success: true,
            name: `${inv.first_name} ${inv.last_name}`,
            email: inv.email,
            link
          });
        } catch (err: any) {
          resultsList.push({
            success: false,
            name: `${inv.first_name} ${inv.last_name}`,
            email: inv.email,
            error: err.message
          });
        }
      }

      setResults(resultsList);
      setSuccess(true);
    } catch (error: any) {
      console.error('Error sending bulk invitations:', error);
      setError(error.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  const copyAllLinks = () => {
    const links = results
      .filter(r => r.success)
      .map(r => `${r.name} (${r.email}): ${r.link}`)
      .join('\n\n');
    navigator.clipboard.writeText(links);
  };

  if (success) {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-white">Bulk Invitations Sent!</h2>
            <p className="text-emerald-100 mt-2">
              {successCount} successful • {failCount} failed
            </p>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${result.success
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-red-50 border-red-200'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{result.name}</p>
                      <p className="text-sm text-slate-600">{result.email}</p>
                      {result.success ? (
                        <div className="mt-2">
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={result.link}
                              readOnly
                              className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-mono"
                            />
                            <button
                              onClick={() => navigator.clipboard.writeText(result.link)}
                              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600 mt-2">Error: {result.error}</p>
                      )}
                    </div>
                    <div className={`ml-4 ${result.success ? 'text-emerald-600' : 'text-red-600'}`}>
                      {result.success ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 p-6 flex gap-3">
            <button
              onClick={copyAllLinks}
              className="flex-1 btn-secondary flex items-center justify-center gap-2"
            >
              <Copy className="h-5 w-5" />
              Copy All Links
            </button>
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="flex-1 btn-primary"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Bulk Invite Employees</h2>
            <p className="text-blue-100 text-sm mt-1">Send onboarding invitations to multiple employees at once</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={downloadTemplate}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              Download CSV Template
            </button>
            <button
              type="button"
              onClick={addRow}
              className="btn-primary flex items-center gap-2"
            >
              <Users className="h-5 w-5" />
              Add Employee
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-32">First Name *</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-32">Last Name *</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-48">Personal Email *</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-40">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-40">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 w-36">Joining Date *</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          required
                          value={inv.first_name}
                          onChange={(e) => updateRow(index, 'first_name', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="First"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          required
                          value={inv.last_name}
                          onChange={(e) => updateRow(index, 'last_name', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="Last"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="email"
                          required
                          value={inv.email}
                          onChange={(e) => updateRow(index, 'email', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="email@gmail.com"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={inv.department_id || ''}
                          onChange={(e) => updateRow(index, 'department_id', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="">Select</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={inv.designation_id || ''}
                          onChange={(e) => updateRow(index, 'designation_id', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="">Select</option>
                          {designations.map((desig) => (
                            <option key={desig.id} value={desig.id}>
                              {desig.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          required
                          value={inv.date_of_joining}
                          onChange={(e) => updateRow(index, 'date_of_joining', e.target.value)}
                          className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {invitations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>What happens next:</strong>
            </p>
            <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
              <li>Employees are created in the system</li>
              <li>Onboarding links are generated for each employee</li>
              <li>You receive all links to share via email</li>
              <li>Employees fill their complete information</li>
              <li>All details auto-update in the system</li>
            </ol>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              {loading ? 'Creating...' : `Create & Generate Links (${invitations.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
