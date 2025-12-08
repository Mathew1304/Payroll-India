import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { QatarPayrollPage } from './QatarPayrollPage';
import { SaudiPayrollPage } from './SaudiPayrollPage';
import { DollarSign } from 'lucide-react';

export function PayrollPage() {
  const { organization } = useAuth();
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

  // Route to country-specific payroll
  if (organization?.country === 'Qatar') {
    return <QatarPayrollPage />;
  }

  if (organization?.country === 'Saudi Arabia') {
    return <SaudiPayrollPage />;
  }

  // Default India Payroll
  return <IndiaPayrollPage />;
}

function IndiaPayrollPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-emerald-600" />
          India Payroll
        </h1>
        <p className="text-slate-600 mt-1">PF, ESI, TDS & Professional Tax Compliant</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PayrollStatCard label="Current Month Salary" value="45,000 QAR" color="blue" />
        <PayrollStatCard label="YTD Earnings" value="5,40,000 QAR" color="green" />
        <PayrollStatCard label="Tax Deducted" value="54,000 QAR" color="red" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Payslip History</h2>
        </div>
        <div className="p-6">
          <p className="text-slate-500 text-center py-12">India payroll features coming soon</p>
        </div>
      </div>
    </div>
  );
}

function PayrollStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} rounded-xl shadow-md p-6 text-white`}>
      <p className="text-sm opacity-90">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
