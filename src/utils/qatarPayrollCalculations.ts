export interface QatarSalaryComponents {
  basicSalary: number;
  housingAllowance: number;
  foodAllowance: number;
  transportAllowance: number;
  mobileAllowance: number;
  utilityAllowance: number;
  otherAllowances: number;
}

export interface OvertimeRecord {
  type: 'weekday' | 'weekend' | 'holiday';
  hours: number;
}

export interface Deductions {
  absenceDeduction: number;
  loanDeduction: number;
  advanceDeduction: number;
  penaltyDeduction: number;
  otherDeductions: number;
}

export function calculateGrossSalary(components: QatarSalaryComponents): number {
  return (
    components.basicSalary +
    components.housingAllowance +
    components.foodAllowance +
    components.transportAllowance +
    components.mobileAllowance +
    components.utilityAllowance +
    components.otherAllowances
  );
}

export function calculateHourlyRate(basicSalary: number, workingDaysPerMonth: number = 26, hoursPerDay: number = 8): number {
  const totalHours = workingDaysPerMonth * hoursPerDay;
  return basicSalary / totalHours;
}

export function calculateOvertime(basicSalary: number, overtimeRecords: OvertimeRecord[]): number {
  const hourlyRate = calculateHourlyRate(basicSalary);

  let totalOvertimeAmount = 0;

  overtimeRecords.forEach(record => {
    let rate = 1.25;
    if (record.type === 'weekend' || record.type === 'holiday') {
      rate = 1.50;
    }

    totalOvertimeAmount += hourlyRate * record.hours * rate;
  });

  return Math.round(totalOvertimeAmount * 100) / 100;
}

export function calculateAbsenceDeduction(basicSalary: number, grossSalary: number, daysAbsent: number, workingDaysPerMonth: number = 26): number {
  const dailyRate = grossSalary / workingDaysPerMonth;
  return Math.round(dailyRate * daysAbsent * 100) / 100;
}

export function calculateTotalDeductions(deductions: Deductions): number {
  return (
    deductions.absenceDeduction +
    deductions.loanDeduction +
    deductions.advanceDeduction +
    deductions.penaltyDeduction +
    deductions.otherDeductions
  );
}

export function calculateNetSalary(grossSalary: number, overtimeAmount: number, totalDeductions: number, bonus: number = 0): number {
  return Math.round((grossSalary + overtimeAmount + bonus - totalDeductions) * 100) / 100;
}

export function calculateEOS(basicSalary: number, yearsOfService: number, resignationType: 'employer' | 'employee' = 'employer'): number {
  if (yearsOfService < 1) return 0;

  let eos = 0;

  if (resignationType === 'employer') {
    eos = (basicSalary * 21 * yearsOfService) / 30;
  } else {
    if (yearsOfService < 2) {
      eos = 0;
    } else if (yearsOfService < 5) {
      const fullYears = Math.floor(yearsOfService);
      eos = (basicSalary * 21 * fullYears) / 30 * (1/3);
    } else if (yearsOfService < 10) {
      const first5Years = (basicSalary * 21 * 5) / 30 * (2/3);
      const remaining = yearsOfService - 5;
      const remainingAmount = (basicSalary * 21 * remaining) / 30;
      eos = first5Years + remainingAmount;
    } else {
      eos = (basicSalary * 21 * yearsOfService) / 30;
    }
  }

  return Math.round(eos * 100) / 100;
}

export function calculateYearsOfService(joiningDate: Date, calculationDate: Date = new Date()): number {
  const diffTime = Math.abs(calculationDate.getTime() - joiningDate.getTime());
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  const years = diffDays / 365.25;
  return Math.round(years * 100) / 100;
}

export interface PayrollCalculationResult {
  grossSalary: number;
  overtimeAmount: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  hourlyRate: number;
}

export function calculateCompletePayroll(
  components: QatarSalaryComponents,
  overtimeRecords: OvertimeRecord[],
  deductions: Deductions,
  bonus: number = 0
): PayrollCalculationResult {
  const grossSalary = calculateGrossSalary(components);
  const overtimeAmount = calculateOvertime(components.basicSalary, overtimeRecords);
  const totalDeductions = calculateTotalDeductions(deductions);
  const totalEarnings = grossSalary + overtimeAmount + bonus;
  const netSalary = calculateNetSalary(grossSalary, overtimeAmount, totalDeductions, bonus);
  const hourlyRate = calculateHourlyRate(components.basicSalary);

  return {
    grossSalary,
    overtimeAmount,
    totalEarnings,
    totalDeductions,
    netSalary,
    hourlyRate
  };
}
