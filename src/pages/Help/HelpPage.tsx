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
          title={t('help.quickLinks.wpsCompliance.title')}
          description={t('help.quickLinks.wpsCompliance.description')}
          onClick={() => setExpandedSection('wps-guide')}
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
                  <li>Country (Qatar)</li>
                  <li>Establishment ID (from Ministry of Labour)</li>
                  <li>Company Email and Contact Information</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Step 2: Add Employees</h4>
                <p className="text-sm text-slate-700 mb-2">Navigate to <strong>Employees</strong> page and add your team:</p>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li><strong>Individual Add:</strong> Click "Add Employee" button</li>
                  <li><strong>Bulk Import:</strong> Click "Bulk Import" and download the Excel template</li>
                  <li>Required fields: Name, Employee Code, Qatar ID, IBAN Number</li>
                  <li>Optional: Phone, Email, Department, Position, Hire Date</li>
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
                    <strong>Important:</strong> As per Qatar Labour Law, Basic Salary should be at least 60% of total salary for WPS compliance.
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
                    { step: 3, title: 'Review Records', desc: 'Check all employee payroll records' },
                    { step: 4, title: 'Generate WPS File', desc: 'Go to WPS tab and download SIF file' },
                    { step: 5, title: 'Submit to Bank', desc: 'Upload WPS file to your bank portal' },
                    { step: 6, title: 'Mark as Paid', desc: 'After bank confirms, mark as paid with bank reference' },
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
                  <li>Calculates gross salary (Basic + All Allowances)</li>
                  <li>Applies any overtime payments</li>
                  <li>Deducts absences, loans, advances, penalties</li>
                  <li>Calculates net salary (Gross - Deductions)</li>
                  <li>Creates payroll records with status "Approved"</li>
                  <li>Generates individual payslips for each employee</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Marking Employees as Paid</h4>
                <p className="text-sm text-slate-700 mb-2">After submitting WPS file to bank and transferring salaries:</p>
                <ol className="list-decimal list-inside text-sm text-slate-700 space-y-1 ml-4">
                  <li>Go to Payroll → Monthly Payroll tab</li>
                  <li>Click "Mark as Paid" button</li>
                  <li>Enter Bank Reference Number (from your bank's bulk transfer)</li>
                  <li>Select Payment Date</li>
                  <li>Confirm to mark all employees as PAID</li>
                </ol>
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-900">
                    <strong>Bank Reference Number</strong> is the transaction reference provided by your bank when you submit the bulk salary transfer. This helps with reconciliation and audit trails.
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
            id="wps-guide"
            title={t('help.sections.wpsGuide.title')}
            icon={Shield}
            expanded={expandedSection === 'wps-guide'}
            onToggle={() => toggleSection('wps-guide')}
          >
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">What is WPS?</h4>
                <p className="text-sm text-blue-800 leading-relaxed">
                  The Wage Protection System (WPS) is a mandatory electronic salary transfer system in Qatar,
                  governed by the Ministry of Labour. It ensures that all employees receive their salaries
                  on time and in full. Every company must submit a Salary Information File (SIF) to their
                  bank each month, which then reports to the Ministry.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Why is WPS Important?</h4>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-2 ml-4">
                  <li><strong>Legal Requirement:</strong> Mandatory for all companies in Qatar</li>
                  <li><strong>Protects Workers:</strong> Ensures timely salary payment</li>
                  <li><strong>Prevents Violations:</strong> Ministry can track late/non-payment</li>
                  <li><strong>Visa Processing:</strong> WPS compliance required for work visas</li>
                  <li><strong>Company Reputation:</strong> Non-compliance leads to penalties and blacklisting</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Generating WPS Files</h4>
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="font-bold text-slate-900 text-sm mb-2">Step 1: Pre-Validation</p>
                    <p className="text-xs text-slate-700 mb-2">Before generating WPS file, click "Run Validation" to check:</p>
                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 ml-4">
                      <li>All employees have valid Qatar ID (QID)</li>
                      <li>All employees have valid IBAN numbers</li>
                      <li>Basic salary is at least 60% of total salary</li>
                      <li>No missing mandatory fields</li>
                    </ul>
                    <p className="text-xs text-amber-800 mt-2">
                      ⚠️ Fix all validation errors before generating WPS file
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="font-bold text-slate-900 text-sm mb-2">Step 2: Enter Establishment ID</p>
                    <p className="text-xs text-slate-700">
                      Your Establishment ID is your company's unique identifier with Qatar Ministry of Labour.
                      This is provided when you register your company. Example: 12345678
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="font-bold text-slate-900 text-sm mb-2">Step 3: Choose File Format</p>
                    <div className="space-y-2 text-xs">
                      <div className="bg-white rounded p-2 border border-emerald-200">
                        <p className="font-bold text-emerald-900">SIF Format (Recommended)</p>
                        <p className="text-slate-700">Standard Salary Information File accepted by all Qatar banks</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-blue-200">
                        <p className="font-bold text-blue-900">TXT Format</p>
                        <p className="text-slate-700">Simple text format with pipe-delimited fields</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-violet-200">
                        <p className="font-bold text-violet-900">CSV Format</p>
                        <p className="text-slate-700">Excel-compatible format for viewing in spreadsheets</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="font-bold text-slate-900 text-sm mb-2">Step 4: Download & Submit</p>
                    <p className="text-xs text-slate-700 mb-2">
                      Click the appropriate format button to download the WPS file. Then:
                    </p>
                    <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1 ml-4">
                      <li>Log in to your bank's corporate portal</li>
                      <li>Navigate to WPS/Salary Transfer section</li>
                      <li>Upload the downloaded SIF file</li>
                      <li>Review the summary shown by the bank</li>
                      <li>Submit for processing</li>
                      <li>Save the bank reference number</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">WPS File Format Explained</h4>
                <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs mb-2">
                  <div>HDR,12345678,202412,3,15000.00</div>
                  <div>D,28012345678,QA12ABCD00012345678901234,5000,1500,0,0,6500</div>
                  <div>D,28098765432,QA12WXYZ00098765432109876,4000,1200,0,0,5200</div>
                  <div>D,28055566677,QA12PQRS00055566677788899,3000,800,0,100,3700</div>
                  <div>FTR,15000.00</div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-blue-50 rounded p-2 border border-blue-200">
                    <p className="font-bold text-blue-900">HDR (Header)</p>
                    <p className="text-blue-700">Employer ID, Month, Count, Total</p>
                  </div>
                  <div className="bg-violet-50 rounded p-2 border border-violet-200">
                    <p className="font-bold text-violet-900">D (Detail)</p>
                    <p className="text-violet-700">QID, IBAN, Basic, Allowances, OT, Deductions, Net</p>
                  </div>
                  <div className="bg-emerald-50 rounded p-2 border border-emerald-200">
                    <p className="font-bold text-emerald-900">FTR (Footer)</p>
                    <p className="text-emerald-700">Total Net Salary (for verification)</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Important Deadlines & Penalties
                </h4>
                <div className="space-y-2 text-sm text-red-800">
                  <p><strong>Deadline:</strong> Salaries must be paid by the 7th of each month for the previous month</p>
                  <p><strong>Late Payment Penalty:</strong> QAR 5,000 - 10,000 per violation</p>
                  <p><strong>Non-Compliance:</strong> Company may be blacklisted, work visas blocked</p>
                  <p><strong>Repeated Violations:</strong> Legal action, business license suspension</p>
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
                issue="Validation Error: Missing Qatar ID or IBAN"
                solution="Go to Employees page, edit the employee profile, and add the missing Qatar ID and IBAN number. Both are mandatory for WPS compliance."
              />
              <IssueCard
                issue="Error: Payroll already processed for this month"
                solution="Each month can only be processed once. If you need to reprocess, contact support or manually delete existing records first (not recommended - instead, edit individual records)."
              />
              <IssueCard
                issue="WPS file rejected by bank"
                solution="Common reasons: Invalid IBAN format, Qatar ID format incorrect (should be 11 digits), Basic Salary less than 60% of total. Run validation in system before generating WPS file."
              />
              <IssueCard
                issue="Employee not showing in payroll"
                solution="Check: 1) Employee status is 'Active', 2) Salary component has been configured for this employee, 3) Employee's is_active flag is true."
              />
              <IssueCard
                issue="Cannot download payslip"
                solution="Ensure payroll has been processed for the selected month. Payslips are only available after processing payroll."
              />
              <IssueCard
                issue="Total salary doesn't match on WPS file"
                solution="WPS file shows NET salary (after deductions). Your internal records may show GROSS salary (before deductions). This is normal."
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
                description="Process payroll by the 1st of each month to allow time for reviews and corrections before the 7th deadline."
              />
              <BestPracticeCard
                icon={Users}
                title="Keep Employee Data Updated"
                description="Regularly verify Qatar IDs, IBANs, and contact information. Outdated information causes WPS rejections."
              />
              <BestPracticeCard
                icon={FileText}
                title="Maintain Salary Records"
                description="Keep payslips for at least 5 years as required by Qatar Labour Law. Download and archive monthly."
              />
              <BestPracticeCard
                icon={Shield}
                title="Run Validation Before WPS"
                description="Always click 'Run Validation' before generating WPS files to catch errors early and avoid bank rejections."
              />
              <BestPracticeCard
                icon={CheckCircle}
                title="Document Bank References"
                description="Save all bank reference numbers when marking payroll as paid. Essential for audits and dispute resolution."
              />
              <BestPracticeCard
                icon={Download}
                title="Backup WPS Files"
                description="Keep copies of all submitted WPS files organized by month and year for compliance and auditing purposes."
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
                    <strong>Email:</strong> support@loghr.qa
                  </p>
                  <p className="text-blue-900">
                    <strong>Response Time:</strong> Within 24 hours
                  </p>
                  <p className="text-blue-900">
                    <strong>Available:</strong> Sunday - Thursday, 9 AM - 5 PM Qatar Time
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
