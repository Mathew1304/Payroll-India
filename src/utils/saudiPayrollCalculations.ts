export interface SaudiSalaryComponents {
  basicSalary: number;
  housingAllowance: number;
  foodAllowance: number;
  transportAllowance: number;
  mobileAllowance: number;
  utilityAllowance: number;
  otherAllowances: number;
}

export interface GOSIContribution {
  contributionBase: number;
  employeeAnnuity: number;
  employeeUnemployment: number;
  employeeTotal: number;
  employerAnnuity: number;
  employerUnemployment: number;
  employerHazards: number;
  employerTotal: number;
  totalContribution: number;
}

export interface SaudiOvertimeRecord {
  type: 'regular' | 'weekend' | 'holiday';
  hours: number;
}

export interface SaudiDeductions {
  gosiEmployeeContribution: number;
  absenceDeduction: number;
  loanDeduction: number;
  advanceDeduction: number;
  penaltyDeduction: number;
  otherDeductions: number;
}

export function calculateGrossSalary(components: SaudiSalaryComponents): number {
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

export function calculateGOSIBase(basicSalary: number, housingAllowance: number, maxBase: number = 45000): number {
  const base = basicSalary + housingAllowance;
  return Math.min(base, maxBase);
}

export function calculateGOSIContributions(
  basicSalary: number,
  housingAllowance: number,
  nationality: 'saudi' | 'non-saudi' = 'non-saudi'
): GOSIContribution {
  const contributionBase = calculateGOSIBase(basicSalary, housingAllowance);

  let employeeAnnuity = 0;
  let employeeUnemployment = 0;
  let employerAnnuity = 0;
  let employerUnemployment = 0;
  let employerHazards = 0;

  if (nationality === 'saudi') {
    employeeAnnuity = Math.round(contributionBase * 0.09 * 100) / 100;
    employeeUnemployment = Math.round(contributionBase * 0.01 * 100) / 100;

    employerAnnuity = Math.round(contributionBase * 0.09 * 100) / 100;
    employerUnemployment = Math.round(contributionBase * 0.01 * 100) / 100;
    employerHazards = Math.round(contributionBase * 0.02 * 100) / 100;
  } else {
    employeeAnnuity = 0;
    employeeUnemployment = 0;

    employerHazards = Math.round(contributionBase * 0.02 * 100) / 100;
  }

  const employeeTotal = employeeAnnuity + employeeUnemployment;
  const employerTotal = employerAnnuity + employerUnemployment + employerHazards;
  const totalContribution = employeeTotal + employerTotal;

  return {
    contributionBase,
    employeeAnnuity,
    employeeUnemployment,
    employeeTotal,
    employerAnnuity,
    employerUnemployment,
    employerHazards,
    employerTotal,
    totalContribution
  };
}

export function calculateHourlyRate(
  basicSalary: number,
  workingDaysPerMonth: number = 30,
  hoursPerDay: number = 8
): number {
  const totalHours = workingDaysPerMonth * hoursPerDay;
  return basicSalary / totalHours;
}

export function calculateOvertime(basicSalary: number, overtimeRecords: SaudiOvertimeRecord[]): number {
  const hourlyRate = calculateHourlyRate(basicSalary);

  let totalOvertimeAmount = 0;

  overtimeRecords.forEach(record => {
    let rate = 1.50;
    if (record.type === 'weekend') {
      rate = 2.00;
    } else if (record.type === 'holiday') {
      rate = 1.50;
    }

    totalOvertimeAmount += hourlyRate * record.hours * rate;
  });

  return Math.round(totalOvertimeAmount * 100) / 100;
}

export function calculateAbsenceDeduction(
  grossSalary: number,
  daysAbsent: number,
  workingDaysPerMonth: number = 30
): number {
  const dailyRate = grossSalary / workingDaysPerMonth;
  return Math.round(dailyRate * daysAbsent * 100) / 100;
}

export function calculateTotalDeductions(deductions: SaudiDeductions): number {
  return (
    deductions.gosiEmployeeContribution +
    deductions.absenceDeduction +
    deductions.loanDeduction +
    deductions.advanceDeduction +
    deductions.penaltyDeduction +
    deductions.otherDeductions
  );
}

export function calculateNetSalary(
  grossSalary: number,
  overtimeAmount: number,
  totalDeductions: number,
  bonus: number = 0
): number {
  return Math.round((grossSalary + overtimeAmount + bonus - totalDeductions) * 100) / 100;
}

export function calculateSaudiEOS(
  basicSalary: number,
  yearsOfService: number,
  resignationType: 'voluntary' | 'employer_initiated' | 'mutual' | 'contract_end' = 'employer_initiated'
): number {
  if (yearsOfService < 1) return 0;

  let eos = 0;

  if (resignationType === 'employer_initiated' || resignationType === 'contract_end') {
    if (yearsOfService <= 5) {
      eos = (basicSalary / 2) * yearsOfService;
    } else {
      const first5Years = (basicSalary / 2) * 5;
      const remainingYears = yearsOfService - 5;
      const remainingAmount = basicSalary * remainingYears;
      eos = first5Years + remainingAmount;
    }
  } else if (resignationType === 'voluntary') {
    if (yearsOfService < 2) {
      eos = 0;
    } else if (yearsOfService < 5) {
      eos = ((basicSalary / 2) * yearsOfService) * (1/3);
    } else if (yearsOfService < 10) {
      eos = ((basicSalary / 2) * yearsOfService) * (2/3);
    } else {
      if (yearsOfService <= 5) {
        eos = (basicSalary / 2) * yearsOfService;
      } else {
        const first5Years = (basicSalary / 2) * 5;
        const remainingYears = yearsOfService - 5;
        const remainingAmount = basicSalary * remainingYears;
        eos = first5Years + remainingAmount;
      }
    }
  } else if (resignationType === 'mutual') {
    if (yearsOfService <= 5) {
      eos = (basicSalary / 2) * yearsOfService;
    } else {
      const first5Years = (basicSalary / 2) * 5;
      const remainingYears = yearsOfService - 5;
      const remainingAmount = basicSalary * remainingYears;
      eos = first5Years + remainingAmount;
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

export interface SaudiPayrollCalculationResult {
  grossSalary: number;
  overtimeAmount: number;
  gosiContribution: GOSIContribution;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  hourlyRate: number;
  employerCost: number;
}

export function calculateCompletePayroll(
  components: SaudiSalaryComponents,
  overtimeRecords: SaudiOvertimeRecord[],
  deductions: Omit<SaudiDeductions, 'gosiEmployeeContribution'>,
  nationality: 'saudi' | 'non-saudi' = 'non-saudi',
  bonus: number = 0
): SaudiPayrollCalculationResult {
  const grossSalary = calculateGrossSalary(components);
  const overtimeAmount = calculateOvertime(components.basicSalary, overtimeRecords);
  const gosiContribution = calculateGOSIContributions(
    components.basicSalary,
    components.housingAllowance,
    nationality
  );

  const allDeductions: SaudiDeductions = {
    ...deductions,
    gosiEmployeeContribution: gosiContribution.employeeTotal
  };

  const totalDeductions = calculateTotalDeductions(allDeductions);
  const totalEarnings = grossSalary + overtimeAmount + bonus;
  const netSalary = calculateNetSalary(grossSalary, overtimeAmount, totalDeductions, bonus);
  const hourlyRate = calculateHourlyRate(components.basicSalary);
  const employerCost = grossSalary + overtimeAmount + bonus + gosiContribution.employerTotal;

  return {
    grossSalary,
    overtimeAmount,
    gosiContribution,
    totalEarnings,
    totalDeductions,
    netSalary,
    hourlyRate,
    employerCost
  };
}
