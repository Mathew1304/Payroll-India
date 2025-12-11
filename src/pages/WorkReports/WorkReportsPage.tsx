import { useState, useEffect } from 'react';
import { FileText, Plus, Send, Eye, Edit, Trash2, MessageSquare, CheckCircle, Clock, Calendar, Filter, Search, Download, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface WorkReport {
  id: string;
  employee_id: string;
  report_date: string;
  report_type: string;
  title: string;
  summary: string;
  detailed_report: string;
  tasks_completed: any[];
  tasks_in_progress: any[];
  tasks_planned: any[];
  challenges: string;
  achievements: string;
  hours_worked: number;
  status: string;
  submitted_at: string;
  reviewed_by: string;
  reviewed_at: string;
  review_comments: string;
  created_at: string;
  employee?: any;
}

export function WorkReportsPage() {
  const { organization, userProfile, membership } = useAuth();
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WorkReport | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mine' | 'team'>('mine');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'hr';

  useEffect(() => {
    if (organization?.id) {
      loadReports();
    }
  }, [organization, filter, statusFilter, typeFilter]);

  const loadReports = async () => {
    if (!organization?.id) return;

    let query = supabase
      .from('work_reports')
      .select(`
        *,
        employee:employees(
          id,
          first_name,
          last_name,
          employee_code,
          departments(name),
          designations(name)
        )
      `)
      .eq('organization_id', organization.id)
      .order('report_date', { ascending: false });

    if (filter === 'mine') {
      const employeeId = userProfile?.employee_id || membership?.employee_id;
      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (typeFilter !== 'all') {
      query = query.eq('report_type', typeFilter);
    }

    const { data, error } = await query;

    if (data) {
      setReports(data);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'submitted': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'reviewed': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'daily': return '📅';
      case 'weekly': return '📊';
      case 'monthly': return '📈';
      case 'project': return '🎯';
      default: return '📄';
    }
  };

  const filteredReports = reports.filter(report => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      report.title.toLowerCase().includes(query) ||
      report.summary?.toLowerCase().includes(query) ||
      report.employee?.first_name?.toLowerCase().includes(query) ||
      report.employee?.last_name?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: reports.length,
    submitted: reports.filter(r => r.status === 'submitted').length,
    approved: reports.filter(r => r.status === 'approved').length,
    thisWeek: reports.filter(r => {
      const reportDate = new Date(r.report_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reportDate >= weekAgo;
    }).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Work Reports
          </h1>
          <p className="text-slate-600 mt-2">Track daily activities and accomplishments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="h-5 w-5" />
          New Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total Reports"
          value={stats.total}
          icon={FileText}
          gradient="from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Pending Review"
          value={stats.submitted}
          icon={Clock}
          gradient="from-amber-500 to-amber-600"
        />
        <StatsCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          gradient="from-emerald-500 to-emerald-600"
        />
        <StatsCard
          title="This Week"
          value={stats.thisWeek}
          icon={TrendingUp}
          gradient="from-violet-500 to-violet-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">Filters:</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('mine')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'mine'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              My Reports
            </button>
            {isManager && (
              <button
                onClick={() => setFilter('team')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'team'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                Team Reports
              </button>
            )}
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              All Reports
            </button>
          </div>

          <div className="h-6 w-px bg-slate-300"></div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="project">Project</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 mt-4">Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <FileText className="h-16 w-16 text-blue-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Reports Yet</h3>
          <p className="text-slate-600 mb-6">Create your first work report to track your progress</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create First Report
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="group bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getTypeIcon(report.report_type)}</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">{report.title}</h3>
                      {report.employee && (
                        <p className="text-sm text-slate-600">
                          {report.employee.first_name} {report.employee.last_name} • {report.employee.employee_code}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>

                  {report.summary && (
                    <p className="text-slate-700 mb-4 line-clamp-2">{report.summary}</p>
                  )}

                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(report.report_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{report.report_type}</span>
                    </div>
                    {report.hours_worked && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{report.hours_worked}h worked</span>
                      </div>
                    )}
                    {report.tasks_completed && report.tasks_completed.length > 0 && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>{report.tasks_completed.length} tasks completed</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setShowViewModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  {report.employee_id === userProfile?.employee_id && report.status === 'draft' && (
                    <>
                      <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Edit className="h-5 w-5" />
                      </button>
                      <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateReportModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadReports();
          }}
        />
      )}

      {showViewModal && selectedReport && (
        <ViewReportModal
          report={selectedReport}
          onClose={() => {
            setShowViewModal(false);
            setSelectedReport(null);
          }}
          onUpdate={() => {
            loadReports();
          }}
        />
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, gradient }: any) {
  return (
    <div className="group relative bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function CreateReportModal({ onClose, onSuccess }: any) {
  const { organization, userProfile, membership } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    report_date: new Date().toISOString().split('T')[0],
    report_type: 'daily',
    title: '',
    summary: '',
    detailed_report: '',
    tasks_completed: [''],
    tasks_in_progress: [''],
    tasks_planned: [''],
    challenges: '',
    achievements: '',
    hours_worked: '',
    status: 'draft'
  });

  const addTask = (field: 'tasks_completed' | 'tasks_in_progress' | 'tasks_planned') => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const updateTask = (field: 'tasks_completed' | 'tasks_in_progress' | 'tasks_planned', index: number, value: string) => {
    const updated = [...formData[field]];
    updated[index] = value;
    setFormData({ ...formData, [field]: updated });
  };

  const removeTask = (field: 'tasks_completed' | 'tasks_in_progress' | 'tasks_planned', index: number) => {
    const updated = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: updated });
  };

  const handleSubmit = async (e: React.FormEvent, submitStatus: 'draft' | 'submitted') => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Get employee_id from userProfile or membership
      const employeeId = userProfile?.employee_id || membership?.employee_id;

      if (!employeeId) {
        throw new Error('Employee ID not found. Please contact your administrator.');
      }

      const reportData = {
        organization_id: organization!.id,
        employee_id: employeeId,
        report_date: formData.report_date,
        report_type: formData.report_type,
        title: formData.title,
        summary: formData.summary,
        detailed_report: formData.detailed_report,
        tasks_completed: formData.tasks_completed.filter(t => t.trim()),
        tasks_in_progress: formData.tasks_in_progress.filter(t => t.trim()),
        tasks_planned: formData.tasks_planned.filter(t => t.trim()),
        challenges: formData.challenges,
        achievements: formData.achievements,
        hours_worked: formData.hours_worked ? parseFloat(formData.hours_worked) : null,
        status: submitStatus,
        submitted_at: submitStatus === 'submitted' ? new Date().toISOString() : null
      };

      const { error: reportError } = await supabase
        .from('work_reports')
        .insert(reportData);

      if (reportError) throw reportError;

      onSuccess();
    } catch (err: any) {
      console.error('Error creating report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-2xl sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-white">Create Work Report</h2>
          <p className="text-blue-100 text-sm mt-1">Document your daily activities and achievements</p>
        </div>

        <form className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Report Date *
              </label>
              <input
                type="date"
                required
                value={formData.report_date}
                onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                className="input-modern"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Report Type *
              </label>
              <select
                value={formData.report_type}
                onChange={(e) => setFormData({ ...formData, report_type: e.target.value })}
                className="input-modern"
              >
                <option value="daily">📅 Daily</option>
                <option value="weekly">📊 Weekly</option>
                <option value="monthly">📈 Monthly</option>
                <option value="project">🎯 Project</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Hours Worked
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.hours_worked}
                onChange={(e) => setFormData({ ...formData, hours_worked: e.target.value })}
                className="input-modern"
                placeholder="8.0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Report Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-modern"
              placeholder="e.g., Daily Report - December 2, 2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Summary
            </label>
            <textarea
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="input-modern min-h-[80px]"
              placeholder="Brief summary of your work today..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
              <span>Tasks Completed ✅</span>
              <button
                type="button"
                onClick={() => addTask('tasks_completed')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Task
              </button>
            </label>
            <div className="space-y-2">
              {formData.tasks_completed.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updateTask('tasks_completed', index, e.target.value)}
                    className="input-modern flex-1"
                    placeholder="Describe completed task..."
                  />
                  {formData.tasks_completed.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask('tasks_completed', index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
              <span>Tasks In Progress 🔄</span>
              <button
                type="button"
                onClick={() => addTask('tasks_in_progress')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Task
              </button>
            </label>
            <div className="space-y-2">
              {formData.tasks_in_progress.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updateTask('tasks_in_progress', index, e.target.value)}
                    className="input-modern flex-1"
                    placeholder="Describe ongoing task..."
                  />
                  {formData.tasks_in_progress.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask('tasks_in_progress', index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center justify-between">
              <span>Tasks Planned 📋</span>
              <button
                type="button"
                onClick={() => addTask('tasks_planned')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Add Task
              </button>
            </label>
            <div className="space-y-2">
              {formData.tasks_planned.map((task, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => updateTask('tasks_planned', index, e.target.value)}
                    className="input-modern flex-1"
                    placeholder="Describe planned task..."
                  />
                  {formData.tasks_planned.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTask('tasks_planned', index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Achievements 🏆
            </label>
            <textarea
              value={formData.achievements}
              onChange={(e) => setFormData({ ...formData, achievements: e.target.value })}
              className="input-modern min-h-[80px]"
              placeholder="Key accomplishments, milestones reached..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Challenges / Blockers ⚠️
            </label>
            <textarea
              value={formData.challenges}
              onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
              className="input-modern min-h-[80px]"
              placeholder="Issues faced, help needed..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Detailed Report
            </label>
            <textarea
              value={formData.detailed_report}
              onChange={(e) => setFormData({ ...formData, detailed_report: e.target.value })}
              className="input-modern min-h-[120px]"
              placeholder="Detailed description of your work..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading}
              className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'submitted')}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewReportModal({ report, onClose, onUpdate }: any) {
  const { userProfile } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [loading, setLoading] = useState(false);

  const isManager = userProfile?.role === 'admin' || userProfile?.role === 'hr';
  const canReview = isManager && report.status === 'submitted';

  useEffect(() => {
    loadComments();
  }, [report.id]);

  const loadComments = async () => {
    const { data } = await supabase
      .from('work_report_comments')
      .select(`
        *,
        employee:employees(first_name, last_name)
      `)
      .eq('work_report_id', report.id)
      .order('created_at', { ascending: true });

    if (data) setComments(data);
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await supabase
        .from('work_reports')
        .update({
          status: 'approved',
          reviewed_by: userProfile?.user_id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComment
        })
        .eq('id', report.id);

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error approving report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await supabase
        .from('work_reports')
        .update({
          status: 'rejected',
          reviewed_by: userProfile?.user_id,
          reviewed_at: new Date().toISOString(),
          review_comments: reviewComment
        })
        .eq('id', report.id);

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error rejecting report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await supabase
        .from('work_report_comments')
        .insert({
          work_report_id: report.id,
          user_id: userProfile?.user_id,
          employee_id: userProfile?.employee_id,
          comment: newComment
        });

      setNewComment('');
      loadComments();
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{report.title}</h2>
              <p className="text-blue-100 text-sm mt-1">
                {report.employee?.first_name} {report.employee?.last_name} • {new Date(report.report_date).toLocaleDateString()}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${report.status === 'approved' ? 'bg-emerald-500 text-white' :
              report.status === 'submitted' ? 'bg-blue-500 text-white' :
                'bg-slate-500 text-white'
              }`}>
              {report.status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Report Type</p>
              <p className="font-semibold text-slate-900">{report.report_type}</p>
            </div>
            {report.hours_worked && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600 mb-1">Hours Worked</p>
                <p className="font-semibold text-slate-900">{report.hours_worked}h</p>
              </div>
            )}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Submitted</p>
              <p className="font-semibold text-slate-900">
                {report.submitted_at ? new Date(report.submitted_at).toLocaleDateString() : 'Not yet'}
              </p>
            </div>
          </div>

          {report.summary && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Summary</h3>
              <p className="text-slate-700 bg-slate-50 rounded-lg p-4">{report.summary}</p>
            </div>
          )}

          {report.tasks_completed && report.tasks_completed.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">✅ Tasks Completed</h3>
              <ul className="space-y-2">
                {report.tasks_completed.map((task: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.tasks_in_progress && report.tasks_in_progress.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">🔄 Tasks In Progress</h3>
              <ul className="space-y-2">
                {report.tasks_in_progress.map((task: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <Clock className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.tasks_planned && report.tasks_planned.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">📋 Tasks Planned</h3>
              <ul className="space-y-2">
                {report.tasks_planned.map((task: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-slate-700">
                    <span className="text-blue-600">•</span>
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.achievements && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">🏆 Achievements</h3>
              <p className="text-slate-700 bg-emerald-50 border border-emerald-200 rounded-lg p-4">{report.achievements}</p>
            </div>
          )}

          {report.challenges && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">⚠️ Challenges / Blockers</h3>
              <p className="text-slate-700 bg-amber-50 border border-amber-200 rounded-lg p-4">{report.challenges}</p>
            </div>
          )}

          {report.detailed_report && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Detailed Report</h3>
              <p className="text-slate-700 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap">{report.detailed_report}</p>
            </div>
          )}

          {report.review_comments && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2">Review Comments</h3>
              <p className="text-slate-700 bg-blue-50 border border-blue-200 rounded-lg p-4">{report.review_comments}</p>
            </div>
          )}

          {canReview && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="font-bold text-slate-900 mb-4">Review Report</h3>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="input-modern min-h-[100px] mb-4"
                placeholder="Add review comments..."
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments ({comments.length})
            </h3>

            <div className="space-y-4 mb-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-slate-900">
                      {comment.employee?.first_name} {comment.employee?.last_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-slate-700">{comment.comment}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                className="input-modern flex-1"
                placeholder="Add a comment..."
              />
              <button
                onClick={handleAddComment}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Post
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
