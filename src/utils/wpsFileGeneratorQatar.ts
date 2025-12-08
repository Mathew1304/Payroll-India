interface WPSEmployeeRecord {
  qid: string;
  iban: string;
  basicSalary: number;
  allowances: number;
  overtime: number;
  deductions: number;
  netSalary: number;
  employeeName: string;
}

interface WPSFileData {
  employerId: string;
  month: string;
  employees: WPSEmployeeRecord[];
}

export function generateQatarWPSFile(data: WPSFileData): string {
  const { employerId, month, employees } = data;

  if (!employerId || !month) {
    throw new Error('Employer ID and Month are required for WPS file generation');
  }

  if (employees.length === 0) {
    throw new Error('No employee records found for WPS file generation');
  }

  const lines: string[] = [];

  const totalSalary = employees.reduce((sum, emp) => sum + emp.netSalary, 0);
  const employeeCount = employees.length;

  const formattedMonth = month.replace('-', '');

  lines.push(`HDR,${employerId},${formattedMonth},${employeeCount},${totalSalary.toFixed(2)}`);

  employees.forEach(emp => {
    if (!emp.qid) {
      throw new Error(`Employee ${emp.employeeName} is missing Qatar ID (QID). All employees must have a valid QID for WPS submission.`);
    }

    if (!emp.iban) {
      throw new Error(`Employee ${emp.employeeName} is missing IBAN. All employees must have a valid IBAN for WPS submission.`);
    }

    const basicSalary = emp.basicSalary.toFixed(2);
    const allowances = emp.allowances.toFixed(2);
    const overtime = emp.overtime.toFixed(2);
    const deductions = emp.deductions.toFixed(2);
    const netSalary = emp.netSalary.toFixed(2);

    lines.push(`D,${emp.qid},${emp.iban},${basicSalary},${allowances},${overtime},${deductions},${netSalary}`);
  });

  lines.push(`FTR,${totalSalary.toFixed(2)}`);

  return lines.join('\n');
}

export function downloadWPSFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateWPSData(employees: WPSEmployeeRecord[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  employees.forEach((emp, index) => {
    if (!emp.qid || emp.qid.trim() === '') {
      errors.push(`Row ${index + 1}: Employee "${emp.employeeName}" is missing Qatar ID (QID)`);
    }

    if (!emp.iban || emp.iban.trim() === '') {
      errors.push(`Row ${index + 1}: Employee "${emp.employeeName}" is missing IBAN`);
    } else if (!emp.iban.startsWith('QA')) {
      errors.push(`Row ${index + 1}: Employee "${emp.employeeName}" has invalid IBAN format (must start with QA)`);
    } else if (emp.iban.length !== 29) {
      errors.push(`Row ${index + 1}: Employee "${emp.employeeName}" has invalid IBAN length (must be 29 characters)`);
    }

    if (emp.qid && emp.qid.length !== 11) {
      errors.push(`Row ${index + 1}: Employee "${emp.employeeName}" has invalid QID length (must be 11 digits)`);
    }

    if (emp.netSalary <= 0) {
      errors.push(`Row ${index + 1}: Employee "${emp.employeeName}" has zero or negative net salary`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export function formatWPSMonth(year: number, month: number): string {
  const monthStr = month.toString().padStart(2, '0');
  return `${year}${monthStr}`;
}

export function parseWPSMonth(wpsMonth: string): { year: number; month: number } {
  if (wpsMonth.length !== 6) {
    throw new Error('Invalid WPS month format. Expected YYYYMM');
  }

  const year = parseInt(wpsMonth.substring(0, 4));
  const month = parseInt(wpsMonth.substring(4, 6));

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    throw new Error('Invalid WPS month format');
  }

  return { year, month };
}

export function getWPSFileName(employerId: string, month: string): string {
  return `WPS_${employerId}_${month.replace('-', '')}.txt`;
}

export interface WPSSummary {
  totalEmployees: number;
  totalBasicSalary: number;
  totalAllowances: number;
  totalOvertime: number;
  totalDeductions: number;
  totalNetSalary: number;
  employeesWithMissingQID: number;
  employeesWithMissingIBAN: number;
}

export function getWPSSummary(employees: WPSEmployeeRecord[]): WPSSummary {
  return {
    totalEmployees: employees.length,
    totalBasicSalary: employees.reduce((sum, emp) => sum + emp.basicSalary, 0),
    totalAllowances: employees.reduce((sum, emp) => sum + emp.allowances, 0),
    totalOvertime: employees.reduce((sum, emp) => sum + emp.overtime, 0),
    totalDeductions: employees.reduce((sum, emp) => sum + emp.deductions, 0),
    totalNetSalary: employees.reduce((sum, emp) => sum + emp.netSalary, 0),
    employeesWithMissingQID: employees.filter(emp => !emp.qid).length,
    employeesWithMissingIBAN: employees.filter(emp => !emp.iban).length,
  };
}
