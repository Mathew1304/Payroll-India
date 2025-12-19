// Indian Payroll Calculation Utilities
// Based on Indian statutory requirements for PF, ESI, Professional Tax, and TDS

export interface IndiaSalaryComponents {
  basicSalary: number;
  dearnessAllowance: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
}

export interface OvertimeRecord {
  type: 'weekday' | 'weekend' | 'holiday';
  hours: number;
}

export interface IndiaDeductions {
  absenceDeduction: number;
  loanDeduction: number;
  advanceDeduction: number;
  penaltyDeduction: number;
  otherDeductions: number;
}

export interface StatutoryDeductions {
  pfEmployee: number;
  esiEmployee: number;
  professionalTax: number;
  tds: number;
  lwf: number;
}

export interface EmployerContributions {
  pfEmployer: number;
  esiEmployer: number;
}

// Calculate Gross Salary (all allowances + basic)
export function calculateGrossSalary(components: IndiaSalaryComponents): number {
  return (
    components.basicSalary +
    components.dearnessAllowance +
    components.houseRentAllowance +
    components.conveyanceAllowance +
    components.medicalAllowance +
    components.specialAllowance +
    components.otherAllowances
  );
}

// Calculate hourly rate for overtime
export function calculateHourlyRate(
  basicSalary: number,
  workingDaysPerMonth: number = 26,
  hoursPerDay: number = 8
): number {
  const totalHours = workingDaysPerMonth * hoursPerDay;
  return basicSalary / totalHours;
}

// Calculate overtime amount
export function calculateOvertime(
  basicSalary: number,
  overtimeRecords: OvertimeRecord[]
): number {
  const hourlyRate = calculateHourlyRate(basicSalary);

  let totalOvertimeAmount = 0;

  overtimeRecords.forEach(record => {
    let rate = 2.0; // Indian law: 2x for overtime
    if (record.type === 'weekend' || record.type === 'holiday') {
      rate = 2.0; // Same rate for weekends/holidays in India
    }

    totalOvertimeAmount += hourlyRate * record.hours * rate;
  });

  return Math.round(totalOvertimeAmount * 100) / 100;
}

// Calculate PF (Provident Fund) - Employee Contribution
// Employee PF: 12% of (Basic + DA), capped at wage ceiling
export function calculatePFEmployee(
  basicSalary: number,
  dearnessAllowance: number,
  isPFApplicable: boolean = true,
  wageCeiling: number = 15000
): number {
  if (!isPFApplicable) return 0;

  const pfWage = Math.min(basicSalary + dearnessAllowance, wageCeiling);
  const pfAmount = pfWage * 0.12;

  return Math.round(pfAmount * 100) / 100;
}

// Calculate PF (Provident Fund) - Employer Contribution
// Employer PF: 12% of (Basic + DA), split into EPF (3.67%) and EPS (8.33%)
export function calculatePFEmployer(
  basicSalary: number,
  dearnessAllowance: number,
  isPFApplicable: boolean = true,
  wageCeiling: number = 15000
): number {
  if (!isPFApplicable) return 0;

  const pfWage = Math.min(basicSalary + dearnessAllowance, wageCeiling);
  const pfAmount = pfWage * 0.12;

  return Math.round(pfAmount * 100) / 100;
}

// Calculate ESI (Employee State Insurance) - Employee Contribution
// Employee ESI: 0.75% of gross salary (if gross <= 21000)
export function calculateESIEmployee(
  grossSalary: number,
  isESIApplicable: boolean = true,
  esiCeiling: number = 21000
): number {
  if (!isESIApplicable || grossSalary > esiCeiling) return 0;

  const esiAmount = grossSalary * 0.0075;
  return Math.round(esiAmount * 100) / 100;
}

// Calculate ESI (Employee State Insurance) - Employer Contribution
// Employer ESI: 3.25% of gross salary (if gross <= 21000)
export function calculateESIEmployer(
  grossSalary: number,
  isESIApplicable: boolean = true,
  esiCeiling: number = 21000
): number {
  if (!isESIApplicable || grossSalary > esiCeiling) return 0;

  const esiAmount = grossSalary * 0.0325;
  return Math.round(esiAmount * 100) / 100;
}

// Calculate Professional Tax (varies by state, using common Karnataka slab)
export function calculateProfessionalTax(grossSalary: number): number {
  const monthlyGross = grossSalary;

  if (monthlyGross <= 15000) {
    return 0;
  } else if (monthlyGross <= 20000) {
    return 150;
  } else {
    return 200;
  }
}

// Calculate LWF (Labour Welfare Fund) - varies by state
export function calculateLWF(grossSalary: number, state: string = 'default'): number {
  // Simplified - typically Rs. 20 per year (Rs. 10 every 6 months)
  // For monthly calculation, we can use a small amount
  return 0; // Usually deducted bi-annually, not monthly
}

// Calculate TDS (Tax Deducted at Source) - simplified
// This is a placeholder - actual TDS calculation is complex and depends on:
// - Annual income, tax regime, deductions (80C, 80D, etc.)
// For now, returning 0 - should be calculated based on Form 16 projections
export function calculateTDS(
  annualIncome: number,
  deductions: number = 0
): number {
  // Simplified TDS calculation (FY 2024-25 new regime)
  const taxableIncome = annualIncome - deductions;

  if (taxableIncome <= 300000) {
    return 0;
  } else if (taxableIncome <= 700000) {
    return (taxableIncome - 300000) * 0.05;
  } else if (taxableIncome <= 1000000) {
    return 20000 + (taxableIncome - 700000) * 0.10;
  } else if (taxableIncome <= 1200000) {
    return 50000 + (taxableIncome - 1000000) * 0.15;
  } else if (taxableIncome <= 1500000) {
    return 80000 + (taxableIncome - 1200000) * 0.20;
  } else {
    return 140000 + (taxableIncome - 1500000) * 0.30;
  }
}

// Calculate monthly TDS from annual TDS
export function calculateMonthlyTDS(
  monthlyGrossSalary: number,
  existingDeductions: number = 0
): number {
  const annualIncome = monthlyGrossSalary * 12;
  const annualTDS = calculateTDS(annualIncome, existingDeductions);
  const monthlyTDS = annualTDS / 12;

  return Math.round(monthlyTDS * 100) / 100;
}

// Calculate absence deduction
export function calculateAbsenceDeduction(
  grossSalary: number,
  daysAbsent: number,
  workingDaysPerMonth: number = 26
): number {
  const dailyRate = grossSalary / workingDaysPerMonth;
  return Math.round(dailyRate * daysAbsent * 100) / 100;
}

// Calculate total statutory deductions
export function calculateTotalStatutoryDeductions(
  statutory: StatutoryDeductions
): number {
  return (
    statutory.pfEmployee +
    statutory.esiEmployee +
    statutory.professionalTax +
    statutory.tds +
    statutory.lwf
  );
}

// Calculate total other deductions
export function calculateTotalDeductions(deductions: IndiaDeductions): number {
  return (
    deductions.absenceDeduction +
    deductions.loanDeduction +
    deductions.advanceDeduction +
    deductions.penaltyDeduction +
    deductions.otherDeductions
  );
}

// Calculate net salary
export function calculateNetSalary(
  grossSalary: number,
  overtimeAmount: number,
  statutoryDeductions: number,
  otherDeductions: number,
  bonus: number = 0,
  incentive: number = 0,
  arrears: number = 0
): number {
  const totalEarnings = grossSalary + overtimeAmount + bonus + incentive + arrears;
  const totalDeductions = statutoryDeductions + otherDeductions;
  return Math.round((totalEarnings - totalDeductions) * 100) / 100;
}

// Calculate CTC (Cost to Company)
export function calculateCTC(
  grossSalary: number,
  pfEmployer: number,
  esiEmployer: number,
  bonus: number = 0
): number {
  // CTC = Gross Salary (annual) + Employer PF + Employer ESI + Bonus
  const annualGross = grossSalary * 12;
  const annualPFEmployer = pfEmployer * 12;
  const annualESIEmployer = esiEmployer * 12;

  return Math.round((annualGross + annualPFEmployer + annualESIEmployer + bonus) * 100) / 100;
}

// Complete payroll calculation result interface
export interface IndiaPayrollCalculationResult {
  grossSalary: number;
  overtimeAmount: number;
  totalEarnings: number;
  statutoryDeductions: StatutoryDeductions;
  otherDeductions: IndiaDeductions;
  totalStatutoryDeductions: number;
  totalOtherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  employerContributions: EmployerContributions;
  ctc: number;
  hourlyRate: number;
}

// Main function to calculate complete payroll
export function calculateCompleteIndiaPayroll(
  components: IndiaSalaryComponents,
  overtimeRecords: OvertimeRecord[],
  deductions: IndiaDeductions,
  isPFApplicable: boolean = true,
  isESIApplicable: boolean = true,
  bonus: number = 0,
  incentive: number = 0,
  arrears: number = 0,
  pfWageCeiling: number = 15000,
  esiCeiling: number = 21000
): IndiaPayrollCalculationResult {
  const grossSalary = calculateGrossSalary(components);
  const overtimeAmount = calculateOvertime(components.basicSalary, overtimeRecords);

  // Calculate statutory deductions
  const pfEmployee = calculatePFEmployee(
    components.basicSalary,
    components.dearnessAllowance,
    isPFApplicable,
    pfWageCeiling
  );
  const esiEmployee = calculateESIEmployee(grossSalary, isESIApplicable, esiCeiling);
  const professionalTax = calculateProfessionalTax(grossSalary);
  const tds = calculateMonthlyTDS(grossSalary);
  const lwf = calculateLWF(grossSalary);

  const statutoryDeductions: StatutoryDeductions = {
    pfEmployee,
    esiEmployee,
    professionalTax,
    tds,
    lwf
  };

  // Calculate employer contributions
  const pfEmployer = calculatePFEmployer(
    components.basicSalary,
    components.dearnessAllowance,
    isPFApplicable,
    pfWageCeiling
  );
  const esiEmployer = calculateESIEmployer(grossSalary, isESIApplicable, esiCeiling);

  const employerContributions: EmployerContributions = {
    pfEmployer,
    esiEmployer
  };

  const totalStatutoryDeductions = calculateTotalStatutoryDeductions(statutoryDeductions);
  const totalOtherDeductions = calculateTotalDeductions(deductions);
  const totalDeductions = totalStatutoryDeductions + totalOtherDeductions;

  const netSalary = calculateNetSalary(
    grossSalary,
    overtimeAmount,
    totalStatutoryDeductions,
    totalOtherDeductions,
    bonus,
    incentive,
    arrears
  );

  const totalEarnings = grossSalary + overtimeAmount + bonus + incentive + arrears;
  const hourlyRate = calculateHourlyRate(components.basicSalary);
  const ctc = calculateCTC(grossSalary, pfEmployer, esiEmployer, bonus * 12);

  return {
    grossSalary,
    overtimeAmount,
    totalEarnings,
    statutoryDeductions,
    otherDeductions: deductions,
    totalStatutoryDeductions,
    totalOtherDeductions,
    totalDeductions,
    netSalary,
    employerContributions,
    ctc,
    hourlyRate
  };
}
