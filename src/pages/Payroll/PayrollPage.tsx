import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QatarPayrollPage } from './QatarPayrollPage';
import { SaudiPayrollPage } from './SaudiPayrollPage';
import { IndiaPayrollPage } from './IndiaPayrollPage';
import { MyPayrollPage } from './MyPayrollPage';

export function PayrollPage() {
  const { organization, profile } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organization) {
      setLoading(false);
    }
  }, [organization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  console.log('PayrollPage rendering, profile:', profile);
  console.log('Profile role:', profile?.role);

  // Check if user is an employee - show employee view
  if (profile?.role === 'employee') {
    console.log('Rendering MyPayrollPage for employee');
    return <MyPayrollPage />;
  }

  // Route to country-specific payroll for HR/Admin
  console.log('Current Organization:', organization);
  const country = organization?.country?.toLowerCase();

  if (country === 'qatar') {
    return <QatarPayrollPage />;
  }

  if (country === 'saudi arabia') {
    return <SaudiPayrollPage />;
  }

  // Default India Payroll for HR/Admin
  return <IndiaPayrollPage />;
}
