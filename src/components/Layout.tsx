import { useState, useEffect, type ReactNode } from 'react';
import { Menu, X, LogOut, Bell, User, LayoutDashboard, Users, Calendar, Clock, IndianRupee, FileText, Settings, Sparkles, CheckSquare, Receipt, Headphones, Award, BookOpen, Megaphone, ClipboardList, Languages, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, organization, membership, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.setAttribute('dir', i18n.language === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

  useEffect(() => {
    if (membership?.employee_id) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [membership]);

  const loadNotifications = async () => {
    if (!membership?.employee_id) return;

    try {
      const { data, error } = await supabase
        .from('employee_notifications')
        .select('*')
        .eq('employee_id', membership.employee_id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
        setNotificationCount(data.length);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('employee_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  const menuItems = [
    { id: 'dashboard', labelKey: 'menu.dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-blue-600', roles: ['admin', 'hr', 'finance', 'manager', 'employee'] },
    { id: 'payroll', labelKey: 'menu.payroll', icon: IndianRupee, color: 'from-emerald-500 to-emerald-600', roles: ['admin', 'hr', 'finance'] },
    { id: 'reports', labelKey: 'menu.reports', icon: FileText, color: 'from-violet-500 to-violet-600', roles: ['admin', 'hr', 'finance'] },
    { id: 'tasks', labelKey: 'menu.tasks', icon: CheckSquare, color: 'from-purple-500 to-purple-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'work-reports', labelKey: 'menu.workReports', icon: ClipboardList, color: 'from-sky-500 to-sky-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'employees', labelKey: 'menu.employees', icon: Users, color: 'from-teal-500 to-teal-600', roles: ['admin', 'hr', 'manager'] },
    { id: 'attendance', labelKey: 'menu.attendance', icon: Clock, color: 'from-amber-500 to-amber-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'leave', labelKey: 'menu.leave', icon: Calendar, color: 'from-cyan-500 to-cyan-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'expenses', labelKey: 'menu.expenses', icon: Receipt, color: 'from-orange-500 to-orange-600', roles: ['admin', 'hr', 'finance', 'manager', 'employee'] },
    { id: 'performance', labelKey: 'menu.performance', icon: Award, color: 'from-yellow-500 to-yellow-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'training', labelKey: 'menu.training', icon: BookOpen, color: 'from-green-500 to-green-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'helpdesk', labelKey: 'menu.helpdesk', icon: Headphones, color: 'from-pink-500 to-pink-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'announcements', labelKey: 'menu.announcements', icon: Megaphone, color: 'from-fuchsia-500 to-fuchsia-600', roles: ['admin', 'hr', 'manager', 'employee'] },
    { id: 'help', labelKey: 'menu.help', icon: HelpCircle, color: 'from-blue-500 to-blue-600', roles: ['admin', 'hr', 'manager', 'employee', 'finance'] },
    { id: 'settings', labelKey: 'menu.settings', icon: Settings, color: 'from-slate-500 to-slate-600', roles: ['admin', 'hr'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    membership && item.roles.includes(membership.role)
  );

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 fixed w-full z-30 top-0 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <div className="ml-4 flex items-center gap-2">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                    {organization?.name || 'HRMS & Payroll'}
                  </h1>
                  <p className="text-xs text-slate-500">Human Resource Management</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 p-2 px-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                title={i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
              >
                <Languages className="h-5 w-5" />
                <span className="text-sm font-medium">{i18n.language === 'en' ? 'EN' : 'العربية'}</span>
              </button>

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
                  <p className="text-xs text-slate-500 capitalize flex items-center justify-end gap-1">
                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full"></span>
                    {membership?.role}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('profile')}
                  className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white shadow-lg ring-2 ring-blue-100 hover:ring-4 hover:ring-blue-200 transition-all"
                  title="My Profile"
                >
                  <User className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={handleSignOut}
                className="p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showNotifications && (
        <div className="fixed top-20 right-4 w-96 max-h-[32rem] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">No new notifications</p>
                <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Bell className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 text-sm mb-1">
                          {notif.title}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2">{notif.message}</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400">
                            {new Date(notif.created_at).toLocaleString()}
                          </p>
                          <button
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Mark as read
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex pt-16">
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed left-0 z-20 w-72 h-[calc(100vh-4rem)] bg-white/80 backdrop-blur-xl border-r border-slate-200/50 transition-transform duration-300 ease-in-out overflow-y-auto shadow-xl`}
        >
          <div className="p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 mb-6 shadow-md border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-400 text-xs font-medium">{organization?.name || 'Organization'}</p>
                  <p className="text-white font-semibold text-sm truncate">{membership?.role || 'User'}</p>
                </div>
              </div>
            </div>

            <div className="mb-3 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('common.menu')}</p>
            </div>

            <nav className="space-y-1.5">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`group relative flex items-center w-full px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg shadow-' + item.color.split('-')[1] + '-500/30'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${i18n.language === 'ar' ? 'ml-3' : 'mr-3'} transition-all ${
                      isActive
                        ? 'bg-white/20 backdrop-blur-sm'
                        : 'bg-slate-100 group-hover:bg-slate-200'
                    }`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-900'}`} />
                    </div>
                    <span className="flex-1">{t(item.labelKey)}</span>
                    {isActive && (
                      <div className={`absolute ${i18n.language === 'ar' ? 'left-4' : 'right-4'} h-2 w-2 bg-white rounded-full shadow-lg`}></div>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 mx-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 mb-1">Pro Features</p>
                  <p className="text-xs text-amber-700 mb-3">Upgrade for advanced analytics</p>
                  <button className="text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main
          className={`${
            sidebarOpen ? 'ml-72' : 'ml-0'
          } flex-1 transition-all duration-300 ease-in-out p-6 w-full`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
