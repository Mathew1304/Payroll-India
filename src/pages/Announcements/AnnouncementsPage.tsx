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

export function AnnouncementsPage() {
  const { membership, loading, profile, user } = useAuth();

  console.log('AnnouncementsPage wrapper - membership:', membership, 'loading:', loading, 'profile:', profile, 'user:', user);

  // Wait for auth to load before deciding which view to show
  if (loading || !user) {
    console.log('Auth still loading or no user, showing spinner');
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
        <p className="ml-4 text-slate-600">Loading...</p>
      </div>
    );
  }

  // TEMPORARY FIX: Show admin view for everyone until role detection is fixed
  // TODO: Fix role detection - membership and profile are both null
  const isAdmin = true; // Temporarily always true

  console.log('AnnouncementsPage wrapper - TEMPORARY: showing admin view for everyone');

  if (isAdmin) {
    console.log('Rendering AdminAnnouncementsDashboard');
    return <AdminAnnouncementsDashboard />;
  } else {
    console.log('Rendering EmployeeAnnouncementFeed');
    return <EmployeeAnnouncementFeed />;
  }
}

function AdminAnnouncementsDashboard() {
  console.log('=== AdminAnnouncementsDashboard RENDERED ===');

  const { organization, profile: userProfile, membership } = useAuth();

  console.log('AdminAnnouncementsDashboard - organization:', organization?.id, 'membership:', membership?.role, 'profile.role:', userProfile?.role);

  // Check admin status from profile.role since membership is null
  const isAdmin = userProfile?.role && ['admin', 'hr', 'manager'].includes(userProfile.role);
  const [activeTab, setActiveTab] = useState<'announcements' | 'distribution-lists'>('announcements');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  // Distribution lists removed - not in schema
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadAnnouncements = async () => {
    console.log('loadAnnouncements called, organization:', organization?.id);

    if (!organization?.id) {
      console.log('No organization, setting loading false');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching announcements...');
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.eq('status', 'published');
      } else if (filter === 'expired') {
        query = query.lt('expires_at', new Date().toISOString());
      }

      const { data, error } = await query;

      console.log('Announcements query result:', { data, error });

      if (error) {
        console.error('Error loading announcements:', error);
        setAnnouncements([]);
      } else if (data) {
        // Simplified: just use basic data without enrichment
        const basicData = data.map(a => ({
          ...a,
          total_recipients: 0,
          read_count: 0
        }));
        console.log('Setting announcements:', basicData.length);
        setAnnouncements(basicData);
      } else {
        console.log('No data returned');
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Exception in loadAnnouncements:', error);
      setAnnouncements([]);
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organization?.id) {
      loadAnnouncements();
      // loadDistributionLists removed - not in schema
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id, filter]);

  const loadDistributionLists = async () => {
    console.log('loadDistributionLists called, organization:', organization?.id);

    if (!organization?.id) {
      console.log('No organization for distribution lists');
      return;
    }

    try {
      console.log('Fetching distribution lists...');
      const { data, error } = await supabase
        .from('distribution_lists')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      console.log('Distribution lists query result:', { data, error });

      if (error) {
        console.error('Error loading distribution lists:', error);
        setDistributionLists([]);
      } else if (data) {
        // Simplified: just use basic data without member counts
        const basicData = data.map(l => ({ ...l, member_count: 0 }));
        console.log('Setting distribution lists:', basicData.length);
        setDistributionLists(basicData);
      } else {
        console.log('No distribution lists data');
        setDistributionLists([]);
      }
    } catch (error) {
      console.error('Exception in loadDistributionLists:', error);
      setDistributionLists([]);
    }
  };


  const handleView = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowViewModal(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowEditModal(true);
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await supabase.from('announcements').delete().eq('id', announcementId);
      loadAnnouncements();
    } catch (err) {
      console.error('Error deleting announcement:', err);
      alert('Failed to delete announcement');
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
        {isAdmin && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-5 w-5" />
              New Announcement
            </button>
          </div>
        )}
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
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
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
          value={announcements.filter(a => a.status === 'published').length}
          icon={Bell}
          gradient="from-emerald-500 to-emerald-600"
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
          <p className="text-slate-600 mb-6">{isAdmin ? 'Create your first announcement to keep everyone informed' : 'No announcements have been posted yet'}</p>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create First Announcement
            </button>
          )}
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
                  <button
                    onClick={() => handleView(announcement)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
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
        <CreateAnnouncementModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadAnnouncements();
          }}
        />
      )}



      {showViewModal && selectedAnnouncement && (
        <ViewAnnouncementModal
          announcement={selectedAnnouncement}
          onClose={() => {
            setShowViewModal(false);
            setSelectedAnnouncement(null);
          }}
        />
      )}

      {showEditModal && selectedAnnouncement && (
        <EditAnnouncementModal
          announcement={selectedAnnouncement}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAnnouncement(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedAnnouncement(null);
            loadAnnouncements();
          }}
        />
      )}
    </div>
  );
}


function EmployeeAnnouncementFeed() {
  const { organization, profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization?.id && profile?.employee_id) {
      loadEmployeeAnnouncements();
    }
  }, [organization, profile]);

  const loadEmployeeAnnouncements = async () => {
    if (!organization?.id || !profile?.employee_id) return;

    try {
      // 1. Get announcements targeted directly to me or my lists
      const { data: explicitAssignments } = await supabase
        .from('announcement_recipients')
        .select('announcement_id')
        .eq('employee_id', profile.employee_id);

      const assignedIds = (explicitAssignments as any[])?.map(a => a.announcement_id) || [];

      // 2. Fetch Active Announcements (ALL or Assigned)
      let query = supabase
        .from('announcements')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (assignedIds.length > 0) {
        query = query.or(`target_type.eq.all,id.in.(${assignedIds.join(',')})`);
      } else {
        query = query.eq('target_type', 'all');
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnnouncements(data || []);

    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Megaphone className="h-8 w-8 text-fuchsia-600" />
          Company News
        </h1>
        <p className="text-slate-600 mt-2">Latest updates and announcements</p>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-12 text-center">
          <BellOff className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up</h3>
          <p className="text-slate-600">There are no active announcements for you right now.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-all relative overflow-hidden"
            >
              {announcement.priority === 'high' && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-3 py-1 rounded-bl-lg font-bold">
                  URGENT
                </div>
              )}
              {announcement.priority === 'medium' && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs px-3 py-1 rounded-bl-lg font-bold">
                  IMPORTANT
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="text-4xl">{getTypeIcon(announcement.type)}</div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{announcement.title}</h3>
                    <span className="text-sm text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(announcement.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="prose prose-slate max-w-none mb-4">
                    <p className="text-slate-700 whitespace-pre-wrap">{announcement.content}</p>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${getPriorityColor(announcement.priority)}`}>
                      {announcement.type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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
  const { organization, user, profile: userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    priority: 'normal',
    target_type: 'all',
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
          priority: formData.priority,
          target_type: 'all', // Simplified: always target all employees
          publish_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          status: 'published',
          created_by: user!.id
        })
        .select()
        .single();

      if (announcementError) throw announcementError;

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

function EditAnnouncementModal({ announcement, onClose, onSuccess, distributionLists }: any) {
  const { organization, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate days until expiry for initial value
  const daysUntilExpiry = Math.ceil(
    (new Date(announcement.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const [formData, setFormData] = useState({
    title: announcement.title || '',
    content: announcement.content || '',
    type: announcement.type || 'general',
    priority: announcement.priority || 'medium',
    is_active: announcement.is_active ?? true,
    expires_in_days: daysUntilExpiry > 0 ? daysUntilExpiry : 30
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + formData.expires_in_days);

      const { error: updateError } = await supabase
        .from('announcements')
        .update({
          title: formData.title,
          content: formData.content,
          type: formData.type,
          priority: formData.priority,
          is_active: formData.is_active,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', announcement.id);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err: any) {
      console.error('Error updating announcement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Edit Announcement</h2>
          <p className="text-blue-100 text-sm mt-1">Update announcement details</p>
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

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-slate-700 cursor-pointer">
              Active (uncheck to deactivate this announcement)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              <Edit className="h-5 w-5" />
              {loading ? 'Updating...' : 'Update Announcement'}
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
      .select('id, first_name, last_name, employee_code, departments(name), designations(name)')
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

function ViewAnnouncementModal({ announcement, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 px-6 py-6 rounded-t-2xl flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{announcement.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-fuchsia-100 text-sm flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(announcement.created_at).toLocaleDateString()}
              </span>
              <span className="bg-white/20 text-white px-2 py-0.5 rounded text-xs font-medium uppercase backdrop-blur-sm">
                {announcement.type}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-1"
          >
            <div className="h-6 w-6 font-bold text-xl">✕</div>
          </button>
        </div>

        <div className="p-8">
          <div className="prose prose-slate max-w-none">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-lg">
              {announcement.content}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4 text-sm text-slate-500">
            <div>
              <p className="font-semibold text-slate-900 mb-1">Priority</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${getPriorityColor(announcement.priority)}`}>
                {announcement.priority}
              </span>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Expires On</p>
              <p>{new Date(announcement.expires_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
