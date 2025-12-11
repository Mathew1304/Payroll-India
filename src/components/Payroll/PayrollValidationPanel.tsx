import { AlertCircle, CheckCircle, AlertTriangle, XCircle, RefreshCw, Download, Eye, ExternalLink, Users, Wrench } from 'lucide-react';
import { useState } from 'react';
import { ValidationResult, ValidationError, generateValidationReport } from '../../utils/payrollValidation';
import { QuickFixModal } from './QuickFixModal';

interface PayrollValidationPanelProps {
  validation: ValidationResult | null;
  loading: boolean;
  onRunValidation: () => Promise<void>;
  onViewError?: (error: ValidationError) => void;
}

interface ValidationSummary {
  missingQID: number;
  missingIBAN: number;
  invalidIBAN: number;
  expiredDocs: number;
  missingSalary: number;
}

export function PayrollValidationPanel({
  validation,
  loading,
  onRunValidation,
  onViewError
}: PayrollValidationPanelProps) {
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);
  const [fixingError, setFixingError] = useState<ValidationError | null>(null);

  const getSummary = (): ValidationSummary => {
    if (!validation) return { missingQID: 0, missingIBAN: 0, invalidIBAN: 0, expiredDocs: 0, missingSalary: 0 };

    return {
      missingQID: validation.errors.filter(e => e.error_code === 'MISSING_QID' || e.error_code === 'MISSING_SAUDI_ID').length,
      missingIBAN: validation.errors.filter(e => e.error_code === 'MISSING_IBAN').length,
      invalidIBAN: validation.errors.filter(e => e.error_code === 'INVALID_IBAN').length,
      expiredDocs: validation.errors.filter(e => e.error_code === 'EXPIRED_QID' || e.error_code === 'EXPIRED_VISA' || e.error_code === 'EXPIRED_PASSPORT').length,
      missingSalary: validation.errors.filter(e => e.error_code === 'MISSING_SALARY' || e.error_code === 'INVALID_BASIC_SALARY').length
    };
  };

  const downloadReport = () => {
    if (!validation) return;

    const report = generateValidationReport(validation);
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_Validation_Report_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFixSuccess = async () => {
    await onRunValidation();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Pre-Payroll Validation</h2>
        <div className="flex gap-3">
          {validation && (
            <button
              onClick={downloadReport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-50 transition-all"
            >
              <Download className="h-4 w-4" />
              Download Report
            </button>
          )}
          <button
            onClick={onRunValidation}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Validating...' : 'Run Validation'}
          </button>
        </div>
      </div>

      {validation && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border-2 ${validation.passed
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
              }`}>
              <div className="flex items-center gap-3">
                {validation.passed ? (
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-slate-600">Status</p>
                  <p className={`text-lg font-bold ${validation.passed ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                    {validation.passed ? 'PASSED' : 'FAILED'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Valid Employees</p>
                  <p className="text-lg font-bold text-blue-600">
                    {validation.validEmployees} / {validation.totalEmployees}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Errors</p>
                  <p className="text-lg font-bold text-red-600">{validation.totalErrors}</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Warnings</p>
                  <p className="text-lg font-bold text-amber-600">{validation.totalWarnings}</p>
                </div>
              </div>
            </div>
          </div>

          {!validation.passed && (
            <>
              <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <p className="text-sm font-semibold text-red-900">
                      Payroll processing is blocked. You must fix all errors before proceeding.
                    </p>
                  </div>
                  <a
                    href="/employees"
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-all"
                  >
                    <Users className="h-4 w-4" />
                    Fix Employee Data
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {(() => {
                const summary = getSummary();
                const hasIssues = summary.missingQID > 0 || summary.missingIBAN > 0 || summary.invalidIBAN > 0;

                if (hasIssues) {
                  return (
                    <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-amber-900 mb-2">Missing Data Summary</h4>
                          <p className="text-sm text-amber-800 mb-3">
                            Update employee profiles with missing information before generating WPS file:
                          </p>
                          <ul className="space-y-1 text-sm text-amber-800">
                            {summary.missingQID > 0 && (
                              <li className="flex items-center gap-2">
                                <span className="font-semibold">{summary.missingQID}</span>
                                employee(s) missing Qatar ID (QID)
                              </li>
                            )}
                            {summary.missingIBAN > 0 && (
                              <li className="flex items-center gap-2">
                                <span className="font-semibold">{summary.missingIBAN}</span>
                                employee(s) missing IBAN
                              </li>
                            )}
                            {summary.invalidIBAN > 0 && (
                              <li className="flex items-center gap-2">
                                <span className="font-semibold">{summary.invalidIBAN}</span>
                                employee(s) has invalid IBAN length (must be 29 characters)
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
            </>
          )}

          {validation.errors.length > 0 && (
            <div className="bg-white border-2 border-red-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-red-50 cursor-pointer"
                onClick={() => setShowErrors(!showErrors)}
              >
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-bold text-red-900">
                    Errors ({validation.errors.length}) - Must be fixed
                  </h3>
                </div>
                <Eye className={`h-5 w-5 text-red-600 transition-transform ${showErrors ? 'rotate-180' : ''}`} />
              </div>

              {showErrors && (
                <div className="divide-y divide-red-100">
                  {validation.errors.map((error, idx) => (
                    <div
                      key={idx}
                      className="p-4 hover:bg-red-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-red-600">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-bold rounded">
                              {error.error_code}
                            </span>
                            {error.category && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded">
                                {error.category.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                          </div>
                          {error.employee_code && (
                            <p className="text-sm font-semibold text-slate-900 mb-1">
                              {error.employee_code} - {error.employee_name}
                            </p>
                          )}
                          <p className="text-sm text-red-700">{error.error_message}</p>
                          {error.field_name && (
                            <p className="text-xs text-slate-500 mt-1">Field: {error.field_name}</p>
                          )}
                        </div>
                        {error.field_name && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFixingError(error);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors shadow-sm"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            Fix Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="bg-white border-2 border-amber-200 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-amber-50 cursor-pointer"
                onClick={() => setShowWarnings(!showWarnings)}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900">
                    Warnings ({validation.warnings.length}) - Should be reviewed
                  </h3>
                </div>
                <Eye className={`h-5 w-5 text-amber-600 transition-transform ${showWarnings ? 'rotate-180' : ''}`} />
              </div>

              {showWarnings && (
                <div className="divide-y divide-amber-100">
                  {validation.warnings.map((warning, idx) => (
                    <div
                      key={idx}
                      className="p-4 hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-amber-600">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-bold rounded">
                              {warning.error_code}
                            </span>
                            {warning.category && (
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded">
                                {warning.category.replace('_', ' ').toUpperCase()}
                              </span>
                            )}
                          </div>
                          {warning.employee_code && (
                            <p className="text-sm font-semibold text-slate-900 mb-1">
                              {warning.employee_code} - {warning.employee_name}
                            </p>
                          )}
                          <p className="text-sm text-amber-700">{warning.error_message}</p>
                          {warning.field_name && (
                            <p className="text-xs text-slate-500 mt-1">Field: {warning.field_name}</p>
                          )}
                        </div>
                        {warning.field_name && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFixingError(warning);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-50 transition-colors shadow-sm"
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            Fix Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {validation.passed && validation.warnings.length === 0 && (
            <div className="p-6 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-center">
              <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-emerald-900 mb-2">All Clear!</h3>
              <p className="text-sm text-emerald-700">
                No errors or warnings found. You can proceed with payroll processing.
              </p>
            </div>
          )}
        </>
      )}

      {!validation && !loading && (
        <div className="p-12 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">
            Click "Run Validation" to check for errors before processing payroll
          </p>
          <button
            onClick={onRunValidation}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            Run Validation Now
          </button>
        </div>
      )}

      {loading && !validation && (
        <div className="p-12 bg-slate-50 border-2 border-slate-200 rounded-xl text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 mx-auto mb-3 animate-spin" />
          <p className="text-slate-600">Validating employee data...</p>
        </div>
      )}

      {fixingError && (
        <QuickFixModal
          isOpen={true}
          onClose={() => setFixingError(null)}
          error={fixingError}
          onSuccess={handleFixSuccess}
        />
      )}
    </div>
  );
}
