export interface QatarWPSEmployee {
  employeeQID: string;
  employeeName: string;
  iban: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  bankCode?: string;
}

export interface QatarWPSFileData {
  establishmentId: string;
  establishmentName: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  employees: QatarWPSEmployee[];
}

export function generateQatarWPSSIFFile(data: QatarWPSFileData): string {
  const lines: string[] = [];

  const monthStr = data.payPeriodMonth.toString().padStart(2, '0');
  const yearStr = data.payPeriodYear.toString();
  const totalEmployees = data.employees.length;
  const totalAmount = data.employees.reduce((sum, emp) => sum + emp.netSalary, 0);

  lines.push(`H|${data.establishmentId}|${data.establishmentName}|${monthStr}${yearStr}|${totalEmployees}|${totalAmount.toFixed(2)}`);

  data.employees.forEach((emp, index) => {
    const recordNumber = (index + 1).toString().padStart(6, '0');
    const qid = emp.employeeQID.padEnd(11, ' ');
    const name = emp.employeeName.substring(0, 50).padEnd(50, ' ');
    const iban = emp.iban.padEnd(30, ' ');
    const basic = emp.basicSalary.toFixed(2).padStart(12, '0');
    const allowances = emp.allowances.toFixed(2).padStart(12, '0');
    const deductions = emp.deductions.toFixed(2).padStart(12, '0');
    const netSalary = emp.netSalary.toFixed(2).padStart(12, '0');
    const bankCode = (emp.bankCode || '000').padStart(3, '0');

    lines.push(`D|${recordNumber}|${qid}|${name}|${iban}|${bankCode}|${basic}|${allowances}|${deductions}|${netSalary}`);
  });

  lines.push(`T|${totalEmployees}|${totalAmount.toFixed(2)}`);

  return lines.join('\n');
}

export function generateQatarWPSCSVFile(data: QatarWPSFileData): string {
  const headers = [
    'Record No',
    'QID',
    'Employee Name',
    'IBAN',
    'Bank Code',
    'Basic Salary',
    'Allowances',
    'Deductions',
    'Net Salary',
    'Month',
    'Year'
  ];

  const rows: string[][] = [];
  rows.push(headers);

  data.employees.forEach((emp, index) => {
    rows.push([
      (index + 1).toString(),
      emp.employeeQID,
      emp.employeeName,
      emp.iban,
      emp.bankCode || '',
      emp.basicSalary.toFixed(2),
      emp.allowances.toFixed(2),
      emp.deductions.toFixed(2),
      emp.netSalary.toFixed(2),
      data.payPeriodMonth.toString(),
      data.payPeriodYear.toString()
    ]);
  });

  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

export interface SaudiWPSEmployee {
  iqamaNumber: string;
  employeeName: string;
  borderNumber: string;
  iban: string;
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  deductions: number;
  netSalary: number;
  bankCode?: string;
}

export interface SaudiWPSFileData {
  establishmentId: string;
  establishmentName: string;
  payPeriodMonth: number;
  payPeriodYear: number;
  employees: SaudiWPSEmployee[];
}

export function generateSaudiWPSSIFFile(data: SaudiWPSFileData): string {
  const lines: string[] = [];

  const monthStr = data.payPeriodMonth.toString().padStart(2, '0');
  const yearStr = data.payPeriodYear.toString();
  const totalEmployees = data.employees.length;
  const totalAmount = data.employees.reduce((sum, emp) => sum + emp.netSalary, 0);

  lines.push(`SCH|${data.establishmentId}|${monthStr}${yearStr}|${totalEmployees}|${totalAmount.toFixed(2)}`);

  data.employees.forEach((emp, index) => {
    const recordNumber = (index + 1).toString().padStart(6, '0');
    const iqama = emp.iqamaNumber.padEnd(10, ' ');
    const borderNum = emp.borderNumber.padEnd(10, ' ');
    const name = emp.employeeName.substring(0, 60).padEnd(60, ' ');
    const iban = emp.iban.padEnd(24, ' ');
    const basic = emp.basicSalary.toFixed(2).padStart(12, '0');
    const housing = emp.housingAllowance.toFixed(2).padStart(12, '0');
    const other = emp.otherAllowances.toFixed(2).padStart(12, '0');
    const deductions = emp.deductions.toFixed(2).padStart(12, '0');
    const netSalary = emp.netSalary.toFixed(2).padStart(12, '0');

    lines.push(`EMP|${recordNumber}|${iqama}|${borderNum}|${name}|${iban}|${basic}|${housing}|${other}|${deductions}|${netSalary}`);
  });

  lines.push(`TRL|${totalEmployees}|${totalAmount.toFixed(2)}`);

  return lines.join('\n');
}

export function generateSaudiMOLHSSFile(data: SaudiWPSFileData): string {
  const lines: string[] = [];

  const monthStr = data.payPeriodMonth.toString().padStart(2, '0');
  const yearStr = data.payPeriodYear.toString();

  lines.push(`MOLHSS Wage File`);
  lines.push(`Establishment ID: ${data.establishmentId}`);
  lines.push(`Period: ${monthStr}/${yearStr}`);
  lines.push(`Total Employees: ${data.employees.length}`);
  lines.push('');
  lines.push('Iqama Number,Border Number,Employee Name,Basic Salary,Housing,Other Allowances,Total Salary,Deductions,Net Salary');

  data.employees.forEach(emp => {
    const totalSalary = emp.basicSalary + emp.housingAllowance + emp.otherAllowances;
    lines.push([
      emp.iqamaNumber,
      emp.borderNumber,
      emp.employeeName,
      emp.basicSalary.toFixed(2),
      emp.housingAllowance.toFixed(2),
      emp.otherAllowances.toFixed(2),
      totalSalary.toFixed(2),
      emp.deductions.toFixed(2),
      emp.netSalary.toFixed(2)
    ].join(','));
  });

  return lines.join('\n');
}

export function generateSaudiGOSIFile(
  establishmentId: string,
  month: number,
  year: number,
  gosiData: Array<{
    iqamaNumber: string;
    gosiNumber: string;
    employeeName: string;
    nationality: string;
    contributionBase: number;
    employeeContribution: number;
    employerContribution: number;
  }>
): string {
  const lines: string[] = [];

  lines.push(`GOSI Monthly Contribution File`);
  lines.push(`Establishment: ${establishmentId}`);
  lines.push(`Period: ${month.toString().padStart(2, '0')}/${year}`);
  lines.push('');
  lines.push('GOSI Number,Iqama Number,Employee Name,Nationality,Contribution Base,Employee Share,Employer Share,Total');

  gosiData.forEach(record => {
    const total = record.employeeContribution + record.employerContribution;
    lines.push([
      record.gosiNumber,
      record.iqamaNumber,
      record.employeeName,
      record.nationality,
      record.contributionBase.toFixed(2),
      record.employeeContribution.toFixed(2),
      record.employerContribution.toFixed(2),
      total.toFixed(2)
    ].join(','));
  });

  const totalBase = gosiData.reduce((sum, r) => sum + r.contributionBase, 0);
  const totalEmployee = gosiData.reduce((sum, r) => sum + r.employeeContribution, 0);
  const totalEmployer = gosiData.reduce((sum, r) => sum + r.employerContribution, 0);
  const grandTotal = totalEmployee + totalEmployer;

  lines.push('');
  lines.push(`Total,,,,${totalBase.toFixed(2)},${totalEmployee.toFixed(2)},${totalEmployer.toFixed(2)},${grandTotal.toFixed(2)}`);

  return lines.join('\n');
}

export function downloadTextFile(content: string, filename: string): void {
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

export function downloadCSVFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
