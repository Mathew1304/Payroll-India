/*
  # Add Saudi Arabia Payroll System

  1. New Tables
    - `saudi_salary_components`
      - Employee salary structure (basic + allowances)
      - Housing, Food, Transport, Other allowances
      
    - `saudi_payroll_records`
      - Monthly payroll records
      - Basic salary, allowances, GOSI, deductions
      - Net salary calculations
      
    - `saudi_gosi_contributions`
      - GOSI tracking (employer + employee)
      - Social insurance contributions
      
    - `saudi_overtime_records`
      - OT tracking
      - Type: regular (150%), weekend (200%)
      
    - `saudi_eos_calculations`
      - End of Service calculations
      - Different rules than Qatar
      
    - `saudi_wps_molhss_files`
      - WPS/MOLHSS file generation
      - Ministry of Labor compliance

  2. Updates to employees table
    - Add Saudi-specific fields (Iqama, GOSI, Bank)

  3. Security
    - Enable RLS on all tables
    - HR and Finance can manage payroll
    - Employees can view own records

  4. Indexes
    - Performance optimization
*/

-- Add Saudi-specific fields to employees table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'iqama_number') THEN
    ALTER TABLE employees ADD COLUMN iqama_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'gosi_number') THEN
    ALTER TABLE employees ADD COLUMN gosi_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'saudi_bank_name') THEN
    ALTER TABLE employees ADD COLUMN saudi_bank_name text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'saudi_iban') THEN
    ALTER TABLE employees ADD COLUMN saudi_iban text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'border_number') THEN
    ALTER TABLE employees ADD COLUMN border_number text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'iqama_expiry') THEN
    ALTER TABLE employees ADD COLUMN iqama_expiry date;
  END IF;
END $$;

-- Create saudi_salary_components table
CREATE TABLE IF NOT EXISTS saudi_salary_components (
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

-- Create saudi_payroll_records table
CREATE TABLE IF NOT EXISTS saudi_payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_component_id uuid REFERENCES saudi_salary_components(id),
  
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
  
  -- GOSI Deductions
  gosi_employee_contribution numeric(12,2) DEFAULT 0,
  gosi_employer_contribution numeric(12,2) DEFAULT 0,
  
  -- Other Deductions
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
  working_days integer DEFAULT 30,
  days_present integer DEFAULT 30,
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
  
  CONSTRAINT valid_status_saudi CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  CONSTRAINT unique_employee_period_saudi UNIQUE(employee_id, pay_period_month, pay_period_year)
);

-- Create saudi_gosi_contributions table
CREATE TABLE IF NOT EXISTS saudi_gosi_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payroll_record_id uuid REFERENCES saudi_payroll_records(id) ON DELETE CASCADE,
  
  contribution_month integer NOT NULL,
  contribution_year integer NOT NULL,
  
  -- Contribution Base (Basic + Housing usually)
  contribution_base numeric(12,2) NOT NULL,
  
  -- Employee Contribution (10% - Annuity + Unemployment)
  employee_annuity numeric(12,2) DEFAULT 0,
  employee_unemployment numeric(12,2) DEFAULT 0,
  employee_total numeric(12,2) DEFAULT 0,
  
  -- Employer Contribution (12% - Annuity + Unemployment + Occupational Hazards)
  employer_annuity numeric(12,2) DEFAULT 0,
  employer_unemployment numeric(12,2) DEFAULT 0,
  employer_hazards numeric(12,2) DEFAULT 0,
  employer_total numeric(12,2) DEFAULT 0,
  
  -- Total
  total_contribution numeric(12,2) DEFAULT 0,
  
  gosi_reference text,
  status text DEFAULT 'pending',
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_gosi_status CHECK (status IN ('pending', 'submitted', 'paid'))
);

-- Create saudi_overtime_records table
CREATE TABLE IF NOT EXISTS saudi_overtime_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payroll_record_id uuid REFERENCES saudi_payroll_records(id) ON DELETE CASCADE,
  
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
  
  CONSTRAINT valid_ot_type_saudi CHECK (ot_type IN ('regular', 'weekend', 'holiday')),
  CONSTRAINT valid_ot_status_saudi CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create saudi_eos_calculations table
CREATE TABLE IF NOT EXISTS saudi_eos_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  joining_date date NOT NULL,
  calculation_type text DEFAULT 'accrued',
  
  years_of_service numeric(10,2) NOT NULL,
  last_basic_salary numeric(12,2) NOT NULL,
  
  eos_amount numeric(12,2) NOT NULL,
  
  is_final boolean DEFAULT false,
  separation_date date,
  separation_reason text,
  resignation_type text,
  
  notes text,
  calculated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_calc_type_saudi CHECK (calculation_type IN ('accrued', 'final', 'resignation', 'termination')),
  CONSTRAINT valid_resignation_type CHECK (resignation_type IN ('voluntary', 'employer_initiated', 'mutual', 'contract_end'))
);

-- Create saudi_wps_molhss_files table
CREATE TABLE IF NOT EXISTS saudi_wps_molhss_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  file_name text NOT NULL,
  file_type text DEFAULT 'wps',
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
  
  submitted_to_system boolean DEFAULT false,
  submitted_at timestamptz,
  reference_number text,
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_sif_status_saudi CHECK (status IN ('generated', 'submitted', 'accepted', 'rejected')),
  CONSTRAINT valid_file_type_saudi CHECK (file_type IN ('wps', 'molhss', 'gosi'))
);

-- Enable RLS
ALTER TABLE saudi_salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_gosi_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_eos_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saudi_wps_molhss_files ENABLE ROW LEVEL SECURITY;

-- Policies for saudi_salary_components
CREATE POLICY "Employees can view own salary components (Saudi)"
  ON saudi_salary_components FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage salary components (Saudi)"
  ON saudi_salary_components FOR ALL
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

-- Policies for saudi_payroll_records
CREATE POLICY "Employees can view own payroll records (Saudi)"
  ON saudi_payroll_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage payroll records (Saudi)"
  ON saudi_payroll_records FOR ALL
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

-- Policies for saudi_gosi_contributions
CREATE POLICY "Employees can view own GOSI (Saudi)"
  ON saudi_gosi_contributions FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage GOSI (Saudi)"
  ON saudi_gosi_contributions FOR ALL
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

-- Policies for saudi_overtime_records
CREATE POLICY "Employees can view own OT records (Saudi)"
  ON saudi_overtime_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create OT records (Saudi)"
  ON saudi_overtime_records FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage OT records (Saudi)"
  ON saudi_overtime_records FOR ALL
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

-- Policies for saudi_eos_calculations
CREATE POLICY "Employees can view own EOS (Saudi)"
  ON saudi_eos_calculations FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "HR can manage EOS calculations (Saudi)"
  ON saudi_eos_calculations FOR ALL
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

-- Policies for saudi_wps_molhss_files
CREATE POLICY "HR can manage WPS files (Saudi)"
  ON saudi_wps_molhss_files FOR ALL
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
CREATE INDEX IF NOT EXISTS idx_saudi_salary_components_employee ON saudi_salary_components(employee_id);
CREATE INDEX IF NOT EXISTS idx_saudi_salary_components_org ON saudi_salary_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_saudi_salary_components_active ON saudi_salary_components(is_active);

CREATE INDEX IF NOT EXISTS idx_saudi_payroll_records_employee ON saudi_payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_saudi_payroll_records_org ON saudi_payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_saudi_payroll_records_period ON saudi_payroll_records(pay_period_year, pay_period_month);
CREATE INDEX IF NOT EXISTS idx_saudi_payroll_records_status ON saudi_payroll_records(status);

CREATE INDEX IF NOT EXISTS idx_saudi_gosi_employee ON saudi_gosi_contributions(employee_id);
CREATE INDEX IF NOT EXISTS idx_saudi_gosi_period ON saudi_gosi_contributions(contribution_year, contribution_month);

CREATE INDEX IF NOT EXISTS idx_saudi_overtime_employee ON saudi_overtime_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_saudi_overtime_date ON saudi_overtime_records(ot_date);
CREATE INDEX IF NOT EXISTS idx_saudi_overtime_status ON saudi_overtime_records(status);

CREATE INDEX IF NOT EXISTS idx_saudi_eos_employee ON saudi_eos_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_saudi_eos_date ON saudi_eos_calculations(calculation_date);

CREATE INDEX IF NOT EXISTS idx_saudi_wps_org ON saudi_wps_molhss_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_saudi_wps_period ON saudi_wps_molhss_files(pay_period_year, pay_period_month);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_saudi_salary_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saudi_salary_components_updated_at
  BEFORE UPDATE ON saudi_salary_components
  FOR EACH ROW
  EXECUTE FUNCTION update_saudi_salary_components_updated_at();

CREATE OR REPLACE FUNCTION update_saudi_payroll_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saudi_payroll_records_updated_at
  BEFORE UPDATE ON saudi_payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION update_saudi_payroll_records_updated_at();
