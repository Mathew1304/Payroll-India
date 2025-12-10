import { useState } from 'react';
import { X, Save, User, Briefcase, Building, Banknote, FileText, Calendar, Mail, Send, CheckCircle, AlertCircle, Users as FamilyIcon, GraduationCap, Heart, Globe, Lock, Copy, Eye, EyeOff, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface AddEmployeeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  departments: any[];
  designations: any[];
  branches: any[];
}

interface AlertModal {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  invitationLink?: string;
  credentials?: {
    email: string;
    password: string;
  };
}

type TabType = 'personal' | 'employment' | 'family' | 'education' | 'documents' | 'health' | 'professional' | 'salary';

export function AddEmployeeModal({ onClose, onSuccess, departments, designations, branches }: AddEmployeeModalProps) {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('personal');
  const [alertModal, setAlertModal] = useState<AlertModal | null>(null);
  const [sendInvitation, setSendInvitation] = useState(true);
  const [invitationType, setInvitationType] = useState<'basic' | 'full_onboarding'>('full_onboarding');
  const [createLogin, setCreateLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isQatar = organization?.country === 'Qatar';
  const isSaudi = organization?.country === 'Saudi Arabia';
  const isIndia = organization?.country === 'India' || !organization?.country;
  const currencySymbol = isQatar ? 'QAR' : isSaudi ? 'SAR' : '₹';

  const DRAFT_KEY = `add_employee_draft_${organization?.id}`;

  const initialFormData = {
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    marital_status: 'single',
    blood_group: '',
    religion: '',
    place_of_birth: '',
    nationality: '',
    personal_email: '',
    company_email: '',
    mobile_number: '',
    alternate_number: '',
    current_address: '',
    permanent_address: '',
    city: '',
    state: '',
    pincode: '',

    department_id: '',
    designation_id: '',
    branch_id: '',
    employment_type: 'full_time',
    employment_status: 'probation',
    date_of_joining: '',
    probation_end_date: '',
    work_location: '',
    job_grade: '',
    job_level: '',

    contract_start_date: '',
    contract_end_date: '',
    contract_duration_months: '',
    notice_period_days: '30',

    pan_number: '',
    aadhaar_number: '',
    uan_number: '',
    esi_number: '',
    passport_number: '',
    passport_expiry: '',
    passport_issue_date: '',
    passport_issue_place: '',
    driving_license_number: '',
    driving_license_expiry: '',

    qatar_id: '',
    qatar_id_expiry: '',
    residence_permit_number: '',
    residence_permit_expiry: '',
    work_permit_number: '',
    work_permit_expiry: '',
    health_card_number: '',
    health_card_expiry: '',
    labor_card_number: '',
    labor_card_expiry: '',
    sponsor_name: '',
    sponsor_id: '',
    medical_fitness_certificate: '',
    medical_fitness_expiry: '',
    police_clearance_certificate: '',
    police_clearance_expiry: '',
    visa_number: '',
    visa_expiry: '',
    visa_issue_date: '',
    visa_sponsor: '',

    iqama_number: '',
    iqama_expiry: '',
    muqeem_id: '',
    kafala_sponsor_name: '',
    kafala_sponsor_id: '',
    jawazat_number: '',
    absher_id: '',
    medical_insurance_number: '',
    medical_insurance_provider: '',
    medical_insurance_expiry: '',

    professional_tax_number: '',
    pf_account_number: '',
    pf_uan: '',
    gratuity_nominee_name: '',
    gratuity_nominee_relationship: '',
    lwf_number: '',

    father_name: '',
    mother_name: '',
    spouse_name: '',
    number_of_children: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    emergency_contact_alternate: '',

    highest_qualification: '',
    institution: '',
    year_of_completion: '',
    specialization: '',

    previous_employer: '',
    previous_designation: '',
    previous_employment_from: '',
    previous_employment_to: '',
    previous_salary: '',
    reason_for_leaving: '',
    total_experience_years: '',

    medical_conditions: '',
    allergies: '',
    disabilities: '',
    hobbies: '',

    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    professional_summary: '',

    accommodation_provided: false,
    accommodation_address: '',
    accommodation_type: '',
    accommodation_allowance: '',
    transportation_provided: false,
    transportation_allowance: '',
    food_allowance: '',
    annual_leave_days: '21',
    sick_leave_days: '15',
    insurance_policy_number: '',
    insurance_provider: '',
    insurance_coverage_amount: '',
    insurance_expiry: '',
    dependents_covered: '',

    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_iban: '',
    bank_branch: '',
    ctc_annual: '',
    basic_salary: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  // Load draft on mount
  useState(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        setFormData(JSON.parse(savedDraft));
      } catch (e) {
        console.error('Error parsing draft:', e);
      }
    }
  });

  // Save draft on change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === 'checkbox') {
      newValue = (e.target as HTMLInputElement).checked;
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    if (!formData.company_email) {
      setAlertModal({
        type: 'error',
        title: 'Missing Email',
        message: 'Company email is required to create employee and send invitation.'
      });
      return;
    }

    setLoading(true);

    try {
      const employeePayload: any = {
        ...formData,
        organization_id: organization.id,
        ctc_annual: formData.ctc_annual ? parseFloat(formData.ctc_annual) : null,
        basic_salary: formData.basic_salary ? parseFloat(formData.basic_salary) : null,
        previous_salary: formData.previous_salary ? parseFloat(formData.previous_salary) : null,
        total_experience_years: formData.total_experience_years ? parseFloat(formData.total_experience_years) : null,
        accommodation_allowance: formData.accommodation_allowance ? parseFloat(formData.accommodation_allowance) : null,
        transportation_allowance: formData.transportation_allowance ? parseFloat(formData.transportation_allowance) : null,
        food_allowance: formData.food_allowance ? parseFloat(formData.food_allowance) : null,
        insurance_coverage_amount: formData.insurance_coverage_amount ? parseFloat(formData.insurance_coverage_amount) : null,
        number_of_children: formData.number_of_children ? parseInt(formData.number_of_children) : null,
        year_of_completion: formData.year_of_completion ? parseInt(formData.year_of_completion) : null,
        contract_duration_months: formData.contract_duration_months ? parseInt(formData.contract_duration_months) : null,
        notice_period_days: formData.notice_period_days ? parseInt(formData.notice_period_days) : null,
        annual_leave_days: formData.annual_leave_days ? parseInt(formData.annual_leave_days) : null,
        sick_leave_days: formData.sick_leave_days ? parseInt(formData.sick_leave_days) : null,
        dependents_covered: formData.dependents_covered ? parseInt(formData.dependents_covered) : null,
        department_id: formData.department_id || null,
        designation_id: formData.designation_id || null,
        branch_id: formData.branch_id || null
      };

      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .insert(employeePayload)
        .select()
        .single();

      if (employeeError) throw employeeError;

      let generatedPassword = '';
      if (createLogin) {
        // Generate random password: OrgName + Random 4 digits
        const orgPrefix = organization.name.substring(0, 3).toUpperCase();
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        generatedPassword = `${orgPrefix}@${randomDigits}`;

        const { error: functionError } = await supabase.functions.invoke('create-employee-user', {
          body: {
            email: formData.company_email,
            password: generatedPassword,
            organization_id: organization.id,
            employee_id: employeeData.id,
            first_name: formData.first_name,
            last_name: formData.last_name
          }
        });

        if (functionError) throw functionError;
      }

      if (sendInvitation && !createLogin) {
        const { data: inviteData, error: inviteError } = await supabase.rpc('generate_invitation_code');

        if (inviteError) throw inviteError;

        const invitationCode = inviteData;

        const { data: tokenData } = await supabase.rpc('generate_onboarding_token');
        const onboardingToken = tokenData || crypto.randomUUID();

        const { data: user } = await supabase.auth.getUser();

        const { error: insertError } = await supabase
          .from('employee_invitations')
          .insert({
            organization_id: organization.id,
            employee_id: employeeData.id,
            email: formData.company_email,
            invitation_code: invitationCode,
            onboarding_token: onboardingToken,
            invitation_type: invitationType,
            invited_by: user?.user?.id
          });

        if (insertError) throw insertError;

        await supabase
          .from('employees')
          .update({ invitation_sent: true })
          .eq('id', employeeData.id);

        const invitationLink = invitationType === 'full_onboarding'
          ? `${window.location.origin}/onboarding?token=${onboardingToken}`
          : `${window.location.origin}/employee-register?code=${invitationCode}`;

        setAlertModal({
          type: 'success',
          title: 'Employee Added Successfully!',
          message: invitationType === 'full_onboarding'
            ? `Employee has been created. Send this onboarding form link to ${formData.first_name} to collect their complete information:`
            : `Employee has been created. Share this invitation link with ${formData.first_name}:`,
          invitationLink: invitationLink
        });
      } else if (createLogin) {
        setAlertModal({
          type: 'success',
          title: 'Employee & Login Created!',
          message: `Employee ${formData.first_name} has been created with login access. Please share these credentials securely:`,
          credentials: {
            email: formData.company_email,
            password: generatedPassword
          }
        });
      } else {
        setAlertModal({
          type: 'success',
          title: 'Employee Added Successfully!',
          message: `Employee ${formData.first_name} ${formData.last_name} has been added to the system.`
        });

        // Clear draft and reset form
        localStorage.removeItem(DRAFT_KEY);
        setFormData(initialFormData);

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error adding employee:', error);
      setAlertModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to add employee: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = () => {
    if (alertModal?.invitationLink) {
      navigator.clipboard.writeText(alertModal.invitationLink);
      setAlertModal({
        ...alertModal,
        message: 'Invitation link copied to clipboard!'
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    }
  };

  const copyCredentials = () => {
    if (alertModal?.credentials) {
      const text = `Email: ${alertModal.credentials.email}\nPassword: ${alertModal.credentials.password}`;
      navigator.clipboard.writeText(text);
      setAlertModal({
        ...alertModal,
        message: 'Credentials copied to clipboard!'
      });
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'family', label: 'Family', icon: FamilyIcon },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'health', label: 'Health', icon: Heart },
    { id: 'professional', label: 'Professional', icon: Globe },
    { id: 'salary', label: 'Salary', icon: DollarSign }
  ];

  return (
    <>
      {alertModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-scaleIn">
            <div className={`p-6 rounded-t-2xl ${alertModal.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
              alertModal.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {alertModal.type === 'success' && <CheckCircle className="h-8 w-8 text-white" />}
                  {alertModal.type === 'error' && <AlertCircle className="h-8 w-8 text-white" />}
                  {alertModal.type === 'info' && <Mail className="h-8 w-8 text-white" />}
                  <h3 className="text-xl font-bold text-white">{alertModal.title}</h3>
                </div>
                <button
                  onClick={() => {
                    setAlertModal(null);
                    if (alertModal.type === 'success' && !alertModal.invitationLink) {
                      onSuccess();
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
              <p className="text-slate-700 text-base mb-4">{alertModal.message}</p>
              {alertModal.invitationLink && (
                <div className="bg-slate-100 rounded-lg p-4 mb-4">
                  <p className="text-xs text-slate-600 mb-2 font-semibold">Invitation Link:</p>
                  <p className="text-sm text-slate-900 break-all font-mono">{alertModal.invitationLink}</p>
                </div>
              )}

              {alertModal.credentials && (
                <div className="bg-slate-100 rounded-lg p-4 mb-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-600 mb-1 font-semibold">Email:</p>
                    <p className="text-sm text-slate-900 font-mono">{alertModal.credentials.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 mb-1 font-semibold">Password:</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-900 font-mono font-bold">
                        {showPassword ? alertModal.credentials.password : '••••••••'}
                      </p>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-1 hover:bg-slate-200 rounded transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4 text-slate-500" /> : <Eye className="h-4 w-4 text-slate-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    ⚠️ Copy these credentials now. The password will not be shown again.
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                {alertModal.invitationLink ? (
                  <button
                    onClick={copyInvitationLink}
                    className="flex-1 py-3 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Copy Link & Close
                  </button>
                ) : alertModal.credentials ? (
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={copyCredentials}
                      className="flex-1 py-3 rounded-xl font-semibold text-white bg-blue-500 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Credentials
                    </button>
                    <button
                      onClick={() => {
                        setAlertModal(null);
                        // Clear draft and reset form
                        localStorage.removeItem(DRAFT_KEY);
                        setFormData(initialFormData);
                        onSuccess();
                        onClose();
                      }}
                      className="flex-1 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAlertModal(null);
                      if (alertModal.type === 'success') {
                        onSuccess();
                        onClose();
                      }
                    }}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${alertModal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' :
                      alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                        'bg-blue-500 hover:bg-blue-600'
                      }`}>
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-2xl font-bold text-slate-900">Add New Employee</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex border-b border-slate-200 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as TabType)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${currentTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            {currentTab === 'personal' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      required
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      name="middle_name"
                      value={formData.middle_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      required
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Marital Status
                    </label>
                    <select
                      name="marital_status"
                      value={formData.marital_status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <input
                      type="text"
                      name="blood_group"
                      value={formData.blood_group}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="A+, B+, O-, etc"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nationality
                    </label>
                    <input
                      type="text"
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Place of Birth
                    </label>
                    <input
                      type="text"
                      name="place_of_birth"
                      value={formData.place_of_birth}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Religion
                    </label>
                    <input
                      type="text"
                      name="religion"
                      value={formData.religion}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      name="mobile_number"
                      required
                      value={formData.mobile_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Alternate Number
                    </label>
                    <input
                      type="tel"
                      name="alternate_number"
                      value={formData.alternate_number}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      name="personal_email"
                      value={formData.personal_email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Company Email
                    </label>
                    <input
                      type="email"
                      name="company_email"
                      value={formData.company_email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">Login Credentials</h3>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={createLogin}
                        onChange={(e) => {
                          setCreateLogin(e.target.checked);
                          if (e.target.checked) setSendInvitation(false);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    Create a user login for this employee immediately?
                  </p>
                  {createLogin && (
                    <div className="text-xs text-blue-600 bg-white p-2 rounded border border-blue-100">
                      A random password will be generated. You will be able to view and copy it after creation.
                      The employee will be forced to change it upon first login.
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Address
                  </label>
                  <textarea
                    name="current_address"
                    value={formData.current_address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Permanent Address
                  </label>
                  <textarea
                    name="permanent_address"
                    value={formData.permanent_address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'employment' && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      name="department_id"
                      value={formData.department_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Designation
                    </label>
                    <select
                      name="designation_id"
                      value={formData.designation_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Designation</option>
                      {designations.map(desig => (
                        <option key={desig.id} value={desig.id}>{desig.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Branch
                    </label>
                    <select
                      name="branch_id"
                      value={formData.branch_id}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Branch</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Work Location
                    </label>
                    <input
                      type="text"
                      name="work_location"
                      value={formData.work_location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Job Grade
                    </label>
                    <input
                      type="text"
                      name="job_grade"
                      value={formData.job_grade}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Job Level
                    </label>
                    <input
                      type="text"
                      name="job_level"
                      value={formData.job_level}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Employment Type *
                    </label>
                    <select
                      name="employment_type"
                      required
                      value={formData.employment_type}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Employment Status *
                    </label>
                    <select
                      name="employment_status"
                      required
                      value={formData.employment_status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="probation">Probation</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notice Period (Days)
                    </label>
                    <input
                      type="number"
                      name="notice_period_days"
                      value={formData.notice_period_days}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Date of Joining *
                    </label>
                    <input
                      type="date"
                      name="date_of_joining"
                      required
                      value={formData.date_of_joining}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Probation End Date
                    </label>
                    <input
                      type="date"
                      name="probation_end_date"
                      value={formData.probation_end_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contract Start Date
                    </label>
                    <input
                      type="date"
                      name="contract_start_date"
                      value={formData.contract_start_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      name="contract_end_date"
                      value={formData.contract_end_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Contract Duration (Months)
                    </label>
                    <input
                      type="number"
                      name="contract_duration_months"
                      value={formData.contract_duration_months}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Annual Leave Days
                    </label>
                    <input
                      type="number"
                      name="annual_leave_days"
                      value={formData.annual_leave_days}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sick Leave Days
                    </label>
                    <input
                      type="number"
                      name="sick_leave_days"
                      value={formData.sick_leave_days}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Accommodation & Benefits</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="accommodation_provided"
                        checked={formData.accommodation_provided}
                        onChange={handleChange}
                        className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      Accommodation Provided
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        name="transportation_provided"
                        checked={formData.transportation_provided}
                        onChange={handleChange}
                        className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      Transportation Provided
                    </label>
                  </div>

                  {formData.accommodation_provided && (
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Accommodation Type
                        </label>
                        <input
                          type="text"
                          name="accommodation_type"
                          value={formData.accommodation_type}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Accommodation Address
                        </label>
                        <input
                          type="text"
                          name="accommodation_address"
                          value={formData.accommodation_address}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Accommodation Allowance ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        name="accommodation_allowance"
                        value={formData.accommodation_allowance}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Transportation Allowance ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        name="transportation_allowance"
                        value={formData.transportation_allowance}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Food Allowance ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        name="food_allowance"
                        value={formData.food_allowance}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Banking Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        name="bank_name"
                        value={formData.bank_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        name="bank_account_number"
                        value={formData.bank_account_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {isIndia ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          IFSC Code
                        </label>
                        <input
                          type="text"
                          name="bank_ifsc_code"
                          value={formData.bank_ifsc_code}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="SBIN0001234"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Bank IBAN
                        </label>
                        <input
                          type="text"
                          name="bank_iban"
                          value={formData.bank_iban}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={isQatar ? "QA00XXXX0000000000000000000" : "SA00XXXX0000000000000000"}
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Bank Branch
                      </label>
                      <input
                        type="text"
                        name="bank_branch"
                        value={formData.bank_branch}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'family' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-slate-900">Family Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Father's Name
                    </label>
                    <input
                      type="text"
                      name="father_name"
                      value={formData.father_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Mother's Name
                    </label>
                    <input
                      type="text"
                      name="mother_name"
                      value={formData.mother_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Spouse Name
                    </label>
                    <input
                      type="text"
                      name="spouse_name"
                      value={formData.spouse_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Number of Children
                    </label>
                    <input
                      type="number"
                      name="number_of_children"
                      value={formData.number_of_children}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Emergency Contact</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Relationship
                      </label>
                      <input
                        type="text"
                        name="emergency_contact_relationship"
                        value={formData.emergency_contact_relationship}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Father, Mother, Spouse, etc"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Primary Phone
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Alternate Phone
                      </label>
                      <input
                        type="tel"
                        name="emergency_contact_alternate"
                        value={formData.emergency_contact_alternate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {isIndia && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-slate-900 mb-4">Nominee Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Gratuity Nominee Name
                        </label>
                        <input
                          type="text"
                          name="gratuity_nominee_name"
                          value={formData.gratuity_nominee_name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Nominee Relationship
                        </label>
                        <input
                          type="text"
                          name="gratuity_nominee_relationship"
                          value={formData.gratuity_nominee_relationship}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Insurance Coverage</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Policy Number
                      </label>
                      <input
                        type="text"
                        name="insurance_policy_number"
                        value={formData.insurance_policy_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Insurance Provider
                      </label>
                      <input
                        type="text"
                        name="insurance_provider"
                        value={formData.insurance_provider}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Dependents Covered
                      </label>
                      <input
                        type="number"
                        name="dependents_covered"
                        value={formData.dependents_covered}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Coverage Amount ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        name="insurance_coverage_amount"
                        value={formData.insurance_coverage_amount}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Insurance Expiry
                      </label>
                      <input
                        type="date"
                        name="insurance_expiry"
                        value={formData.insurance_expiry}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'education' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-slate-900">Educational Qualifications</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Highest Qualification
                    </label>
                    <input
                      type="text"
                      name="highest_qualification"
                      value={formData.highest_qualification}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="B.Tech, MBA, M.Sc, etc"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Institution/University
                    </label>
                    <input
                      type="text"
                      name="institution"
                      value={formData.institution}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Year of Completion
                    </label>
                    <input
                      type="number"
                      name="year_of_completion"
                      value={formData.year_of_completion}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="2020"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Specialization/Field
                    </label>
                    <input
                      type="text"
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Computer Science, Finance, etc"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Previous Employment</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Previous Employer
                      </label>
                      <input
                        type="text"
                        name="previous_employer"
                        value={formData.previous_employer}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Previous Designation
                      </label>
                      <input
                        type="text"
                        name="previous_designation"
                        value={formData.previous_designation}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Employment From
                      </label>
                      <input
                        type="date"
                        name="previous_employment_from"
                        value={formData.previous_employment_from}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Employment To
                      </label>
                      <input
                        type="date"
                        name="previous_employment_to"
                        value={formData.previous_employment_to}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Previous Salary ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        name="previous_salary"
                        value={formData.previous_salary}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Total Experience (Years)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        name="total_experience_years"
                        value={formData.total_experience_years}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Reason for Leaving
                      </label>
                      <input
                        type="text"
                        name="reason_for_leaving"
                        value={formData.reason_for_leaving}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'documents' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Document uploads will be available after creating the employee profile. Here you can enter document numbers and expiry dates.
                  </p>
                </div>

                {isIndia && (
                  <>
                    <h3 className="font-semibold text-slate-900">India - Government IDs</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          name="pan_number"
                          value={formData.pan_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="ABCDE1234F"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Aadhaar Number
                        </label>
                        <input
                          type="text"
                          name="aadhaar_number"
                          value={formData.aadhaar_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1234 5678 9012"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          UAN Number
                        </label>
                        <input
                          type="text"
                          name="uan_number"
                          value={formData.uan_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          PF Account Number
                        </label>
                        <input
                          type="text"
                          name="pf_account_number"
                          value={formData.pf_account_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          PF UAN
                        </label>
                        <input
                          type="text"
                          name="pf_uan"
                          value={formData.pf_uan}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          ESI Number
                        </label>
                        <input
                          type="text"
                          name="esi_number"
                          value={formData.esi_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Professional Tax Number
                        </label>
                        <input
                          type="text"
                          name="professional_tax_number"
                          value={formData.professional_tax_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          LWF Number
                        </label>
                        <input
                          type="text"
                          name="lwf_number"
                          value={formData.lwf_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {isQatar && (
                  <>
                    <h3 className="font-semibold text-slate-900">Qatar - Work Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Qatar ID (QID)
                        </label>
                        <input
                          type="text"
                          name="qatar_id"
                          value={formData.qatar_id}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Qatar ID Expiry
                        </label>
                        <input
                          type="date"
                          name="qatar_id_expiry"
                          value={formData.qatar_id_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Residence Permit (RP) Number
                        </label>
                        <input
                          type="text"
                          name="residence_permit_number"
                          value={formData.residence_permit_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          RP Expiry Date
                        </label>
                        <input
                          type="date"
                          name="residence_permit_expiry"
                          value={formData.residence_permit_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Work Permit Number
                        </label>
                        <input
                          type="text"
                          name="work_permit_number"
                          value={formData.work_permit_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Work Permit Expiry
                        </label>
                        <input
                          type="date"
                          name="work_permit_expiry"
                          value={formData.work_permit_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Health Card Number
                        </label>
                        <input
                          type="text"
                          name="health_card_number"
                          value={formData.health_card_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Health Card Expiry
                        </label>
                        <input
                          type="date"
                          name="health_card_expiry"
                          value={formData.health_card_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Labor Card Number
                        </label>
                        <input
                          type="text"
                          name="labor_card_number"
                          value={formData.labor_card_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Labor Card Expiry
                        </label>
                        <input
                          type="date"
                          name="labor_card_expiry"
                          value={formData.labor_card_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Medical Fitness Certificate
                        </label>
                        <input
                          type="text"
                          name="medical_fitness_certificate"
                          value={formData.medical_fitness_certificate}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Medical Fitness Expiry
                        </label>
                        <input
                          type="date"
                          name="medical_fitness_expiry"
                          value={formData.medical_fitness_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Police Clearance Certificate
                        </label>
                        <input
                          type="text"
                          name="police_clearance_certificate"
                          value={formData.police_clearance_certificate}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Police Clearance Expiry
                        </label>
                        <input
                          type="date"
                          name="police_clearance_expiry"
                          value={formData.police_clearance_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Sponsor Name
                        </label>
                        <input
                          type="text"
                          name="sponsor_name"
                          value={formData.sponsor_name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Sponsor ID
                        </label>
                        <input
                          type="text"
                          name="sponsor_id"
                          value={formData.sponsor_id}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {isSaudi && (
                  <>
                    <h3 className="font-semibold text-slate-900">Saudi Arabia - Work Documents</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Iqama Number
                        </label>
                        <input
                          type="text"
                          name="iqama_number"
                          value={formData.iqama_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Iqama Expiry
                        </label>
                        <input
                          type="date"
                          name="iqama_expiry"
                          value={formData.iqama_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Muqeem ID
                        </label>
                        <input
                          type="text"
                          name="muqeem_id"
                          value={formData.muqeem_id}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Jawazat Number
                        </label>
                        <input
                          type="text"
                          name="jawazat_number"
                          value={formData.jawazat_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Absher ID
                        </label>
                        <input
                          type="text"
                          name="absher_id"
                          value={formData.absher_id}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Kafala Sponsor Name
                        </label>
                        <input
                          type="text"
                          name="kafala_sponsor_name"
                          value={formData.kafala_sponsor_name}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Kafala Sponsor ID
                        </label>
                        <input
                          type="text"
                          name="kafala_sponsor_id"
                          value={formData.kafala_sponsor_id}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Medical Insurance Number
                        </label>
                        <input
                          type="text"
                          name="medical_insurance_number"
                          value={formData.medical_insurance_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Insurance Provider
                        </label>
                        <input
                          type="text"
                          name="medical_insurance_provider"
                          value={formData.medical_insurance_provider}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Insurance Expiry
                        </label>
                        <input
                          type="date"
                          name="medical_insurance_expiry"
                          value={formData.medical_insurance_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Passport & Visa</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Passport Number
                      </label>
                      <input
                        type="text"
                        name="passport_number"
                        value={formData.passport_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Passport Expiry
                      </label>
                      <input
                        type="date"
                        name="passport_expiry"
                        value={formData.passport_expiry}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Passport Issue Date
                      </label>
                      <input
                        type="date"
                        name="passport_issue_date"
                        value={formData.passport_issue_date}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Passport Issue Place
                      </label>
                      <input
                        type="text"
                        name="passport_issue_place"
                        value={formData.passport_issue_place}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {(isQatar || isSaudi) && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Visa Number
                        </label>
                        <input
                          type="text"
                          name="visa_number"
                          value={formData.visa_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Visa Issue Date
                        </label>
                        <input
                          type="date"
                          name="visa_issue_date"
                          value={formData.visa_issue_date}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Visa Expiry
                        </label>
                        <input
                          type="date"
                          name="visa_expiry"
                          value={formData.visa_expiry}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {(isQatar || isSaudi) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Visa Sponsor
                      </label>
                      <input
                        type="text"
                        name="visa_sponsor"
                        value={formData.visa_sponsor}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Driving License</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Driving License Number
                      </label>
                      <input
                        type="text"
                        name="driving_license_number"
                        value={formData.driving_license_number}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        License Expiry
                      </label>
                      <input
                        type="date"
                        name="driving_license_expiry"
                        value={formData.driving_license_expiry}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'health' && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    Health information is confidential and will only be accessible to HR/Admin personnel.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Medical Conditions
                  </label>
                  <textarea
                    name="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any chronic conditions, medications, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Allergies
                  </label>
                  <textarea
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Food allergies, drug allergies, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Disabilities (if any)
                  </label>
                  <textarea
                    name="disabilities"
                    value={formData.disabilities}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any disabilities requiring workplace accommodation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hobbies & Interests
                  </label>
                  <textarea
                    name="hobbies"
                    value={formData.hobbies}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sports, music, reading, etc."
                  />
                </div>
              </div>
            )}

            {currentTab === 'professional' && (
              <div className="space-y-6">
                <h3 className="font-semibold text-slate-900">Professional Profile</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Professional Summary
                  </label>
                  <textarea
                    name="professional_summary"
                    value={formData.professional_summary}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief professional bio or summary"
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-slate-900 mb-4">Social & Professional Links</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        LinkedIn Profile URL
                      </label>
                      <input
                        type="url"
                        name="linkedin_url"
                        value={formData.linkedin_url}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://linkedin.com/in/username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        GitHub Profile URL
                      </label>
                      <input
                        type="url"
                        name="github_url"
                        value={formData.github_url}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://github.com/username"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Portfolio/Website URL
                      </label>
                      <input
                        type="url"
                        name="portfolio_url"
                        value={formData.portfolio_url}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'salary' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Define the employee's annual CTC and basic salary. You can set up detailed salary components later from the employee profile.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Annual CTC ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      name="ctc_annual"
                      value={formData.ctc_annual}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={isQatar ? "150000" : isSaudi ? "180000" : "500000"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Basic Salary (Monthly) ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      name="basic_salary"
                      value={formData.basic_salary}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={isQatar ? "5000" : isSaudi ? "6000" : "25000"}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <h3 className="font-medium text-slate-900 mb-2">Salary Breakdown (Optional)</h3>
                  <p className="text-sm text-slate-600 mb-4">
                    You can configure detailed salary components from the employee's profile after creation.
                  </p>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <span>Basic Salary:</span>
                      <span className="font-medium">{currencySymbol} {formData.basic_salary || '0'}</span>
                    </div>
                    {isIndia && (
                      <div className="flex justify-between">
                        <span>HRA (40%):</span>
                        <span className="font-medium">{currencySymbol} {formData.basic_salary ? (parseFloat(formData.basic_salary) * 0.4).toFixed(2) : '0'}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-medium">Estimated Monthly Gross:</span>
                      <span className="font-medium">{currencySymbol} {formData.basic_salary ? (isIndia ? (parseFloat(formData.basic_salary) * 1.4).toFixed(2) : formData.basic_salary) : '0'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium"
              >
                Cancel
              </button>
              {currentTab === 'salary' && (
                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendInvitation}
                      onChange={(e) => setSendInvitation(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Send invitation link to employee
                    </span>
                  </label>

                  {sendInvitation && (
                    <div className="ml-6 space-y-2">
                      <p className="text-xs font-medium text-slate-600">Invitation Type:</p>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value="full_onboarding"
                          checked={invitationType === 'full_onboarding'}
                          onChange={(e) => setInvitationType(e.target.value as 'basic' | 'full_onboarding')}
                          className="text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium">Full Onboarding Form</span>
                          <p className="text-xs text-slate-500">Employee fills complete profile via web form</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          value="basic"
                          checked={invitationType === 'basic'}
                          onChange={(e) => setInvitationType(e.target.value as 'basic' | 'full_onboarding')}
                          className="text-blue-600 focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium">Basic Registration</span>
                          <p className="text-xs text-slate-500">Simple account creation only</p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {currentTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: TabType[] = ['personal', 'employment', 'family', 'education', 'documents', 'health', 'professional', 'salary'];
                    const currentIndex = tabs.indexOf(currentTab);
                    setCurrentTab(tabs[currentIndex - 1]);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors"
                >
                  Previous
                </button>
              )}
              {currentTab !== 'salary' ? (
                <button
                  type="button"
                  onClick={() => {
                    const tabs: TabType[] = ['personal', 'employment', 'family', 'education', 'documents', 'health', 'professional', 'salary'];
                    const currentIndex = tabs.indexOf(currentTab);
                    setCurrentTab(tabs[currentIndex + 1]);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving...' : 'Create Employee'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
