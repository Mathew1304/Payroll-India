import { supabase } from '../lib/supabase';

export interface ValidationError {
  id?: string;
  validation_type: 'error' | 'warning' | 'info';
  category: 'missing_data' | 'salary_structure' | 'leave_deduction' | 'compliance' | 'wps';
  employee_id?: string;
  employee_name?: string;
  employee_code?: string;
  error_code: string;
  error_message: string;
  field_name?: string;
  resolved: boolean;
}

export interface ValidationResult {
  passed: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  totalErrors: number;
  totalWarnings: number;
  validEmployees: number;
  totalEmployees: number;
}

export async function validatePrePayroll(
  organizationId: string,
  month: number,
  year: number,
  country: 'Qatar' | 'Saudi Arabia'
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select(`
      id,
      employee_code,
      first_name,
      last_name,
      personal_email,
      company_email,
      mobile_number,
      qatar_id,
      muqeem_id,
      bank_name,
      iban_number,
      employment_status,
      is_active,
      date_of_birth,
      passport_expiry,
      visa_expiry,
      qatar_id_expiry
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  if (empError || !employees) {
    throw new Error(`Failed to load employees: ${empError?.message}`);
  }

  for (const emp of employees) {
    const empName = `${emp.first_name} ${emp.last_name}`;

    if (country === 'Qatar') {
      if (!emp.qatar_id) {
        errors.push({
          validation_type: 'error',
          category: 'missing_data',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'MISSING_QID',
          error_message: `Missing Qatar ID`,
          field_name: 'qatar_id',
          resolved: false
        });
      } else if (emp.qatar_id.length !== 11) {
        errors.push({
          validation_type: 'error',
          category: 'compliance',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'INVALID_QID',
          error_message: `Qatar ID must be 11 digits (current: ${emp.qatar_id.length})`,
          field_name: 'qatar_id',
          resolved: false
        });
      }
    }

    if (country === 'Saudi Arabia') {
      if (!emp.muqeem_id) {
        errors.push({
          validation_type: 'error',
          category: 'missing_data',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'MISSING_SAUDI_ID',
          error_message: `Missing Muqeem ID / Iqama`,
          field_name: 'muqeem_id',
          resolved: false
        });
      }
    }

    const ibanField = emp.iban_number;

    if (!ibanField) {
      errors.push({
        validation_type: 'error',
        category: 'missing_data',
        employee_id: emp.id,
        employee_name: empName,
        employee_code: emp.employee_code,
        error_code: 'MISSING_IBAN',
        error_message: `Missing IBAN`,
        field_name: 'iban_number',
        resolved: false
      });
    } else {
      if (country === 'Qatar' && (!ibanField.startsWith('QA') || ibanField.length !== 29)) {
        errors.push({
          validation_type: 'error',
          category: 'wps',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'INVALID_IBAN',
          error_message: `Invalid Qatar IBAN format (must start with QA and be 29 characters, current: ${ibanField.length} characters)`,
          field_name: 'iban_number',
          resolved: false
        });
      }
      if (country === 'Saudi Arabia' && (!ibanField.startsWith('SA') || ibanField.length !== 24)) {
        errors.push({
          validation_type: 'error',
          category: 'wps',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'INVALID_IBAN',
          error_message: `Invalid Saudi IBAN format (must start with SA and be 24 characters, current: ${ibanField.length} characters)`,
          field_name: 'iban_number',
          resolved: false
        });
      }
    }

    if (!emp.bank_name) {
      warnings.push({
        validation_type: 'warning',
        category: 'missing_data',
        employee_id: emp.id,
        employee_name: empName,
        employee_code: emp.employee_code,
        error_code: 'MISSING_BANK_NAME',
        error_message: `Missing Bank Name`,
        field_name: 'bank_name',
        resolved: false
      });
    }

    if (emp.qatar_id_expiry) {
      const expiryDate = new Date(emp.qatar_id_expiry);
      const today = new Date();
      if (expiryDate < today) {
        errors.push({
          validation_type: 'error',
          category: 'compliance',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'EXPIRED_QID',
          error_message: `Qatar ID expired on ${expiryDate.toLocaleDateString()}`,
          field_name: 'qatar_id_expiry',
          resolved: false
        });
      } else {
        const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 30) {
          warnings.push({
            validation_type: 'warning',
            category: 'compliance',
            employee_id: emp.id,
            employee_name: empName,
            employee_code: emp.employee_code,
            error_code: 'QID_EXPIRING_SOON',
            error_message: `Qatar ID expires in ${daysUntilExpiry} days`,
            field_name: 'qatar_id_expiry',
            resolved: false
          });
        }
      }
    }

    if (emp.visa_expiry_date) {
      const expiryDate = new Date(emp.visa_expiry_date);
      const today = new Date();
      if (expiryDate < today) {
        errors.push({
          validation_type: 'error',
          category: 'compliance',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'EXPIRED_VISA',
          error_message: `Visa expired on ${expiryDate.toLocaleDateString()}`,
          field_name: 'visa_expiry_date',
          resolved: false
        });
      }
    }

    if (emp.passport_expiry_date) {
      const expiryDate = new Date(emp.passport_expiry_date);
      const today = new Date();
      if (expiryDate < today) {
        errors.push({
          validation_type: 'error',
          category: 'compliance',
          employee_id: emp.id,
          employee_name: empName,
          employee_code: emp.employee_code,
          error_code: 'EXPIRED_PASSPORT',
          error_message: `Passport expired on ${expiryDate.toLocaleDateString()}`,
          field_name: 'passport_expiry_date',
          resolved: false
        });
      }
    }
  }

  const salaryTable = country === 'Qatar' ? 'qatar_salary_components' : 'saudi_salary_components';
  const { data: salaryComponents, error: salError } = await supabase
    .from(salaryTable)
    .select(`
      id,
      employee_id,
      basic_salary,
      employees!inner(id, employee_code, first_name, last_name, is_active)
    `)
    .eq('employees.organization_id', organizationId)
    .eq('employees.is_active', true);

  if (salError) {
    warnings.push({
      validation_type: 'warning',
      category: 'salary_structure',
      error_code: 'SALARY_LOAD_ERROR',
      error_message: `Failed to load salary components: ${salError.message}`,
      resolved: false
    });
  }

  if (salaryComponents) {
    const employeesWithSalary = new Set(salaryComponents.map(s => s.employee_id));

    for (const emp of employees) {
      if (!employeesWithSalary.has(emp.id)) {
        errors.push({
          validation_type: 'error',
          category: 'missing_data',
          employee_id: emp.id,
          employee_name: `${emp.first_name} ${emp.last_name}`,
          employee_code: emp.employee_code,
          error_code: 'MISSING_SALARY',
          error_message: `No salary components configured`,
          field_name: 'salary_components',
          resolved: false
        });
      }
    }

    for (const salary of salaryComponents) {
      if (!salary.basic_salary || salary.basic_salary <= 0) {
        errors.push({
          validation_type: 'error',
          category: 'salary_structure',
          employee_id: salary.employee_id,
          employee_name: `${salary.employees.first_name} ${salary.employees.last_name}`,
          employee_code: salary.employees.employee_code,
          error_code: 'INVALID_BASIC_SALARY',
          error_message: `Basic salary must be greater than 0`,
          field_name: 'basic_salary',
          resolved: false
        });
      }
    }
  }

  const validEmployees = employees.length - errors.filter(e => e.employee_id).length;

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    validEmployees,
    totalEmployees: employees.length
  };
}

export async function saveValidationResults(
  organizationId: string,
  month: number,
  year: number,
  validationResult: ValidationResult
): Promise<void> {
  await supabase
    .from('payroll_validations')
    .delete()
    .eq('organization_id', organizationId)
    .eq('payroll_period_month', month)
    .eq('payroll_period_year', year);

  const allIssues = [...validationResult.errors, ...validationResult.warnings];

  if (allIssues.length > 0) {
    const { error } = await supabase
      .from('payroll_validations')
      .insert(
        allIssues.map(issue => ({
          organization_id: organizationId,
          payroll_period_month: month,
          payroll_period_year: year,
          validation_type: issue.validation_type,
          category: issue.category,
          employee_id: issue.employee_id || null,
          error_code: issue.error_code,
          error_message: issue.error_message,
          field_name: issue.field_name || null,
          resolved: false
        }))
      );

    if (error) {
      console.error('Failed to save validation results:', error);
    }
  }
}

export function generateValidationReport(validation: ValidationResult): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('PAYROLL VALIDATION REPORT');
  lines.push('='.repeat(80));
  lines.push('');

  lines.push(`Total Employees: ${validation.totalEmployees}`);
  lines.push(`Valid Employees: ${validation.validEmployees}`);
  lines.push(`Total Errors: ${validation.totalErrors}`);
  lines.push(`Total Warnings: ${validation.totalWarnings}`);
  lines.push(`Status: ${validation.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
  lines.push('');

  if (validation.errors.length > 0) {
    lines.push('-'.repeat(80));
    lines.push('ERRORS (Must be fixed before processing payroll)');
    lines.push('-'.repeat(80));
    validation.errors.forEach((err, idx) => {
      lines.push(`${idx + 1}. [${err.error_code}] ${err.employee_code || 'N/A'} - ${err.employee_name || 'System'}`);
      lines.push(`   ${err.error_message}`);
      if (err.field_name) lines.push(`   Field: ${err.field_name}`);
      lines.push('');
    });
  }

  if (validation.warnings.length > 0) {
    lines.push('-'.repeat(80));
    lines.push('WARNINGS (Should be reviewed)');
    lines.push('-'.repeat(80));
    validation.warnings.forEach((warn, idx) => {
      lines.push(`${idx + 1}. [${warn.error_code}] ${warn.employee_code || 'N/A'} - ${warn.employee_name || 'System'}`);
      lines.push(`   ${warn.error_message}`);
      lines.push('');
    });
  }

  lines.push('='.repeat(80));

  return lines.join('\n');
}
