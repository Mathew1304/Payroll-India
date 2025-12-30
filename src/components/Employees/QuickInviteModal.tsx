import { useState, useEffect } from 'react';
import { X, Send, CheckCircle, AlertCircle, Copy, Download, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateSalaryFromTakeHome, formatCurrency, SalaryBreakdown } from '../../utils/salaryUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    date_of_joining: '',
    take_home_salary: ''
  });

  const [salaryBreakdown, setSalaryBreakdown] = useState<SalaryBreakdown | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);

  useEffect(() => {
    if (organization?.id) {
      loadMasterData();
    }
  }, [organization]);

  useEffect(() => {
    if (formData.take_home_salary) {
      const amount = parseFloat(formData.take_home_salary);
      if (!isNaN(amount) && amount > 0) {
        setSalaryBreakdown(calculateSalaryFromTakeHome(amount));
      } else {
        setSalaryBreakdown(null);
      }
    } else {
      setSalaryBreakdown(null);
    }
  }, [formData.take_home_salary]);

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

  const generateOfferLetter = () => {
    if (!salaryBreakdown) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text(organization?.name || 'Company Name', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Strictly Private & Confidential', pageWidth / 2, 28, { align: 'center' });

    // Date and Ref
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, 40);
    doc.text(`Ref: OFF/${new Date().getFullYear()}/${Math.floor(Math.random() * 1000)}`, pageWidth - margin - 40, 40);

    // Candidate Details
    doc.setFontSize(11);
    doc.text(`To,`, margin, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formData.first_name} ${formData.last_name}`, margin, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(formData.email, margin, 65);

    // Subject
    doc.setFont('helvetica', 'bold');
    doc.text('Subject: Offer of Employment', margin, 80);

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const bodyText = `Dear ${formData.first_name},

We are pleased to offer you the position of ${(designations.find(d => d.id === formData.designation_id)?.name || 'Employee')} at ${organization?.name}. We believe your skills and experience will be an ideal fit for our team.

Your date of joining will be ${new Date(formData.date_of_joining).toLocaleDateString('en-GB')}.

The terms and conditions of your employment are attached herewith. Please sign and return the duplicate copy of this letter as a token of your acceptance.

We look forward to welcoming you to the team.`;

    const splitText = doc.splitTextToSize(bodyText, pageWidth - (margin * 2));
    doc.text(splitText, margin, 90);

    // Salary Table
    doc.setFont('helvetica', 'bold');
    doc.text('Annexure A: Salary Breakdown', margin, 150);

    autoTable(doc, {
      startY: 155,
      head: [['Component', 'Monthly (INR)', 'Annual (INR)']],
      body: [
        ['Basic Salary', formatCurrency(salaryBreakdown.basic), formatCurrency(salaryBreakdown.basic * 12)],
        ['HRA', formatCurrency(salaryBreakdown.hra), formatCurrency(salaryBreakdown.hra * 12)],
        ['Special Allowance', formatCurrency(salaryBreakdown.specialAllowance), formatCurrency(salaryBreakdown.specialAllowance * 12)],
        ['Gross Salary', formatCurrency(salaryBreakdown.grossSalary), formatCurrency(salaryBreakdown.grossSalary * 12)],
        ['PF (Employee)', formatCurrency(salaryBreakdown.employeePF), formatCurrency(salaryBreakdown.employeePF * 12)],
        ['Professional Tax', formatCurrency(salaryBreakdown.professionalTax), formatCurrency(salaryBreakdown.professionalTax * 12)],
        ['Net Salary (Take Home)', formatCurrency(salaryBreakdown.netSalary), formatCurrency(salaryBreakdown.netSalary * 12)],
        ['Employer PF', formatCurrency(salaryBreakdown.employerPF), formatCurrency(salaryBreakdown.employerPF * 12)],
        ['Cost to Company (CTC)', formatCurrency(salaryBreakdown.costToCompany), formatCurrency(salaryBreakdown.annualCTC)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 }
    });

    // Onboarding Link Section
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Onboarding Instructions:', margin, finalY);
    doc.setFont('helvetica', 'normal');
    const onboardingText = `Please complete your onboarding formalities by visiting the link below:
${invitationLink}`;
    doc.text(doc.splitTextToSize(onboardingText, pageWidth - (margin * 2)), margin, finalY + 7);

    // Save
    doc.save(`Offer_Letter_${formData.first_name}_${formData.last_name}.pdf`);
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
          mobile_number: '',
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
          created_by: user!.id
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
      alert('Link copied to clipboard!');
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
            <h2 className="text-2xl font-bold text-white">Invitation Created!</h2>
            <p className="text-emerald-100 mt-2">
              Employee {formData.first_name} {formData.last_name} has been added.
            </p>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                Offer Letter Ready
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                Download the generated offer letter containing the salary breakdown and onboarding instructions.
              </p>
              <button
                onClick={generateOfferLetter}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors font-medium"
              >
                <Download className="h-4 w-4" />
                Download Offer Letter PDF
              </button>
            </div>

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

            <div className="text-sm text-slate-500 text-center">
              Please email the PDF and Link to the candidate manually.
            </div>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full btn-secondary mt-2"
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
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Quick Invite & Offer</h2>
            <p className="text-blue-100 text-sm mt-1">Create employee and generate offer letter</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Monthly Take Home Salary (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.take_home_salary}
                onChange={(e) => setFormData({ ...formData, take_home_salary: e.target.value })}
                className="input-modern"
                placeholder="e.g. 50000"
              />
            </div>
          </div>

          {salaryBreakdown && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Salary Preview</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Gross Salary:</span>
                  <span className="font-medium text-slate-900 float-right">{formatCurrency(salaryBreakdown.grossSalary)}</span>
                </div>
                <div>
                  <span className="text-slate-500">LPA (CTC):</span>
                  <span className="font-medium text-emerald-600 float-right">{formatCurrency(salaryBreakdown.annualCTC)}</span>
                </div>
              </div>
            </div>
          )}

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
              {loading ? 'Creating...' : 'Generate Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
