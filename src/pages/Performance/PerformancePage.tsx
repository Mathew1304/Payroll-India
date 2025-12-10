import { useState, useEffect } from 'react';
import { Target, Star, BarChart2, Building2, User, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PerformanceDashboard } from './PerformanceDashboard';
import { GoalsTab } from './GoalsTab';
import { ReviewsTab } from './ReviewsTab';
import { AnalyticsTab } from './AnalyticsTab';
import { CreateGoalModal } from '../../components/Performance/CreateGoalModal';
import { CreateReviewModal } from '../../components/Performance/CreateReviewModal';

export function PerformancePage() {
  const { organization, membership } = useAuth();
  const [activeTab, setActiveTab] = useState<'goals' | 'reviews' | 'analytics'>('goals');
  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Global Filters
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  // Modals
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showCreateReview, setShowCreateReview] = useState(false);

  useEffect(() => {
    if (organization?.id) {
      loadFilters();
    }
  }, [organization?.id]);

  const loadFilters = async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        supabase.from('departments').select('id, name').eq('organization_id', organization!.id).eq('is_active', true),
        supabase.from('employees').select('id, first_name, last_name').eq('is_active', true)
      ]);

      if (deptRes.data) setDepartments(deptRes.data);
      if (empRes.data) setEmployees(empRes.data);
    } catch (err) {
      console.error('Error loading filters:', err);
    }
  };

  const isManagerOrAdmin = ['admin', 'super_admin', 'manager', 'hr'].includes(membership?.role || '');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance Management</h1>
          <p className="text-slate-500">Manage goals, reviews & organizational performance</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Global Filters */}
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent outline-none text-sm text-slate-700 min-w-[120px]"
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2">
            <User className="h-4 w-4 text-slate-400" />
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="bg-transparent outline-none text-sm text-slate-700 min-w-[120px]"
            >
              <option value="all">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          {isManagerOrAdmin && (
            <>
              <button
                onClick={() => setShowCreateGoal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                New Goal
              </button>
              <button
                onClick={() => setShowCreateReview(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors shadow-sm"
              >
                <Star className="h-4 w-4" />
                New Review
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dashboard Stats */}
      <PerformanceDashboard
        departmentId={selectedDept === 'all' ? undefined : selectedDept}
        employeeId={selectedEmployee === 'all' ? undefined : selectedEmployee}
      />

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
        <div className="border-b border-slate-200">
          <nav className="flex gap-6 px-6">
            <button
              onClick={() => setActiveTab('goals')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'goals'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <Target className="h-4 w-4" />
              Goals
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'reviews'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <Star className="h-4 w-4" />
              Reviews
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'analytics'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              <BarChart2 className="h-4 w-4" />
              Analytics
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'goals' && (
            <GoalsTab
              departmentId={selectedDept === 'all' ? undefined : selectedDept}
              employeeId={selectedEmployee === 'all' ? undefined : selectedEmployee}
            />
          )}
          {activeTab === 'reviews' && (
            <ReviewsTab
              departmentId={selectedDept === 'all' ? undefined : selectedDept}
              employeeId={selectedEmployee === 'all' ? undefined : selectedEmployee}
            />
          )}
          {activeTab === 'analytics' && (
            <AnalyticsTab
              departmentId={selectedDept === 'all' ? undefined : selectedDept}
              employeeId={selectedEmployee === 'all' ? undefined : selectedEmployee}
            />
          )}
        </div>
      </div>

      {showCreateGoal && (
        <CreateGoalModal onClose={() => setShowCreateGoal(false)} />
      )}

      {showCreateReview && (
        <CreateReviewModal onClose={() => setShowCreateReview(false)} />
      )}
    </div>
  );
}
