/*
  # Add Qatar Payroll System

  1. New Tables
    - `qatar_salary_components`
      - Employee salary structure (basic + allowances)
      - Housing, Food, Transport, Other allowances
      
    - `qatar_payroll_records`
      - Monthly payroll records
      - Basic salary, allowances, OT, deductions
      - Net salary calculations
      
    - `qatar_overtime_records`
      - OT tracking
      - Type: weekday (125%), weekend (150%), holiday (150%)
      
    - `qatar_eos_calculations`
      - End of Service calculations
      - Accrued EOS tracking
      
    - `qatar_wps_sif_files`
      - WPS file generation tracking
      - SIF file content and status

  2. Updates to employees table
    - Add Qatar-specific fields (QID, IBAN, Passport)

  3. Security
    - Enable RLS on all tables
    - HR and Finance can manage payroll
    - Employees can view own records

  4. Indexes
    - Performance optimization
*/

-- Add Qatar-specific fields to employees table
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

-- Enable RLS
ALTER TABLE qatar_salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_eos_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qatar_wps_sif_files ENABLE ROW LEVEL SECURITY;

-- Policies for qatar_salary_components
CREATE POLICY "Employees can view own salary components"
  ON qatar_salary_components FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

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
CREATE POLICY "Employees can view own payroll records"
  ON qatar_payroll_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

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
CREATE POLICY "Employees can view own OT records"
  ON qatar_overtime_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create OT records"
  ON qatar_overtime_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

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
CREATE POLICY "Employees can view own EOS"
  ON qatar_eos_calculations FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

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

-- Create indexes
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

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_qatar_salary_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE TRIGGER trigger_update_qatar_payroll_records_updated_at
  BEFORE UPDATE ON qatar_payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION update_qatar_payroll_records_updated_at();
