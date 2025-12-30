
export interface SalaryBreakdown {
  basic: number;
  hra: number;
  specialAllowance: number;
  grossSalary: number;
  employeePF: number;
  professionalTax: number;
  totalDeductions: number;
  netSalary: number;
  employerPF: number;
  costToCompany: number; // Monthly CTC
  annualCTC: number; // LPA
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const calculateSalaryFromTakeHome = (takeHome: number): SalaryBreakdown => {
  // Reverse calculation logic (Simplified for estimation)
  // Assumptions:
  // 1. PF is deducted (12% of Basic, capped at 1800 if basic > 15000)
  // 2. PT is standard 200 (vary by state, taking average)
  // 3. Take Home = Gross - PF - PT
  // 4. Gross = Take Home + PF + PT
  
  // Iterative approach to find close match or algebraic estimation
  // Let's use algebraic for standard components
  
  const professionalTax = 200;
  
  // Estimate Gross first (TakeHome + PT + Estimated PF)
  // PF is roughly 1800 for most decent salaries, or 12% of basic.
  // Basic is usually 50% of Gross.
  // So PF ~= 0.12 * 0.5 * Gross = 0.06 * Gross.
  // TakeHome = Gross - 0.06*Gross - 200
  // TakeHome + 200 = 0.94 * Gross
  // Gross = (TakeHome + 200) / 0.94
  
  let grossSalary = Math.round((takeHome + professionalTax) / 0.94);
  
  // Recalculate components to be precise
  const basic = Math.round(grossSalary * 0.5);
  
  // Calculate PF
  const pfWage = basic > 15000 ? 15000 : basic;
  const employeePF = Math.round(pfWage * 0.12);
  
  // Re-adjust Gross to match Take Home exactly if possible
  // Take Home = Gross - PF - PT
  // Gross = Take Home + PF + PT
  grossSalary = takeHome + employeePF + professionalTax;
  
  // Recalculate components with precise Gross
  // We keep Basic fixed as 50% of this new Gross to start, or fixed from previous estimate?
  // Let's keep Basic as 50% of Gross.
  const finalBasic = Math.round(grossSalary * 0.5);
  const finalHRA = Math.round(finalBasic * 0.5);
  
  // Difference goes to Special Allowance
  const specialAllowance = grossSalary - finalBasic - finalHRA;
  
  // Recalculate Deductions
  const finalPFWage = finalBasic > 15000 ? 15000 : finalBasic;
  const finalEmployeePF = Math.round(finalPFWage * 0.12);
  const totalDeductions = finalEmployeePF + professionalTax;
  const netSalary = grossSalary - totalDeductions;
  
  // Employer Contributions
  const employerPF = finalEmployeePF; // Simplified matching
  
  // CTC
  const costToCompany = grossSalary + employerPF;
  const annualCTC = costToCompany * 12;

  return {
    basic: finalBasic,
    hra: finalHRA,
    specialAllowance: specialAllowance > 0 ? specialAllowance : 0,
    grossSalary,
    employeePF: finalEmployeePF,
    professionalTax,
    totalDeductions,
    netSalary, // Should be equal to takeHome
    employerPF,
    costToCompany,
    annualCTC
  };
};
