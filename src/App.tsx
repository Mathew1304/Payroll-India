import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ImportProvider } from './contexts/ImportContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './components/Auth/LoginPage';
import { RegisterPage } from './components/Auth/RegisterPage';
import { EmployeeRegisterPage } from './components/Auth/EmployeeRegisterPage';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EmployeesPage } from './pages/Employees/EmployeesPage';
import { AttendancePage } from './pages/Attendance/AttendancePage';
import { LeavePage } from './pages/Leave/LeavePage';
import { AdminLeavePage } from './pages/Leave/AdminLeavePage';
import { PayrollPage } from './pages/Payroll/PayrollPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { EmployeeSettingsPage } from './pages/Settings/EmployeeSettingsPage';
import { EmployeeProfilePage } from './pages/EmployeeProfile/EmployeeProfilePage';
import { TasksPage } from './pages/Tasks/TasksPage';
import { ExpensesPage } from './pages/Expenses/ExpensesPage';
import { SuperAdminPage } from './pages/SuperAdminPage';

import { HelpdeskPage } from './pages/Helpdesk/HelpdeskPage';
import { PerformancePage } from './pages/Performance/PerformancePage';
import { EmployeePerformancePage } from './pages/Performance/EmployeePerformancePage';
import { AttendanceAdminPage } from './pages/Attendance/Admin/AttendanceAdminPage';
import { AttendanceEmployeePage } from './pages/Attendance/Employee/AttendanceEmployeePage';
import { TrainingPage } from './pages/Training/TrainingPage';
import { AnnouncementsPage } from './pages/Announcements/AnnouncementsPage';
// import { AssetsPage } from './pages/Assets/AssetsPage';
import { OnboardingFormPage } from './pages/EmployeeOnboarding/OnboardingFormPage';
import { WorkReportsPage } from './pages/WorkReports/WorkReportsPage';
import { HelpPage } from './pages/Help/HelpPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { ChangePasswordPage } from './pages/Auth/ChangePasswordPage';
import { MyPayrollPage } from './pages/Payroll/MyPayrollPage';

function AppContent() {
  const { user, loading, profile } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register' | 'employee-register' | 'onboarding'>('landing');

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path === '/onboarding' || params.get('token')) {
      setAuthMode('onboarding');
    } else if (path === '/employee-register' || params.get('code')) {
      setAuthMode('employee-register');
    }
  }, []);

  useEffect(() => {
    if (!user && !loading) {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      if (path !== '/onboarding' && !params.get('token') && path !== '/employee-register' && !params.get('code')) {
        setAuthMode('landing');
      }
    }
  }, [user, loading]);

  // Handle Role-Based Redirects & Forced Password Change
  useEffect(() => {
    if (user && !loading && profile) {
      const metadata = user.user_metadata;

      if (metadata?.force_password_change) {
        setCurrentPage('change-password');
        return;
      }

      // If user is employee and tries to access restricted pages (or default dashboard), redirect to employee-dashboard
      if (profile.role === 'employee') {
        if (currentPage === 'dashboard' || currentPage === 'super-admin') {
          setCurrentPage('employee-dashboard');
        }
      }
    }
  }, [user, loading, profile, currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'onboarding') {
      return <OnboardingFormPage />;
    }

    if (authMode === 'employee-register') {
      return <EmployeeRegisterPage />;
    }

    if (authMode === 'landing') {
      return (
        <LandingPage
          onGetStarted={() => setAuthMode('register')}
          onLogin={() => setAuthMode('login')}
        />
      );
    }

    return authMode === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'tasks':
        return <TasksPage />;
      case 'employees':
        return <EmployeesPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'leave':
        // Show employee-specific view for employees, admin view for managers/admins
        return profile?.role === 'employee' ? <LeavePage /> : <AdminLeavePage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'payroll':
        return <PayrollPage />;
      case 'my-payroll':
        return <MyPayrollPage />;
      case 'performance':
        // Show employee-specific view for employees, admin view for managers/admins
        return profile?.role === 'employee' ? <EmployeePerformancePage /> : <PerformancePage />;
      case 'training':
        return <TrainingPage />;
      case 'helpdesk':
        return <HelpdeskPage />;
      case 'attendance-admin':
        return <AttendanceAdminPage />;
      case 'attendance-employee':
        return <AttendanceEmployeePage />;
      case 'announcements':
        return <AnnouncementsPage />;
      case 'work-reports':
        return <WorkReportsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'employee-settings':
        return <EmployeeSettingsPage />;
      case 'profile':
        return <EmployeeProfilePage />;
      case 'help':
        return <HelpPage />;
      case 'super-admin':
        return <SuperAdminPage />;
      case 'employee-dashboard':
        return <EmployeeDashboard onNavigate={setCurrentPage} />;
      case 'change-password':
        return <ChangePasswordPage />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ImportProvider>
          <AppContent />
        </ImportProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
