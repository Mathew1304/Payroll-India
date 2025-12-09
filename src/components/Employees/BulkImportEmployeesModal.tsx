import { useState } from 'react';
import { X, Upload, Download, CheckCircle, AlertCircle, FileText, Users } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface BulkImportEmployeesModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface ImportRow {
  [key: string]: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  expected?: string;
  actual?: string;
}

interface RowErrors {
  rowNumber: number;
  rowData: ImportRow;
  errors: ValidationError[];
}

export function BulkImportEmployeesModal({ onClose, onSuccess }: BulkImportEmployeesModalProps) {
  const { organization, user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [rowErrors, setRowErrors] = useState<Map<number, RowErrors>>(new Map());
  const [selectedRow, setSelectedRow] = useState<RowErrors | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const [failedRowDetails, setFailedRowDetails] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');

  const isQatar = organization?.country === 'Qatar';
  const isIndia = organization?.country === 'India' || !organization?.country;

  const getTemplateHeaders = () => {
    const commonHeaders = [
      'first_name',
      'middle_name',
      'last_name',
      'date_of_birth',
      'gender',
      'marital_status',
      'personal_email',
      'company_email',
      'mobile_number',
      'current_address',
      'city',
      'state',
      'pincode',
      'employment_type',
      'employment_status',
      'date_of_joining',
      'ctc_annual',
      'basic_salary',
      'housing_allowance',
      'food_allowance',
      'transport_allowance',
      'mobile_allowance',
      'utility_allowance',
      'other_allowances',
      'bank_name',
      'bank_account_number',
      'bank_branch'
    ];

    if (isQatar) {
      return [
        ...commonHeaders,
        'qatar_id',
        'qatar_id_expiry',
        'residence_permit_number',
        'residence_permit_expiry',
        'work_permit_number',
        'work_permit_expiry',
        'health_card_number',
        'health_card_expiry',
        'labor_card_number',
        'labor_card_expiry',
        'sponsor_name',
        'sponsor_id',
        'bank_iban'
      ];
    } else {
      return [
        ...commonHeaders,
        'pan_number',
        'aadhaar_number',
        'uan_number',
        'esi_number',
        'bank_ifsc_code'
      ];
    }
  };

  const downloadTemplate = () => {
    const headers = getTemplateHeaders();
    const csv = headers.join(',') + '\n';

    const exampleRow = headers.map(header => {
      if (header === 'first_name') return 'John';
      if (header === 'last_name') return 'Doe';
      if (header === 'company_email') return 'john.doe@company.com';
      if (header === 'mobile_number') return isQatar ? '+974-12345678' : '+91-9876543210';
      if (header === 'gender') return 'male';
      if (header === 'employment_type') return 'full_time';
      if (header === 'employment_status') return 'active';
      if (header === 'date_of_joining') return '2024-01-15';
      if (header === 'ctc_annual') return isQatar ? '150000' : '500000';
      if (header === 'basic_salary') return isQatar ? '5000' : '25000';
      if (header === 'housing_allowance') return isQatar ? '2000' : '10000';
      if (header === 'food_allowance') return isQatar ? '500' : '2000';
      if (header === 'transport_allowance') return isQatar ? '800' : '3000';
      if (header === 'mobile_allowance') return isQatar ? '200' : '1000';
      if (header === 'utility_allowance') return isQatar ? '300' : '1500';
      if (header === 'other_allowances') return isQatar ? '500' : '2000';
      return '';
    }).join(',');

    const blob = new Blob([csv + exampleRow], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_import_template_${organization?.country || 'general'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        alert('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Normalize data fields to snake_case
        const normalizedData = (results.data as ImportRow[]).map(row => {
          if (row.employment_type) {
            row.employment_type = row.employment_type.toLowerCase().trim().replace(/[\s-]/g, '_');
          }
          if (row.employment_status) {
            row.employment_status = row.employment_status.toLowerCase().trim().replace(/[\s-]/g, '_');
          }
          if (row.gender) {
            row.gender = row.gender.toLowerCase().trim();
          }
          if (row.marital_status) {
            row.marital_status = row.marital_status.toLowerCase().trim();
          }
          return row;
        });

        setParsedData(normalizedData);
        validateData(normalizedData);
        setStep('preview');
      },
      error: (error) => {
        alert('Error parsing CSV file: ' + error.message);
      }
    });
  };

  const downloadErrorReport = () => {
    if (rowErrors.size === 0) return;

    const timestamp = new Date().toLocaleString();
    let reportContent = `BULK IMPORT VALIDATION ERROR REPORT\n`;
    reportContent += `Generated: ${timestamp}\n`;
    reportContent += `File: ${file?.name}\n`;
    reportContent += `Total Rows: ${parsedData.length}\n`;
    reportContent += `Rows with Errors: ${rowErrors.size}\n`;
    reportContent += `Total Errors: ${validationErrors.length}\n`;
    reportContent += `\n${'='.repeat(80)}\n\n`;

    Array.from(rowErrors.values()).forEach((rowError) => {
      reportContent += `ROW ${rowError.rowNumber}\n`;
      reportContent += `${'-'.repeat(80)}\n`;
      reportContent += `Employee: ${rowError.rowData.first_name || '(empty)'} ${rowError.rowData.last_name || '(empty)'}\n`;
      reportContent += `Email: ${rowError.rowData.company_email || '(empty)'}\n`;
      reportContent += `Mobile: ${rowError.rowData.mobile_number || '(empty)'}\n`;
      reportContent += `\n`;

      rowError.errors.forEach((error, index) => {
        reportContent += `  ERROR ${index + 1}:\n`;
        reportContent += `  Field: ${error.field}\n`;
        reportContent += `  Issue: ${error.message}\n`;
        reportContent += `  Current Value: "${error.actual || '(empty)'}"\n`;
        if (error.expected) {
          reportContent += `  Expected Format: ${error.expected}\n`;
        }
        reportContent += `\n`;
      });

      reportContent += `\n`;
    });

    reportContent += `${'='.repeat(80)}\n`;
    reportContent += `\nINSTRUCTIONS TO FIX:\n`;
    reportContent += `1. Open your CSV file in Excel or any spreadsheet application\n`;
    reportContent += `2. For each row listed above, locate the row number (including header row)\n`;
    reportContent += `3. Fix the values in the specified fields according to the expected format\n`;
    reportContent += `4. Save the file and upload it again\n`;
    reportContent += `\nNote: Row numbers include the header row. For example, Row 2 is the first data row.\n`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import-errors-${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const validateData = (data: ImportRow[]) => {
    const errors: ValidationError[] = [];
    const rowErrorsMap = new Map<number, RowErrors>();
    const requiredFields = ['first_name', 'last_name', 'company_email', 'mobile_number'];

    data.forEach((row, index) => {
      const rowNum = index + 1;
      const rowErrs: ValidationError[] = [];

      requiredFields.forEach(field => {
        if (!row[field] || row[field].trim() === '') {
          const error = {
            row: rowNum,
            field,
            message: `${field.replace('_', ' ')} is required`,
            expected: 'Non-empty value',
            actual: row[field] || '(empty)'
          };
          errors.push(error);
          rowErrs.push(error);
        }
      });

      if (row.company_email && !row.company_email.includes('@')) {
        const error = {
          row: rowNum,
          field: 'company_email',
          message: 'Invalid email format',
          expected: 'Valid email (e.g., user@company.com)',
          actual: row.company_email
        };
        errors.push(error);
        rowErrs.push(error);
      }

      if (row.gender && !['male', 'female', 'other'].includes(row.gender.toLowerCase())) {
        const error = {
          row: rowNum,
          field: 'gender',
          message: 'Invalid gender value',
          expected: 'male, female, or other',
          actual: row.gender
        };
        errors.push(error);
        rowErrs.push(error);
      }

      if (row.employment_type && !['full_time', 'part_time', 'contract', 'intern'].includes(row.employment_type.toLowerCase())) {
        const error = {
          row: rowNum,
          field: 'employment_type',
          message: 'Invalid employment type',
          expected: 'full_time, part_time, contract, or intern',
          actual: row.employment_type
        };
        errors.push(error);
        rowErrs.push(error);
      }

      if (row.employment_status && !['active', 'probation', 'on_hold', 'inactive', 'terminated'].includes(row.employment_status.toLowerCase())) {
        const error = {
          row: rowNum,
          field: 'employment_status',
          message: 'Invalid employment status',
          expected: 'active, probation, on_hold, inactive, or terminated',
          actual: row.employment_status
        };
        errors.push(error);
        rowErrs.push(error);
      }

      if (row.marital_status && !['single', 'married', 'divorced', 'widowed'].includes(row.marital_status.toLowerCase())) {
        const error = {
          row: rowNum,
          field: 'marital_status',
          message: 'Invalid marital status',
          expected: 'single, married, divorced, or widowed',
          actual: row.marital_status
        };
        errors.push(error);
        rowErrs.push(error);
      }

      const numericFields = ['basic_salary', 'housing_allowance', 'food_allowance', 'transport_allowance',
        'mobile_allowance', 'utility_allowance', 'other_allowances', 'ctc_annual'];
      numericFields.forEach(field => {
        if (row[field] && row[field].trim() !== '') {
          const value = parseFloat(row[field]);
          if (isNaN(value) || value < 0) {
            const error = {
              row: rowNum,
              field,
              message: `${field.replace(/_/g, ' ')} must be a valid positive number`,
              expected: 'Numeric value >= 0',
              actual: row[field]
            };
            errors.push(error);
            rowErrs.push(error);
          }
        }
      });

      const dateFields = ['date_of_birth', 'date_of_joining', 'probation_end_date', 'qatar_id_expiry',
        'residence_permit_expiry', 'work_permit_expiry', 'health_card_expiry',
        'labor_card_expiry', 'contract_start_date', 'contract_end_date'];

      dateFields.forEach(field => {
        if (row[field] && row[field].trim() !== '') {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(row[field])) {
            const error = {
              row: rowNum,
              field,
              message: `Invalid date format for ${field.replace('_', ' ')}`,
              expected: 'YYYY-MM-DD (e.g., 2024-12-31)',
              actual: row[field]
            };
            errors.push(error);
            rowErrs.push(error);
          }
        }
      });

      if (rowErrs.length > 0) {
        rowErrorsMap.set(rowNum, {
          rowNumber: rowNum,
          rowData: row,
          errors: rowErrs
        });
      }
    });

    setValidationErrors(errors);
    setRowErrors(rowErrorsMap);
  };

  const startImport = async () => {
    if (!organization?.id) return;

    setImporting(true);
    setStep('importing');
    setImportProgress(0);

    let successCount = 0;
    let failedCount = 0;
    const batchSize = 10;
    const importedEmployees: any[] = [];
    const failedRows: any[] = [];

    for (let i = 0; i < parsedData.length; i += batchSize) {
      const batch = parsedData.slice(i, i + batchSize);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const rowNumber = i + j + 1;

        try {
          // Check for duplicates
          const { data: existingEmployee } = await supabase
            .from('employees')
            .select('id, company_email, mobile_number')
            .eq('organization_id', organization.id)
            .or(`company_email.eq.${row.company_email?.trim()},mobile_number.eq.${row.mobile_number?.trim()}`)
            .maybeSingle();

          if (existingEmployee) {
            throw new Error(`Duplicate employee found: ${existingEmployee.company_email || existingEmployee.mobile_number} already exists`);
          }

          const employeeData: any = {
            organization_id: organization.id,
            first_name: row.first_name?.trim(),
            middle_name: row.middle_name?.trim() || null,
            last_name: row.last_name?.trim(),
            date_of_birth: row.date_of_birth || null,
            gender: row.gender?.toLowerCase() || 'male',
            marital_status: row.marital_status?.toLowerCase() || 'single',
            personal_email: row.personal_email?.trim() || null,
            company_email: row.company_email?.trim(),
            mobile_number: row.mobile_number?.trim(),
            alternate_number: row.alternate_number?.trim() || null,
            current_address: row.current_address?.trim() || null,
            permanent_address: row.permanent_address?.trim() || null,
            city: row.city?.trim() || null,
            state: row.state?.trim() || null,
            pincode: row.pincode?.trim() || null,
            employment_type: row.employment_type?.toLowerCase() || 'full_time',
            employment_status: row.employment_status?.toLowerCase() || 'active',
            date_of_joining: row.date_of_joining || null,
            probation_end_date: row.probation_end_date || null,
            ctc_annual: row.ctc_annual ? parseFloat(row.ctc_annual) : null,
            basic_salary: row.basic_salary ? parseFloat(row.basic_salary) : null,
            bank_name: row.bank_name?.trim() || null,
            bank_account_number: row.bank_account_number?.trim() || null,
            bank_branch: row.bank_branch?.trim() || null
          };

          if (isQatar) {
            employeeData.qatar_id = row.qatar_id?.trim() || null;
            employeeData.qatar_id_expiry = row.qatar_id_expiry || null;
            employeeData.residence_permit_number = row.residence_permit_number?.trim() || null;
            employeeData.residence_permit_expiry = row.residence_permit_expiry || null;
            employeeData.work_permit_number = row.work_permit_number?.trim() || null;
            employeeData.work_permit_expiry = row.work_permit_expiry || null;
            employeeData.health_card_number = row.health_card_number?.trim() || null;
            employeeData.health_card_expiry = row.health_card_expiry || null;
            employeeData.labor_card_number = row.labor_card_number?.trim() || null;
            employeeData.labor_card_expiry = row.labor_card_expiry || null;
            employeeData.sponsor_name = row.sponsor_name?.trim() || null;
            employeeData.sponsor_id = row.sponsor_id?.trim() || null;
            employeeData.iban_number = row.bank_iban?.trim() || null;
          } else {
            employeeData.pan_number = row.pan_number?.trim() || null;
            employeeData.aadhaar_number = row.aadhaar_number?.trim() || null;
            employeeData.uan_number = row.uan_number?.trim() || null;
            employeeData.esi_number = row.esi_number?.trim() || null;
            employeeData.bank_ifsc_code = row.bank_ifsc_code?.trim() || null;
          }

          const { data, error } = await supabase
            .from('employees')
            .insert(employeeData)
            .select('id, first_name, middle_name, last_name, company_email, mobile_number, employment_type')
            .single();

          if (error) throw error;

          const basicSalary = row.basic_salary ? parseFloat(row.basic_salary) : 0;
          if (basicSalary > 0) {
            const salaryData = {
              organization_id: organization.id,
              employee_id: data.id,
              basic_salary: basicSalary,
              housing_allowance: row.housing_allowance ? parseFloat(row.housing_allowance) : 0,
              food_allowance: row.food_allowance ? parseFloat(row.food_allowance) : 0,
              transport_allowance: row.transport_allowance ? parseFloat(row.transport_allowance) : 0,
              mobile_allowance: row.mobile_allowance ? parseFloat(row.mobile_allowance) : 0,
              utility_allowance: row.utility_allowance ? parseFloat(row.utility_allowance) : 0,
              other_allowances: row.other_allowances ? parseFloat(row.other_allowances) : 0,
              effective_from: row.date_of_joining || new Date().toISOString().split('T')[0],
              is_active: true
            };

            let salaryTableName = 'salary_components';
            if (organization?.country === 'Qatar') {
              salaryTableName = 'qatar_salary_components';
            } else if (organization?.country === 'Saudi Arabia') {
              salaryTableName = 'saudi_salary_components';
            }

            if (salaryTableName !== 'salary_components') {
              const { error: salaryError } = await supabase
                .from(salaryTableName)
                .insert(salaryData);

              if (salaryError) {
                console.error(`Error inserting salary components for ${data.first_name}:`, salaryError);
              }
            }
          }

          successCount++;

          importedEmployees.push({
            name: `${data.first_name}${data.middle_name ? ' ' + data.middle_name : ''} ${data.last_name}`,
            email: data.company_email,
            mobile: data.mobile_number,
            employment_type: data.employment_type
          });
        } catch (error: any) {
          console.error('Error importing row:', error);
          failedCount++;

          failedRows.push({
            row_number: rowNumber,
            row_data: {
              first_name: row.first_name,
              last_name: row.last_name,
              company_email: row.company_email,
              mobile_number: row.mobile_number
            },
            error: error?.message || 'Unknown error occurred'
          });
        }
      }

      setImportProgress(Math.round(((i + batch.length) / parsedData.length) * 100));
    }

    try {
      await supabase
        .from('employee_import_history')
        .insert({
          organization_id: organization.id,
          uploaded_by: user?.id || null,
          file_name: file?.name || 'unknown.csv',
          total_rows: parsedData.length,
          successful_imports: successCount,
          failed_imports: failedCount,
          imported_employees: importedEmployees,
          failed_rows: failedRows,
          country: organization.country
        });
    } catch (error) {
      console.error('Error saving import history:', error);
    }

    setImportResults({ success: successCount, failed: failedCount });
    setFailedRowDetails(failedRows);
    setImporting(false);
    setStep('complete');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Bulk Import Employees</h2>
              <p className="text-sm text-slate-600">Import multiple employees from CSV file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Download the CSV template for your country ({organization?.country || 'General'})</li>
                  <li>Fill in employee details following the template format</li>
                  <li>Ensure all required fields are filled: first_name, last_name, company_email, mobile_number</li>
                  <li>Include salary components (basic_salary, allowances) to enable payroll processing</li>
                  <li>Date fields must be in YYYY-MM-DD format (e.g., 2024-01-15)</li>
                  <li>Salary and allowance fields must be numeric values</li>
                  <li>Save your file as CSV format</li>
                  <li>Upload the completed CSV file below</li>
                </ul>
              </div>

              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Download className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-slate-700">Download CSV Template ({organization?.country || 'General'})</span>
              </button>

              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="p-4 bg-slate-100 rounded-full">
                    <Upload className="h-8 w-8 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-slate-900">Upload CSV File</p>
                    <p className="text-sm text-slate-600">Click to browse or drag and drop</p>
                  </div>
                </label>
                {file && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-700">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Preview Import Data</h3>
                  <p className="text-sm text-slate-600">Found {parsedData.length} employees to import</p>
                </div>
                {validationErrors.length > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-medium">{validationErrors.length} validation errors</span>
                  </div>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900 mb-1">Validation Errors Found</h4>
                        <p className="text-sm text-blue-800">
                          {rowErrors.size} row{rowErrors.size !== 1 ? 's have' : ' has'} errors. Click on any row with errors below to see detailed error information and what needs to be fixed.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={downloadErrorReport}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Download className="h-4 w-4" />
                      Download Error Report
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">#</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Name</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Email</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Mobile</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 10).map((row, index) => {
                        const rowNum = index + 1;
                        const hasErrors = rowErrors.has(rowNum);
                        const errorCount = hasErrors ? rowErrors.get(rowNum)!.errors.length : 0;

                        return (
                          <tr
                            key={index}
                            onClick={() => hasErrors && setSelectedRow(rowErrors.get(rowNum)!)}
                            className={`border-b border-slate-100 transition-colors ${hasErrors
                              ? 'hover:bg-red-50 cursor-pointer'
                              : 'hover:bg-green-50'
                              }`}
                          >
                            <td className="px-4 py-2 text-slate-600">{rowNum}</td>
                            <td className="px-4 py-2">{row.first_name} {row.last_name}</td>
                            <td className="px-4 py-2">{row.company_email}</td>
                            <td className="px-4 py-2">{row.mobile_number}</td>
                            <td className="px-4 py-2">
                              {hasErrors ? (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 text-red-700 font-medium text-xs">
                                    <AlertCircle className="h-3 w-3" />
                                    {errorCount} error{errorCount !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-xs text-slate-500">(click for details)</span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 font-medium text-xs">
                                  <CheckCircle className="h-3 w-3" />
                                  Valid
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {parsedData.length > 10 && (
                    <div className="p-3 bg-slate-50 text-center text-sm text-slate-600">
                      ...and {parsedData.length - 10} more employees
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-24 h-24 relative">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    className="text-slate-200"
                    strokeWidth="10"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                  <circle
                    className="text-blue-600 transition-all duration-300"
                    strokeWidth="10"
                    strokeDasharray={`${importProgress * 2.51} 251`}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{importProgress}%</span>
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-slate-900 mb-2">Importing Employees...</h3>
                <p className="text-slate-600">Please wait while we import your employee data</p>
              </div>
            </div>
          )}

          {step === 'complete' && importResults && (
            <div className="py-6 space-y-6">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Import Complete!</h3>
                  <div className="space-y-2">
                    <p className="text-lg text-green-600 font-medium">
                      Successfully imported: {importResults.success} employees
                    </p>
                    {importResults.failed > 0 && (
                      <p className="text-lg text-red-600 font-medium">
                        Failed: {importResults.failed} employees
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {importResults.failed > 0 && failedRowDetails.length > 0 && (
                <div className="mt-6 border border-red-200 rounded-lg p-4 bg-red-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-red-900 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Failed Rows ({failedRowDetails.length})
                    </h4>
                    <button
                      onClick={() => {
                        const timestamp = new Date().toISOString().split('T')[0];
                        let report = `EMPLOYEE IMPORT FAILURE REPORT\n`;
                        report += `${'='.repeat(80)}\n\n`;
                        report += `File: ${file?.name || 'unknown.csv'}\n`;
                        report += `Date: ${new Date().toLocaleString()}\n`;
                        report += `Total Rows: ${importResults.success + importResults.failed}\n`;
                        report += `Successful: ${importResults.success}\n`;
                        report += `Failed: ${importResults.failed}\n`;
                        report += `\n${'='.repeat(80)}\n\n`;
                        report += `FAILED ROWS DETAILS\n`;
                        report += `${'-'.repeat(80)}\n\n`;

                        failedRowDetails.forEach((row) => {
                          report += `Row #${row.row_number}\n`;
                          report += `  Name: ${row.row_data.first_name} ${row.row_data.last_name}\n`;
                          report += `  Email: ${row.row_data.company_email || 'N/A'}\n`;
                          report += `  Mobile: ${row.row_data.mobile_number || 'N/A'}\n`;
                          report += `  Error: ${row.error}\n`;
                          report += `\n`;
                        });

                        report += `${'='.repeat(80)}\n`;
                        report += `End of Report\n`;

                        const blob = new Blob([report], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `import-failure-report-${timestamp}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      <Download className="h-4 w-4" />
                      Download Report
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-red-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-red-900">Row #</th>
                          <th className="px-3 py-2 text-left font-medium text-red-900">Name</th>
                          <th className="px-3 py-2 text-left font-medium text-red-900">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-red-900">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-200">
                        {failedRowDetails.map((row, index) => (
                          <tr key={index} className="hover:bg-red-100">
                            <td className="px-3 py-2 text-red-700 font-medium">{row.row_number}</td>
                            <td className="px-3 py-2 text-red-900">
                              {row.row_data.first_name} {row.row_data.last_name}
                            </td>
                            <td className="px-3 py-2 text-red-800">{row.row_data.company_email || '-'}</td>
                            <td className="px-3 py-2 text-red-700 text-xs">{row.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 font-medium"
          >
            {step === 'complete' ? 'Close' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step === 'preview' && (
              <>
                <button
                  onClick={() => {
                    setStep('upload');
                    setFile(null);
                    setParsedData([]);
                    setValidationErrors([]);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={startImport}
                  disabled={parsedData.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import {parsedData.length} Employees
                </button>
              </>
            )}
            {step === 'complete' && (
              <button
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedRow && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-scaleIn">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-red-50 to-red-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Row {selectedRow.rowNumber} - Error Details</h3>
                  <p className="text-sm text-slate-600">
                    {selectedRow.errors.length} error{selectedRow.errors.length !== 1 ? 's' : ''} found in this row
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRow(null)}
                className="p-2 hover:bg-red-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Employee Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-600">Name:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {selectedRow.rowData.first_name} {selectedRow.rowData.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-600">Email:</span>
                    <span className="ml-2 font-medium text-slate-900">{selectedRow.rowData.company_email}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Mobile:</span>
                    <span className="ml-2 font-medium text-slate-900">{selectedRow.rowData.mobile_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <span className="ml-2 font-medium text-slate-900">{selectedRow.rowData.employment_status || 'Not specified'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  Validation Errors ({selectedRow.errors.length})
                </h4>

                {selectedRow.errors.map((error, index) => (
                  <div key={index} className="bg-white border-2 border-red-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-mono rounded">
                            {error.field}
                          </span>
                          <span className="text-sm font-medium text-red-600">{error.message}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="bg-red-50 rounded p-3">
                            <div className="text-xs font-semibold text-red-900 mb-1 uppercase tracking-wide">Current Value:</div>
                            <div className="font-mono text-sm text-red-700 break-all">
                              {error.actual || '(empty)'}
                            </div>
                          </div>

                          {error.expected && (
                            <div className="bg-green-50 rounded p-3">
                              <div className="text-xs font-semibold text-green-900 mb-1 uppercase tracking-wide">Expected Format:</div>
                              <div className="font-mono text-sm text-green-700">
                                {error.expected}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  How to Fix
                </h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open your CSV file in Excel or any spreadsheet application</li>
                  <li>Go to row {selectedRow.rowNumber} (including header row)</li>
                  <li>Fix the values in the highlighted fields according to the expected format</li>
                  <li>Save the file and upload it again</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={downloadErrorReport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Download All Errors
              </button>
              <button
                onClick={() => setSelectedRow(null)}
                className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
