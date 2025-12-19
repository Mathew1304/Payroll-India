import { useEffect, useState } from 'react';
import { User, Briefcase, DollarSign, FileText, Mail, Phone, MapPin, Calendar, Building, Download, Eye, Edit, Save, X, Lock, Camera, CheckCircle, AlertCircle, Clock, TrendingUp, Calendar as CalendarIcon, Award, Heart, GraduationCap, Briefcase as BriefcaseIcon, Languages, Shield, Link as LinkIcon, Users as UsersIcon, AlertTriangle, FileCheck, CreditCard, BookOpen, Home, Plane, Stethoscope, Car, Utensils } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PayrollHistoryTab } from '../../components/Payroll/PayrollHistoryTab';
import { AdminOverviewTab } from '../../components/Profile/AdminOverviewTab';

interface SalaryComponent {
  id: string;
  component_id: string;
  amount: number;
  salary_components: {
    name: string;
    code: string;
    type: 'earning' | 'deduction';
  };
}

interface OfferLetter {
  id: string;
  offer_date: string;
  joining_date: string;
  ctc_annual: number;
  status: string;
  pdf_url?: string;
}

interface AlertModal {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface AttendanceStats {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  thisMonth: number;
}

interface LeaveStats {
  totalAvailable: number;
  totalTaken: number;
  pending: number;
}

export function EmployeeProfilePage() {
  const { membership, organization, user, profile } = useAuth();
  const [employee, setEmployee] = useState<any>(null);
  const [admin, setAdmin] = useState<any>(null); // Admin profile from organization_admins
  const [userProfile, setUserProfile] = useState<any>(null);
  const [salaryStructure, setSalaryStructure] = useState<SalaryComponent[]>([]);
  const [offerLetters, setOfferLetters] = useState<OfferLetter[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({ totalPresent: 0, totalAbsent: 0, totalLate: 0, thisMonth: 0 });
  const [leaveStats, setLeaveStats] = useState<LeaveStats>({ totalAvailable: 0, totalTaken: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [alertModal, setAlertModal] = useState<AlertModal | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'professional' | 'documents' | 'payroll'>('overview');

  const country = organization?.country || 'India';

  useEffect(() => {
    if (profile?.role && ['admin', 'hr'].includes(profile.role)) {
      setIsAdmin(true);
    }
    loadData();
  }, [profile, user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserProfile(profile);

      // Check if user is admin (has admin_id in organization_members)
      if (membership?.admin_id) {
        await loadAdminData();
      } else if (profile?.employee_id) {
        await loadEmployeeData();
        await loadAttendanceStats();
        await loadLeaveStats();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeData = async () => {
    if (!profile?.employee_id) return;

    try {
      const { data: empData } = await supabase
        .from('employees')
        .select(`
          *,
          departments!department_id (name),
          designations!designation_id (title),
          branches!branch_id (name, city)
        `)
        .eq('id', profile.employee_id)
        .single();

      setEmployee(empData);
      setEditFormData(empData);

      const { data: salaryData } = await supabase
        .from('salary_structures')
        .select(`
          *,
          salary_components (name, code, type)
        `)
        .eq('employee_id', profile.employee_id)
        .eq('is_active', true)
        .order('salary_components(type)', { ascending: false });

      setSalaryStructure(salaryData || []);

      const { data: offerData } = await supabase
        .from('offer_letters')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .order('created_at', { ascending: false });

      setOfferLetters(offerData || []);
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  const loadAdminData = async () => {
    if (!membership?.admin_id) return;

    try {
      const { data: adminData } = await supabase
        .from('organization_admins')
        .select('*')
        .eq('id', membership.admin_id)
        .single();

      setAdmin(adminData);
      setEditFormData(adminData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const loadAttendanceStats = async () => {
    if (!profile?.employee_id) return;

    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .gte('attendance_date', startOfMonth)
        .lte('attendance_date', today);

      const present = data?.filter(r => r.status === 'present').length || 0;
      const absent = data?.filter(r => r.status === 'absent').length || 0;
      const late = data?.filter(r => {
        if (!r.check_in_time) return false;
        const checkInTime = new Date(r.check_in_time);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        return hours > 9 || (hours === 9 && minutes > 30);
      }).length || 0;

      setAttendanceStats({
        totalPresent: present,
        totalAbsent: absent,
        totalLate: late,
        thisMonth: data?.length || 0
      });
    } catch (error) {
      console.error('Error loading attendance stats:', error);
    }
  };

  const loadLeaveStats = async () => {
    if (!profile?.employee_id) return;

    try {
      const { data: balances } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', profile.employee_id)
        .eq('year', new Date().getFullYear());

      const { data: applications } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('employee_id', profile.employee_id);

      const available = balances?.reduce((sum, b) => sum + Number(b.available_leaves), 0) || 0;
      const taken = applications?.filter(a => a.status === 'approved').reduce((sum, a) => sum + Number(a.total_days), 0) || 0;
      const pending = applications?.filter(a => a.status === 'pending').length || 0;

      setLeaveStats({
        totalAvailable: available,
        totalTaken: taken,
        pending: pending
      });
    } catch (error) {
      console.error('Error loading leave stats:', error);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      setEditFormData(admin || employee);
    }
    setIsEditMode(!isEditMode);
  };

  const handleEditChange = (field: string, value: any) => {
    setEditFormData({ ...editFormData, [field]: value });
  };

  const handleSaveProfile = async () => {
    // Handle admin profile update
    if (membership?.admin_id) {
      try {
        const { error } = await supabase
          .from('organization_admins')
          .update({
            mobile_number: editFormData.mobile_number || null,
            alternate_number: editFormData.alternate_number || null,
            current_address: editFormData.current_address || null,
            permanent_address: editFormData.permanent_address || null,
            city: editFormData.city || null,
            state: editFormData.state || null,
            country: editFormData.country || null,
            pincode: editFormData.pincode || null,
            date_of_birth: editFormData.date_of_birth || null,
            gender: editFormData.gender || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', membership.admin_id);

        if (error) throw error;

        setAlertModal({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your profile has been updated successfully.'
        });

        setIsEditMode(false);
        await loadAdminData();
      } catch (error: any) {
        console.error('Error updating admin profile:', error);
        setAlertModal({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update profile: ' + error.message
        });
      }
      return;
    }

    // Handle employee profile update
    if (!profile?.employee_id) return;

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          personal_email: editFormData.personal_email,
          mobile_number: editFormData.mobile_number,
          alternate_number: editFormData.alternate_number,
          current_address: editFormData.current_address,
          permanent_address: editFormData.permanent_address,
          city: editFormData.city,
          state: editFormData.state,
          pincode: editFormData.pincode,
          emergency_contact_name: editFormData.emergency_contact_name,
          emergency_contact_relationship: editFormData.emergency_contact_relationship,
          emergency_contact_phone: editFormData.emergency_contact_phone,
          emergency_contact_alternate: editFormData.emergency_contact_alternate,
          hobbies: editFormData.hobbies,
          linkedin_url: editFormData.linkedin_url,
          github_url: editFormData.github_url,
          portfolio_url: editFormData.portfolio_url,
          // New fields - convert empty strings to null for dates
          date_of_birth: editFormData.date_of_birth || null,
          gender: editFormData.gender,
          blood_group: editFormData.blood_group,
          marital_status: editFormData.marital_status,
          nationality: editFormData.nationality,
          religion: editFormData.religion,
          place_of_birth: editFormData.place_of_birth,
          father_name: editFormData.father_name,
          mother_name: editFormData.mother_name,
          spouse_name: editFormData.spouse_name,
          number_of_children: editFormData.number_of_children,
          // Document fields - convert empty strings to null
          pan_number: editFormData.pan_number || null,
          pan_expiry: editFormData.pan_expiry || null,
          aadhaar_number: editFormData.aadhaar_number || null,
          passport_number: editFormData.passport_number || null,
          passport_issue_date: editFormData.passport_issue_date || null,
          passport_expiry_date: editFormData.passport_expiry_date || null,
          passport_issue_place: editFormData.passport_issue_place || null,
          visa_number: editFormData.visa_number || null,
          visa_sponsor: editFormData.visa_sponsor || null,
          visa_issue_date: editFormData.visa_issue_date || null,
          visa_expiry_date: editFormData.visa_expiry_date || null,
          qatar_id: editFormData.qatar_id || null,
          qatar_id_expiry: editFormData.qatar_id_expiry || null,
          iqama_number: editFormData.iqama_number || null,
          iqama_expiry: editFormData.iqama_expiry || null,
          driving_license_number: editFormData.driving_license_number || null,
          driving_license_expiry: editFormData.driving_license_expiry || null,
          bank_name: editFormData.bank_name || null,
          bank_account_number: editFormData.bank_account_number || null,
          iban: editFormData.iban || null,
          branch: editFormData.branch || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.employee_id);

      if (error) throw error;

      setAlertModal({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.'
      });

      setIsEditMode(false);
      await loadEmployeeData();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setAlertModal({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to update employee: ' + error.message
      });
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword.length < 6) {
      setAlertModal({
        type: 'error',
        title: 'Invalid Password',
        message: 'Password must be at least 6 characters long.'
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setAlertModal({
        type: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirm password do not match.'
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      setAlertModal({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been changed successfully.'
      });

      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      setAlertModal({
        type: 'error',
        title: 'Password Change Failed',
        message: error.message || 'Failed to change password.'
      });
    }
  };

  const handleCreateAdminProfile = async () => {
    if (!user || !organization) return;
    setLoading(true);

    try {
      // 1. Create Employee Record
      const { data: newEmployee, error: createError } = await supabase
        .from('employees')
        .insert({
          organization_id: organization.id,
          first_name: userProfile?.full_name?.split(' ')[0] || 'Admin',
          last_name: userProfile?.full_name?.split(' ').slice(1).join(' ') || 'User',
          company_email: user.email,
          personal_email: user.email,
          mobile_number: '', // Schema requires this, but we can update later
          date_of_joining: new Date().toISOString().split('T')[0],
          employment_status: 'active',
          employment_type: 'full_time',
          user_id: user.id,
          // department_id: null, // Can be set later
          // designation_id: null, // Can be set later
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Link to Organization Member
      const { error: linkError } = await supabase
        .from('organization_members')
        .update({ employee_id: newEmployee.id })
        .eq('organization_id', organization.id)
        .eq('user_id', user.id);

      if (linkError) throw linkError;

      // 3. Link to User Profile (if not already handled by trigger)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ employee_id: newEmployee.id })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      setAlertModal({
        type: 'success',
        title: 'Profile Created',
        message: 'Your employee profile has been created successfully.'
      });

      // Reload data to show the new profile
      window.location.reload();

    } catch (error: any) {
      console.error('Error creating profile:', error);
      setAlertModal({
        type: 'error',
        title: 'Creation Failed',
        message: error.message || 'Failed to create profile.'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const earnings = salaryStructure
      .filter(s => s.salary_components.type === 'earning')
      .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);

    const deductions = salaryStructure
      .filter(s => s.salary_components.type === 'deduction')
      .reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0);

    const netSalary = earnings - deductions;

    return { earnings, deductions, netSalary };
  };

  const formatCurrency = (amount: number) => {
    const currency = country === 'Qatar' ? 'QAR' : country === 'Saudi Arabia' ? 'SAR' : 'INR';
    return `${currency} ${amount.toLocaleString()}`;
  };

  const maskSensitiveData = (data: string, visibleChars: number = 4) => {
    if (!data) return 'N/A';
    if (data.length <= visibleChars) return data;
    return '•'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
  };

  const isExpiringSoon = (date: string, daysThreshold: number = 90) => {
    if (!date) return false;
    const expiryDate = new Date(date);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= daysThreshold && diffDays >= 0;
  };

  const isExpired = (date: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const hasData = (fields: string[]) => {
    if (!employee) return false;
    return fields.some(field => employee[field]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          <User className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
        </div>
      </div>
    );
  }

  const profileData = admin || employee;
  const displayName = profileData
    ? `${profileData.first_name} ${profileData.middle_name || ''} ${profileData.last_name}`.trim()
    : userProfile?.full_name || user?.email || 'User';

  const totals = employee ? calculateTotals() : { earnings: 0, deductions: 0, netSalary: 0 };

  return (
    <>
      {alertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className={`p-6 rounded-t-2xl ${alertModal.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' :
              alertModal.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                'bg-gradient-to-r from-blue-500 to-blue-600'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {alertModal.type === 'success' && <CheckCircle className="h-8 w-8 text-white" />}
                  {alertModal.type === 'error' && <AlertCircle className="h-8 w-8 text-white" />}
                  {alertModal.type === 'info' && <User className="h-8 w-8 text-white" />}
                  <h3 className="text-xl font-bold text-white">{alertModal.title}</h3>
                </div>
                <button
                  onClick={() => setAlertModal(null)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-slate-700 text-lg">{alertModal.message}</p>
              <button
                onClick={() => setAlertModal(null)}
                className={`mt-6 w-full py-3 rounded-xl font-semibold text-white transition-all ${alertModal.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' :
                  alertModal.type === 'error' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-blue-500 hover:bg-blue-600'
                  }`}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-white" />
                  <h3 className="text-xl font-bold text-white">Change Password</h3>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm new password"
                  minLength={6}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <User className="h-8 w-8 text-blue-600" />
              My Profile
            </h1>
            <p className="text-slate-600 mt-2">Complete employee information - {country}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
            >
              <Lock className="h-4 w-4" />
              Change Password
            </button>
            {(employee || admin) && (
              <button
                onClick={isEditMode ? handleSaveProfile : handleEditToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isEditMode
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-700 hover:to-emerald-800'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                  }`}
              >
                {isEditMode ? (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {employee && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniStatCard icon={Clock} label="Present Days" value={attendanceStats.totalPresent} color="emerald" />
            <MiniStatCard icon={CalendarIcon} label="Leaves Taken" value={leaveStats.totalTaken} color="blue" />
            <MiniStatCard icon={TrendingUp} label="Late Arrivals" value={attendanceStats.totalLate} color="amber" />
            <MiniStatCard icon={Award} label="Leave Balance" value={leaveStats.totalAvailable} color="violet" />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="h-24 w-24 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-4xl font-bold text-blue-600">
                    {displayName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <button className="absolute -bottom-2 -right-2 p-2 bg-white rounded-full shadow-lg hover:bg-blue-50 transition-colors">
                  <Camera className="h-4 w-4 text-blue-600" />
                </button>
              </div>
              <div className="text-white flex-1">
                <h2 className="text-3xl font-bold mb-2">{displayName}</h2>
                {admin && (
                  <>
                    <p className="text-blue-100 text-lg">{admin.designation || 'Administrator'}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-blue-200 text-sm">{admin.admin_code}</p>
                      <p className="text-blue-200 text-sm">• Admin Profile</p>
                    </div>
                  </>
                )}
                {employee && (
                  <>
                    <p className="text-blue-100 text-lg">{employee.designations?.title || 'N/A'}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-blue-200 text-sm">{employee.employee_code}</p>
                      {employee.nationality && (
                        <p className="text-blue-200 text-sm">• {employee.nationality}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200">
            <div className="flex gap-2 px-6 overflow-x-auto">
              {/* Show only overview and personal tabs for admins */}
              {(admin ? ['overview', 'personal'] : ['overview', 'personal', 'professional', 'documents', 'payroll']).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-6 py-4 font-semibold text-sm transition-all whitespace-nowrap ${activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {!employee && !admin ? (
              <div className="text-center py-16">
                <div className="inline-flex p-6 bg-blue-50 rounded-full mb-6">
                  <User className="h-16 w-16 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Employee Profile Not Found</h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Your account is not yet linked to an employee profile.
                  {isAdmin ? " As an administrator, you can create your profile now." : " Please contact your HR administrator to complete your onboarding process."}
                </p>

                {isAdmin ? (
                  <button
                    onClick={handleCreateAdminProfile}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Creating Profile...
                      </>
                    ) : (
                      <>
                        <User className="h-5 w-5" />
                        Create My Profile
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 max-w-md mx-auto">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-left">
                        <h4 className="font-semibold text-amber-900 mb-2">What you can do:</h4>
                        <ul className="text-sm text-amber-800 space-y-1">
                          <li>• Contact your HR department</li>
                          <li>• Complete employee onboarding if invited</li>
                          <li>• Change your password using the button above</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                {activeTab === 'overview' && (
                  admin ? (
                    <AdminOverviewTab
                      admin={admin}
                      isEditMode={isEditMode}
                      editFormData={editFormData}
                      handleEditChange={handleEditChange}
                      country={country}
                    />
                  ) : (
                    <OverviewTab
                      employee={employee}
                      salaryStructure={salaryStructure}
                      offerLetters={offerLetters}
                      totals={totals}
                      formatCurrency={formatCurrency}
                      isEditMode={isEditMode}
                      editFormData={editFormData}
                      handleEditChange={handleEditChange}
                      hasData={hasData}
                      country={country}
                    />
                  )
                )}

                {activeTab === 'personal' && (
                  <PersonalTab
                    employee={admin || employee}
                    isEditMode={isEditMode}
                    editFormData={editFormData}
                    handleEditChange={handleEditChange}
                  />
                )}

                {!admin && activeTab === 'professional' && (
                  <ProfessionalTab
                    employee={employee}
                    isEditMode={isEditMode}
                    editFormData={editFormData}
                    handleEditChange={handleEditChange}
                    hasData={hasData}
                  />
                )}

                {!admin && activeTab === 'documents' && (
                  <DocumentsTab
                    employee={employee}
                    maskSensitiveData={maskSensitiveData}
                    isAdmin={isAdmin}
                    hasData={hasData}
                    country={country}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                    isEditMode={isEditMode}
                    editFormData={editFormData}
                    handleEditChange={handleEditChange}
                  />
                )}
                {!admin && activeTab === 'payroll' && employee && (
                  <PayrollHistoryTab employeeId={employee.id} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function OverviewTab({ employee, salaryStructure, offerLetters, totals, formatCurrency, isEditMode, editFormData, handleEditChange, hasData, country }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Section title="Contact Information" icon={Mail}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={Mail} label="Company Email" value={employee.company_email || 'N/A'} />
            {isEditMode ? (
              <EditableField
                icon={Mail}
                label="Personal Email"
                value={editFormData.personal_email || ''}
                onChange={(v) => handleEditChange('personal_email', v)}
                type="email"
              />
            ) : (
              <InfoItem icon={Mail} label="Personal Email" value={employee.personal_email || 'N/A'} />
            )}
            {isEditMode ? (
              <EditableField
                icon={Phone}
                label="Mobile"
                value={editFormData.mobile_number || ''}
                onChange={(v) => handleEditChange('mobile_number', v)}
                type="tel"
              />
            ) : (
              <InfoItem icon={Phone} label="Mobile" value={employee.mobile_number || 'N/A'} />
            )}
            {isEditMode ? (
              <EditableField
                icon={Phone}
                label="Alternate"
                value={editFormData.alternate_number || ''}
                onChange={(v) => handleEditChange('alternate_number', v)}
                type="tel"
              />
            ) : (
              <InfoItem icon={Phone} label="Alternate" value={employee.alternate_number || 'N/A'} />
            )}
          </div>
        </Section>

        <Section title="Employment Details" icon={Briefcase}>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem icon={Building} label="Department" value={employee.departments?.name || 'N/A'} />
            <InfoItem icon={Briefcase} label="Designation" value={employee.designations?.title || 'N/A'} />
            <InfoItem icon={MapPin} label="Branch" value={employee.branches?.name || 'N/A'} />
            <InfoItem icon={Calendar} label="Joining Date" value={employee.date_of_joining ? new Date(employee.date_of_joining).toLocaleDateString() : 'N/A'} />
            <InfoItem label="Employment Type" value={employee.employment_type?.replace('_', ' ').toUpperCase() || 'N/A'} />
            <InfoItem label="Status" value={employee.employment_status?.replace('_', ' ').toUpperCase() || 'N/A'} />
            {employee.job_grade && <InfoItem label="Job Grade" value={employee.job_grade} />}
            {employee.job_level && <InfoItem label="Job Level" value={employee.job_level} />}
            {employee.contract_start_date && <InfoItem label="Contract Start" value={new Date(employee.contract_start_date).toLocaleDateString()} />}
            {employee.contract_end_date && <InfoItem label="Contract End" value={new Date(employee.contract_end_date).toLocaleDateString()} />}
            {employee.notice_period_days && <InfoItem label="Notice Period" value={`${employee.notice_period_days} days`} />}
            {employee.work_location && <InfoItem label="Work Location" value={employee.work_location} />}
          </div>
        </Section>

        {salaryStructure.length > 0 && (
          <Section title="Salary & Benefits" icon={DollarSign}>
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 text-sm">Earnings</h4>
                {salaryStructure
                  .filter((s: any) => s.salary_components.type === 'earning')
                  .map((component: any) => (
                    <div key={component.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                      <span className="text-slate-700 text-sm">{component.salary_components.name}</span>
                      <span className="text-slate-900 font-bold text-sm">{formatCurrency(parseFloat(component.amount.toString()))}</span>
                    </div>
                  ))}
                <div className="flex items-center justify-between p-3 bg-emerald-100 rounded-lg border-2 border-emerald-200">
                  <span className="text-emerald-800 font-bold text-sm">Gross Earnings</span>
                  <span className="text-emerald-900 font-bold">{formatCurrency(totals.earnings)}</span>
                </div>
              </div>

              {salaryStructure.some((s: any) => s.salary_components.type === 'deduction') && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-700 text-sm">Deductions</h4>
                  {salaryStructure
                    .filter((s: any) => s.salary_components.type === 'deduction')
                    .map((component: any) => (
                      <div key={component.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-slate-700 text-sm">{component.salary_components.name}</span>
                        <span className="text-slate-900 font-bold text-sm">-{formatCurrency(parseFloat(component.amount.toString()))}</span>
                      </div>
                    ))}
                  <div className="flex items-center justify-between p-3 bg-red-100 rounded-lg border-2 border-red-200">
                    <span className="text-red-800 font-bold text-sm">Total Deductions</span>
                    <span className="text-red-900 font-bold">-{formatCurrency(totals.deductions)}</span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm mb-1">Net Monthly Salary</p>
                    <p className="text-2xl font-bold">{formatCurrency(totals.netSalary)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-blue-100 text-sm mb-1">Annual CTC</p>
                    <p className="text-xl font-bold">{formatCurrency(totals.earnings * 12)}</p>
                  </div>
                </div>
              </div>

              {(employee.accommodation_allowance || employee.transportation_allowance || employee.food_allowance) && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    Additional Allowances
                  </h4>
                  {employee.accommodation_allowance && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-slate-700 text-sm">Accommodation Allowance</span>
                      <span className="text-slate-900 font-semibold text-sm">{formatCurrency(parseFloat(employee.accommodation_allowance))}</span>
                    </div>
                  )}
                  {employee.transportation_allowance && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-slate-700 text-sm">Transportation Allowance</span>
                      <span className="text-slate-900 font-semibold text-sm">{formatCurrency(parseFloat(employee.transportation_allowance))}</span>
                    </div>
                  )}
                  {employee.food_allowance && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <span className="text-slate-700 text-sm">Food Allowance</span>
                      <span className="text-slate-900 font-semibold text-sm">{formatCurrency(parseFloat(employee.food_allowance))}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}
      </div>

      <div className="space-y-6">
        <Section title="Personal Details" icon={User}>
          <div className="space-y-3">
            {isEditMode ? (
              <>
                <EditableField
                  icon={Calendar}
                  label="Date of Birth"
                  value={editFormData.date_of_birth || ''}
                  onChange={(v) => handleEditChange('date_of_birth', v)}
                  type="date"
                />
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Gender</label>
                  <select
                    value={editFormData.gender || ''}
                    onChange={(e) => handleEditChange('gender', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <EditableField
                  icon={Heart}
                  label="Blood Group"
                  value={editFormData.blood_group || ''}
                  onChange={(v) => handleEditChange('blood_group', v)}
                />
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Marital Status</label>
                  <select
                    value={editFormData.marital_status || ''}
                    onChange={(e) => handleEditChange('marital_status', e.target.value)}
                    className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Status</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <EditableField
                  icon={Plane}
                  label="Nationality"
                  value={editFormData.nationality || ''}
                  onChange={(v) => handleEditChange('nationality', v)}
                />
                <EditableField
                  icon={BookOpen}
                  label="Religion"
                  value={editFormData.religion || ''}
                  onChange={(v) => handleEditChange('religion', v)}
                />
                <EditableField
                  icon={MapPin}
                  label="Place of Birth"
                  value={editFormData.place_of_birth || ''}
                  onChange={(v) => handleEditChange('place_of_birth', v)}
                />
              </>
            ) : (
              <>
                <SmallInfoItem label="Date of Birth" value={employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString() : 'N/A'} />
                <SmallInfoItem label="Gender" value={employee.gender?.toUpperCase() || 'N/A'} />
                <SmallInfoItem label="Blood Group" value={employee.blood_group || 'N/A'} />
                <SmallInfoItem label="Marital Status" value={employee.marital_status?.replace('_', ' ').toUpperCase() || 'N/A'} />
                <SmallInfoItem label="Nationality" value={employee.nationality || 'N/A'} />
                <SmallInfoItem label="Religion" value={employee.religion || 'N/A'} />
                <SmallInfoItem label="Place of Birth" value={employee.place_of_birth || 'N/A'} />
              </>
            )}
          </div>
        </Section>

        {(employee.accommodation_provided || employee.transportation_provided) && (
          <Section title="Company Benefits" icon={Home}>
            <div className="space-y-3">
              {employee.accommodation_provided && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Home className="h-4 w-4 text-emerald-600" />
                    <span className="font-semibold text-emerald-900 text-sm">Accommodation Provided</span>
                  </div>
                  {employee.accommodation_type && <SmallInfoItem label="Type" value={employee.accommodation_type} />}
                  {employee.accommodation_address && (
                    <p className="text-xs text-slate-600 mt-2">{employee.accommodation_address}</p>
                  )}
                </div>
              )}
              {employee.transportation_provided && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-blue-900 text-sm">Transportation Provided</span>
                  </div>
                </div>
              )}
              {employee.annual_leave_days && (
                <SmallInfoItem label="Annual Leave Days" value={`${employee.annual_leave_days} days`} />
              )}
              {employee.sick_leave_days && (
                <SmallInfoItem label="Sick Leave Days" value={`${employee.sick_leave_days} days`} />
              )}
            </div>
          </Section>
        )}

        {hasData(['emergency_contact_name', 'emergency_contact_phone']) && (
          <Section title="Emergency Contact" icon={AlertTriangle}>
            <div className="space-y-3">
              <SmallInfoItem label="Name" value={employee.emergency_contact_name || 'N/A'} />
              <SmallInfoItem label="Relationship" value={employee.emergency_contact_relationship || 'N/A'} />
              <SmallInfoItem label="Phone" value={employee.emergency_contact_phone || 'N/A'} />
            </div>
          </Section>
        )}

        {offerLetters.length > 0 && (
          <Section title="Offer Letters" icon={FileText}>
            <div className="space-y-3">
              {offerLetters.map((letter: any) => (
                <div key={letter.id} className="p-3 bg-gradient-to-br from-slate-50 to-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {new Date(letter.offer_date).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${letter.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                      letter.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                      {letter.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">
                    CTC: {formatCurrency(parseFloat(letter.ctc_annual.toString()))}
                  </p>
                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-violet-50 text-violet-600 rounded text-xs font-medium hover:bg-violet-100">
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                    {letter.pdf_url && (
                      <button className="flex items-center justify-center px-2 py-1 bg-slate-50 text-slate-600 rounded hover:bg-slate-100">
                        <Download className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

function PersonalTab({ employee, isEditMode, editFormData, handleEditChange }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Section title="Family Information" icon={UsersIcon}>
        <div className="space-y-3">
          {isEditMode ? (
            <>
              <EditableField
                icon={User}
                label="Father's Name"
                value={editFormData.father_name || ''}
                onChange={(v) => handleEditChange('father_name', v)}
              />
              <EditableField
                icon={User}
                label="Mother's Name"
                value={editFormData.mother_name || ''}
                onChange={(v) => handleEditChange('mother_name', v)}
              />
              <EditableField
                icon={Heart}
                label="Spouse's Name"
                value={editFormData.spouse_name || ''}
                onChange={(v) => handleEditChange('spouse_name', v)}
              />
              <EditableField
                icon={UsersIcon}
                label="Number of Children"
                value={editFormData.number_of_children || ''}
                onChange={(v) => handleEditChange('number_of_children', v)}
                type="number"
              />
            </>
          ) : (
            <>
              <SmallInfoItem label="Father's Name" value={employee.father_name || 'Not provided'} />
              <SmallInfoItem label="Mother's Name" value={employee.mother_name || 'Not provided'} />
              {employee.marital_status === 'married' && (
                <>
                  <SmallInfoItem label="Spouse's Name" value={employee.spouse_name || 'Not provided'} />
                  <SmallInfoItem label="Number of Children" value={employee.number_of_children || '0'} />
                </>
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Emergency Contact" icon={AlertTriangle}>
        <div className="space-y-3">
          {isEditMode ? (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Contact Name</label>
                <input
                  type="text"
                  value={editFormData.emergency_contact_name || ''}
                  onChange={(e) => handleEditChange('emergency_contact_name', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Relationship</label>
                <input
                  type="text"
                  value={editFormData.emergency_contact_relationship || ''}
                  onChange={(e) => handleEditChange('emergency_contact_relationship', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="e.g., Spouse, Parent, Sibling"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Primary Phone</label>
                <input
                  type="tel"
                  value={editFormData.emergency_contact_phone || ''}
                  onChange={(e) => handleEditChange('emergency_contact_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Alternate Phone</label>
                <input
                  type="tel"
                  value={editFormData.emergency_contact_alternate || ''}
                  onChange={(e) => handleEditChange('emergency_contact_alternate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Alternate number"
                />
              </div>
            </>
          ) : (
            <>
              <SmallInfoItem label="Name" value={employee.emergency_contact_name || 'Not provided'} />
              <SmallInfoItem label="Relationship" value={employee.emergency_contact_relationship || 'Not provided'} />
              <SmallInfoItem label="Primary Phone" value={employee.emergency_contact_phone || 'Not provided'} />
              <SmallInfoItem label="Alternate Phone" value={employee.emergency_contact_alternate || 'Not provided'} />
            </>
          )}
        </div>
      </Section>

      <Section title="Address Information" icon={MapPin}>
        <div className="space-y-4">
          {isEditMode ? (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Current Address</label>
                <textarea
                  value={editFormData.current_address || ''}
                  onChange={(e) => handleEditChange('current_address', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  rows={2}
                  placeholder="Street address, apartment/unit"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">City</label>
                  <input
                    type="text"
                    value={editFormData.city || ''}
                    onChange={(e) => handleEditChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">State</label>
                  <input
                    type="text"
                    value={editFormData.state || ''}
                    onChange={(e) => handleEditChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Pincode</label>
                <input
                  type="text"
                  value={editFormData.pincode || ''}
                  onChange={(e) => handleEditChange('pincode', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Permanent Address</label>
                <textarea
                  value={editFormData.permanent_address || ''}
                  onChange={(e) => handleEditChange('permanent_address', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  rows={2}
                  placeholder="Same as current or different"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-slate-500 mb-1">Current Address</p>
                <p className="text-sm font-medium text-slate-900">{employee.current_address || 'Not provided'}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SmallInfoItem label="City" value={employee.city || 'N/A'} />
                <SmallInfoItem label="State" value={employee.state || 'N/A'} />
              </div>
              <SmallInfoItem label="Pincode" value={employee.pincode || 'N/A'} />
              <div>
                <p className="text-xs text-slate-500 mb-1">Permanent Address</p>
                <p className="text-sm font-medium text-slate-900">{employee.permanent_address || 'Not provided'}</p>
              </div>
            </>
          )}
        </div>
      </Section>

      {isEditMode && (
        <Section title="Personal Interests" icon={Heart}>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hobbies & Interests</label>
            <textarea
              value={editFormData.hobbies || ''}
              onChange={(e) => handleEditChange('hobbies', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              rows={3}
              placeholder="Your hobbies, interests, activities..."
            />
          </div>
        </Section>
      )}
      {!isEditMode && employee.hobbies && (
        <Section title="Personal Interests" icon={Heart}>
          <p className="text-sm text-slate-700">{employee.hobbies}</p>
        </Section>
      )}
    </div>
  );
}

function ProfessionalTab({ employee, isEditMode, editFormData, handleEditChange, hasData }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {hasData(['highest_qualification', 'institution', 'specialization']) && (
        <Section title="Education" icon={GraduationCap}>
          <div className="space-y-3">
            <SmallInfoItem label="Highest Qualification" value={employee.highest_qualification || 'Not provided'} />
            <SmallInfoItem label="Institution" value={employee.institution || 'Not provided'} />
            <SmallInfoItem label="Specialization" value={employee.specialization || 'Not provided'} />
            <SmallInfoItem label="Year of Completion" value={employee.year_of_completion || 'Not provided'} />
          </div>
        </Section>
      )}

      {hasData(['previous_employer', 'previous_designation']) && (
        <Section title="Previous Employment" icon={BriefcaseIcon}>
          <div className="space-y-3">
            <SmallInfoItem label="Previous Employer" value={employee.previous_employer || 'Not provided'} />
            <SmallInfoItem label="Designation" value={employee.previous_designation || 'Not provided'} />
            {employee.previous_employment_from && (
              <SmallInfoItem
                label="Duration"
                value={`${new Date(employee.previous_employment_from).toLocaleDateString()} - ${employee.previous_employment_to ? new Date(employee.previous_employment_to).toLocaleDateString() : 'Present'}`}
              />
            )}
            {employee.total_experience_years && (
              <SmallInfoItem label="Total Experience" value={`${employee.total_experience_years} years`} />
            )}
            {employee.reason_for_leaving && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Reason for Leaving</p>
                <p className="text-sm font-medium text-slate-900">{employee.reason_for_leaving}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {employee.skills && Array.isArray(employee.skills) && employee.skills.length > 0 && (
        <Section title="Skills" icon={Award}>
          <div className="flex flex-wrap gap-2">
            {employee.skills.map((skill: string, idx: number) => (
              <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm font-medium rounded-full border border-blue-200">
                {skill}
              </span>
            ))}
          </div>
        </Section>
      )}

      {employee.certifications && Array.isArray(employee.certifications) && employee.certifications.length > 0 && (
        <Section title="Certifications" icon={Award}>
          <div className="space-y-2">
            {employee.certifications.map((cert: any, idx: number) => (
              <div key={idx} className="p-3 bg-violet-50 rounded-lg border border-violet-100">
                <p className="text-sm font-semibold text-slate-900">{cert.name || cert}</p>
                {cert.issuer && <p className="text-xs text-slate-600 mt-1">{cert.issuer}</p>}
                {cert.year && <p className="text-xs text-slate-500">{cert.year}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {employee.languages_known && Array.isArray(employee.languages_known) && employee.languages_known.length > 0 && (
        <Section title="Languages" icon={Languages}>
          <div className="space-y-2">
            {employee.languages_known.map((lang: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-sm font-medium text-slate-900">{lang.name || lang}</span>
                {lang.proficiency && (
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                    {lang.proficiency}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Professional Links" icon={LinkIcon}>
        <div className="space-y-3">
          {isEditMode ? (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">LinkedIn</label>
                <input
                  type="url"
                  value={editFormData.linkedin_url || ''}
                  onChange={(e) => handleEditChange('linkedin_url', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">GitHub</label>
                <input
                  type="url"
                  value={editFormData.github_url || ''}
                  onChange={(e) => handleEditChange('github_url', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="https://github.com/username"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Portfolio</label>
                <input
                  type="url"
                  value={editFormData.portfolio_url || ''}
                  onChange={(e) => handleEditChange('portfolio_url', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </>
          ) : (
            <>
              {employee.linkedin_url && (
                <a href={employee.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <LinkIcon className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">LinkedIn Profile</span>
                </a>
              )}
              {employee.github_url && (
                <a href={employee.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <LinkIcon className="h-4 w-4 text-slate-600" />
                  <span className="text-sm text-slate-700 font-medium">GitHub Profile</span>
                </a>
              )}
              {employee.portfolio_url && (
                <a href={employee.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors">
                  <LinkIcon className="h-4 w-4 text-violet-600" />
                  <span className="text-sm text-violet-700 font-medium">Portfolio Website</span>
                </a>
              )}
              {!employee.linkedin_url && !employee.github_url && !employee.portfolio_url && (
                <p className="text-sm text-slate-500">No professional links added</p>
              )}
            </>
          )}
        </div>
      </Section>

      {employee.professional_summary && (
        <Section title="Professional Summary" icon={BookOpen}>
          <p className="text-sm text-slate-700 leading-relaxed">{employee.professional_summary}</p>
        </Section>
      )}
    </div>
  );
}

function DocumentsTab({ employee, maskSensitiveData, isAdmin, hasData, country, isExpiringSoon, isExpired, isEditMode, editFormData, handleEditChange }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {country === 'India' && (
        <Section title="Indian Government IDs" icon={Shield}>
          <div className="space-y-3">
            {isEditMode ? (
              <>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">PAN Number</label>
                  <input
                    type="text"
                    value={editFormData.pan_number || ''}
                    onChange={(e) => handleEditChange('pan_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Aadhaar Number</label>
                  <input
                    type="text"
                    value={editFormData.aadhaar_number || ''}
                    onChange={(e) => handleEditChange('aadhaar_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">UAN Number</label>
                  <input
                    type="text"
                    value={editFormData.uan_number || ''}
                    onChange={(e) => handleEditChange('uan_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">PF Account</label>
                  <input
                    type="text"
                    value={editFormData.pf_account_number || ''}
                    onChange={(e) => handleEditChange('pf_account_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">PF UAN</label>
                  <input
                    type="text"
                    value={editFormData.pf_uan || ''}
                    onChange={(e) => handleEditChange('pf_uan', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">ESI Number</label>
                  <input
                    type="text"
                    value={editFormData.esi_number || ''}
                    onChange={(e) => handleEditChange('esi_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Professional Tax</label>
                  <input
                    type="text"
                    value={editFormData.professional_tax_number || ''}
                    onChange={(e) => handleEditChange('professional_tax_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">LWF Number</label>
                  <input
                    type="text"
                    value={editFormData.lwf_number || ''}
                    onChange={(e) => handleEditChange('lwf_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Driving License</label>
                  <input
                    type="text"
                    value={editFormData.driving_license_number || ''}
                    onChange={(e) => handleEditChange('driving_license_number', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">DL Expiry</label>
                  <input
                    type="date"
                    value={editFormData.driving_license_expiry || ''}
                    onChange={(e) => handleEditChange('driving_license_expiry', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </>
            ) : (
              <>
                <SmallInfoItem label="PAN Number" value={maskSensitiveData(employee.pan_number)} />
                <SmallInfoItem label="Aadhaar Number" value={maskSensitiveData(employee.aadhaar_number)} />
                <SmallInfoItem label="UAN Number" value={employee.uan_number || 'N/A'} />
                <SmallInfoItem label="PF Account" value={employee.pf_account_number || 'N/A'} />
                <SmallInfoItem label="PF UAN" value={employee.pf_uan || 'N/A'} />
                <SmallInfoItem label="ESI Number" value={employee.esi_number || 'N/A'} />
                <SmallInfoItem label="Professional Tax" value={employee.professional_tax_number || 'N/A'} />
                <SmallInfoItem label="LWF Number" value={employee.lwf_number || 'N/A'} />
                {employee.driving_license_number && (
                  <>
                    <SmallInfoItem label="Driving License" value={employee.driving_license_number} />
                    <ExpiryItem
                      label="DL Expiry"
                      date={employee.driving_license_expiry}
                      isExpiringSoon={isExpiringSoon}
                      isExpired={isExpired}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </Section>
      )}

      {country === 'Qatar' && (
        <>
          <Section title="Qatar Documents" icon={Plane}>
            <div className="space-y-3">
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Qatar ID</label>
                    <input
                      type="text"
                      value={editFormData.qatar_id || ''}
                      onChange={(e) => handleEditChange('qatar_id', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Qatar ID Expiry</label>
                    <input
                      type="date"
                      value={editFormData.qatar_id_expiry || ''}
                      onChange={(e) => handleEditChange('qatar_id_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Residence Permit</label>
                    <input
                      type="text"
                      value={editFormData.residence_permit_number || ''}
                      onChange={(e) => handleEditChange('residence_permit_number', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">RP Expiry</label>
                    <input
                      type="date"
                      value={editFormData.residence_permit_expiry || ''}
                      onChange={(e) => handleEditChange('residence_permit_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Work Permit</label>
                    <input
                      type="text"
                      value={editFormData.work_permit_number || ''}
                      onChange={(e) => handleEditChange('work_permit_number', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Work Permit Expiry</label>
                    <input
                      type="date"
                      value={editFormData.work_permit_expiry || ''}
                      onChange={(e) => handleEditChange('work_permit_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Labor Card</label>
                    <input
                      type="text"
                      value={editFormData.labor_card_number || ''}
                      onChange={(e) => handleEditChange('labor_card_number', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Labor Card Expiry</label>
                    <input
                      type="date"
                      value={editFormData.labor_card_expiry || ''}
                      onChange={(e) => handleEditChange('labor_card_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <SmallInfoItem label="Qatar ID" value={employee.qatar_id || 'N/A'} />
                  <ExpiryItem
                    label="Qatar ID Expiry"
                    date={employee.qatar_id_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                  <SmallInfoItem label="Residence Permit" value={employee.residence_permit_number || 'N/A'} />
                  <ExpiryItem
                    label="RP Expiry"
                    date={employee.residence_permit_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                  <SmallInfoItem label="Work Permit" value={employee.work_permit_number || 'N/A'} />
                  <ExpiryItem
                    label="Work Permit Expiry"
                    date={employee.work_permit_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                  <SmallInfoItem label="Labor Card" value={employee.labor_card_number || 'N/A'} />
                  <ExpiryItem
                    label="Labor Card Expiry"
                    date={employee.labor_card_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                </>
              )}
            </div>
          </Section>

          <Section title="Qatar Health & Sponsorship" icon={Stethoscope}>
            <div className="space-y-3">
              {isEditMode ? (
                <>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Health Card</label>
                    <input
                      type="text"
                      value={editFormData.health_card_number || ''}
                      onChange={(e) => handleEditChange('health_card_number', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Health Card Expiry</label>
                    <input
                      type="date"
                      value={editFormData.health_card_expiry || ''}
                      onChange={(e) => handleEditChange('health_card_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Medical Fitness Cert</label>
                    <input
                      type="text"
                      value={editFormData.medical_fitness_certificate || ''}
                      onChange={(e) => handleEditChange('medical_fitness_certificate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Medical Fitness Expiry</label>
                    <input
                      type="date"
                      value={editFormData.medical_fitness_expiry || ''}
                      onChange={(e) => handleEditChange('medical_fitness_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Police Clearance</label>
                    <input
                      type="text"
                      value={editFormData.police_clearance_certificate || ''}
                      onChange={(e) => handleEditChange('police_clearance_certificate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Police Clearance Expiry</label>
                    <input
                      type="date"
                      value={editFormData.police_clearance_expiry || ''}
                      onChange={(e) => handleEditChange('police_clearance_expiry', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Sponsor Name</label>
                    <input
                      type="text"
                      value={editFormData.sponsor_name || ''}
                      onChange={(e) => handleEditChange('sponsor_name', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Sponsor ID</label>
                    <input
                      type="text"
                      value={editFormData.sponsor_id || ''}
                      onChange={(e) => handleEditChange('sponsor_id', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <SmallInfoItem label="Health Card" value={employee.health_card_number || 'N/A'} />
                  <ExpiryItem
                    label="Health Card Expiry"
                    date={employee.health_card_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                  <SmallInfoItem label="Medical Fitness Cert" value={employee.medical_fitness_certificate || 'N/A'} />
                  <ExpiryItem
                    label="Medical Fitness Expiry"
                    date={employee.medical_fitness_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                  <SmallInfoItem label="Police Clearance" value={employee.police_clearance_certificate || 'N/A'} />
                  <ExpiryItem
                    label="Police Clearance Expiry"
                    date={employee.police_clearance_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                  <SmallInfoItem label="Sponsor Name" value={employee.sponsor_name || 'N/A'} />
                  <SmallInfoItem label="Sponsor ID" value={employee.sponsor_id || 'N/A'} />
                </>
              )}
            </div>
          </Section>
        </>
      )}

      {country === 'Saudi Arabia' && (
        <>
          <Section title="Saudi Documents" icon={Plane}>
            <div className="space-y-3">
              <SmallInfoItem label="Iqama Number" value={employee.iqama_number || 'N/A'} />
              <ExpiryItem
                label="Iqama Expiry"
                date={employee.iqama_expiry}
                isExpiringSoon={isExpiringSoon}
                isExpired={isExpired}
              />
              <SmallInfoItem label="Muqeem ID" value={employee.muqeem_id || 'N/A'} />
              <SmallInfoItem label="Jawazat Number" value={employee.jawazat_number || 'N/A'} />
              <SmallInfoItem label="Absher ID" value={employee.absher_id || 'N/A'} />
              <SmallInfoItem label="Border Number" value={employee.border_number || 'N/A'} />
              <SmallInfoItem label="GOSI Number" value={employee.gosi_number || 'N/A'} />
            </div>
          </Section>

          <Section title="Saudi Sponsorship" icon={Shield}>
            <div className="space-y-3">
              <SmallInfoItem label="Kafala Sponsor" value={employee.kafala_sponsor_name || 'N/A'} />
              <SmallInfoItem label="Sponsor ID" value={employee.kafala_sponsor_id || 'N/A'} />
            </div>
          </Section>
        </>
      )}

      <Section title="Bank Details" icon={CreditCard}>
        <div className="space-y-3">
          {isEditMode ? (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Bank Name</label>
                <input
                  type="text"
                  value={editFormData.bank_name || editFormData.saudi_bank_name || ''}
                  onChange={(e) => {
                    handleEditChange('bank_name', e.target.value);
                    handleEditChange('saudi_bank_name', e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Account Number</label>
                <input
                  type="text"
                  value={editFormData.bank_account_number || ''}
                  onChange={(e) => handleEditChange('bank_account_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              {country === 'India' && (
                <>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">IFSC Code</label>
                    <input
                      type="text"
                      value={editFormData.bank_ifsc_code || ''}
                      onChange={(e) => handleEditChange('bank_ifsc_code', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Branch</label>
                    <input
                      type="text"
                      value={editFormData.bank_branch || ''}
                      onChange={(e) => handleEditChange('bank_branch', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                </>
              )}
              {(country === 'Qatar' || country === 'Saudi Arabia') && (
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">IBAN</label>
                  <input
                    type="text"
                    value={editFormData.iban_number || editFormData.saudi_iban || ''}
                    onChange={(e) => {
                      handleEditChange('iban_number', e.target.value);
                      handleEditChange('saudi_iban', e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <SmallInfoItem label="Bank Name" value={employee.bank_name || employee.saudi_bank_name || 'N/A'} />
              <SmallInfoItem label="Account Number" value={maskSensitiveData(employee.bank_account_number)} />
              {country === 'India' && (
                <>
                  <SmallInfoItem label="IFSC Code" value={employee.bank_ifsc_code || 'N/A'} />
                  <SmallInfoItem label="Branch" value={employee.bank_branch || 'N/A'} />
                </>
              )}
              {(country === 'Qatar' || country === 'Saudi Arabia') && (
                <SmallInfoItem label="IBAN" value={maskSensitiveData(employee.iban_number || employee.saudi_iban, 6)} />
              )}
            </>
          )}
        </div>
      </Section>

      <Section title="Passport & Visa" icon={Plane}>
        <div className="space-y-3">
          {isEditMode ? (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Passport Number</label>
                <input
                  type="text"
                  value={editFormData.passport_number || ''}
                  onChange={(e) => handleEditChange('passport_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Passport Issue Date</label>
                <input
                  type="date"
                  value={editFormData.passport_issue_date || ''}
                  onChange={(e) => handleEditChange('passport_issue_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Issue Place</label>
                <input
                  type="text"
                  value={editFormData.passport_issue_place || ''}
                  onChange={(e) => handleEditChange('passport_issue_place', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Passport Expiry</label>
                <input
                  type="date"
                  value={editFormData.passport_expiry || ''}
                  onChange={(e) => handleEditChange('passport_expiry', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Visa Number</label>
                <input
                  type="text"
                  value={editFormData.visa_number || ''}
                  onChange={(e) => handleEditChange('visa_number', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Visa Sponsor</label>
                <input
                  type="text"
                  value={editFormData.visa_sponsor || ''}
                  onChange={(e) => handleEditChange('visa_sponsor', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Visa Issue Date</label>
                <input
                  type="date"
                  value={editFormData.visa_issue_date || ''}
                  onChange={(e) => handleEditChange('visa_issue_date', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Visa Expiry</label>
                <input
                  type="date"
                  value={editFormData.visa_expiry || ''}
                  onChange={(e) => handleEditChange('visa_expiry', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </>
          ) : (
            <>
              <SmallInfoItem label="Passport Number" value={employee.passport_number || 'N/A'} />
              {employee.passport_issue_date && (
                <SmallInfoItem label="Passport Issue Date" value={new Date(employee.passport_issue_date).toLocaleDateString()} />
              )}
              {employee.passport_issue_place && (
                <SmallInfoItem label="Issue Place" value={employee.passport_issue_place} />
              )}
              <ExpiryItem
                label="Passport Expiry"
                date={employee.passport_expiry}
                isExpiringSoon={isExpiringSoon}
                isExpired={isExpired}
              />
              {employee.visa_number && (
                <>
                  <SmallInfoItem label="Visa Number" value={employee.visa_number} />
                  {employee.visa_sponsor && <SmallInfoItem label="Visa Sponsor" value={employee.visa_sponsor} />}
                  {employee.visa_issue_date && (
                    <SmallInfoItem label="Visa Issue Date" value={new Date(employee.visa_issue_date).toLocaleDateString()} />
                  )}
                  <ExpiryItem
                    label="Visa Expiry"
                    date={employee.visa_expiry}
                    isExpiringSoon={isExpiringSoon}
                    isExpired={isExpired}
                  />
                </>
              )}
            </>
          )}
        </div>
      </Section>

      {(employee.insurance_policy_number || employee.medical_insurance_number) && (
        <Section title="Insurance Details" icon={Shield}>
          <div className="space-y-3">
            <SmallInfoItem label="Policy Number" value={employee.insurance_policy_number || employee.medical_insurance_number || 'N/A'} />
            <SmallInfoItem label="Provider" value={employee.insurance_provider || employee.medical_insurance_provider || 'N/A'} />
            {employee.insurance_coverage_amount && (
              <SmallInfoItem label="Coverage Amount" value={`${employee.insurance_coverage_amount.toLocaleString()}`} />
            )}
            {employee.dependents_covered > 0 && (
              <SmallInfoItem label="Dependents Covered" value={employee.dependents_covered.toString()} />
            )}
            <ExpiryItem
              label="Insurance Expiry"
              date={employee.insurance_expiry || employee.medical_insurance_expiry}
              isExpiringSoon={isExpiringSoon}
              isExpired={isExpired}
            />
          </div>
        </Section>
      )}

      {country === 'India' && (employee.gratuity_nominee_name) && (
        <Section title="Gratuity Nominee" icon={Users}>
          <div className="space-y-3">
            <SmallInfoItem label="Nominee Name" value={employee.gratuity_nominee_name || 'N/A'} />
            <SmallInfoItem label="Relationship" value={employee.gratuity_nominee_relationship || 'N/A'} />
          </div>
        </Section>
      )}

      {isAdmin && hasData(['medical_conditions', 'allergies', 'disabilities']) && (
        <Section title="Health Information" icon={Stethoscope}>
          <div className="space-y-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-semibold">Confidential - Admin Access Only</span>
            </div>
            {employee.medical_conditions && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Medical Conditions</p>
                <p className="text-sm font-medium text-slate-900">{employee.medical_conditions}</p>
              </div>
            )}
            {employee.allergies && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Allergies</p>
                <p className="text-sm font-medium text-slate-900">{employee.allergies}</p>
              </div>
            )}
            {employee.disabilities && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Disabilities/Accommodations</p>
                <p className="text-sm font-medium text-slate-900">{employee.disabilities}</p>
              </div>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function ExpiryItem({ label, date, isExpiringSoon, isExpired }: any) {
  if (!date) {
    return <SmallInfoItem label={label} value="N/A" />;
  }

  const dateStr = new Date(date).toLocaleDateString();
  const expired = isExpired(date);
  const expiringSoon = isExpiringSoon(date);

  return (
    <div className={`p-2 rounded-lg ${expired ? 'bg-red-50 border border-red-200' :
      expiringSoon ? 'bg-amber-50 border border-amber-200' :
        'bg-slate-50'
      }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          <p className="font-medium text-slate-900 text-sm">{dateStr}</p>
        </div>
        {expired && (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
            EXPIRED
          </span>
        )}
        {!expired && expiringSoon && (
          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
            EXPIRING
          </span>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="h-5 w-5 text-blue-600" />}
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && (
        <div className="mt-1 p-2 bg-blue-50 rounded-lg">
          <Icon className="h-4 w-4 text-blue-600" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="font-medium text-slate-900 text-sm">{value}</p>
      </div>
    </div>
  );
}

function SmallInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-slate-50 rounded-lg">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="font-medium text-slate-900 text-sm">{value}</p>
    </div>
  );
}

function EditableField({ icon: Icon, label, value, onChange, type = 'text' }: { icon: any; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-1 p-2 bg-blue-50 rounded-lg">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>
    </div>
  );
}

function MiniStatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorMap: any = {
    emerald: 'from-emerald-500 to-emerald-600',
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-amber-600',
    violet: 'from-violet-500 to-violet-600',
  };

  return (
    <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-gradient-to-br ${colorMap[color]} rounded-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-slate-600 mb-1">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
