import { PayrollHistoryTab } from '../../components/Payroll/PayrollHistoryTab';
import { useAuth } from '../../contexts/AuthContext';

export function MyPayrollPage() {
    const { profile } = useAuth();

    if (!profile?.employee_id) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Payroll History</h2>
                <p className="text-slate-600">No employee profile found. Please contact your HR administrator.</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <PayrollHistoryTab employeeId={profile.employee_id} />
        </div>
    );
}
