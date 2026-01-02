import { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertCircle, Loader, User, Mail, Phone, MapPin, Calendar, FileText, Building } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function OnboardingFormPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [token, setToken] = useState('');

  const [formData, setFormData] = useState({
    // Personal Information
    middle_name: '',
    date_of_birth: '',
    gender: 'male',
    marital_status: 'single',
    blood_group: '',
    company_email: '',
    personal_email: '',
    mobile_number: '',
    alternate_number: '',

    // Address
    current_address: '',
    permanent_address: '',
    city: '',
    state: '',
    pincode: '',

    // Banking Details
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_branch: '',

    // Identity Documents
    pan_number: '',
    aadhaar_number: '',
    uan_number: '',
    esi_number: '',

    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_relation: '',
    emergency_contact_phone: ''
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (tokenParam) {
      setToken(tokenParam);
      loadInvitation(tokenParam);
    } else {
      setError('Invalid or missing invitation token');
      setLoading(false);
    }
  }, []);

  const loadInvitation = async (invitationToken: string) => {
    try {
      setLoading(true);
      // First, get the invitation
      const { data: invitationData, error: fetchError } = await supabase
        .from('employee_invitations')
        .select('*')
        .eq('onboarding_token', invitationToken)
        .single();

      if (fetchError) throw fetchError;

      // Then, get the employee data separately if employee_id exists
      let employeeData = null;
      if (invitationData.employee_id) {
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .select('*')
          .eq('id', invitationData.employee_id)
          .single();
        
        if (!empError && empData) {
          employeeData = empData;
        }
      }

      const data = { ...invitationData, employee: employeeData };

      if (data.onboarding_completed) {
        setError('This onboarding form has already been completed');
        setLoading(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation link has expired');
        setLoading(false);
        return;
      }

      setInvitation(data);

      if (data.employee) {
        setFormData({
          middle_name: data.employee.middle_name || '',
          date_of_birth: data.employee.date_of_birth || '',
          gender: data.employee.gender || 'male',
          marital_status: data.employee.marital_status || 'single',
          blood_group: data.employee.blood_group || '',
          company_email: data.employee.company_email || '',
          personal_email: data.employee.personal_email || data.email || '',
          mobile_number: data.employee.mobile_number || '',
          alternate_number: data.employee.alternate_number || '',
          current_address: data.employee.current_address || '',
          permanent_address: data.employee.permanent_address || '',
          city: data.employee.city || '',
          state: data.employee.state || '',
          pincode: data.employee.pincode || '',
          bank_name: data.employee.bank_name || '',
          bank_account_number: data.employee.bank_account_number || '',
          bank_ifsc_code: data.employee.bank_ifsc_code || '',
          bank_branch: data.employee.bank_branch || '',
          pan_number: data.employee.pan_number || '',
          aadhaar_number: data.employee.aadhaar_number || '',
          uan_number: data.employee.uan_number || '',
          esi_number: data.employee.esi_number || '',
          emergency_contact_name: '',
          emergency_contact_relation: '',
          emergency_contact_phone: ''
        });
      }
    } catch (error: any) {
      console.error('Error loading invitation:', error);
      setError(error.message || 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          middle_name: formData.middle_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          marital_status: formData.marital_status,
          blood_group: formData.blood_group,
          company_email: formData.company_email,
          personal_email: formData.personal_email,
          mobile_number: formData.mobile_number,
          alternate_number: formData.alternate_number,
          current_address: formData.current_address,
          permanent_address: formData.permanent_address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          bank_ifsc_code: formData.bank_ifsc_code,
          bank_branch: formData.bank_branch,
          pan_number: formData.pan_number,
          aadhaar_number: formData.aadhaar_number,
          uan_number: formData.uan_number,
          esi_number: formData.esi_number,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_relationship: formData.emergency_contact_relation,
          emergency_contact_phone: formData.emergency_contact_phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', invitation.employee_id);

      if (updateError) throw updateError;

      const { error: invitationError } = await supabase
        .from('employee_invitations')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          form_data: formData
        })
        .eq('onboarding_token', token);

      if (invitationError) throw invitationError;

      setSuccess(true);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'Failed to submit onboarding form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading onboarding form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Onboarding Error</h2>
            <p className="text-slate-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Onboarding Complete!</h2>
            <p className="text-slate-600 mb-6">
              Thank you for completing your onboarding information. Your details have been successfully submitted.
            </p>
            <p className="text-sm text-slate-500">
              HR will review your information and contact you with next steps.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-10">
            <h1 className="text-3xl font-bold text-white">Employee Onboarding</h1>
            <p className="text-blue-100 mt-2">Complete your profile information</p>
            {invitation?.employee && (
              <div className="mt-4 bg-blue-500 bg-opacity-30 rounded-lg p-4">
                <p className="text-white font-semibold">
                  {invitation.employee.first_name} {invitation.employee.last_name}
                </p>
                <p className="text-blue-100 text-sm">{invitation.employee.employee_code} • {invitation.email}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <User className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middle_name}
                    onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    className="input-modern"
                    placeholder="Enter middle name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="input-modern"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gender *
                  </label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="input-modern"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Marital Status *
                  </label>
                  <select
                    required
                    value={formData.marital_status}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    className="input-modern"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    value={formData.blood_group}
                    onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                    className="input-modern"
                    placeholder="e.g., A+, O-, B+"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Company Email
                  </label>
                  <input
                    type="email"
                    value={formData.company_email}
                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                    className="input-modern"
                    placeholder="your.name@company.com"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Optional - Fill if you have one
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Personal Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.personal_email}
                    onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                    className="input-modern"
                    placeholder="your.personal@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.mobile_number}
                    onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                    className="input-modern"
                    placeholder="+91-9876543210"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Alternate Number
                  </label>
                  <input
                    type="tel"
                    value={formData.alternate_number}
                    onChange={(e) => setFormData({ ...formData, alternate_number: e.target.value })}
                    className="input-modern"
                    placeholder="+91-9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Address Details</h2>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Address *
                  </label>
                  <textarea
                    required
                    value={formData.current_address}
                    onChange={(e) => setFormData({ ...formData, current_address: e.target.value })}
                    className="input-modern"
                    rows={2}
                    placeholder="Enter current address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Permanent Address
                  </label>
                  <textarea
                    value={formData.permanent_address}
                    onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                    className="input-modern"
                    rows={2}
                    placeholder="Same as current or enter permanent address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="input-modern"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      State *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="input-modern"
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="input-modern"
                      placeholder="000000"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-6">
                <Building className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Banking Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="input-modern"
                    placeholder="Bank name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Account Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                    className="input-modern"
                    placeholder="Account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    IFSC Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.bank_ifsc_code}
                    onChange={(e) => setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase() })}
                    className="input-modern"
                    placeholder="IFSC Code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={formData.bank_branch}
                    onChange={(e) => setFormData({ ...formData, bank_branch: e.target.value })}
                    className="input-modern"
                    placeholder="Branch name"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Identity Documents</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PAN Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                    className="input-modern"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Aadhaar Number
                  </label>
                  <input
                    type="text"
                    value={formData.aadhaar_number}
                    onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
                    className="input-modern"
                    placeholder="1234 5678 9012"
                    maxLength={12}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    UAN Number
                  </label>
                  <input
                    type="text"
                    value={formData.uan_number}
                    onChange={(e) => setFormData({ ...formData, uan_number: e.target.value })}
                    className="input-modern"
                    placeholder="UAN Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ESI Number
                  </label>
                  <input
                    type="text"
                    value={formData.esi_number}
                    onChange={(e) => setFormData({ ...formData, esi_number: e.target.value })}
                    className="input-modern"
                    placeholder="ESI Number"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-8">
              <div className="flex items-center gap-2 mb-6">
                <Phone className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-bold text-slate-900">Emergency Contact</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                    className="input-modern"
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Relation
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_relation}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                    className="input-modern"
                    placeholder="e.g., Father, Spouse"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                    className="input-modern"
                    placeholder="+91-9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2 px-8 py-4 text-lg"
              >
                <Save className="h-6 w-6" />
                {submitting ? 'Submitting...' : 'Submit Onboarding Form'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
