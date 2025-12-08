import { useState, useEffect } from 'react';
import { DollarSign, Plus, Download, FileText, Clock, Calculator, TrendingUp, Users, Calendar, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCompletePayroll, calculateGOSIContributions, calculateSaudiEOS, calculateYearsOfService } from '../../utils/saudiPayrollCalculations';
import { generateSaudiWPSSIFFile, generateSaudiMOLHSSFile, generateSaudiGOSIFile, downloadTextFile, downloadCSVFile } from '../../utils/wpsFileGenerator';
import { downloadPayslipHTML, printPayslip } from '../../utils/payslipGenerator';

export function SaudiPayrollPage() {
  const { organization } = useAuth();
  const [activeTab, setActiveTab] = useState<'payroll' | 'salary-setup' | 'overtime' | 'eos' | 'gosi' | 'wps'>('payroll');
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [salaryComponents, setSalaryComponents] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showProcessModal, setShowProcessModal] = useState(false);

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

    const { data } = await supabase
      .from('saudi_payroll_records')
      .select(`
        *,
        employee:employees(
          id,
          first_name,
          last_name,
          employee_code,
          iqama_number,
          saudi_iban,
          nationality,
          gosi_number
        )
      `)
      .eq('organization_id', organization.id)
      .eq('pay_period_month', selectedMonth)
      .eq('pay_period_year', selectedYear)
      .order('created_at', { ascending: false });

    if (data) setPayrollRecords(data);
  };

  const loadSalaryComponents = async () => {
    if (!organization?.id) return;

    const { data } = await supabase
      .from('saudi_salary_components')
      .select(`
        *,
        employee:employees(
          id,
          first_name,
          last_name,
          employee_code,
          iqama_number,
          nationality,
          gosi_number
        )
      `)
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) setSalaryComponents(data);
  };

  const loadAllEmployees = async () => {
    if (!organization?.id) return;

    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, employee_code, iqama_number, nationality, gosi_number, is_active, employment_status')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (data) setAllEmployees(data);
  };

  const stats = {
    totalEmployees: allEmployees.length,
    processedPayroll: payrollRecords.filter(r => r.status === 'paid').length,
    pendingPayroll: payrollRecords.filter(r => r.status === 'approved').length,
    totalAmount: payrollRecords.reduce((sum, r) => sum + Number(r.net_salary), 0),
    totalGOSI: payrollRecords.reduce((sum, r) => sum + Number(r.gosi_employee_contribution) + Number(r.gosi_employer_contribution), 0)
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-emerald-600" />
            Saudi Arabia Payroll System
          </h1>
          <p className="text-slate-600 mt-2">GOSI Compliant • WPS/MOLHSS • End of Service</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowProcessModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Calculator className="h-5 w-5" />
            Process Payroll
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white rounded-xl shadow-md p-4 border border-slate-200">
        <Calendar className="h-5 w-5 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Pay Period:</span>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        >
          {monthNames.map((month, index) => (
            <option key={index} value={index + 1}>{month}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
        >
          {[2024, 2025, 2026].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
          title="Total Amount (SAR)"
          value={stats.totalAmount.toLocaleString()}
          icon={TrendingUp}
          gradient="from-violet-500 to-violet-600"
        />
        <StatsCard
          title="Total GOSI (SAR)"
          value={stats.totalGOSI.toLocaleString()}
          icon={Shield}
          gradient="from-rose-500 to-rose-600"
        />
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex gap-1 p-2">
            {[
              { id: 'payroll', label: 'Monthly Payroll', icon: DollarSign },
              { id: 'salary-setup', label: 'Salary Components', icon: FileText },
              { id: 'gosi', label: 'GOSI', icon: Shield },
              { id: 'overtime', label: 'Overtime', icon: Clock },
              { id: 'eos', label: 'End of Service', icon: Calculator },
              { id: 'wps', label: 'WPS/MOLHSS Files', icon: Download }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'payroll' && (
            <PayrollRecordsTab
              records={payrollRecords}
              onRefresh={loadPayrollRecords}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              organizationName={organization?.name || ''}
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
            />
          )}
          {activeTab === 'gosi' && (
            <GOSITab
              organizationId={organization?.id}
              payrollRecords={payrollRecords}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
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

function PayrollRecordsTab({ records, onRefresh, selectedMonth, selectedYear, organizationName }: any) {
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const handleDownloadPayslip = (record: any) => {
    const payslipData = {
      country: 'Saudi Arabia' as const,
      currency: 'SAR' as const,
      companyName: organizationName,
      establishmentId: 'EST-001',
      employeeName: `${record.employee.first_name} ${record.employee.last_name}`,
      employeeCode: record.employee.employee_code,
      employeeId: record.employee.iqama_number || '',
      iban: record.employee.saudi_iban || '',
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
      gosiEmployeeContribution: Number(record.gosi_employee_contribution),
      gosiEmployerContribution: Number(record.gosi_employer_contribution),
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
      <div className="text-center py-12">
        <DollarSign className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Payroll Processed</h3>
        <p className="text-slate-600">Process payroll for this period to generate records</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {records.map((record: any) => (
        <div
          key={record.id}
          className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-slate-900">
                {record.employee?.first_name} {record.employee?.last_name}
              </h4>
              <p className="text-sm text-slate-600">
                {record.employee?.employee_code} • Iqama: {record.employee?.iqama_number}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              record.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
              record.status === 'approved' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {record.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <p className="text-xs text-slate-500">Basic Salary</p>
              <p className="text-sm font-semibold">{Number(record.basic_salary).toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Allowances</p>
              <p className="text-sm font-semibold">
                {(Number(record.housing_allowance) + Number(record.food_allowance) + Number(record.transport_allowance)).toLocaleString()} SAR
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">GOSI (Employee)</p>
              <p className="text-sm font-semibold text-red-600">{Number(record.gosi_employee_contribution).toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Overtime</p>
              <p className="text-sm font-semibold">{Number(record.overtime_amount).toLocaleString()} SAR</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Net Salary</p>
              <p className="text-lg font-bold text-emerald-600">{Number(record.net_salary).toLocaleString()} SAR</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadPayslip(record)}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Payslip
            </button>
            <button className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors">
              View Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SalaryComponentsTab({ components, allEmployees, onRefresh }: any) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const getEmployeeSalaryComponent = (employeeId: string) => {
    return components.find((c: any) => c.employee_id === employeeId);
  };

  if (allEmployees.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Employees Found</h3>
        <p className="text-slate-600">Add employees first to set up salary components</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">Salary Structure Setup</h3>
          <p className="text-sm text-slate-600">
            {components.length} of {allEmployees.length} employees have salary configured
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Salary Component
        </button>
      </div>

      <div className="space-y-3">
        {allEmployees.map((employee: any) => {
          const salaryComp = getEmployeeSalaryComponent(employee.id);

          if (salaryComp) {
            const gosi = calculateGOSIContributions(
              Number(salaryComp.basic_salary),
              Number(salaryComp.housing_allowance),
              employee.nationality?.toLowerCase() === 'saudi' ? 'saudi' : 'non-saudi'
            );

            return (
              <div
                key={employee.id}
                className="border-2 border-emerald-200 bg-emerald-50/30 rounded-xl p-6 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900">
                        {employee.first_name} {employee.last_name}
                      </h4>
                      <span className="px-2 py-1 text-xs font-bold bg-emerald-500 text-white rounded-full">
                        CONFIGURED
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold ${
                        employee.nationality?.toLowerCase() === 'saudi'
                          ? 'bg-blue-500 text-white'
                          : 'bg-amber-500 text-white'
                      } rounded-full`}>
                        {employee.nationality?.toLowerCase() === 'saudi' ? 'SAUDI' : 'NON-SAUDI'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {employee.employee_code} • Iqama: {employee.iqama_number || 'N/A'} • GOSI: {employee.gosi_number || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 font-medium">Total Monthly Salary</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {(Number(salaryComp.basic_salary) +
                        Number(salaryComp.housing_allowance) +
                        Number(salaryComp.food_allowance) +
                        Number(salaryComp.transport_allowance) +
                        Number(salaryComp.mobile_allowance) +
                        Number(salaryComp.utility_allowance) +
                        Number(salaryComp.other_allowances)).toLocaleString()} SAR
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                    <p className="text-xs text-emerald-700 font-medium">Basic Salary</p>
                    <p className="text-lg font-bold text-emerald-900">{Number(salaryComp.basic_salary).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-xs text-blue-700 font-medium">Housing</p>
                    <p className="text-lg font-bold text-blue-900">{Number(salaryComp.housing_allowance).toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium">Food</p>
                    <p className="text-lg font-bold text-amber-900">{Number(salaryComp.food_allowance).toLocaleString()}</p>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                    <p className="text-xs text-violet-700 font-medium">Transport</p>
                    <p className="text-lg font-bold text-violet-900">{Number(salaryComp.transport_allowance).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Employee GOSI</p>
                    <p className="text-sm font-bold text-slate-900">{gosi.employeeContribution.toLocaleString()} SAR</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Employer GOSI</p>
                    <p className="text-sm font-bold text-slate-900">{gosi.employerContribution.toLocaleString()} SAR</p>
                  </div>
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={employee.id}
                className="border-2 border-amber-200 bg-amber-50/30 rounded-xl p-6 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-slate-900">
                        {employee.first_name} {employee.last_name}
                      </h4>
                      <span className="px-2 py-1 text-xs font-bold bg-amber-500 text-white rounded-full">
                        NOT CONFIGURED
                      </span>
                      <span className={`px-2 py-1 text-xs font-bold ${
                        employee.nationality?.toLowerCase() === 'saudi'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-500 text-white'
                      } rounded-full`}>
                        {employee.nationality?.toLowerCase() === 'saudi' ? 'SAUDI' : 'NON-SAUDI'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {employee.employee_code} • Iqama: {employee.iqama_number || 'N/A'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEmployeeId(employee.id);
                      setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
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
        />
      )}
    </div>
  );
}

function OldSalaryComponentsView({ components }: any) {
  return (
    <div className="space-y-4">
      {components.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">No Salary Components</h3>
          <p className="text-slate-600 mb-6">Set up salary structure for employees</p>
        </div>
      ) : (
        <div className="space-y-4">
          {components.map((comp: any) => {
            const gosi = calculateGOSIContributions(
              Number(comp.basic_salary),
              Number(comp.housing_allowance),
              comp.employee?.nationality?.toLowerCase() === 'saudi' ? 'saudi' : 'non-saudi'
            );

            return (
              <div
                key={comp.id}
                className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">
                      {comp.employee?.first_name} {comp.employee?.last_name}
                    </h4>
                    <p className="text-sm text-slate-600">
                      {comp.employee?.employee_code} • Iqama: {comp.employee?.iqama_number} • {comp.employee?.nationality}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total Salary</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {(Number(comp.basic_salary) +
                        Number(comp.housing_allowance) +
                        Number(comp.food_allowance) +
                        Number(comp.transport_allowance) +
                        Number(comp.mobile_allowance) +
                        Number(comp.utility_allowance) +
                        Number(comp.other_allowances)).toLocaleString()} SAR
                    </p>
                    <p className="text-xs text-red-600 mt-1">GOSI: -{gosi.employeeTotal.toLocaleString()} SAR</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-700 font-medium">Basic Salary</p>
                    <p className="text-lg font-bold text-emerald-900">{Number(comp.basic_salary).toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-700 font-medium">Housing</p>
                    <p className="text-lg font-bold text-blue-900">{Number(comp.housing_allowance).toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs text-amber-700 font-medium">Food</p>
                    <p className="text-lg font-bold text-amber-900">{Number(comp.food_allowance).toLocaleString()}</p>
                  </div>
                  <div className="bg-violet-50 rounded-lg p-3">
                    <p className="text-xs text-violet-700 font-medium">Transport</p>
                    <p className="text-lg font-bold text-violet-900">{Number(comp.transport_allowance).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <AddSalaryComponentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}

function GOSITab({ organizationId, payrollRecords, selectedMonth, selectedYear }: any) {
  const handleDownloadGOSIFile = () => {
    const gosiData = payrollRecords.map((record: any) => ({
      iqamaNumber: record.employee?.iqama_number || '',
      gosiNumber: record.employee?.gosi_number || '',
      employeeName: `${record.employee?.first_name} ${record.employee?.last_name}`,
      nationality: record.employee?.nationality || 'Non-Saudi',
      contributionBase: Number(record.basic_salary) + Number(record.housing_allowance),
      employeeContribution: Number(record.gosi_employee_contribution),
      employerContribution: Number(record.gosi_employer_contribution)
    }));

    const fileContent = generateSaudiGOSIFile('EST-001', selectedMonth, selectedYear, gosiData);
    downloadCSVFile(fileContent, `GOSI_${selectedMonth}_${selectedYear}.csv`);
  };

  const totalEmployeeGOSI = payrollRecords.reduce((sum: number, r: any) => sum + Number(r.gosi_employee_contribution), 0);
  const totalEmployerGOSI = payrollRecords.reduce((sum: number, r: any) => sum + Number(r.gosi_employer_contribution), 0);
  const totalGOSI = totalEmployeeGOSI + totalEmployerGOSI;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">Employee Contribution</p>
          <p className="text-3xl font-bold mt-2">{totalEmployeeGOSI.toLocaleString()} SAR</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">Employer Contribution</p>
          <p className="text-3xl font-bold mt-2">{totalEmployerGOSI.toLocaleString()} SAR</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
          <p className="text-sm opacity-90">Total GOSI</p>
          <p className="text-3xl font-bold mt-2">{totalGOSI.toLocaleString()} SAR</p>
        </div>
      </div>

      <div className="text-center py-8">
        <Shield className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">GOSI Contributions</h3>
        <p className="text-slate-600 mb-6">General Organization for Social Insurance</p>
        <button
          onClick={handleDownloadGOSIFile}
          disabled={payrollRecords.length === 0}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Download className="h-5 w-5" />
          Download GOSI File
        </button>
      </div>
    </div>
  );
}

function OvertimeTab({ organizationId }: any) {
  return (
    <div className="text-center py-12">
      <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-900 mb-2">Overtime Management</h3>
      <p className="text-slate-600">Track and approve employee overtime hours</p>
      <p className="text-sm text-slate-500 mt-2">Regular: 150% • Weekend: 200%</p>
    </div>
  );
}

function EOSTab({ organizationId }: any) {
  return (
    <div className="text-center py-12">
      <Calculator className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-slate-900 mb-2">End of Service Calculations</h3>
      <p className="text-slate-600">Calculate EOS gratuity for employees</p>
      <p className="text-sm text-slate-500 mt-2">First 5 years: ½ month per year • After 5 years: 1 month per year</p>
    </div>
  );
}

function WPSTab({ organizationId, payrollRecords, selectedMonth, selectedYear }: any) {
  const handleDownloadWPS = () => {
    const wpsData = {
      establishmentId: 'EST-001',
      establishmentName: 'Organization Name',
      payPeriodMonth: selectedMonth,
      payPeriodYear: selectedYear,
      employees: payrollRecords.map((record: any) => ({
        iqamaNumber: record.employee?.iqama_number || '',
        employeeName: `${record.employee?.first_name} ${record.employee?.last_name}`,
        borderNumber: '1234567890',
        iban: record.employee?.saudi_iban || '',
        basicSalary: Number(record.basic_salary),
        housingAllowance: Number(record.housing_allowance),
        otherAllowances: Number(record.food_allowance) + Number(record.transport_allowance) + Number(record.other_allowances),
        deductions: Number(record.total_deductions),
        netSalary: Number(record.net_salary)
      }))
    };

    const fileContent = generateSaudiWPSSIFFile(wpsData);
    downloadTextFile(fileContent, `WPS_Saudi_${selectedMonth}_${selectedYear}.txt`);
  };

  const handleDownloadMOLHSS = () => {
    const molhssData = {
      establishmentId: 'EST-001',
      establishmentName: 'Organization Name',
      payPeriodMonth: selectedMonth,
      payPeriodYear: selectedYear,
      employees: payrollRecords.map((record: any) => ({
        iqamaNumber: record.employee?.iqama_number || '',
        employeeName: `${record.employee?.first_name} ${record.employee?.last_name}`,
        borderNumber: '1234567890',
        iban: record.employee?.saudi_iban || '',
        basicSalary: Number(record.basic_salary),
        housingAllowance: Number(record.housing_allowance),
        otherAllowances: Number(record.food_allowance) + Number(record.transport_allowance),
        deductions: Number(record.total_deductions),
        netSalary: Number(record.net_salary)
      }))
    };

    const fileContent = generateSaudiMOLHSSFile(molhssData);
    downloadCSVFile(fileContent, `MOLHSS_${selectedMonth}_${selectedYear}.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="border-2 border-emerald-200 rounded-xl p-8 hover:shadow-lg transition-all">
          <div className="text-center">
            <div className="inline-flex p-4 bg-emerald-100 rounded-full mb-4">
              <Download className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">WPS File</h3>
            <p className="text-slate-600 mb-6">Wage Protection System file for bank submission</p>
            <button
              onClick={handleDownloadWPS}
              disabled={payrollRecords.length === 0}
              className="btn-primary w-full"
            >
              Generate WPS File
            </button>
          </div>
        </div>

        <div className="border-2 border-blue-200 rounded-xl p-8 hover:shadow-lg transition-all">
          <div className="text-center">
            <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">MOLHSS File</h3>
            <p className="text-slate-600 mb-6">Ministry of Labor report file</p>
            <button
              onClick={handleDownloadMOLHSS}
              disabled={payrollRecords.length === 0}
              className="btn-primary w-full"
            >
              Generate MOLHSS File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProcessPayrollModal({ onClose, onSuccess, month, year }: any) {
  const { organization } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleProcess = async () => {
    setLoading(true);
    setError('');

    try {
      // Check for existing payroll records
      const { data: existingRecords } = await supabase
        .from('saudi_payroll_records')
        .select('id')
        .eq('organization_id', organization!.id)
        .eq('pay_period_month', month)
        .eq('pay_period_year', year)
        .limit(1);

      if (existingRecords && existingRecords.length > 0) {
        throw new Error(`Payroll for ${monthNames[month - 1]} ${year} has already been processed. Delete existing records first if you need to reprocess.`);
      }

      const { data: salaryComponents, error: salaryError } = await supabase
        .from('saudi_salary_components')
        .select('*, employee:employees(id, first_name, last_name, employee_code, iqama_number, saudi_iban, nationality)')
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

        const gosi = calculateGOSIContributions(
          Number(comp.basic_salary),
          Number(comp.housing_allowance),
          comp.employee?.nationality?.toLowerCase() === 'saudi' ? 'saudi' : 'non-saudi'
        );

        const totalDeductions = gosi.employeeTotal;
        const netSalary = grossSalary - totalDeductions;

        const { error: insertError } = await supabase.from('saudi_payroll_records').insert({
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
          gosi_employee_contribution: gosi.employeeTotal,
          gosi_employer_contribution: gosi.employerTotal,
          overtime_amount: 0,
          gross_salary: grossSalary,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          status: 'approved',
          working_days: 30,
          days_present: 30
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

      alert(`✓ Payroll processed successfully for ${successCount} employee(s)!`);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      alert(`Error: ${err.message}`);
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
              This will process payroll for all active employees including GOSI calculations.
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

function AddSalaryComponentModal({ onClose, onSuccess, preSelectedEmployeeId }: any) {
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
      .select('id, first_name, last_name, employee_code, iqama_number, nationality, is_active')
      .eq('organization_id', organization.id)
      .eq('is_active', true)
      .eq('employment_status', 'active');

    if (error) {
      console.error('Error loading employees for payroll:', error);
      alert(`Failed to load employees: ${error.message}`);
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
      console.log('Submitting Saudi salary component:', {
        organization_id: organization!.id,
        employee_id: formData.employee_id,
        basic_salary: parseFloat(formData.basic_salary)
      });

      const { data, error: insertError } = await supabase
        .from('saudi_salary_components')
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

      console.log('Successfully inserted Saudi salary component:', data);
      alert('Salary component saved successfully!');
      onSuccess();
    } catch (err: any) {
      console.error('Error saving Saudi salary component:', err);
      setError(err.message || 'Failed to save salary component');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = employees.find(e => e.id === formData.employee_id);
  const totalSalary =
    (parseFloat(formData.basic_salary) || 0) +
    (parseFloat(formData.housing_allowance) || 0) +
    (parseFloat(formData.food_allowance) || 0) +
    (parseFloat(formData.transport_allowance) || 0) +
    (parseFloat(formData.mobile_allowance) || 0) +
    (parseFloat(formData.utility_allowance) || 0) +
    (parseFloat(formData.other_allowances) || 0);

  const gosi = selectedEmployee ? calculateGOSIContributions(
    parseFloat(formData.basic_salary) || 0,
    parseFloat(formData.housing_allowance) || 0,
    selectedEmployee.nationality?.toLowerCase() === 'saudi' ? 'saudi' : 'non-saudi'
  ) : null;

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
                  {emp.first_name} {emp.last_name} ({emp.employee_code}) - {emp.nationality}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Basic Salary (SAR) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={formData.basic_salary}
                onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                className="input-modern"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Housing Allowance (SAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.housing_allowance}
                onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })}
                className="input-modern"
                placeholder="1500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Food Allowance (SAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.food_allowance}
                onChange={(e) => setFormData({ ...formData, food_allowance: e.target.value })}
                className="input-modern"
                placeholder="500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Transport Allowance (SAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.transport_allowance}
                onChange={(e) => setFormData({ ...formData, transport_allowance: e.target.value })}
                className="input-modern"
                placeholder="800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Mobile Allowance (SAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.mobile_allowance}
                onChange={(e) => setFormData({ ...formData, mobile_allowance: e.target.value })}
                className="input-modern"
                placeholder="200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Utility Allowance (SAR)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.utility_allowance}
                onChange={(e) => setFormData({ ...formData, utility_allowance: e.target.value })}
                className="input-modern"
                placeholder="200"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Other Allowances (SAR)
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

          {gosi && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 mb-2">GOSI Calculation</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-amber-700">Employee Contribution:</span>
                  <span className="font-bold text-amber-900 ml-2">{gosi.employeeTotal.toLocaleString()} SAR</span>
                </div>
                <div>
                  <span className="text-amber-700">Employer Contribution:</span>
                  <span className="font-bold text-amber-900 ml-2">{gosi.employerTotal.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-emerald-900">Total Monthly Salary:</span>
              <span className="text-2xl font-bold text-emerald-700">{totalSalary.toLocaleString()} SAR</span>
            </div>
            {gosi && (
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-emerald-200">
                <span className="text-sm font-medium text-emerald-900">Net After GOSI:</span>
                <span className="text-xl font-bold text-emerald-700">{(totalSalary - gosi.employeeTotal).toLocaleString()} SAR</span>
              </div>
            )}
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
