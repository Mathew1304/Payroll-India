-- Qatar Payroll System Schema Correction (Forced Update)
-- This script cleans up the mistakenly created generic tables and restores the correct Qatar-specific schema.

-- 1. CLEANUP: Drop the generic tables created by the mistaken script
DROP TABLE IF EXISTS payroll_audit_log CASCADE;
DROP TABLE IF EXISTS employee_documents CASCADE;
DROP TABLE IF EXISTS bank_file_templates CASCADE;
DROP TABLE IF EXISTS payroll_approval_workflow CASCADE;
DROP TABLE IF EXISTS payroll_settings CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS payroll_validation_logs CASCADE;
DROP TABLE IF EXISTS wps_files CASCADE;
DROP TABLE IF EXISTS employee_deductions CASCADE;
DROP TABLE IF EXISTS deduction_types CASCADE;
DROP TABLE IF EXISTS loan_repayments CASCADE;
DROP TABLE IF EXISTS loans_advances CASCADE;
DROP TABLE IF EXISTS end_of_service_records CASCADE;
DROP TABLE IF EXISTS eos_settings CASCADE;
DROP TABLE IF EXISTS overtime_records CASCADE;
DROP TABLE IF EXISTS overtime_settings CASCADE;
DROP TABLE IF EXISTS payroll_records CASCADE;
DROP TABLE IF EXISTS payroll_cycles CASCADE;
DROP TABLE IF EXISTS employee_salary_structure CASCADE;
DROP TABLE IF EXISTS salary_components_master CASCADE;

-- 2. RESTORE: Re-create Qatar-specific tables (from 20251205084742_add_qatar_payroll_system.sql)

-- Add Qatar-specific fields to employees table (Idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'qatar_id') THEN
    ALTER TABLE employees ADD COLUMN qatar_id text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_number') THEN
    ALTER TABLE employees ADD COLUMN passport_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'nationality') THEN
    ALTER TABLE employees ADD COLUMN nationality text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'iban_number') THEN
    ALTER TABLE employees ADD COLUMN iban_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'contract_type') THEN
    ALTER TABLE employees ADD COLUMN contract_type text DEFAULT 'full_time';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_number') THEN
    ALTER TABLE employees ADD COLUMN visa_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_expiry') THEN
    ALTER TABLE employees ADD COLUMN visa_expiry date;
  END IF;
END $$;

-- Create qatar_salary_components table
CREATE TABLE IF NOT EXISTS qatar_salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  basic_salary numeric(12,2) NOT NULL,
  housing_allowance numeric(12,2) DEFAULT 0,
  food_allowance numeric(12,2) DEFAULT 0,
  transport_allowance numeric(12,2) DEFAULT 0,
  mobile_allowance numeric(12,2) DEFAULT 0,
  utility_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create qatar_payroll_records table
CREATE TABLE IF NOT EXISTS qatar_payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_component_id uuid REFERENCES qatar_salary_components(id),
  
  pay_period_month integer NOT NULL,
  pay_period_year integer NOT NULL,
  
  -- Salary Components
  basic_salary numeric(12,2) NOT NULL,
  housing_allowance numeric(12,2) DEFAULT 0,
  food_allowance numeric(12,2) DEFAULT 0,
  transport_allowance numeric(12,2) DEFAULT 0,
  mobile_allowance numeric(12,2) DEFAULT 0,
  utility_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  
  -- Earnings
  overtime_amount numeric(12,2) DEFAULT 0,
  overtime_hours numeric(5,2) DEFAULT 0,
  bonus numeric(12,2) DEFAULT 0,
  
  -- Deductions
  absence_deduction numeric(12,2) DEFAULT 0,
  loan_deduction numeric(12,2) DEFAULT 0,
  advance_deduction numeric(12,2) DEFAULT 0,
  penalty_deduction numeric(12,2) DEFAULT 0,
  other_deductions numeric(12,2) DEFAULT 0,
  
  -- Calculations
  gross_salary numeric(12,2) NOT NULL,
  total_deductions numeric(12,2) DEFAULT 0,
  net_salary numeric(12,2) NOT NULL,
  
  -- Days
  working_days integer DEFAULT 26,
  days_present integer DEFAULT 26,
  days_absent integer DEFAULT 0,
  days_leave integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft',
  payment_date date,
  payment_method text DEFAULT 'bank_transfer',
  payment_reference text,
  
  -- WPS
  wps_submitted boolean DEFAULT false,
  wps_submitted_at timestamptz,
  wps_file_id uuid,
  
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  CONSTRAINT unique_employee_period UNIQUE(employee_id, pay_period_month, pay_period_year)
);

-- Create qatar_overtime_records table
CREATE TABLE IF NOT EXISTS qatar_overtime_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payroll_record_id uuid REFERENCES qatar_payroll_records(id) ON DELETE CASCADE,
  
  ot_date date NOT NULL,
  ot_type text NOT NULL,
  hours numeric(5,2) NOT NULL,
  hourly_rate numeric(12,2) NOT NULL,
  ot_rate numeric(3,2) NOT NULL,
  ot_amount numeric(12,2) NOT NULL,
  
  description text,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  status text DEFAULT 'pending',
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_ot_type CHECK (ot_type IN ('weekday', 'weekend', 'holiday')),
  CONSTRAINT valid_ot_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create qatar_eos_calculations table
CREATE TABLE IF NOT EXISTS qatar_eos_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  joining_date date NOT NULL,
  calculation_type text DEFAULT 'accrued',
  
  years_of_service numeric(10,2) NOT NULL,
  basic_salary numeric(12,2) NOT NULL,
  
  eos_amount numeric(12,2) NOT NULL,
  
  is_final boolean DEFAULT false,
  separation_date date,
  separation_reason text,
  
  notes text,
  calculated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_calc_type CHECK (calculation_type IN ('accrued', 'final', 'resignation', 'termination'))
);

-- Create qatar_wps_sif_files table
CREATE TABLE IF NOT EXISTS qatar_wps_sif_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  file_name text NOT NULL,
  pay_period_month integer NOT NULL,
  pay_period_year integer NOT NULL,
  
  establishment_id text NOT NULL,
  total_employees integer NOT NULL,
  total_amount numeric(12,2) NOT NULL,
  
  file_content text NOT NULL,
  file_format text DEFAULT 'txt',
  
  status text DEFAULT 'generated',
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz DEFAULT now(),
  
  submitted_to_bank boolean DEFAULT false,
  submitted_at timestamptz,
  bank_reference text,
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_sif_status CHECK (status IN ('generated', 'submitted', 'accepted', 'rejected'))
);

-- 3. RESTORE: Re-create Qatar Configuration tables (from 20251207093727_add_qatar_payroll_configurations.sql)

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

-- 4. ENABLE RLS (If not already enabled)
ALTER TABLE qatar_salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_eos_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_wps_sif_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_overtime_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_monthly_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_employee_advances ENABLE ROW LEVEL SECURITY;

-- 5. RE-APPLY POLICIES (Using DO blocks to avoid errors if they exist)
-- Note: It's safer to drop and recreate policies to ensure they are correct

-- Policies for qatar_salary_components
DROP POLICY IF EXISTS "Employees can view own salary components" ON qatar_salary_components;
CREATE POLICY "Employees can view own salary components"
  ON qatar_salary_components FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "HR can manage salary components" ON qatar_salary_components;
CREATE POLICY "HR can manage salary components"
  ON qatar_salary_components FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for qatar_payroll_records
DROP POLICY IF EXISTS "Employees can view own payroll records" ON qatar_payroll_records;
CREATE POLICY "Employees can view own payroll records"
  ON qatar_payroll_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "HR can manage payroll records" ON qatar_payroll_records;
CREATE POLICY "HR can manage payroll records"
  ON qatar_payroll_records FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for qatar_overtime_records
DROP POLICY IF EXISTS "Employees can view own OT records" ON qatar_overtime_records;
CREATE POLICY "Employees can view own OT records"
  ON qatar_overtime_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees can create OT records" ON qatar_overtime_records;
CREATE POLICY "Employees can create OT records"
  ON qatar_overtime_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "HR can manage OT records" ON qatar_overtime_records;
CREATE POLICY "HR can manage OT records"
  ON qatar_overtime_records FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for qatar_eos_calculations
DROP POLICY IF EXISTS "Employees can view own EOS" ON qatar_eos_calculations;
CREATE POLICY "Employees can view own EOS"
  ON qatar_eos_calculations FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "HR can manage EOS calculations" ON qatar_eos_calculations;
CREATE POLICY "HR can manage EOS calculations"
  ON qatar_eos_calculations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for qatar_wps_sif_files
DROP POLICY IF EXISTS "HR can manage WPS files" ON qatar_wps_sif_files;
CREATE POLICY "HR can manage WPS files"
  ON qatar_wps_sif_files FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for qatar_payroll_config
DROP POLICY IF EXISTS "Organization members can manage payroll config" ON qatar_payroll_config;
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

-- Policies for qatar_overtime_rules
DROP POLICY IF EXISTS "Organization members can manage OT rules" ON qatar_overtime_rules;
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

-- Policies for qatar_monthly_attendance
DROP POLICY IF EXISTS "Organization members can manage attendance" ON qatar_monthly_attendance;
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

DROP POLICY IF EXISTS "Employees can view own attendance" ON qatar_monthly_attendance;
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

-- Policies for qatar_employee_loans
DROP POLICY IF EXISTS "Organization members can manage loans" ON qatar_employee_loans;
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

DROP POLICY IF EXISTS "Employees can view own loans" ON qatar_employee_loans;
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

-- Policies for qatar_employee_advances
DROP POLICY IF EXISTS "Organization members can manage advances" ON qatar_employee_advances;
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

DROP POLICY IF EXISTS "Employees can view own advances" ON qatar_employee_advances;
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

-- 6. RE-CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_qatar_salary_components_employee ON qatar_salary_components(employee_id);
CREATE INDEX IF NOT EXISTS idx_qatar_salary_components_org ON qatar_salary_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_qatar_salary_components_active ON qatar_salary_components(is_active);

CREATE INDEX IF NOT EXISTS idx_qatar_payroll_records_employee ON qatar_payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_qatar_payroll_records_org ON qatar_payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_qatar_payroll_records_period ON qatar_payroll_records(pay_period_year, pay_period_month);
CREATE INDEX IF NOT EXISTS idx_qatar_payroll_records_status ON qatar_payroll_records(status);

CREATE INDEX IF NOT EXISTS idx_qatar_overtime_employee ON qatar_overtime_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_qatar_overtime_date ON qatar_overtime_records(ot_date);
CREATE INDEX IF NOT EXISTS idx_qatar_overtime_status ON qatar_overtime_records(status);

CREATE INDEX IF NOT EXISTS idx_qatar_eos_employee ON qatar_eos_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_qatar_eos_date ON qatar_eos_calculations(calculation_date);

CREATE INDEX IF NOT EXISTS idx_qatar_wps_org ON qatar_wps_sif_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_qatar_wps_period ON qatar_wps_sif_files(pay_period_year, pay_period_month);

CREATE INDEX IF NOT EXISTS idx_qatar_monthly_attendance_employee_month 
  ON qatar_monthly_attendance(employee_id, month, year);
  
CREATE INDEX IF NOT EXISTS idx_qatar_employee_loans_employee 
  ON qatar_employee_loans(employee_id, status);
  
CREATE INDEX IF NOT EXISTS idx_qatar_employee_advances_employee 
  ON qatar_employee_advances(employee_id, status);

-- 7. RE-CREATE TRIGGERS
CREATE OR REPLACE FUNCTION update_qatar_salary_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_qatar_salary_components_updated_at ON qatar_salary_components;
CREATE TRIGGER trigger_update_qatar_salary_components_updated_at
  BEFORE UPDATE ON qatar_salary_components
  FOR EACH ROW
  EXECUTE FUNCTION update_qatar_salary_components_updated_at();

CREATE OR REPLACE FUNCTION update_qatar_payroll_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_qatar_payroll_records_updated_at ON qatar_payroll_records;
CREATE TRIGGER trigger_update_qatar_payroll_records_updated_at
  BEFORE UPDATE ON qatar_payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION update_qatar_payroll_records_updated_at();
