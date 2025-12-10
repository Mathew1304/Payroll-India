import { useState, useEffect, Fragment } from 'react';
import { Banknote, Plus, Download, FileText, Clock, Calculator, TrendingUp, Users, Calendar, CheckCircle, AlertCircle, X, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCompletePayroll, calculateEOS, calculateYearsOfService } from '../../utils/qatarPayrollCalculations';
import { generateQatarWPSSIFFile, generateQatarWPSCSVFile, downloadTextFile, downloadCSVFile } from '../../utils/wpsFileGenerator';
import { downloadPayslipHTML, printPayslip } from '../../utils/payslipGenerator';
import {
  generateQatarWPSFile,
  downloadWPSFile,
  validateWPSData,
  getWPSSummary,
  getWPSFileName,
  formatWPSMonth
} from '../../utils/wpsFileGeneratorQatar';
import { validatePrePayroll, ValidationResult } from '../../utils/payrollValidation';
import { PayrollValidationPanel } from '../../components/Payroll/PayrollValidationPanel';

interface SalaryComponent {
  id: string;
  employee_id: string;
  basic_salary: number;
  housing_allowance: number;
  food_allowance: number;
  transport_allowance: number;
  mobile_allowance: number;
  utility_allowance: number;
  other_allowances: number;
  employee?: any;
}

interface PayrollRecord {
  id: string;
  employee_id: string;
  pay_period_month: number;
  pay_period_year: number;
  basic_salary: number;
  housing_allowance: number;
  food_allowance: number;
  transport_allowance: number;
  overtime_amount: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  status: string;
  employee?: any;
}

export function QatarPayrollPage() {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'payroll' | 'salary-setup' | 'overtime' | 'eos' | 'wps'>('payroll');
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<SalaryComponent[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showNotification = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const closeNotification = () => {
    setNotification({ ...notification, show: false });
  };

  useEffect(() => {
    if (organization?.id) {
      loadData();
    }
  }, [organization, selectedMonth, selectedYear]);

  const loadData = async () => {
    await Promise.all([
      loadPayrollRecords(),
      loadSalaryComponents(),
      loadAllEmployees()
    ]);
    setLoading(false);
  };

  const loadPayrollRecords = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('qatar_payroll_records')
      .select(`
        *,
        employee:employees(
          id,
          first_name,
          last_name,
          employee_code,
          qatar_id,
          iban_number
        )
      `)
      .eq('organization_id', organization.id)
      .eq('pay_period_month', selectedMonth)
      .eq('pay_period_year', selectedYear)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading payroll records:', error);
      return;
    }

    if (data) setPayrollRecords(data);
  };

  const loadSalaryComponents = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('qatar_salary_components')
      .select(`
        *,
        employee:employees(
          id,
          first_name,
          last_name,
          employee_code,
          qatar_id
        )
      `)
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading salary components:', error);
      return;
    }

    if (data) setSalaryComponents(data);
  };

  const loadAllEmployees = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, qatar_id, iban_number, is_active, employment_status')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading employees:', error);
      return;
    }

    if (data) setAllEmployees(data);
  };

  const stats = {
    totalEmployees: allEmployees.length,
    processedPayroll: payrollRecords.filter(r => r.status === 'paid').length,
    pendingPayroll: payrollRecords.filter(r => r.status === 'approved').length,
    totalAmount: payrollRecords.reduce((sum, r) => sum + Number(r.net_salary), 0)
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-emerald-600" />
            Qatar Payroll System
          </h1>
          <p className="text-sm text-slate-600 mt-1">WPS Compliant • End of Service • Overtime Management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowProcessModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Calculator className="h-4 w-4" />
            Process Payroll
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white rounded-lg shadow-md p-3 border border-slate-200">
        <Calendar className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-700">Pay Period:</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
        >
          {monthNames.map((month, index) => (
            <option key={index} value={index + 1}>{month}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees}
          icon={Users}
          gradient="from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Paid This Month"
          value={stats.processedPayroll}
          icon={CheckCircle}
          gradient="from-emerald-500 to-emerald-600"
        />
        <StatsCard
          title="Pending Payment"
          value={stats.pendingPayroll}
          icon={Clock}
          gradient="from-amber-500 to-amber-600"
        />
        <StatsCard
          title="Total Amount (QAR)"
          value={stats.totalAmount.toLocaleString()}
          icon={TrendingUp}
          gradient="from-violet-500 to-violet-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-1.5">
            {[
              { id: 'payroll', label: 'Monthly Payroll', icon: Banknote },
              { id: 'salary-setup', label: 'Salary Components', icon: FileText },
              { id: 'overtime', label: 'Overtime', icon: Clock },
              { id: 'eos', label: 'End of Service', icon: Calculator },
              { id: 'wps', label: 'WPS / SIF Files', icon: Download }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id
                    ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'payroll' && (
            <PayrollRecordsTab
              records={payrollRecords}
              onRefresh={loadPayrollRecords}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              organizationName={organization?.name || ''}
              showNotification={showNotification}
            />
          )}
          {activeTab === 'salary-setup' && (
            <SalaryComponentsTab
              components={salaryComponents}
              allEmployees={allEmployees}
              onRefresh={() => {
                loadSalaryComponents();
                loadAllEmployees();
              }}
              showNotification={showNotification}
            />
          )}
          {activeTab === 'overtime' && (
            <OvertimeTab organizationId={organization?.id} />
          )}
          {activeTab === 'eos' && (
            <EOSTab organizationId={organization?.id} />
          )}
          {activeTab === 'wps' && (
            <WPSTab
              organizationId={organization?.id}
              payrollRecords={payrollRecords}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />
          )}
        </div>
      </div>

      {showProcessModal && (
        <ProcessPayrollModal
          onClose={() => setShowProcessModal(false)}
          onSuccess={() => {
            setShowProcessModal(false);
            loadPayrollRecords();
          }}
          month={selectedMonth}
          year={selectedYear}
          showNotification={showNotification}
        />
      )}

      {notification.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
            <div className={`px-4 py-3 rounded-t-xl ${notification.type === 'success' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700' :
              notification.type === 'error' ? 'bg-gradient-to-r from-red-600 to-red-700' :
                'bg-gradient-to-r from-blue-600 to-blue-700'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-white" />}
                  {notification.type === 'error' && <AlertCircle className="h-5 w-5 text-white" />}
                  {notification.type === 'info' && <AlertCircle className="h-5 w-5 text-white" />}
                  <h3 className="text-lg font-bold text-white">{notification.title}</h3>
                </div>
                <button
                  onClick={closeNotification}
                  className="text-white hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{notification.message}</p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={closeNotification}
                  className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${notification.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                    notification.type === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, gradient }: any) {
  return (
    <div className="group relative bg-white rounded-lg shadow-md border border-slate-200 p-4 hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function PayrollRecordsTab({ records, onRefresh, selectedMonth, selectedYear, organizationName, showNotification }: any) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [markingPayment, setMarkingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bankReference, setBankReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleMarkAsPaid = async () => {
    if (!bankReference.trim()) {
      showNotification('error', 'Missing Information', 'Please enter the bank reference number');
      return;
    }

    setMarkingPayment(true);
    try {
      const updates = records.map((record: any) => ({
        id: record.id,
        payment_status: 'paid',
        payment_date: paymentDate,
        bank_reference_number: bankReference
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('qatar_payroll_records')
          .update({
            payment_status: update.payment_status,
            payment_date: update.payment_date,
            bank_reference_number: update.bank_reference_number
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      showNotification('success', 'Payment Recorded', `Successfully marked ${records.length} employee(s) as PAID\n\nBank Reference: ${bankReference}\nPayment Date: ${new Date(paymentDate).toLocaleDateString()}`);
      setShowPaymentModal(false);
      setBankReference('');
      onRefresh();
    } catch (error: any) {
      showNotification('error', 'Payment Failed', error.message || 'An error occurred while marking payments');
    } finally {
      setMarkingPayment(false);
    }
  };

  const toggleRowExpansion = (recordId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRows(newExpanded);
  };

  // Filter records based on search query
  const filteredRecords = records.filter((record: any) => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${record.employee?.first_name} ${record.employee?.last_name}`.toLowerCase();
    const employeeCode = record.employee?.employee_code?.toLowerCase() || '';
    const qid = record.employee?.qatar_id?.toLowerCase() || '';

    return fullName.includes(searchLower) ||
      employeeCode.includes(searchLower) ||
      qid.includes(searchLower);
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleDownloadPayslip = (record: any) => {
    const payslipData = {
      country: 'Qatar' as const,
      currency: 'QAR' as const,
      companyName: organizationName,
      establishmentId: 'EST-001',
      employeeName: `${record.employee.first_name} ${record.employee.last_name}`,
      employeeCode: record.employee.employee_code,
      employeeId: record.employee.qatar_id || '',
      iban: record.employee.iban_number || '',
      payPeriod: `${monthNames[selectedMonth - 1]} ${selectedYear}`,
      workingDays: record.working_days,
      daysPresent: record.days_present,
      daysAbsent: record.days_absent,
      basicSalary: Number(record.basic_salary),
      housingAllowance: Number(record.housing_allowance),
      foodAllowance: Number(record.food_allowance),
      transportAllowance: Number(record.transport_allowance),
      mobileAllowance: Number(record.mobile_allowance),
      utilityAllowance: Number(record.utility_allowance),
      otherAllowances: Number(record.other_allowances),
      overtimeHours: Number(record.overtime_hours),
      overtimeAmount: Number(record.overtime_amount),
      bonus: Number(record.bonus) || 0,
      absenceDeduction: Number(record.absence_deduction),
      loanDeduction: Number(record.loan_deduction),
      advanceDeduction: Number(record.advance_deduction),
      penaltyDeduction: Number(record.penalty_deduction),
      otherDeductions: Number(record.other_deductions),
      grossSalary: Number(record.gross_salary),
      totalEarnings: Number(record.gross_salary) + Number(record.overtime_amount) + (Number(record.bonus) || 0),
      totalDeductions: Number(record.total_deductions),
      netSalary: Number(record.net_salary)
    };

    downloadPayslipHTML(payslipData);
  };

  if (records.length === 0) {
    return (
      <div className="text-center py-8">
        <Banknote className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1.5">No Payroll Processed</h3>
        <p className="text-sm text-slate-600">Process payroll for this period to generate records</p>
      </div>
    );
  }

  const paymentStatus = records[0]?.payment_status || 'draft';
  const allPaid = records.every((r: any) => r.payment_status === 'paid' || r.payment_status === 'confirmed');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg">
        <div className="flex items-center gap-2.5">
          <div className={`p-1.5 rounded-lg ${allPaid ? 'bg-emerald-100' : 'bg-blue-100'}`}>
            <CheckCircle className={`h-5 w-5 ${allPaid ? 'text-emerald-600' : 'text-blue-600'}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {allPaid ? 'All Employees Paid' : 'Ready to Pay Employees'}
            </h3>
            <p className="text-xs text-slate-600">
              {allPaid
                ? `${records.length} employee(s) have been paid for ${monthNames[selectedMonth - 1]} ${selectedYear}`
                : `${records.length} employee(s) ready for payment`
              }
            </p>
          </div>
        </div>
        {!allPaid && (
          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={markingPayment}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            {markingPayment ? 'Processing...' : 'Mark as Paid'}
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, employee code, or Qatar ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-xs text-slate-600">per page</span>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>
          Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} employees
          {searchQuery && ` (filtered from ${records.length} total)`}
        </span>
      </div>

      {/* Compact Table View */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-8"></th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Employee</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Basic</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Allowances</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Overtime</th>
                <th className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Net Salary</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {paginatedRecords.map((record: PayrollRecord) => {
                const isExpanded = expandedRows.has(record.id);
                const allowancesTotal = Number(record.housing_allowance) + Number(record.food_allowance) + Number(record.transport_allowance);

                return (
                  <Fragment key={record.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleRowExpansion(record.id)}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">
                            {record.employee?.first_name} {record.employee?.last_name}
                          </span>
                          <span className="text-xs text-slate-500">{record.employee?.employee_code}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {Number(record.basic_salary).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {allowancesTotal.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm font-semibold text-slate-900">
                          {Number(record.overtime_amount).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-base font-bold text-emerald-600">
                          {Number(record.net_salary).toLocaleString()} QAR
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                            record.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                            {record.status.toUpperCase()}
                          </span>
                          {(record as any).payment_status && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${(record as any).payment_status === 'paid' || (record as any).payment_status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : (record as any).payment_status === 'submitted_to_bank'
                                ? 'bg-blue-100 text-blue-700'
                                : (record as any).payment_status === 'pending_payment'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                              {(record as any).payment_status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => handleDownloadPayslip(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Download className="h-3 w-3" />
                          Payslip
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${record.id}-details`} className="bg-slate-50">
                        <td colSpan={8} className="px-3 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Housing Allowance</p>
                              <p className="text-sm font-bold text-slate-900">{Number(record.housing_allowance).toLocaleString()} QAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Food Allowance</p>
                              <p className="text-sm font-bold text-slate-900">{Number(record.food_allowance).toLocaleString()} QAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Transport Allowance</p>
                              <p className="text-sm font-bold text-slate-900">{Number(record.transport_allowance).toLocaleString()} QAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Qatar ID</p>
                              <p className="text-sm font-bold text-slate-900">{record.employee?.qatar_id || 'N/A'}</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Mobile Allowance</p>
                              <p className="text-sm font-bold text-slate-900">{Number((record as any).mobile_allowance || 0).toLocaleString()} QAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Utility Allowance</p>
                              <p className="text-sm font-bold text-slate-900">{Number((record as any).utility_allowance || 0).toLocaleString()} QAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Other Allowances</p>
                              <p className="text-sm font-bold text-slate-900">{Number((record as any).other_allowances || 0).toLocaleString()} QAR</p>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <p className="text-xs text-slate-500 font-medium mb-1">Gross Salary</p>
                              <p className="text-sm font-bold text-slate-900">{Number(record.gross_salary).toLocaleString()} QAR</p>
                            </div>
                          </div>
                          {(record as any).payment_status === 'paid' && (record as any).payment_date && (
                            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                                <span className="font-bold text-emerald-900">
                                  Paid on {new Date((record as any).payment_date).toLocaleDateString()}
                                </span>
                                {(record as any).bank_reference_number && (
                                  <span className="text-emerald-700">
                                    | Bank Ref: {(record as any).bank_reference_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              // Show first page, last page, current page, and pages around current page
              if (
                page === 1 ||
                page === totalPages ||
                (page >= currentPage - 1 && page <= currentPage + 1)
              ) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50'
                      }`}
                  >
                    {page}
                  </button>
                );
              } else if (
                page === currentPage - 2 ||
                page === currentPage + 2
              ) {
                return <span key={page} className="px-2 text-slate-500">...</span>;
              }
              return null;
            })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Confirm Payment</h2>
                  <p className="text-emerald-50 text-sm">Mark {records.length} employee(s) as paid</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Explanation Box */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 mb-2">What is Bank Reference Number?</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      When you submit a bulk salary payment through your bank's portal, the bank provides a unique
                      <strong> Batch Reference Number</strong> or <strong>Transaction Reference Number</strong>.
                      This number helps you track and reconcile the payment.
                    </p>
                    <div className="bg-blue-100 rounded-lg p-3 space-y-1">
                      <p className="text-xs font-bold text-blue-900 mb-1">Examples:</p>
                      <p className="text-xs text-blue-800 font-mono">• BATCH2024120800123</p>
                      <p className="text-xs text-blue-800 font-mono">• TXN-BULK-456789</p>
                      <p className="text-xs text-blue-800 font-mono">• REF-20241208-SAL</p>
                      <p className="text-xs text-blue-800 font-mono">• PAYROLL-DEC-2024</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Bank Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="Enter reference from your bank (e.g., BATCH2024120800123)"
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Find this in your bank's corporate portal after submitting the salary file
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    The date when the bank processed the bulk transfer
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2">Payment Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Employees:</span>
                    <span className="font-bold text-slate-900">{records.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total Amount:</span>
                    <span className="font-bold text-emerald-600">
                      {records.reduce((sum, r) => sum + Number(r.net_salary), 0).toLocaleString()} QAR
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Month:</span>
                    <span className="font-bold text-slate-900">
                      {monthNames[selectedMonth - 1]} {selectedYear}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setBankReference('');
                  }}
                  className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  disabled={markingPayment || !bankReference.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {markingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalaryComponentsTab({ components, allEmployees, onRefresh, showNotification }: any) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const getEmployeeSalaryComponent = (employeeId: string) => {
    return components.find((c: SalaryComponent) => c.employee_id === employeeId);
  };

  if (allEmployees.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1.5">No Employees Found</h3>
        <p className="text-sm text-slate-600">Add employees first to set up salary components</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-base font-bold">Salary Structure Setup</h3>
          <p className="text-xs text-slate-600">
            {components.length} of {allEmployees.length} employees have salary configured
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Salary Component
        </button>
      </div>

      <div className="space-y-2.5">
        {allEmployees.map((employee: any) => {
          const salaryComp = getEmployeeSalaryComponent(employee.id);

          if (salaryComp) {
            return (
              <div
                key={employee.id}
                className="border-2 border-emerald-200 bg-emerald-50/30 rounded-lg p-4 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-bold text-slate-900">
                        {employee.first_name} {employee.last_name}
                      </h4>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                        CONFIGURED
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{employee.employee_code} • QID: {employee.qatar_id || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-medium uppercase">Total Monthly Salary</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {(Number(salaryComp.basic_salary) +
                        Number(salaryComp.housing_allowance) +
                        Number(salaryComp.food_allowance) +
                        Number(salaryComp.transport_allowance) +
                        Number(salaryComp.mobile_allowance) +
                        Number(salaryComp.utility_allowance) +
                        Number(salaryComp.other_allowances)).toLocaleString()} QAR
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200">
                    <p className="text-[10px] text-emerald-700 font-medium uppercase">Basic Salary</p>
                    <p className="text-sm font-bold text-emerald-900">{Number(salaryComp.basic_salary).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                    <p className="text-[10px] text-blue-700 font-medium uppercase">Housing</p>
                    <p className="text-sm font-bold text-blue-900">{Number(salaryComp.housing_allowance).toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                    <p className="text-[10px] text-amber-700 font-medium uppercase">Food</p>
                    <p className="text-sm font-bold text-amber-900">{Number(salaryComp.food_allowance).toLocaleString()}</p>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-2 border border-violet-200">
                    <p className="text-[10px] text-violet-700 font-medium uppercase">Transport</p>
                    <p className="text-sm font-bold text-violet-900">{Number(salaryComp.transport_allowance).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={employee.id}
                className="border-2 border-amber-200 bg-amber-50/30 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-base font-bold text-slate-900">
                        {employee.first_name} {employee.last_name}
                      </h4>
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                        NOT CONFIGURED
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{employee.employee_code} • QID: {employee.qatar_id || 'N/A'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEmployeeId(employee.id);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Set Up Salary
                  </button>
                </div>
              </div>
            );
          }
        })}
      </div>

      {showAddModal && (
        <AddSalaryComponentModal
          preSelectedEmployeeId={selectedEmployeeId}
          onClose={() => {
            setShowAddModal(false);
            setSelectedEmployeeId(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setSelectedEmployeeId(null);
            onRefresh();
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}

function OvertimeTab({ organizationId }: any) {
  return (
    <div className="text-center py-12">
      <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-900 mb-2">Overtime Management</h3>
      <p className="text-slate-600">Track and approve employee overtime hours</p>
      <p className="text-sm text-slate-500 mt-2">Weekday: 125% • Weekend: 150% • Holiday: 150%</p>
    </div>
  );
}

function EOSTab({ organizationId }: any) {
  return (
    <div className="text-center py-12">
      <Calculator className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-900 mb-2">End of Service Calculations</h3>
      <p className="text-slate-600">Calculate EOS gratuity for employees</p>
      <p className="text-sm text-slate-500 mt-2">Formula: (Basic × 21 days × Years) / 30</p>
    </div>
  );
}

function WPSTab({ organizationId, payrollRecords, selectedMonth, selectedYear }: any) {
  const { organization } = useAuth();
  const [showPreview, setShowPreview] = useState(false);
  const [establishmentId, setEstablishmentId] = useState('');
  const [filePreview, setFilePreview] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  const wpsEmployees = Array.isArray(payrollRecords) ? payrollRecords.map((record: any) => ({
    qid: record.employee?.qatar_id || '',
    iban: record.employee?.iban_number || '',
    basicSalary: Number(record.basic_salary) || 0,
    allowances: (Number(record.housing_allowance) || 0) + (Number(record.food_allowance) || 0) + (Number(record.transport_allowance) || 0) + (Number(record.mobile_allowance) || 0) + (Number(record.utility_allowance) || 0) + (Number(record.other_allowances) || 0),
    overtime: Number(record.overtime_amount) || 0,
    deductions: Number(record.total_deductions) || 0,
    netSalary: Number(record.net_salary) || 0,
    employeeName: `${record.employee?.first_name || ''} ${record.employee?.last_name || ''}`
  })) : [];

  const oldValidation = wpsEmployees.length > 0 ? validateWPSData(wpsEmployees) : { valid: false, errors: ['No payroll records found'] };
  const summary = wpsEmployees.length > 0 ? getWPSSummary(wpsEmployees) : {
    totalEmployees: 0,
    totalBasicSalary: 0,
    totalAllowances: 0,
    totalNetSalary: 0,
    employeesWithMissingQID: 0,
    employeesWithMissingIBAN: 0
  };

  const runValidation = async () => {
    if (!organizationId) return;

    setValidationLoading(true);
    try {
      const result = await validatePrePayroll(organizationId, selectedMonth, selectedYear, 'Qatar');
      setValidation(result);
    } catch (error: any) {
      showNotification('error', 'Validation Failed', error.message || 'An error occurred during validation');
    } finally {
      setValidationLoading(false);
    }
  };

  const handleGenerateWPS = (format: 'sif' | 'txt' | 'csv') => {
    if (!establishmentId.trim()) {
      showNotification('error', 'Missing Information', 'Please enter your Establishment ID (Employer ID)');
      return;
    }

    if (validation && !validation.passed) {
      showNotification('error', 'Validation Errors', `Cannot generate WPS file. Please fix ${validation.totalErrors} validation error(s) first. Run the validation to see details.`);
      return;
    }

    if (oldValidation && !oldValidation.valid && oldValidation.errors) {
      showNotification('error', 'Validation Errors', 'Cannot generate WPS file. Please fix the following errors:\n\n' + oldValidation.errors.join('\n'));
      return;
    }

    if (!oldValidation || !oldValidation.valid) {
      showNotification('error', 'Missing Data', 'Cannot generate WPS file. Please ensure all employees have valid Qatar ID and IBAN numbers.');
      return;
    }

    try {
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const yearStr = selectedYear.toString();

      if (format === 'sif') {
        // Generate SIF format (Salary Information File)
        const sifData: any = {
          establishmentId: establishmentId,
          establishmentName: organization?.name || 'Company',
          payPeriodMonth: selectedMonth,
          payPeriodYear: selectedYear,
          employees: payrollRecords.map((record: any) => ({
            employeeQID: record.employee?.qatar_id || '',
            employeeName: `${record.employee?.first_name} ${record.employee?.last_name}`,
            iban: record.employee?.iban_number || '',
            basicSalary: Number(record.basic_salary),
            allowances: Number(record.housing_allowance) + Number(record.food_allowance) +
              Number(record.transport_allowance) + Number(record.mobile_allowance) +
              Number(record.utility_allowance) + Number(record.other_allowances),
            deductions: Number(record.total_deductions) || 0,
            netSalary: Number(record.net_salary),
            bankCode: ''
          }))
        };

        const sifContent = generateQatarWPSSIFFile(sifData);
        const filename = `WPS_SIF_${establishmentId}_${monthStr}${yearStr}.txt`;
        downloadTextFile(sifContent, filename);
        setFilePreview(sifContent);
        setShowPreview(true);

      } else if (format === 'csv') {
        // Generate CSV format
        const csvData: any = {
          establishmentId: establishmentId,
          establishmentName: organization?.name || 'Company',
          payPeriodMonth: selectedMonth,
          payPeriodYear: selectedYear,
          employees: payrollRecords.map((record: any) => ({
            employeeQID: record.employee?.qatar_id || '',
            employeeName: `${record.employee?.first_name} ${record.employee?.last_name}`,
            iban: record.employee?.iban_number || '',
            basicSalary: Number(record.basic_salary),
            allowances: Number(record.housing_allowance) + Number(record.food_allowance) +
              Number(record.transport_allowance) + Number(record.mobile_allowance) +
              Number(record.utility_allowance) + Number(record.other_allowances),
            deductions: Number(record.total_deductions) || 0,
            netSalary: Number(record.net_salary),
            bankCode: ''
          }))
        };

        const csvContent = generateQatarWPSCSVFile(csvData);
        const filename = `WPS_${establishmentId}_${monthStr}${yearStr}.csv`;
        downloadCSVFile(csvContent, filename);

      } else {
        // Generate simple TXT format
        const wpsMonth = formatWPSMonth(selectedYear, selectedMonth);
        const fileContent = generateQatarWPSFile({
          employerId: establishmentId,
          month: wpsMonth,
          employees: wpsEmployees
        });

        const filename = getWPSFileName(establishmentId, wpsMonth);
        downloadWPSFile(fileContent, filename);
        setFilePreview(fileContent);
        setShowPreview(true);
      }
    } catch (error: any) {
      showNotification('error', 'Generation Failed', error.message || 'An error occurred while generating the WPS file');
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  if (payrollRecords.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Payroll Records</h3>
        <p className="text-slate-600">Process payroll for this period before generating WPS file</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl shadow">
            <FileText className="h-8 w-8 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-emerald-900 mb-2">Wage Protection System (WPS)</h3>
            <p className="text-emerald-800 text-sm leading-relaxed">
              WPS is a mandatory payroll reporting system issued by the Qatar Ministry of Labour (MoL).
              Every company must submit a Salary Information File (SIF) each month to prove all employees were paid correctly.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white text-emerald-700 text-xs font-bold rounded-full">Ministry Compliance</span>
              <span className="px-3 py-1 bg-white text-emerald-700 text-xs font-bold rounded-full">Bank Submission Required</span>
              <span className="px-3 py-1 bg-white text-emerald-700 text-xs font-bold rounded-full">Monthly Deadline</span>
            </div>
          </div>
        </div>
      </div>

      <PayrollValidationPanel
        validation={validation}
        loading={validationLoading}
        onRunValidation={runValidation}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Total Employees</p>
          <p className="text-2xl font-bold text-slate-900">{summary.totalEmployees}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Basic Salary</p>
          <p className="text-2xl font-bold text-blue-600">{summary.totalBasicSalary.toLocaleString()} QAR</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Allowances</p>
          <p className="text-2xl font-bold text-violet-600">{summary.totalAllowances.toLocaleString()} QAR</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Net Salary</p>
          <p className="text-2xl font-bold text-emerald-600">{summary.totalNetSalary.toLocaleString()} QAR</p>
        </div>
      </div>

      {oldValidation && !oldValidation.valid && !validation && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-amber-900 mb-2">Quick Validation Check</h4>
              <ul className="space-y-1">
                {summary.employeesWithMissingQID > 0 && (
                  <li className="text-sm text-amber-800">
                    <span className="font-bold">{summary.employeesWithMissingQID}</span> employee(s) missing Qatar ID (QID)
                  </li>
                )}
                {summary.employeesWithMissingIBAN > 0 && (
                  <li className="text-sm text-amber-800">
                    <span className="font-bold">{summary.employeesWithMissingIBAN}</span> employee(s) missing IBAN
                  </li>
                )}
              </ul>
              <p className="text-xs text-amber-700 mt-2">
                Update employee profiles with missing information before generating WPS file.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h4 className="text-lg font-bold text-slate-900 mb-4">Generate WPS File</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Establishment ID (Employer ID) *
            </label>
            <input
              type="text"
              value={establishmentId}
              onChange={(e) => setEstablishmentId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              placeholder="e.g., 12345678"
              maxLength={20}
            />
            <p className="text-xs text-slate-500 mt-1">
              Your company's Establishment ID as registered with Qatar Ministry of Labour
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-bold text-blue-900 mb-2">File Details</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-blue-700">Pay Period:</p>
                <p className="font-semibold text-blue-900">{monthNames[selectedMonth - 1]} {selectedYear}</p>
              </div>
              <div>
                <p className="text-blue-700">Format:</p>
                <p className="font-semibold text-blue-900">WPS Month: {formatWPSMonth(selectedYear, selectedMonth)}</p>
              </div>
              <div>
                <p className="text-blue-700">Employees:</p>
                <p className="font-semibold text-blue-900">{summary.totalEmployees} records</p>
              </div>
              <div>
                <p className="text-blue-700">Total Amount:</p>
                <p className="font-semibold text-blue-900">{summary.totalNetSalary.toLocaleString()} QAR</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleGenerateWPS('sif')}
              disabled={!oldValidation?.valid || !establishmentId.trim()}
              className={`py-4 rounded-xl font-bold text-white transition-all flex flex-col items-center justify-center gap-2 ${!oldValidation?.valid || !establishmentId.trim()
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-lg hover:shadow-xl'
                }`}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">SIF Format</span>
              <span className="text-xs opacity-80">(Standard)</span>
            </button>

            <button
              onClick={() => handleGenerateWPS('txt')}
              disabled={!oldValidation?.valid || !establishmentId.trim()}
              className={`py-4 rounded-xl font-bold text-white transition-all flex flex-col items-center justify-center gap-2 ${!oldValidation?.valid || !establishmentId.trim()
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                }`}
            >
              <FileText className="h-6 w-6" />
              <span className="text-sm">TXT Format</span>
              <span className="text-xs opacity-80">(Simple)</span>
            </button>

            <button
              onClick={() => handleGenerateWPS('csv')}
              disabled={!oldValidation?.valid || !establishmentId.trim()}
              className={`py-4 rounded-xl font-bold text-white transition-all flex flex-col items-center justify-center gap-2 ${!oldValidation?.valid || !establishmentId.trim()
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 shadow-lg hover:shadow-xl'
                }`}
            >
              <Download className="h-6 w-6" />
              <span className="text-sm">CSV Format</span>
              <span className="text-xs opacity-80">(Excel)</span>
            </button>
          </div>

          {oldValidation && !oldValidation.valid && (
            <p className="text-xs text-center text-red-600 font-medium">
              Fix validation errors above before generating file
            </p>
          )}
        </div>
      </div>

      {showPreview && filePreview && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-slate-900">File Preview</h4>
            <button
              onClick={() => setShowPreview(false)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Hide Preview
            </button>
          </div>
          <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs overflow-x-auto">
            <pre>{filePreview}</pre>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-blue-700 font-medium mb-1">HDR = Header</p>
              <p className="text-blue-600">Contains employer info & totals</p>
            </div>
            <div className="bg-violet-50 rounded-lg p-3">
              <p className="text-violet-700 font-medium mb-1">D = Detail</p>
              <p className="text-violet-600">One line per employee salary</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-emerald-700 font-medium mb-1">FTR = Footer</p>
              <p className="text-emerald-600">Total salary verification</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <h4 className="text-sm font-bold text-slate-900 mb-3">WPS File Format Explanation</h4>
        <div className="space-y-2 text-xs text-slate-700">
          <p><span className="font-mono bg-slate-200 px-2 py-1 rounded">HDR</span> <span className="font-semibold">Header:</span> HDR,employer_id,month(YYYYMM),employee_count,total_salary</p>
          <p><span className="font-mono bg-slate-200 px-2 py-1 rounded">D</span> <span className="font-semibold">Detail:</span> D,qid,iban,basic_salary,allowances,overtime,deductions,net_salary</p>
          <p><span className="font-mono bg-slate-200 px-2 py-1 rounded">FTR</span> <span className="font-semibold">Footer:</span> FTR,total_salary</p>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Important:</span> Submit this file to your bank before the monthly deadline.
            Late submissions may result in penalties, company blacklisting, or blocked work visas.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProcessPayrollModal({ onClose, onSuccess, month, year, showNotification }: any) {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const handleProcess = async () => {
    setLoading(true);
    setError('');

    try {
      // Check for existing payroll records
      const { data: existingRecords } = await supabase
        .from('qatar_payroll_records')
        .select('id')
        .eq('organization_id', organization!.id)
        .eq('pay_period_month', month)
        .eq('pay_period_year', year)
        .limit(1);

      if (existingRecords && existingRecords.length > 0) {
        throw new Error(`Payroll for ${monthNames[month - 1]} ${year} has already been processed. Delete existing records first if you need to reprocess.`);
      }

      const { data: salaryComponents, error: salaryError } = await supabase
        .from('qatar_salary_components')
        .select('*, employee:employees(id, first_name, last_name, employee_code, qatar_id, iban_number)')
        .eq('organization_id', organization!.id)
        .eq('is_active', true);

      if (salaryError) {
        throw new Error(`Failed to load salary components: ${salaryError.message}`);
      }

      if (!salaryComponents || salaryComponents.length === 0) {
        throw new Error('No active salary components found. Please set up employee salaries first.');
      }

      let successCount = 0;
      const errors: string[] = [];

      for (const comp of salaryComponents) {
        const grossSalary =
          Number(comp.basic_salary) +
          Number(comp.housing_allowance) +
          Number(comp.food_allowance) +
          Number(comp.transport_allowance) +
          Number(comp.mobile_allowance) +
          Number(comp.utility_allowance) +
          Number(comp.other_allowances);

        const { error: insertError } = await supabase.from('qatar_payroll_records').insert({
          organization_id: organization!.id,
          employee_id: comp.employee_id,
          salary_component_id: comp.id,
          pay_period_month: month,
          pay_period_year: year,
          basic_salary: comp.basic_salary,
          housing_allowance: comp.housing_allowance,
          food_allowance: comp.food_allowance,
          transport_allowance: comp.transport_allowance,
          mobile_allowance: comp.mobile_allowance,
          utility_allowance: comp.utility_allowance,
          other_allowances: comp.other_allowances,
          overtime_amount: 0,
          total_deductions: 0,
          gross_salary: grossSalary,
          net_salary: grossSalary,
          status: 'approved',
          working_days: 26,
          days_present: 26
        });

        if (insertError) {
          errors.push(`${comp.employee?.first_name} ${comp.employee?.last_name}: ${insertError.message}`);
        } else {
          successCount++;
        }
      }

      if (errors.length > 0) {
        throw new Error(`Processed ${successCount} employees with ${errors.length} errors:\n${errors.join('\n')}`);
      }

      showNotification('success', 'Payroll Processed', `Successfully processed payroll for ${successCount} employee(s)!`);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      showNotification('error', 'Processing Failed', err.message || 'An error occurred while processing payroll');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-6 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Process Monthly Payroll</h2>
          <p className="text-emerald-100 text-sm mt-1">
            {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              This will process payroll for all active employees based on their salary components.
              Overtime and deductions will be calculated automatically.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button
              onClick={handleProcess}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Processing...' : 'Process Payroll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddSalaryComponentModal({ onClose, onSuccess, preSelectedEmployeeId, showNotification }: any) {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: preSelectedEmployeeId || '',
    basic_salary: '',
    housing_allowance: '',
    food_allowance: '',
    transport_allowance: '',
    mobile_allowance: '',
    utility_allowance: '',
    other_allowances: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    if (!organization?.id) {
      console.warn('No organization ID available for loading employees');
      return;
    }

    console.log('Loading employees for payroll in organization:', organization.id);

    const { data, error } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, qatar_id, is_active')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .eq('employment_status', 'active');

    if (error) {
      console.error('Error loading employees for payroll:', error);
      showNotification('error', 'Load Failed', error.message || 'Failed to load employees');
      return;
    }

    console.log(`Loaded ${data?.length || 0} employees for payroll`);
    if (data) setEmployees(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.employee_id) {
      setError('Please select an employee');
      setLoading(false);
      return;
    }

    if (!formData.basic_salary || parseFloat(formData.basic_salary) <= 0) {
      setError('Basic salary must be greater than 0');
      setLoading(false);
      return;
    }

    try {
      console.log('Submitting salary component:', {
        organization_id: organization!.id,
        employee_id: formData.employee_id,
        basic_salary: parseFloat(formData.basic_salary)
      });

      const { data, error: insertError } = await supabase
        .from('qatar_salary_components')
        .insert({
          organization_id: organization!.id,
          employee_id: formData.employee_id,
          basic_salary: parseFloat(formData.basic_salary),
          housing_allowance: parseFloat(formData.housing_allowance) || 0,
          food_allowance: parseFloat(formData.food_allowance) || 0,
          transport_allowance: parseFloat(formData.transport_allowance) || 0,
          mobile_allowance: parseFloat(formData.mobile_allowance) || 0,
          utility_allowance: parseFloat(formData.utility_allowance) || 0,
          other_allowances: parseFloat(formData.other_allowances) || 0,
          is_active: true
        })
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Successfully inserted salary component:', data);
      showNotification('success', 'Success', 'Salary component saved successfully!');
      onSuccess();
    } catch (err: any) {
      console.error('Error saving salary component:', err);
      setError(err.message || 'Failed to save salary component');
    } finally {
      setLoading(false);
    }
  };

  const totalSalary =
    (parseFloat(formData.basic_salary) || 0) +
    (parseFloat(formData.housing_allowance) || 0) +
    (parseFloat(formData.food_allowance) || 0) +
    (parseFloat(formData.transport_allowance) || 0) +
    (parseFloat(formData.mobile_allowance) || 0) +
    (parseFloat(formData.utility_allowance) || 0) +
    (parseFloat(formData.other_allowances) || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-6 rounded-t-2xl sticky top-0">
          <h2 className="text-2xl font-bold text-white">Add Salary Component</h2>
          <p className="text-emerald-100 text-sm mt-1">Set up employee salary structure</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Employee *
            </label>
            <select
              required
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
              className="input-modern"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Basic Salary (QAR) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.basic_salary}
                onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                className="input-modern"
                placeholder="3000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Housing Allowance (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.housing_allowance}
                onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })}
                className="input-modern"
                placeholder="1000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Food Allowance (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.food_allowance}
                onChange={(e) => setFormData({ ...formData, food_allowance: e.target.value })}
                className="input-modern"
                placeholder="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transport Allowance (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.transport_allowance}
                onChange={(e) => setFormData({ ...formData, transport_allowance: e.target.value })}
                className="input-modern"
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mobile Allowance (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.mobile_allowance}
                onChange={(e) => setFormData({ ...formData, mobile_allowance: e.target.value })}
                className="input-modern"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Utility Allowance (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.utility_allowance}
                onChange={(e) => setFormData({ ...formData, utility_allowance: e.target.value })}
                className="input-modern"
                placeholder="100"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Other Allowances (QAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.other_allowances}
                onChange={(e) => setFormData({ ...formData, other_allowances: e.target.value })}
                className="input-modern"
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-900">Total Monthly Salary:</span>
              <span className="text-2xl font-bold text-emerald-700">{totalSalary.toLocaleString()} QAR</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Salary Component'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
