import { useState, useEffect } from 'react';
import { Megaphone, Plus, Users, Send, Eye, Edit, Trash2, Bell, BellOff, CheckCircle, Clock, Filter, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  target_type: string;
  is_active: boolean;
  published_at: string;
  expires_at: string;
  created_at: string;
  total_recipients?: number;
  read_count?: number;
}

interface DistributionList {
  id: string;
  name: string;
  description: string;
  type: string;
  member_count?: number;
}

export function AnnouncementsPage() {
  const { organization, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'announcements' | 'distribution-lists'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [distributionLists, setDistributionLists] = useState<DistributionList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');

  useEffect(() => {
    if (organization?.id) {
      loadAnnouncements();
      loadDistributionLists();
    }
  }, [organization, filter]);

  const loadAnnouncements = async () => {
    if (!organization?.id) return;

    let query = supabase
      .from('announcements')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false });

    if (filter === 'active') {
      query = query.eq('is_active', true);
    } else if (filter === 'expired') {
      query = query.lt('expires_at', new Date().toISOString());
    }

    const { data, error } = await query;

    if (data) {
      const enrichedData = await Promise.all(
        data.map(async (announcement) => {
          const { count: totalRecipients } = await supabase
            .from('announcement_recipients')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', announcement.id);

          const { count: readCount } = await supabase
            .from('announcement_recipients')
            .select('*', { count: 'exact', head: true })
            .eq('announcement_id', announcement.id)
            .eq('is_read', true);

          return {
            ...announcement,
            total_recipients: totalRecipients || 0,
            read_count: readCount || 0
          };
        })
      );
      setAnnouncements(enrichedData);
    }

    setLoading(false);
  };

  const loadDistributionLists = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('distribution_lists')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('name');

    if (data) {
      const enrichedData = await Promise.all(
        data.map(async (list) => {
          const { count } = await supabase
            .from('distribution_list_members')
            .select('*', { count: 'exact', head: true })
            .eq('distribution_list_id', list.id);

          return { ...list, member_count: count || 0 };
        })
      );
      setDistributionLists(enrichedData);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general': return '📢';
      case 'policy': return '📋';
      case 'event': return '🎉';
      case 'urgent': return '🚨';
      default: return '📢';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-fuchsia-600" />
            Company Announcements
          </h1>
          <p className="text-slate-600 mt-2">Share news, updates, and important notices</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowListModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Users className="h-5 w-5" />
            Distribution Lists
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-5 w-5" />
            New Announcement
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white rounded-xl shadow-md p-4 border border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Filter:</span>
        </div>
        <div className="flex gap-2">
          {['active', 'all', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-fuchsia-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Total Announcements"
          value={announcements.length}
          icon={Megaphone}
          gradient="from-fuchsia-500 to-fuchsia-600"
        />
        <StatsCard
          title="Active Now"
          value={announcements.filter(a => a.is_active).length}
          icon={Bell}
          gradient="from-emerald-500 to-emerald-600"
        />
        <StatsCard
          title="Distribution Lists"
          value={distributionLists.length}
          icon={Users}
          gradient="from-violet-500 to-violet-600"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
          <p className="text-slate-600 mt-4">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <Megaphone className="h-16 w-16 text-fuchsia-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Announcements Yet</h3>
          <p className="text-slate-600 mb-6">Create your first announcement to keep everyone informed</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create First Announcement
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="group bg-white rounded-xl shadow-md border border-slate-200 p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getTypeIcon(announcement.type)}</span>
                    <h3 className="text-xl font-bold text-slate-900">{announcement.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority?.toUpperCase()}
                    </span>
                    {announcement.is_active ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        INACTIVE
                      </span>
                    )}
                  </div>

                  <p className="text-slate-700 mb-4 line-clamp-2">{announcement.content}</p>

                  <div className="flex items-center gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {announcement.target_type === 'all' ? 'All Employees' :
                         announcement.target_type === 'distribution_list' ? 'Distribution Lists' :
                         'Specific Employees'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      <span>{announcement.total_recipients} recipients</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span>{announcement.read_count} read ({Math.round((announcement.read_count! / (announcement.total_recipients || 1)) * 100)}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Eye className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Edit className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateAnnouncementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAnnouncements();
          }}
          distributionLists={distributionLists}
        />
      )}

      {showListModal && (
        <DistributionListsModal
          onClose={() => setShowListModal(false)}
          onSuccess={() => {
            setShowListModal(false);
            loadDistributionLists();
          }}
          lists={distributionLists}
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

function CreateAnnouncementModal({ onClose, onSuccess, distributionLists }: any) {
  const { organization, user, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'medium',
    target_type: 'all',
    distribution_list_ids: [] as string[],
    expires_in_days: 30
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formData.expires_in_days);

      const { data: announcement, error: announcementError } = await supabase
        .from('announcements')
        .insert({
          organization_id: organization!.id,
          title: formData.title,
          content: formData.content,
          type: formData.type,
          priority: formData.priority,
          target_type: formData.target_type,
          distribution_list_ids: formData.distribution_list_ids,
          is_active: true,
          published_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          created_by: user!.id
        })
        .select()
        .single();

      if (announcementError) throw announcementError;

      let recipientIds: string[] = [];

      if (formData.target_type === 'all') {
        const { data: employees } = await supabase
          .from('employees')
          .select('id')
          .eq('organization_id', organization!.id)
          .eq('is_active', true);

        recipientIds = employees?.map(e => e.id) || [];
      } else if (formData.target_type === 'distribution_list') {
        for (const listId of formData.distribution_list_ids) {
          const { data: members } = await supabase
            .from('distribution_list_members')
            .select('employee_id')
            .eq('distribution_list_id', listId);

          recipientIds.push(...(members?.map(m => m.employee_id) || []));
        }
        recipientIds = [...new Set(recipientIds)];
      }

      if (recipientIds.length > 0) {
        const recipients = recipientIds.map(employeeId => ({
          announcement_id: announcement.id,
          employee_id: employeeId,
          distribution_list_id: formData.target_type === 'distribution_list' ? formData.distribution_list_ids[0] : null
        }));

        await supabase.from('announcement_recipients').insert(recipients);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating announcement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 px-6 py-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Create New Announcement</h2>
          <p className="text-fuchsia-100 text-sm mt-1">Share important news with your team</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="input-modern"
              placeholder="Enter announcement title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Content *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="input-modern min-h-[120px]"
              placeholder="Write your announcement message..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="input-modern"
              >
                <option value="general">📢 General</option>
                <option value="policy">📋 Policy</option>
                <option value="event">🎉 Event</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="input-modern"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Send To *
            </label>
            <select
              value={formData.target_type}
              onChange={(e) => setFormData({ ...formData, target_type: e.target.value, distribution_list_ids: [] })}
              className="input-modern"
            >
              <option value="all">All Employees</option>
              <option value="distribution_list">Distribution Lists</option>
              <option value="specific">Specific Employees</option>
            </select>
          </div>

          {formData.target_type === 'distribution_list' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Distribution Lists *
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {distributionLists.map((list: DistributionList) => (
                  <label key={list.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.distribution_list_ids.includes(list.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            distribution_list_ids: [...formData.distribution_list_ids, list.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            distribution_list_ids: formData.distribution_list_ids.filter(id => id !== list.id)
                          });
                        }
                      }}
                      className="w-4 h-4 text-fuchsia-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{list.name}</p>
                      <p className="text-xs text-slate-500">{list.member_count} members</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Expires In (Days)
            </label>
            <input
              type="number"
              min="1"
              value={formData.expires_in_days}
              onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) })}
              className="input-modern"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Send className="h-5 w-5" />
              {loading ? 'Creating...' : 'Create & Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DistributionListsModal({ onClose, onSuccess, lists }: any) {
  const [showCreateList, setShowCreateList] = useState(false);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-6 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Distribution Lists</h2>
            <p className="text-violet-100 text-sm mt-1">Manage employee groups for announcements</p>
          </div>
          <button
            onClick={() => setShowCreateList(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-violet-700 rounded-lg hover:bg-violet-50 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New List
          </button>
        </div>

        <div className="p-6">
          {lists.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-violet-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Distribution Lists Yet</h3>
              <p className="text-slate-600 mb-6">Create lists to target specific groups of employees</p>
              <button
                onClick={() => setShowCreateList(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Create First List
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lists.map((list: DistributionList) => (
                <div key={list.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{list.name}</h4>
                      <p className="text-sm text-slate-600 mt-1">{list.description}</p>
                    </div>
                    <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold">
                      {list.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{list.member_count} members</span>
                    <div className="flex gap-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>

      {showCreateList && (
        <CreateDistributionListModal
          onClose={() => setShowCreateList(false)}
          onSuccess={() => {
            setShowCreateList(false);
            onSuccess();
          }}
        />
      )}
    </div>
  );
}

function CreateDistributionListModal({ onClose, onSuccess }: any) {
  const { organization, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'manual',
    selectedEmployees: [] as string[],
    department_id: '',
    designation_id: ''
  });

  useEffect(() => {
    loadEmployees();
    loadFilters();
  }, [organization]);

  const loadEmployees = async () => {
    if (!organization?.id) return;

    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, departments(name), designations(title)')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('first_name');

    if (data) setEmployees(data);
  };

  const loadFilters = async () => {
    if (!organization?.id) return;

    const [depts, desigs] = await Promise.all([
      supabase.from('departments').select('*').eq('organization_id', organization.id).eq('is_active', true),
      supabase.from('designations').select('*').eq('organization_id', organization.id).eq('is_active', true)
    ]);

    if (depts.data) setDepartments(depts.data);
    if (desigs.data) setDesignations(desigs.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: list, error: listError } = await supabase
        .from('distribution_lists')
        .insert({
          organization_id: organization!.id,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          filter_criteria: formData.type !== 'manual' ? {
            department_id: formData.department_id,
            designation_id: formData.designation_id
          } : null,
          is_active: true,
          created_by: user!.id
        })
        .select()
        .single();

      if (listError) throw listError;

      let memberIds: string[] = [];

      if (formData.type === 'manual') {
        memberIds = formData.selectedEmployees;
      } else if (formData.type === 'department' && formData.department_id) {
        const { data } = await supabase
          .from('employees')
          .select('id')
          .eq('organization_id', organization!.id)
          .eq('department_id', formData.department_id)
          .eq('is_active', true);
        memberIds = data?.map(e => e.id) || [];
      } else if (formData.type === 'designation' && formData.designation_id) {
        const { data } = await supabase
          .from('employees')
          .select('id')
          .eq('organization_id', organization!.id)
          .eq('designation_id', formData.designation_id)
          .eq('is_active', true);
        memberIds = data?.map(e => e.id) || [];
      } else if (formData.type === 'all_employees') {
        const { data } = await supabase
          .from('employees')
          .select('id')
          .eq('organization_id', organization!.id)
          .eq('is_active', true);
        memberIds = data?.map(e => e.id) || [];
      }

      if (memberIds.length > 0) {
        const members = memberIds.map(employeeId => ({
          distribution_list_id: list.id,
          employee_id: employeeId,
          added_by: user!.id
        }));

        await supabase.from('distribution_list_members').insert(members);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error creating list:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Create Distribution List</h2>
          <p className="text-violet-100 text-sm mt-1">Group employees for targeted announcements</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              List Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-modern"
              placeholder="e.g., Engineering Team, All Managers"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input-modern"
              placeholder="Describe the purpose of this list..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              List Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value, selectedEmployees: [], department_id: '', designation_id: '' })}
              className="input-modern"
            >
              <option value="manual">Manual Selection</option>
              <option value="department">By Department</option>
              <option value="designation">By Designation</option>
              <option value="all_employees">All Employees</option>
            </select>
          </div>

          {formData.type === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Employees *
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {employees.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.selectedEmployees.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            selectedEmployees: [...formData.selectedEmployees, emp.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedEmployees: formData.selectedEmployees.filter(id => id !== emp.id)
                          });
                        }
                      }}
                      className="w-4 h-4 text-violet-600 rounded"
                    />
                    <div>
                      <p className="font-medium text-slate-900">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-slate-500">{emp.employee_code} • {emp.departments?.name || 'No Dept'}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-sm text-slate-600 mt-2">{formData.selectedEmployees.length} employees selected</p>
            </div>
          )}

          {formData.type === 'department' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Department *
              </label>
              <select
                required
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="input-modern"
              >
                <option value="">Choose Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.type === 'designation' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Designation *
              </label>
              <select
                required
                value={formData.designation_id}
                onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                className="input-modern"
              >
                <option value="">Choose Designation</option>
                {designations.map((desig) => (
                  <option key={desig.id} value={desig.id}>{desig.name}</option>
                ))}
              </select>
            </div>
          )}

          {formData.type === 'all_employees' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                This list will include all active employees in your organization.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create List'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
