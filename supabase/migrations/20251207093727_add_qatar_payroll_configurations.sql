/*
  # Add Qatar Payroll Configuration Tables
  
  1. New Tables
    - `qatar_payroll_config`
      - Organization-level payroll settings
      - WPS establishment details
      - Default working days and calendar settings
    
    - `qatar_overtime_rules`
      - OT rate configurations (weekday, weekend, holiday)
      - Custom OT rules per organization
    
    - `qatar_monthly_attendance`
      - Monthly attendance summary per employee
      - Working days, present days, absent days
      - Integration point for payroll calculation
    
    - `qatar_employee_loans`
      - Employee loan records
      - Installment tracking
      - Monthly deduction amounts
    
    - `qatar_employee_advances`
      - Salary advance records
      - Recovery tracking
  
  2. Security
    - Enable RLS on all tables
    - Organization members can manage their org data
    - Employees can view own records
*/

-- Qatar Payroll Configuration
CREATE TABLE IF NOT EXISTS qatar_payroll_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  establishment_id text NOT NULL,
  establishment_name text,
  mol_establishment_number text,
  bank_code text,
  bank_account_number text,
  default_working_days_per_month integer DEFAULT 26,
  weekend_days text[] DEFAULT ARRAY['friday']::text[],
  ot_weekday_rate numeric DEFAULT 1.25,
  ot_weekend_rate numeric DEFAULT 1.50,
  ot_holiday_rate numeric DEFAULT 1.50,
  eos_formula text DEFAULT 'qatar_standard',
  auto_calculate_ot boolean DEFAULT false,
  auto_calculate_absence boolean DEFAULT true,
  payroll_approval_required boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id)
);

-- Qatar Overtime Rules
CREATE TABLE IF NOT EXISTS qatar_overtime_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN ('weekday', 'weekend', 'holiday', 'night_shift', 'custom')),
  ot_multiplier numeric NOT NULL DEFAULT 1.25,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Qatar Monthly Attendance Summary
CREATE TABLE IF NOT EXISTS qatar_monthly_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  total_working_days integer NOT NULL,
  days_present integer DEFAULT 0,
  days_absent integer DEFAULT 0,
  days_leave integer DEFAULT 0,
  days_weekend integer DEFAULT 0,
  days_holiday integer DEFAULT 0,
  late_days integer DEFAULT 0,
  half_days integer DEFAULT 0,
  overtime_hours numeric DEFAULT 0,
  is_finalized boolean DEFAULT false,
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, employee_id, month, year)
);

-- Qatar Employee Loans
CREATE TABLE IF NOT EXISTS qatar_employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  loan_number text,
  loan_type text DEFAULT 'personal' CHECK (loan_type IN ('personal', 'housing', 'vehicle', 'emergency', 'other')),
  loan_amount numeric NOT NULL,
  installment_amount numeric NOT NULL,
  total_installments integer NOT NULL,
  paid_installments integer DEFAULT 0,
  remaining_amount numeric,
  start_date date NOT NULL,
  end_date date,
  interest_rate numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Qatar Employee Advances
CREATE TABLE IF NOT EXISTS qatar_employee_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  employee_id uuid NOT NULL REFERENCES employees(id),
  advance_number text,
  advance_amount numeric NOT NULL,
  recovery_amount numeric NOT NULL,
  total_recoveries integer NOT NULL DEFAULT 1,
  paid_recoveries integer DEFAULT 0,
  remaining_amount numeric,
  advance_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE qatar_payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_overtime_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_monthly_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_employee_advances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for qatar_payroll_config
CREATE POLICY "Organization members can manage payroll config"
  ON qatar_payroll_config
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for qatar_overtime_rules
CREATE POLICY "Organization members can manage OT rules"
  ON qatar_overtime_rules
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  );

-- RLS Policies for qatar_monthly_attendance
CREATE POLICY "Organization members can manage attendance"
  ON qatar_monthly_attendance
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own attendance"
  ON qatar_monthly_attendance
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for qatar_employee_loans
CREATE POLICY "Organization members can manage loans"
  ON qatar_employee_loans
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own loans"
  ON qatar_employee_loans
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for qatar_employee_advances
CREATE POLICY "Organization members can manage advances"
  ON qatar_employee_advances
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT e.organization_id 
      FROM employees e
      INNER JOIN user_profiles up ON up.employee_id = e.id
      WHERE up.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own advances"
  ON qatar_employee_advances
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qatar_monthly_attendance_employee_month 
  ON qatar_monthly_attendance(employee_id, month, year);
  
CREATE INDEX IF NOT EXISTS idx_qatar_employee_loans_employee 
  ON qatar_employee_loans(employee_id, status);
  
CREATE INDEX IF NOT EXISTS idx_qatar_employee_advances_employee 
  ON qatar_employee_advances(employee_id, status);
