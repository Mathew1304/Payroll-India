import { X, User, Mail, Phone, MapPin, Briefcase, Calendar, CreditCard, FileText, GraduationCap, Award, Globe, Heart, Shield, Home, Car, Plane, Bell, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertModal, AlertModalProps } from '../UI/AlertModal';

interface ViewEmployeeModalProps {
  employeeId: string;
  onClose: () => void;
}

type TabType = 'basic' | 'employment' | 'salary' | 'documents' | 'education' | 'additional';

export function ViewEmployeeModal({ employeeId, onClose }: ViewEmployeeModalProps) {
  const { user, organization } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [requestingInfo, setRequestingInfo] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [alertModal, setAlertModal] = useState<AlertModalProps | null>(null);

  const isIndia = organization?.country === 'India' || !organization?.country;
  console.log('ViewEmployeeModal: isIndia=', isIndia, 'Country=', organization?.country);

  useEffect(() => {
    loadEmployeeDetails();
  }, [employeeId]);

  const loadEmployeeDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          departments!department_id (name),
          designations!designation_id (title),
          branches!branch_id (name, city),
          manager:employees!reporting_manager_id (first_name, last_name, employee_code)
        `)
        .eq('id', employeeId)
        .single();

      if (error) throw error;
      setEmployee(data);
    } catch (error) {
      console.error('Error loading employee details:', error);
      console.error('Error loading employee details:', error);
      setAlertModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to load employee details',
        onClose: () => setAlertModal(null)
      });
    } finally {
      setLoading(false);
    }
  };

  const detectMissingFields = () => {
    const missing: string[] = [];

    if (!employee.email) missing.push('email');
    if (!employee.personal_email) missing.push('personal_email');
    if (!employee.phone) missing.push('phone');
    if (!employee.date_of_birth) missing.push('date_of_birth');
    if (!employee.gender) missing.push('gender');
    if (!employee.marital_status) missing.push('marital_status');
    if (!employee.qatar_id) missing.push('qatar_id');
    if (!employee.passport_number) missing.push('passport_number');
    if (!employee.iban) missing.push('iban');
    if (!employee.bank_name) missing.push('bank_name');
    if (!employee.emergency_contact_name) missing.push('emergency_contact_name');
    if (!employee.emergency_contact_phone) missing.push('emergency_contact_phone');

    return missing;
  };

  const handleRequestInformation = async () => {
    if (!user || !organization) return;

    setRequestingInfo(true);
    try {
      const missingFields = detectMissingFields();

      const { data: request, error: requestError } = await supabase
        .from('employee_profile_requests')
        .insert({
          organization_id: organization.id,
          employee_id: employeeId,
          requested_by: user.id,
          message: requestMessage || 'Please update your profile with missing information',
          missing_fields: missingFields,
          status: 'pending'
        })
        .select()
        .single();

      if (requestError) throw requestError;

      const { error: notifError } = await supabase
        .from('employee_notifications')
        .insert({
          organization_id: organization.id,
          employee_id: employeeId,
          user_id: employee.user_id,
          type: 'profile_update_request',
          title: 'Profile Update Required',
          message: requestMessage || `Please update your profile. Missing fields: ${missingFields.join(', ')}`,
          related_id: request.id,
          action_url: '/profile'
        });

      if (notifError) throw notifError;

      setAlertModal({
        type: 'success',
        title: 'Success',
        message: 'Information request sent successfully! The employee will be notified.',
        onClose: () => setAlertModal(null)
      });
      setShowRequestModal(false);
      setRequestMessage('');
    } catch (error) {
      console.error('Error sending request:', error);
      console.error('Error sending request:', error);
      setAlertModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to send information request',
        onClose: () => setAlertModal(null)
      });
    } finally {
      setRequestingInfo(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4 text-center">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (!employee) return null;

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'salary', label: 'Salary & Bank', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'additional', label: 'Additional', icon: Shield }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold backdrop-blur-sm border-2 border-white/30">
              {employee.first_name[0]}{employee.last_name[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {employee.first_name} {employee.middle_name || ''} {employee.last_name}
              </h2>
              <p className="text-blue-100 flex items-center gap-2">
                <span className="font-semibold">{employee.employee_code}</span>
                <span>•</span>
                <span>{employee.designations?.title || 'N/A'}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${employee.employment_status === 'active' ? 'bg-emerald-500' :
                  employee.employment_status === 'probation' ? 'bg-amber-500' :
                    employee.employment_status === 'terminated' ? 'bg-red-500' :
                      'bg-slate-500'
                  }`}>
                  {employee.employment_status?.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRequestModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium"
            >
              <Send className="h-4 w-4" />
              <span>Request Info</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex gap-1 p-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-slate-600 hover:bg-white/50'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section icon={User} title="Personal Information">
                <InfoRow label="Full Name" value={`${employee.first_name} ${employee.middle_name || ''} ${employee.last_name}`} />
                <InfoRow label="Date of Birth" value={formatDate(employee.date_of_birth)} />
                <InfoRow label="Gender" value={employee.gender || 'N/A'} />
                <InfoRow label="Marital Status" value={employee.marital_status || 'N/A'} />
                <InfoRow label="Blood Group" value={employee.blood_group || 'N/A'} />
                <InfoRow label="Nationality" value={employee.nationality || 'N/A'} />
                <InfoRow label="Religion" value={employee.religion || 'N/A'} />
              </Section>

              <Section icon={Mail} title="Contact Information">
                <InfoRow label="Company Email" value={employee.company_email || 'N/A'} />
                <InfoRow label="Personal Email" value={employee.personal_email || 'N/A'} />
                <InfoRow label="Mobile Number" value={employee.mobile_number || 'N/A'} />
                <InfoRow label="Alternate Number" value={employee.alternate_number || 'N/A'} />
                <InfoRow label="LinkedIn" value={employee.linkedin_url || 'N/A'} link={employee.linkedin_url} />
                <InfoRow label="GitHub" value={employee.github_url || 'N/A'} link={employee.github_url} />
              </Section>

              <Section icon={MapPin} title="Address Details">
                <InfoRow label="Current Address" value={employee.current_address || 'N/A'} />
                <InfoRow label="Permanent Address" value={employee.permanent_address || 'N/A'} />
                <InfoRow label="City" value={employee.city || 'N/A'} />
                <InfoRow label="State" value={employee.state || 'N/A'} />
                <InfoRow label="Pincode" value={employee.pincode || 'N/A'} />
              </Section>

              <Section icon={Heart} title="Emergency Contact">
                <InfoRow label="Contact Name" value={employee.emergency_contact_name || 'N/A'} />
                <InfoRow label="Relationship" value={employee.emergency_contact_relationship || 'N/A'} />
                <InfoRow label="Phone" value={employee.emergency_contact_phone || 'N/A'} />
                <InfoRow label="Father's Name" value={employee.father_name || 'N/A'} />
                <InfoRow label="Mother's Name" value={employee.mother_name || 'N/A'} />
                <InfoRow label="Spouse Name" value={employee.spouse_name || 'N/A'} />
              </Section>
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section icon={Briefcase} title="Employment Details">
                <InfoRow label="Department" value={employee.departments?.name || 'N/A'} />
                <InfoRow label="Designation" value={employee.designations?.title || 'N/A'} />
                <InfoRow label="Branch" value={employee.branches?.name || 'N/A'} />
                <InfoRow label="Employment Type" value={employee.employment_type || 'N/A'} />
                <InfoRow label="Employment Status" value={employee.employment_status || 'N/A'} />
                <InfoRow label="Date of Joining" value={formatDate(employee.date_of_joining)} />
                {employee.manager && (
                  <InfoRow
                    label="Reporting Manager"
                    value={`${employee.manager.first_name} ${employee.manager.last_name} (${employee.manager.employee_code})`}
                  />
                )}
              </Section>

              <Section icon={Calendar} title="Important Dates">
                <InfoRow label="Probation End" value={formatDate(employee.probation_end_date)} />
                <InfoRow label="Confirmation Date" value={formatDate(employee.confirmation_date)} />
                <InfoRow label="Contract Start" value={formatDate(employee.contract_start_date)} />
                <InfoRow label="Contract End" value={formatDate(employee.contract_end_date)} />
                {employee.last_working_date && (
                  <InfoRow label="Last Working Date" value={formatDate(employee.last_working_date)} />
                )}
              </Section>

              <Section icon={Briefcase} title="Previous Employment">
                <InfoRow label="Previous Employer" value={employee.previous_employer || 'N/A'} />
                <InfoRow label="Previous Designation" value={employee.previous_designation || 'N/A'} />
                <InfoRow label="Previous Salary" value={formatCurrency(employee.previous_salary)} />
                <InfoRow label="Total Experience" value={employee.total_experience_years ? `${employee.total_experience_years} years` : 'N/A'} />
                <InfoRow label="Reason for Leaving" value={employee.reason_for_leaving || 'N/A'} />
              </Section>

              <Section icon={Home} title="Benefits & Allowances">
                <InfoRow label="Accommodation" value={employee.accommodation_provided ? 'Provided' : 'Not Provided'} />
                <InfoRow label="Transportation" value={employee.transportation_provided ? 'Provided' : 'Not Provided'} />
                <InfoRow label="Annual Leave Days" value={employee.annual_leave_days || 'N/A'} />
                <InfoRow label="Sick Leave Days" value={employee.sick_leave_days || 'N/A'} />
                <InfoRow label="Notice Period" value={employee.notice_period_days ? `${employee.notice_period_days} days` : 'N/A'} />
              </Section>
            </div>
          )}

          {activeTab === 'salary' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section icon={CreditCard} title="Salary Details">
                <InfoRow label="Annual CTC" value={formatCurrency(employee.ctc_annual)} />
                <InfoRow label="Basic Salary" value={formatCurrency(employee.basic_salary)} />
                <InfoRow label="Accommodation Allowance" value={formatCurrency(employee.accommodation_allowance)} />
                <InfoRow label="Transportation Allowance" value={formatCurrency(employee.transportation_allowance)} />
                <InfoRow label="Food Allowance" value={formatCurrency(employee.food_allowance)} />
              </Section>

              <Section icon={CreditCard} title="Bank Details">
                <InfoRow label="Bank Name" value={employee.bank_name || 'N/A'} />
                <InfoRow label="Account Number" value={employee.bank_account_number || 'N/A'} />
                <InfoRow label="IFSC Code" value={employee.bank_ifsc_code || 'N/A'} />
                <InfoRow label="IBAN" value={employee.iban_number || 'N/A'} />
                <InfoRow label="Bank Branch" value={employee.bank_branch || 'N/A'} />
              </Section>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {isIndia && (
                <Section icon={FileText} title="India Documents">
                  <InfoRow label="PAN Number" value={employee.pan_number || 'N/A'} />
                  <InfoRow label="Aadhaar Number" value={employee.aadhaar_number || 'N/A'} />
                  <InfoRow label="UAN Number" value={employee.uan_number || 'N/A'} />
                  <InfoRow label="ESI Number" value={employee.esi_number || 'N/A'} />
                  <InfoRow label="PF Account" value={employee.pf_account_number || 'N/A'} />
                </Section>
              )}

              <Section icon={Plane} title="Passport & Visa">
                <InfoRow label="Passport Number" value={employee.passport_number || 'N/A'} />
                <InfoRow label="Issue Date" value={formatDate(employee.passport_issue_date)} />
                <InfoRow label="Expiry Date" value={formatDate(employee.passport_expiry)} />
                <InfoRow label="Visa Number" value={employee.visa_number || 'N/A'} />
                <InfoRow label="Visa Expiry" value={formatDate(employee.visa_expiry)} />
              </Section>

              {(employee.qatar_id || employee.iqama_number) && (
                <>
                  {employee.qatar_id && (
                    <Section icon={Shield} title="Qatar Documents">
                      <InfoRow label="Qatar ID" value={employee.qatar_id} />
                      <InfoRow label="Qatar ID Expiry" value={formatDate(employee.qatar_id_expiry)} />
                      <InfoRow label="Residence Permit" value={employee.residence_permit_number || 'N/A'} />
                      <InfoRow label="Work Permit" value={employee.work_permit_number || 'N/A'} />
                      <InfoRow label="Health Card" value={employee.health_card_number || 'N/A'} />
                      <InfoRow label="Sponsor Name" value={employee.sponsor_name || 'N/A'} />
                    </Section>
                  )}
                  {employee.iqama_number && (
                    <Section icon={Shield} title="Saudi Arabia Documents">
                      <InfoRow label="Iqama Number" value={employee.iqama_number} />
                      <InfoRow label="Iqama Expiry" value={formatDate(employee.iqama_expiry)} />
                      <InfoRow label="GOSI Number" value={employee.gosi_number || 'N/A'} />
                      <InfoRow label="Border Number" value={employee.border_number || 'N/A'} />
                      <InfoRow label="Saudi IBAN" value={employee.saudi_iban || 'N/A'} />
                    </Section>
                  )}
                </>
              )}

              <Section icon={Shield} title="Insurance">
                <InfoRow label="Medical Insurance No." value={employee.medical_insurance_number || 'N/A'} />
                <InfoRow label="Insurance Provider" value={employee.medical_insurance_provider || 'N/A'} />
                <InfoRow label="Expiry Date" value={formatDate(employee.medical_insurance_expiry)} />
                <InfoRow label="Coverage Amount" value={formatCurrency(employee.insurance_coverage_amount)} />
              </Section>
            </div>
          )}

          {activeTab === 'education' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section icon={GraduationCap} title="Education">
                <InfoRow label="Highest Qualification" value={employee.highest_qualification || 'N/A'} />
                <InfoRow label="Institution" value={employee.institution || 'N/A'} />
                <InfoRow label="Specialization" value={employee.specialization || 'N/A'} />
                <InfoRow label="Year of Completion" value={employee.year_of_completion || 'N/A'} />
              </Section>

              <Section icon={Award} title="Skills & Certifications">
                <InfoRow label="Skills" value={employee.skills ? JSON.stringify(employee.skills) : 'N/A'} />
                <InfoRow label="Certifications" value={employee.certifications ? JSON.stringify(employee.certifications) : 'N/A'} />
                <InfoRow label="Languages" value={employee.languages_known ? JSON.stringify(employee.languages_known) : 'N/A'} />
              </Section>
            </div>
          )}

          {activeTab === 'additional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Section icon={Car} title="Additional Details">
                <InfoRow label="Driving License" value={employee.driving_license_number || 'N/A'} />
                <InfoRow label="License Expiry" value={formatDate(employee.driving_license_expiry)} />
                <InfoRow label="Medical Conditions" value={employee.medical_conditions || 'N/A'} />
                <InfoRow label="Allergies" value={employee.allergies || 'N/A'} />
                <InfoRow label="Disabilities" value={employee.disabilities || 'N/A'} />
                <InfoRow label="Hobbies" value={employee.hobbies || 'N/A'} />
              </Section>

              <Section icon={Globe} title="Social & Portfolio">
                <InfoRow label="LinkedIn" value={employee.linkedin_url || 'N/A'} link={employee.linkedin_url} />
                <InfoRow label="GitHub" value={employee.github_url || 'N/A'} link={employee.github_url} />
                <InfoRow label="Portfolio" value={employee.portfolio_url || 'N/A'} link={employee.portfolio_url} />
                <InfoRow label="Professional Summary" value={employee.professional_summary || 'N/A'} />
              </Section>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold"
          >
            Close
          </button>
        </div>
      </div>

      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Request Information Update</h3>
                    <p className="text-sm text-blue-100">Send notification to employee</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-slate-600 mb-3">
                  Missing fields detected: <strong>{detectMissingFields().length} fields</strong>
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Bell className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium mb-1">Missing Information:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        {detectMissingFields().slice(0, 5).map((field) => (
                          <li key={field}>{field.replace(/_/g, ' ').toUpperCase()}</li>
                        ))}
                        {detectMissingFields().length > 5 && (
                          <li>and {detectMissingFields().length - 5} more...</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message to Employee (Optional)
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Add a custom message to the employee..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestInformation}
                  disabled={requestingInfo}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {requestingInfo ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {alertModal && (
        <AlertModal
          {...alertModal}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      {link && value !== 'N/A' ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline text-right break-all"
        >
          {value}
        </a>
      ) : (
        <span className="text-sm text-slate-900 font-medium text-right break-all">{value}</span>
      )}
    </div>
  );
}
