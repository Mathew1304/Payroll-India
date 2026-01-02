import { useState, useEffect } from 'react';
import { X, Save, User, Briefcase, Building, Banknote, FileText, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AlertModal, AlertModalProps } from '../UI/AlertModal';
import { Gender, MaritalStatus, EmploymentType, EmploymentStatus, Database } from '../../lib/database.types';

type EmployeeRow = Database['public']['Tables']['employees']['Row'];

interface EditEmployeeModalProps {
  employeeId: string;
  onClose: () => void;
  onSuccess: () => void;
  departments: any[];
  designations: any[];
  branches: any[];
}

export function EditEmployeeModal({ employeeId, onClose, onSuccess, departments, designations, branches }: EditEmployeeModalProps) {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [currentTab, setCurrentTab] = useState<'personal' | 'employment' | 'salary' | 'documents'>('personal');
  const [alertModal, setAlertModal] = useState<AlertModalProps | null>(null);

  const isQatar = organization?.country === 'Qatar';
  const isSaudi = organization?.country === 'Saudi Arabia';
  const isIndia = organization?.country === 'India' || !organization?.country;
  const currencySymbol = isQatar ? 'QAR' : isSaudi ? 'SAR' : '₹';

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
    marital_status: 'single',
    blood_group: '',
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
    pan_number: '',
    aadhaar_number: '',
    uan_number: '',
    esi_number: '',
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
    iqama_number: '',
    iqama_expiry: '',
    gosi_number: '',
    border_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    iban_number: '',
    bank_branch: '',
    ctc_annual: '',
    basic_salary: '',
    accommodation_allowance: '',
    transportation_allowance: '',
    food_allowance: ''
  });

  useEffect(() => {
    loadEmployeeData();
  }, [employeeId]);

  const loadEmployeeData = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .single();

      if (error) throw error;

      if (data) {
        const emp = data as EmployeeRow;
        setFormData({
          first_name: emp.first_name || '',
          middle_name: emp.middle_name || '',
          last_name: emp.last_name || '',
          date_of_birth: emp.date_of_birth || '',
          gender: emp.gender || 'male',
          marital_status: emp.marital_status || 'single',
          blood_group: emp.blood_group || '',
          personal_email: emp.personal_email || '',
          company_email: emp.company_email || '',
          mobile_number: emp.mobile_number || '',
          alternate_number: emp.alternate_number || '',
          current_address: emp.current_address || '',
          permanent_address: emp.permanent_address || '',
          city: emp.city || '',
          state: emp.state || '',
          pincode: emp.pincode || '',
          department_id: emp.department_id || '',
          designation_id: emp.designation_id || '',
          branch_id: emp.branch_id || '',
          employment_type: emp.employment_type || 'full_time',
          employment_status: emp.employment_status || 'probation',
          date_of_joining: emp.date_of_joining || '',
          probation_end_date: emp.probation_end_date || '',
          pan_number: emp.pan_number || '',
          aadhaar_number: emp.aadhaar_number || '',
          uan_number: emp.uan_number || '',
          esi_number: emp.esi_number || '',
          qatar_id: emp.qatar_id || '',
          qatar_id_expiry: emp.qatar_id_expiry || '',
          residence_permit_number: emp.residence_permit_number || '',
          residence_permit_expiry: emp.residence_permit_expiry || '',
          work_permit_number: emp.work_permit_number || '',
          work_permit_expiry: emp.work_permit_expiry || '',
          health_card_number: emp.health_card_number || '',
          health_card_expiry: emp.health_card_expiry || '',
          labor_card_number: emp.labor_card_number || '',
          labor_card_expiry: emp.labor_card_expiry || '',
          sponsor_name: emp.sponsor_name || '',
          sponsor_id: emp.sponsor_id || '',
          iqama_number: emp.iqama_number || '',
          iqama_expiry: emp.iqama_expiry || '',
          gosi_number: emp.gosi_number || '',
          border_number: emp.border_number || '',
          bank_name: emp.bank_name || '',
          bank_account_number: emp.bank_account_number || '',
          bank_ifsc_code: emp.bank_ifsc_code || '',
          iban_number: emp.bank_iban || '',
          bank_branch: emp.bank_branch || '',
          ctc_annual: emp.ctc_annual?.toString() || '',
          basic_salary: emp.basic_salary?.toString() || '',
          accommodation_allowance: emp.accommodation_allowance?.toString() || '',
          transportation_allowance: emp.transportation_allowance?.toString() || '',
          food_allowance: emp.food_allowance?.toString() || ''
        });
      }
    } catch (error) {
      console.error('Error loading employee:', error);
      setAlertModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to load employee data',
        onClose: () => setAlertModal(null)
      });
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // console.log('Field changed:', name, value); 
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Convert empty date strings to null to avoid database errors
      const dateFields = [
        'date_of_birth', 'date_of_joining', 'probation_end_date',
        'qatar_id_expiry', 'residence_permit_expiry', 'work_permit_expiry',
        'health_card_expiry', 'labor_card_expiry', 'iqama_expiry'
      ];

      const updateData: any = { ...formData };

      // Convert empty strings to null for date fields
      dateFields.forEach(field => {
        if (updateData[field] === '') {
          updateData[field] = null;
        }
      });

      // Create final update object
      const finalUpdateData: any = {
        ...updateData,
        bank_iban: formData.iban_number || null,
        ctc_annual: formData.ctc_annual ? parseFloat(formData.ctc_annual) : null,
        basic_salary: formData.basic_salary ? parseFloat(formData.basic_salary) : null,
        accommodation_allowance: formData.accommodation_allowance ? parseFloat(formData.accommodation_allowance) : null,
        transportation_allowance: formData.transportation_allowance ? parseFloat(formData.transportation_allowance) : null,
        food_allowance: formData.food_allowance ? parseFloat(formData.food_allowance) : null,
        department_id: formData.department_id || null,
        designation_id: formData.designation_id || null,
        branch_id: formData.branch_id || null,
        gender: formData.gender as Gender,
        marital_status: formData.marital_status as MaritalStatus,
        employment_type: formData.employment_type as EmploymentType,
        employment_status: formData.employment_status as EmploymentStatus,
        updated_at: new Date().toISOString()
      };

      // Remove the form-only field 'iban_number' which isn't a DB column
      delete finalUpdateData.iban_number;

      const { error } = await supabase
        .from('employees')
        .update(finalUpdateData)
        .eq('id', employeeId);

      if (error) throw error;

      setAlertModal({
        type: 'success',
        title: 'Success',
        message: 'Employee updated successfully!',
        onClose: () => {
          setAlertModal(null);
          onSuccess();
        }
      });
    } catch (error: any) {
      console.error('Error updating employee:', error);
      setAlertModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to update employee: ' + error.message,
        onClose: () => setAlertModal(null)
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading employee data...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'employment', label: 'Employment', icon: Briefcase },
    { id: 'salary', label: 'Salary & Bank', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <User className="h-7 w-7" />
            Edit Employee
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex gap-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${currentTab === tab.id
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-slate-600 hover:bg-white/50'
                  }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-16rem)] overflow-y-auto">
          {currentTab === 'personal' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">First Name *</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Middle Name</label>
                  <input
                    type="text"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name *</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Marital Status</label>
                  <select
                    name="marital_status"
                    value={formData.marital_status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Blood Group</label>
                  <input
                    type="text"
                    name="blood_group"
                    value={formData.blood_group}
                    onChange={handleChange}
                    placeholder="e.g., A+, O-, B+"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Personal Email</label>
                  <input
                    type="email"
                    name="personal_email"
                    value={formData.personal_email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Company Email *</label>
                  <input
                    type="email"
                    name="company_email"
                    value={formData.company_email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Number *</label>
                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Alternate Number</label>
                  <input
                    type="tel"
                    name="alternate_number"
                    value={formData.alternate_number}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Current Address</label>
                  <textarea
                    name="current_address"
                    value={formData.current_address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Permanent Address</label>
                  <textarea
                    name="permanent_address"
                    value={formData.permanent_address}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Pincode</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab === 'employment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                  <select
                    name="department_id"
                    value={formData.department_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Designation</label>
                  <select
                    name="designation_id"
                    value={formData.designation_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Designation</option>
                    {designations.map(desig => (
                      <option key={desig.id} value={desig.id}>{desig.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Branch</label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Type</label>
                  <select
                    name="employment_type"
                    value={formData.employment_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Employment Status</label>
                  <select
                    name="employment_status"
                    value={formData.employment_status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="probation">Probation</option>
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Joining</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    value={formData.date_of_joining}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Probation End Date</label>
                  <input
                    type="date"
                    name="probation_end_date"
                    value={formData.probation_end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab === 'salary' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Annual CTC ({currencySymbol})</label>
                  <input
                    type="number"
                    name="ctc_annual"
                    value={formData.ctc_annual}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Basic Salary ({currencySymbol})</label>
                  <input
                    type="number"
                    name="basic_salary"
                    value={formData.basic_salary}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Accommodation Allow.</label>
                  <input
                    type="number"
                    name="accommodation_allowance"
                    value={formData.accommodation_allowance}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Transportation Allow.</label>
                  <input
                    type="number"
                    name="transportation_allowance"
                    value={formData.transportation_allowance}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Food Allowance</label>
                  <input
                    type="number"
                    name="food_allowance"
                    value={formData.food_allowance}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    name="bank_ifsc_code"
                    value={formData.bank_ifsc_code}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {(isQatar || isSaudi) && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">IBAN Number</label>
                    <input
                      type="text"
                      name="iban_number"
                      value={formData.iban_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Bank Branch</label>
                  <input
                    type="text"
                    name="bank_branch"
                    value={formData.bank_branch}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {currentTab === 'documents' && (
            <div className="space-y-6">
              {isIndia && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">PAN Number</label>
                    <input
                      type="text"
                      name="pan_number"
                      value={formData.pan_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Aadhaar Number</label>
                    <input
                      type="text"
                      name="aadhaar_number"
                      value={formData.aadhaar_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">UAN Number</label>
                    <input
                      type="text"
                      name="uan_number"
                      value={formData.uan_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">ESI Number</label>
                    <input
                      type="text"
                      name="esi_number"
                      value={formData.esi_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {isQatar && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Qatar ID</label>
                    <input
                      type="text"
                      name="qatar_id"
                      value={formData.qatar_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Qatar ID Expiry</label>
                    <input
                      type="date"
                      name="qatar_id_expiry"
                      value={formData.qatar_id_expiry}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Residence Permit Number</label>
                    <input
                      type="text"
                      name="residence_permit_number"
                      value={formData.residence_permit_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Residence Permit Expiry</label>
                    <input
                      type="date"
                      name="residence_permit_expiry"
                      value={formData.residence_permit_expiry}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Work Permit Number</label>
                    <input
                      type="text"
                      name="work_permit_number"
                      value={formData.work_permit_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Work Permit Expiry</label>
                    <input
                      type="date"
                      name="work_permit_expiry"
                      value={formData.work_permit_expiry}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sponsor Name</label>
                    <input
                      type="text"
                      name="sponsor_name"
                      value={formData.sponsor_name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Sponsor ID</label>
                    <input
                      type="text"
                      name="sponsor_id"
                      value={formData.sponsor_id}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {isSaudi && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Iqama Number</label>
                    <input
                      type="text"
                      name="iqama_number"
                      value={formData.iqama_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Iqama Expiry</label>
                    <input
                      type="date"
                      name="iqama_expiry"
                      value={formData.iqama_expiry}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">GOSI Number</label>
                    <input
                      type="text"
                      name="gosi_number"
                      value={formData.gosi_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Border Number</label>
                    <input
                      type="text"
                      name="border_number"
                      value={formData.border_number}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </form>

        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 rounded-b-2xl border-t border-slate-200 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Update Employee
              </>
            )}
          </button>
        </div>
      </div>

      {alertModal && (
        <AlertModal
          {...alertModal}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}
