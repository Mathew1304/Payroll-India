import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, HelpCircle, PlayCircle, FileText, DollarSign, Users, Download, CheckCircle, AlertCircle, Calendar, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function HelpPage() {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <HelpCircle className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{t('help.title')}</h1>
            <p className="text-blue-100 text-lg">{t('help.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLinkCard
          icon={PlayCircle}
          title={t('help.quickLinks.gettingStarted.title')}
          description={t('help.quickLinks.gettingStarted.description')}
          onClick={() => setExpandedSection('getting-started')}
        />
        <QuickLinkCard
          icon={DollarSign}
          title={t('help.quickLinks.processPayroll.title')}
          description={t('help.quickLinks.processPayroll.description')}
          onClick={() => setExpandedSection('payroll-process')}
        />
        <QuickLinkCard
          icon={Download}
          title="Statutory Compliance"
          description="Learn about PF, ESI, and Professional Tax"
          onClick={() => setExpandedSection('statutory-compliance')}
        />
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{t('help.faqTitle')}</h2>
        </div>
        <div className="divide-y divide-slate-200">
          <FAQSection
            id="getting-started"
            title={t('help.sections.gettingStarted.title')}
            icon={PlayCircle}
            expanded={expandedSection === 'getting-started'}
            onToggle={() => toggleSection('getting-started')}
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Step 1: Organization Setup</h4>
                <p className="text-sm text-slate-700 mb-2">Your organization was created during registration. Make sure your organization profile is complete with:</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li>Company Name</li>
                  <li>Country (India)</li>
                  <li>PAN Number (Company PAN)</li>
                  <li>TAN Number (Tax Deduction Account Number)</li>
                  <li>PF Registration Number (if applicable)</li>
                  <li>ESI Registration Number (if applicable)</li>
                  <li>Company Email and Contact Information</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Step 2: Add Employees</h4>
                <p className="text-sm text-slate-700 mb-2">Navigate to <strong>Employees</strong> page and add your team:</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li><strong>Individual Add:</strong> Click "Add Employee" button</li>
                  <li><strong>Bulk Import:</strong> Click "Bulk Import" and download the CSV template</li>
                  <li>Required fields: Name, Employee Code, Date of Birth, Date of Joining</li>
                  <li>Important: PAN Number, Aadhaar Number, UAN (for PF), Bank Account Details</li>
                  <li>Optional: Phone, Email, Department, Designation, ESI Number</li>
                </ul>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-900 font-medium">
                    <strong>Pro Tip:</strong> Use bulk import for adding multiple employees at once. The system validates all data and shows errors before importing.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Step 3: Configure Salary Components</h4>
                <p className="text-sm text-slate-700 mb-2">Go to <strong>Payroll → Salary Components</strong> tab:</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li>Click "Add Salary Component" for each employee</li>
                  <li>Enter Basic Salary (mandatory)</li>
                  <li>Add allowances: Housing, Food, Transport, Mobile, Utility, Other</li>
                  <li>System automatically calculates total monthly salary</li>
                </ul>
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-900 font-medium">
                    <strong>Important:</strong> Basic Salary is used for PF calculation. Ensure it's set correctly as PF contribution is 12% of Basic + DA.
                  </p>
                </div>
              </div>
            </div>
          </FAQSection>

          <FAQSection
            id="payroll-process"
            title={t('help.sections.payrollProcess.title')}
            icon={DollarSign}
            expanded={expandedSection === 'payroll-process'}
            onToggle={() => toggleSection('payroll-process')}
          >
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl p-4">
                <h4 className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Payroll Workflow
                </h4>
                <div className="space-y-3">
                  {[
                    { step: 1, title: 'Select Pay Period', desc: 'Choose month and year from dropdowns' },
                    { step: 2, title: 'Process Payroll', desc: 'Click "Process Payroll" button' },
                    { step: 3, title: 'Review Records', desc: 'Check all employee payroll records with PF/ESI/PT deductions' },
                    { step: 4, title: 'Generate Reports', desc: 'Download PF, ESI, and Professional Tax reports' },
                    { step: 5, title: 'Submit to Authorities', desc: 'File PF returns online, pay ESI & PT' },
                    { step: 6, title: 'Mark as Paid', desc: 'After bank transfer, mark as paid with UTR reference' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-emerald-200">
                      <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {step}
                      </div>
                      <div>
                        <p className="font-bold text-emerald-900 text-sm">{title}</p>
                        <p className="text-xs text-emerald-800">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Processing Payroll Explained</h4>
                <p className="text-sm text-slate-700 mb-2">When you click "Process Payroll", the system:</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li>Retrieves all active salary components</li>
                  <li>Calculates gross salary (Basic + DA + HRA + Other Allowances)</li>
                  <li>Calculates PF deduction (12% of Basic + DA, max ₹1,800)</li>
                  <li>Calculates ESI deduction (0.75% of gross, if gross ≤ ₹21,000)</li>
                  <li>Calculates Professional Tax (state-specific slabs)</li>
                  <li>Deducts TDS, loans, advances, LOP (Loss of Pay)</li>
                  <li>Calculates net salary (Gross - All Deductions)</li>
                  <li>Creates payroll records with statutory compliance</li>
                  <li>Generates individual payslips with PF/ESI/PT details</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Marking Employees as Paid</h4>
                <p className="text-sm text-slate-700 mb-2">After transferring salaries via NEFT/RTGS/IMPS:</p>
                <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li>Go to Payroll → Monthly Payroll tab</li>
                  <li>Click "Mark as Paid" button</li>
                  <li>Enter UTR Number (Unique Transaction Reference from bank)</li>
                  <li>Select Payment Date</li>
                  <li>Confirm to mark all employees as PAID</li>
                </ol>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-900">
                    <strong>UTR Number</strong> is the unique transaction reference provided by your bank for NEFT/RTGS transfers. This is essential for reconciliation and audit purposes.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Downloading Payslips</h4>
                <p className="text-sm text-slate-700 mb-2">Each employee's payslip can be downloaded as HTML:</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li>Click "Download Payslip" button next to employee</li>
                  <li>Payslip contains: Earnings breakdown, Deductions, Net salary</li>
                  <li>Professional format suitable for printing or emailing</li>
                  <li>Includes company name, employee details, pay period</li>
                </ul>
              </div>
            </div>
          </FAQSection>

          <FAQSection
            id="statutory-compliance"
            title="Statutory Compliance (PF, ESI, PT)"
            icon={Shield}
            expanded={expandedSection === 'statutory-compliance'}
            onToggle={() => toggleSection('statutory-compliance')}
          >
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">What are Statutory Compliances?</h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  In India, employers must comply with various labour laws including Provident Fund (PF),
                  Employee State Insurance (ESI), and Professional Tax (PT). These are mandatory deductions
                  from employee salaries that must be deposited with respective authorities monthly.
                  Non-compliance can result in penalties and legal action.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Why is Statutory Compliance Important?</h4>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-2 ml-4">
                  <li><strong>Legal Requirement:</strong> Mandatory under Indian labour laws</li>
                  <li><strong>Employee Benefits:</strong> Provides social security and retirement benefits</li>
                  <li><strong>Avoid Penalties:</strong> Late payment attracts interest and penalties</li>
                  <li><strong>Audit Requirements:</strong> Required for company audits and compliance</li>
                  <li><strong>Employee Trust:</strong> Ensures employees receive their entitled benefits</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Understanding Statutory Deductions</h4>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="font-bold text-slate-900 text-sm mb-2">Provident Fund (PF)</p>
                    <p className="text-xs text-slate-700 mb-2">Applicable to organizations with 20+ employees:</p>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 ml-4">
                      <li>Employee contribution: 12% of (Basic + DA)</li>
                      <li>Employer contribution: 12% of (Basic + DA)</li>
                      <li>Maximum ceiling: ₹15,000 per month</li>
                      <li>Due date: 15th of following month</li>
                      <li>File ECR (Electronic Challan cum Return) on EPFO portal</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="font-bold text-slate-900 text-sm mb-2">Employee State Insurance (ESI)</p>
                    <p className="text-xs text-slate-700 mb-2">Applicable if employee gross salary ≤ ₹21,000:</p>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 ml-4">
                      <li>Employee contribution: 0.75% of gross salary</li>
                      <li>Employer contribution: 3.25% of gross salary</li>
                      <li>Due date: 15th of following month</li>
                      <li>File returns on ESIC portal</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="font-bold text-slate-900 text-sm mb-2">Professional Tax (PT)</p>
                    <p className="text-xs text-slate-700 mb-2">State-specific tax (varies by state):</p>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 ml-4">
                      <li>Deducted from employee salary based on state slabs</li>
                      <li>Example: Maharashtra - ₹200/month (₹2,500/year)</li>
                      <li>Due date: Varies by state (usually 15th-30th)</li>
                      <li>File returns with state commercial tax department</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Filing Statutory Returns</h4>
                <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs mb-2">
                  <div>PF ECR Filing → EPFO Portal (epfindia.gov.in)</div>
                  <div>ESI Returns → ESIC Portal (esic.in)</div>
                  <div>PT Returns → State Commercial Tax Portal</div>
                  <div>TDS Returns → Income Tax Portal (incometax.gov.in)</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 rounded p-2 border border-blue-200">
                    <p className="font-bold text-blue-900">Monthly</p>
                    <p className="text-blue-700">PF, ESI, PT payments</p>
                  </div>
                  <div className="bg-violet-50 rounded p-2 border border-violet-200">
                    <p className="font-bold text-violet-900">Quarterly</p>
                    <p className="text-violet-700">TDS Returns (Form 24Q)</p>
                  </div>
                  <div className="bg-emerald-50 rounded p-2 border border-emerald-200">
                    <p className="font-bold text-emerald-900">Annually</p>
                    <p className="text-emerald-700">Form 16, Annual Returns</p>
                  </div>
                  <div className="bg-amber-50 rounded p-2 border border-amber-200">
                    <p className="font-bold text-amber-900">As Required</p>
                    <p className="text-amber-700">Form 12BB, IT Declarations</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Important Deadlines & Penalties
                </h4>
                <div className="space-y-2 text-sm text-red-800">
                  <p><strong>PF/ESI Deadline:</strong> 15th of following month</p>
                  <p><strong>Late Payment Penalty:</strong> 12% p.a. interest + damages</p>
                  <p><strong>TDS Deadline:</strong> 7th of following month (payment), Quarterly (returns)</p>
                  <p><strong>Non-Compliance:</strong> Penalties, prosecution under respective acts</p>
                  <p><strong>Audit Issues:</strong> Can lead to disallowance of expenses</p>
                </div>
              </div>
            </div>
          </FAQSection>

          <FAQSection
            id="common-issues"
            title={t('help.sections.commonIssues.title')}
            icon={HelpCircle}
            expanded={expandedSection === 'common-issues'}
            onToggle={() => toggleSection('common-issues')}
          >
            <div className="space-y-4">
              <IssueCard
                issue="Validation Error: Missing PAN or Aadhaar"
                solution="Go to Employees page, edit the employee profile, and add the missing PAN and Aadhaar number. Both are mandatory for statutory compliance and tax purposes."
              />
              <IssueCard
                issue="Error: Payroll already processed for this month"
                solution="Each month can only be processed once. If you need to reprocess, you can edit individual payroll records or contact support for assistance with bulk corrections."
              />
              <IssueCard
                issue="PF/ESI calculation incorrect"
                solution="Common reasons: Basic salary not set correctly, DA not included in PF calculation, ESI threshold (₹21,000) exceeded. Verify salary components in employee profile."
              />
              <IssueCard
                issue="Employee not showing in payroll"
                solution="Check: 1) Employee status is 'Active', 2) Salary component has been configured, 3) Employee has valid joining date, 4) Employee's is_active flag is true."
              />
              <IssueCard
                issue="Cannot download payslip"
                solution="Ensure payroll has been processed for the selected month. Payslips are only available after processing payroll."
              />
              <IssueCard
                issue="Professional Tax amount incorrect"
                solution="PT is state-specific. Verify the employee's work state and ensure the correct PT slab is configured in system settings. Each state has different PT rates."
              />
            </div>
          </FAQSection>

          <FAQSection
            id="best-practices"
            title={t('help.sections.bestPractices.title')}
            icon={CheckCircle}
            expanded={expandedSection === 'best-practices'}
            onToggle={() => toggleSection('best-practices')}
          >
            <div className="space-y-4">
              <BestPracticeCard
                icon={Calendar}
                title="Process Payroll Early"
                description="Process payroll by the 1st of each month to allow time for reviews, corrections, and timely PF/ESI payments before the 15th deadline."
              />
              <BestPracticeCard
                icon={Users}
                title="Keep Employee Data Updated"
                description="Regularly verify PAN, Aadhaar, UAN, Bank Account details. Outdated information causes statutory compliance issues and payment failures."
              />
              <BestPracticeCard
                icon={FileText}
                title="Maintain Payroll Records"
                description="Keep payslips and statutory returns for at least 7 years as required by Indian tax laws. Download and archive monthly for audit purposes."
              />
              <BestPracticeCard
                icon={Shield}
                title="File Returns on Time"
                description="Always file PF ECR, ESI returns, and PT payments before the 15th. Late filing attracts penalties and interest charges."
              />
              <BestPracticeCard
                icon={CheckCircle}
                title="Document UTR Numbers"
                description="Save all bank UTR numbers when marking payroll as paid. Essential for reconciliation, audits, and employee queries."
              />
              <BestPracticeCard
                icon={Download}
                title="Issue Form 16 Annually"
                description="Generate and issue Form 16 to all employees by June 15th each year. This is mandatory for employees with TDS deductions."
              />
            </div>
          </FAQSection>

          <FAQSection
            id="support"
            title={t('help.sections.support.title')}
            icon={HelpCircle}
            expanded={expandedSection === 'support'}
            onToggle={() => toggleSection('support')}
          >
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-2">Need More Help?</h4>
                <p className="text-sm text-blue-800 mb-3">
                  If you have questions not covered in this documentation, please contact our support team.
                </p>
                <div className="space-y-2 text-sm">
                  <p className="text-blue-900">
                    <strong>Email:</strong> support@loghr.in
                  </p>
                  <p className="text-blue-900">
                    <strong>Response Time:</strong> Within 24 hours
                  </p>
                  <p className="text-blue-900">
                    <strong>Available:</strong> Monday - Friday, 9 AM - 6 PM IST
                  </p>
                </div>
              </div>
            </div>
          </FAQSection>
        </div>
      </div>
    </div>
  );
}

function QuickLinkCard({ icon: Icon, title, description, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all text-left group"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-600 transition-colors">
          <Icon className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </button>
  );
}

function FAQSection({ id, title, icon: Icon, expanded, onToggle, children }: any) {
  return (
    <div className="border-b border-slate-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronRight className="h-5 w-5 text-slate-400" />
        )}
      </button>
      {expanded && (
        <div className="px-6 pb-6">
          {children}
        </div>
      )}
    </div>
  );
}

function IssueCard({ issue, solution }: any) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-900 text-sm mb-1">{issue}</p>
          <p className="text-sm text-amber-800">{solution}</p>
        </div>
      </div>
    </div>
  );
}

function BestPracticeCard({ icon: Icon, title, description }: any) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
          <Icon className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-emerald-900 text-sm mb-1">{title}</p>
          <p className="text-sm text-emerald-800">{description}</p>
        </div>
      </div>
    </div>
  );
}
