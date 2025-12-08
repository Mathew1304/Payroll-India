import { useState, useEffect } from 'react';
import { X, Mail, Send, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface QuickInviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickInviteModal({ onClose, onSuccess }: QuickInviteModalProps) {
  const { organization, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitationLink, setInvitationLink] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department_id: '',
    designation_id: '',
    date_of_joining: ''
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const employeeCode = `EMP${Math.floor(10000 + Math.random() * 90000)}`;

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert({
          organization_id: organization!.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          personal_email: formData.email,
          employee_code: employeeCode,
          department_id: formData.department_id || null,
          designation_id: formData.designation_id || null,
          date_of_joining: formData.date_of_joining,
          employment_status: 'probation',
          employment_type: 'full_time',
          is_active: true
        })
        .select()
        .single();

      if (employeeError) throw employeeError;

      const { data: inviteCodeData, error: inviteCodeError } = await supabase.rpc('generate_invitation_code');
      if (inviteCodeError) throw inviteCodeError;

      const { data: tokenData } = await supabase.rpc('generate_onboarding_token');
      const onboardingToken = tokenData || crypto.randomUUID();

      const { error: inviteError } = await supabase
        .from('employee_invitations')
        .insert({
          organization_id: organization!.id,
          employee_id: employeeData.id,
          email: formData.email,
          invitation_code: inviteCodeData,
          onboarding_token: onboardingToken,
          invitation_type: 'full_onboarding',
          invited_by: user!.id
        });

      if (inviteError) throw inviteError;

      await supabase
        .from('employees')
        .update({ invitation_sent: true })
        .eq('id', employeeData.id);

      const link = `${window.location.origin}/onboarding?token=${onboardingToken}`;
      setInvitationLink(link);
      setSuccess(true);
    } catch (error: any) {
      console.error('Error creating quick invite:', error);
      setError(error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-8 rounded-t-2xl text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-white">Invitation Sent!</h2>
            <p className="text-emerald-100 mt-2">
              Employee {formData.first_name} {formData.last_name} has been created
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Onboarding Form Link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={invitationLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono"
                />
                <button
                  onClick={copyLink}
                  className="btn-primary flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Next Steps:</strong>
              </p>
              <ol className="text-sm text-blue-800 mt-2 space-y-1 list-decimal list-inside">
                <li>Copy the link above</li>
                <li>Send it to {formData.email}</li>
                <li>Employee fills complete onboarding form</li>
                <li>All details auto-update in system</li>
              </ol>
            </div>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full btn-secondary"
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
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-white">Quick Invite</h2>
            <p className="text-blue-100 text-sm mt-1">Employee fills everything via onboarding form</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-900">
              <strong>Quick Process:</strong> Only provide basic info and personal email. Employee will fill complete details
              (company email, personal info, address, banking, documents) via onboarding form link.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input-modern"
                placeholder="First name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input-modern"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Personal Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-modern"
              placeholder="employee@gmail.com"
            />
            <p className="text-xs text-slate-500 mt-1">
              Onboarding link will be sent to this personal email. They can fill their company email in the form.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Department
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="input-modern"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Designation
            </label>
            <select
              value={formData.designation_id}
              onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
              className="input-modern"
            >
              <option value="">Select Designation</option>
              {designations.map((desig) => (
                <option key={desig.id} value={desig.id}>
                  {desig.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Joining Date *
            </label>
            <input
              type="date"
              required
              value={formData.date_of_joining}
              onChange={(e) => setFormData({ ...formData, date_of_joining: e.target.value })}
              className="input-modern"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-emerald-900 mb-2">
              What Employee Will Fill:
            </p>
            <ul className="text-xs text-emerald-800 space-y-1">
              <li>✓ Personal details (DOB, gender, blood group, etc.)</li>
              <li>✓ Contact information (phone, alternate number)</li>
              <li>✓ Complete address details</li>
              <li>✓ Banking information (account, IFSC, etc.)</li>
              <li>✓ Identity documents (PAN, Aadhaar, UAN, ESI)</li>
              <li>✓ Document uploads</li>
              <li>✓ Emergency contact details</li>
            </ul>
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
              {loading ? 'Creating...' : 'Create & Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
