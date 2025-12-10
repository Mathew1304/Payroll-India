import { useAuth } from '../../contexts/AuthContext';
import { EmployeeHelpdeskDashboard } from './EmployeeHelpdeskDashboard';
import { AdminHelpdeskDashboard } from './AdminHelpdeskDashboard';

export function HelpdeskPage() {
  const { membership } = useAuth();

  const isAdmin = membership?.role === 'admin' || membership?.role === 'super_admin' || membership?.role === 'hr';

  if (isAdmin) {
    return <AdminHelpdeskDashboard />;
  }

  return <EmployeeHelpdeskDashboard />;
}
