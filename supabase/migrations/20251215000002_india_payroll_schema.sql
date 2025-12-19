-- ============================================================
-- INDIA PAYROLL SYSTEM - Complete Schema with RLS Policies
-- Compliant with: PF Act 1952, ESI Act 1948, Income Tax Act 1961
-- Payment of Gratuity Act 1972, Payment of Wages Act 1936
-- ============================================================

-- ============================================================
-- PART 1: CREATE INDIA SALARY COMPONENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Salary Components
  basic_salary numeric(12,2) NOT NULL,
  dearness_allowance numeric(12,2) DEFAULT 0,          -- DA
  house_rent_allowance numeric(12,2) DEFAULT 0,        -- HRA
  conveyance_allowance numeric(12,2) DEFAULT 0,
  medical_allowance numeric(12,2) DEFAULT 0,
  special_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  
  -- Employer PF Contribution Settings
  is_pf_applicable boolean DEFAULT true,
  pf_contribution_type text DEFAULT 'statutory',       -- statutory / voluntary / opted_out
  pf_wage_ceiling numeric(12,2) DEFAULT 15000,         -- Current PF wage ceiling
  
  -- ESI Settings
  is_esi_applicable boolean DEFAULT true,              -- Auto-calculated based on gross
  
  -- Effective Dates
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 2: CREATE INDIA PAYROLL RECORDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_component_id uuid REFERENCES india_salary_components(id),
  
  -- Pay Period
  pay_period_month integer NOT NULL,
  pay_period_year integer NOT NULL,
  
  -- Earnings - Salary Components
  basic_salary numeric(12,2) NOT NULL,
  dearness_allowance numeric(12,2) DEFAULT 0,
  house_rent_allowance numeric(12,2) DEFAULT 0,
  conveyance_allowance numeric(12,2) DEFAULT 0,
  medical_allowance numeric(12,2) DEFAULT 0,
  special_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  
  -- Additional Earnings
  overtime_hours numeric(5,2) DEFAULT 0,
  overtime_amount numeric(12,2) DEFAULT 0,
  bonus numeric(12,2) DEFAULT 0,
  incentive numeric(12,2) DEFAULT 0,
  arrears numeric(12,2) DEFAULT 0,
  
  -- Statutory Deductions (Employee Share)
  pf_employee numeric(12,2) DEFAULT 0,                 -- 12% of Basic + DA
  esi_employee numeric(12,2) DEFAULT 0,                -- 0.75% if gross <= 21000
  professional_tax numeric(12,2) DEFAULT 0,            -- State-wise
  tds numeric(12,2) DEFAULT 0,                         -- Income Tax TDS
  lwf numeric(12,2) DEFAULT 0,                         -- Labour Welfare Fund
  
  -- Employer Contributions (for CTC & Compliance)
  pf_employer numeric(12,2) DEFAULT 0,                 -- 12% of Basic + DA
  esi_employer numeric(12,2) DEFAULT 0,                -- 3.25% if gross <= 21000
  
  -- Other Deductions
  absence_deduction numeric(12,2) DEFAULT 0,
  loan_deduction numeric(12,2) DEFAULT 0,
  advance_deduction numeric(12,2) DEFAULT 0,
  penalty_deduction numeric(12,2) DEFAULT 0,
  other_deductions numeric(12,2) DEFAULT 0,
  
  -- Calculated Totals
  gross_salary numeric(12,2) NOT NULL,
  total_statutory_deductions numeric(12,2) DEFAULT 0,
  total_deductions numeric(12,2) DEFAULT 0,
  net_salary numeric(12,2) NOT NULL,
  ctc numeric(12,2) DEFAULT 0,                         -- Cost to Company
  
  -- Days
  working_days integer DEFAULT 26,
  days_present integer DEFAULT 26,
  days_absent integer DEFAULT 0,
  days_leave integer DEFAULT 0,
  loss_of_pay_days integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft',
  payment_status text DEFAULT 'pending',
  payment_date date,
  payment_method text DEFAULT 'bank_transfer',
  bank_reference_number text,
  
  -- Audit
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_india_status CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  CONSTRAINT valid_india_payment_status CHECK (payment_status IN ('pending', 'processing', 'paid', 'confirmed', 'failed')),
  CONSTRAINT unique_india_employee_period UNIQUE(employee_id, pay_period_month, pay_period_year)
);

-- ============================================================
-- PART 3: CREATE INDIA PAYROLL CONFIG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_payroll_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Company Registration Numbers
  pf_establishment_code text,                          -- EPFO Establishment Code
  esi_establishment_code text,                         -- ESIC Code
  tan_number text,                                     -- TAN for TDS
  company_pan text,                                    -- Company PAN
  
  -- Bank Details for Salary Disbursement
  company_bank_account text,
  company_bank_ifsc text,
  company_bank_name text,
  
  -- Default Settings
  default_working_days_per_month integer DEFAULT 26,
  weekend_days text[] DEFAULT ARRAY['sunday']::text[],
  
  -- PF Settings
  pf_employee_rate numeric(5,4) DEFAULT 0.12,          -- 12%
  pf_employer_rate numeric(5,4) DEFAULT 0.12,          -- 12%
  pf_wage_ceiling numeric(12,2) DEFAULT 15000,
  eps_rate numeric(5,4) DEFAULT 0.0833,                -- 8.33% to EPS from employer
  
  -- ESI Settings
  esi_employee_rate numeric(5,4) DEFAULT 0.0075,       -- 0.75%
  esi_employer_rate numeric(5,4) DEFAULT 0.0325,       -- 3.25%
  esi_wage_ceiling numeric(12,2) DEFAULT 21000,
  
  -- Professional Tax (Default Maharashtra)
  pt_state text DEFAULT 'Maharashtra',
  pt_slab_1_limit numeric(12,2) DEFAULT 7500,
  pt_slab_1_tax numeric(12,2) DEFAULT 0,
  pt_slab_2_limit numeric(12,2) DEFAULT 10000,
  pt_slab_2_tax numeric(12,2) DEFAULT 175,
  pt_above_slab_2_tax numeric(12,2) DEFAULT 200,
  
  -- Overtime Settings
  ot_rate_multiplier numeric(3,2) DEFAULT 2.00,        -- 2x as per Factories Act
  
  -- Gratuity Settings
  gratuity_eligibility_years integer DEFAULT 5,
  gratuity_max_amount numeric(12,2) DEFAULT 2000000,   -- ₹20 Lakh max
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- ============================================================
-- PART 4: CREATE INDIA MONTHLY ATTENDANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_monthly_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  
  total_working_days integer NOT NULL DEFAULT 26,
  days_present integer DEFAULT 0,
  days_absent integer DEFAULT 0,
  days_leave integer DEFAULT 0,
  days_weekend integer DEFAULT 0,
  days_holiday integer DEFAULT 0,
  late_days integer DEFAULT 0,
  half_days integer DEFAULT 0,
  overtime_hours numeric(6,2) DEFAULT 0,
  loss_of_pay_days integer DEFAULT 0,
  
  is_finalized boolean DEFAULT false,
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, employee_id, month, year)
);

-- ============================================================
-- PART 5: CREATE INDIA EMPLOYEE LOANS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  loan_number text,
  loan_type text DEFAULT 'personal' CHECK (loan_type IN ('personal', 'housing', 'vehicle', 'emergency', 'festival', 'other')),
  loan_amount numeric(12,2) NOT NULL,
  installment_amount numeric(12,2) NOT NULL,
  total_installments integer NOT NULL,
  paid_installments integer DEFAULT 0,
  remaining_amount numeric(12,2),
  start_date date NOT NULL,
  end_date date,
  interest_rate numeric(5,2) DEFAULT 0,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled', 'rejected')),
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 6: CREATE INDIA EMPLOYEE ADVANCES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_employee_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  advance_number text,
  advance_amount numeric(12,2) NOT NULL,
  recovery_amount numeric(12,2) NOT NULL,
  total_recoveries integer NOT NULL DEFAULT 1,
  paid_recoveries integer DEFAULT 0,
  remaining_amount numeric(12,2),
  advance_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 7: CREATE INDIA GRATUITY CALCULATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_gratuity_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  joining_date date NOT NULL,
  
  years_of_service numeric(10,2) NOT NULL,
  last_drawn_basic numeric(12,2) NOT NULL,
  last_drawn_da numeric(12,2) DEFAULT 0,
  
  -- Gratuity = (Basic + DA) × 15 × Years / 26
  gratuity_amount numeric(12,2) NOT NULL,
  
  calculation_type text DEFAULT 'estimate' CHECK (calculation_type IN ('estimate', 'final', 'resignation', 'retirement', 'termination', 'death')),
  
  is_eligible boolean DEFAULT true,
  is_final boolean DEFAULT false,
  separation_date date,
  separation_reason text,
  
  notes text,
  calculated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 8: CREATE INDIA BANK TRANSFER FILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_bank_transfer_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  file_name text NOT NULL,
  pay_period_month integer NOT NULL,
  pay_period_year integer NOT NULL,
  
  total_employees integer NOT NULL,
  total_amount numeric(14,2) NOT NULL,
  
  file_content text NOT NULL,
  file_format text DEFAULT 'csv' CHECK (file_format IN ('csv', 'txt', 'xlsx')),
  
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'uploaded', 'processed', 'failed')),
  
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz DEFAULT now(),
  
  utr_reference text,
  processed_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 9: CREATE INDIA TDS DECLARATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_tds_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  financial_year text NOT NULL,                        -- e.g., '2024-25'
  tax_regime text DEFAULT 'new' CHECK (tax_regime IN ('old', 'new')),
  
  -- Section 80C Deductions
  life_insurance numeric(12,2) DEFAULT 0,
  ppf numeric(12,2) DEFAULT 0,
  elss numeric(12,2) DEFAULT 0,
  nsc numeric(12,2) DEFAULT 0,
  housing_loan_principal numeric(12,2) DEFAULT 0,
  tuition_fees numeric(12,2) DEFAULT 0,
  sukanya_samriddhi numeric(12,2) DEFAULT 0,
  
  -- Section 80D - Health Insurance
  health_insurance_self numeric(12,2) DEFAULT 0,
  health_insurance_parents numeric(12,2) DEFAULT 0,
  preventive_checkup numeric(12,2) DEFAULT 0,
  
  -- Section 24 - Housing Loan Interest
  housing_loan_interest numeric(12,2) DEFAULT 0,
  
  -- HRA Exemption
  actual_rent_paid numeric(12,2) DEFAULT 0,
  city_type text DEFAULT 'non_metro' CHECK (city_type IN ('metro', 'non_metro')),
  
  -- Other Deductions
  section_80e_education_loan numeric(12,2) DEFAULT 0,
  section_80g_donations numeric(12,2) DEFAULT 0,
  section_80tta_savings_interest numeric(12,2) DEFAULT 0,
  nps_80ccd_1b numeric(12,2) DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified', 'approved')),
  
  submitted_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, financial_year)
);

-- ============================================================
-- PART 10: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE india_salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_payroll_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_monthly_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_employee_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_gratuity_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_bank_transfer_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE india_tds_declarations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 11: RLS POLICIES FOR india_salary_components
-- ============================================================

DROP POLICY IF EXISTS "india_salary_employees_view_own" ON india_salary_components;
CREATE POLICY "india_salary_employees_view_own"
  ON india_salary_components FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_salary_admins_manage" ON india_salary_components;
CREATE POLICY "india_salary_admins_manage"
  ON india_salary_components FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- ============================================================
-- PART 12: RLS POLICIES FOR india_payroll_records
-- ============================================================

DROP POLICY IF EXISTS "india_payroll_employees_view_own" ON india_payroll_records;
CREATE POLICY "india_payroll_employees_view_own"
  ON india_payroll_records FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_payroll_admins_manage" ON india_payroll_records;
CREATE POLICY "india_payroll_admins_manage"
  ON india_payroll_records FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'hr_manager')
    )
  );

-- ============================================================
-- PART 13: RLS POLICIES FOR india_payroll_config
-- ============================================================

DROP POLICY IF EXISTS "india_config_org_members_manage" ON india_payroll_config;
CREATE POLICY "india_config_org_members_manage"
  ON india_payroll_config FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 14: RLS POLICIES FOR india_monthly_attendance
-- ============================================================

DROP POLICY IF EXISTS "india_attendance_employees_view_own" ON india_monthly_attendance;
CREATE POLICY "india_attendance_employees_view_own"
  ON india_monthly_attendance FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_attendance_admins_manage" ON india_monthly_attendance;
CREATE POLICY "india_attendance_admins_manage"
  ON india_monthly_attendance FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 15: RLS POLICIES FOR india_employee_loans
-- ============================================================

DROP POLICY IF EXISTS "india_loans_employees_view_own" ON india_employee_loans;
CREATE POLICY "india_loans_employees_view_own"
  ON india_employee_loans FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_loans_admins_manage" ON india_employee_loans;
CREATE POLICY "india_loans_admins_manage"
  ON india_employee_loans FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 16: RLS POLICIES FOR india_employee_advances
-- ============================================================

DROP POLICY IF EXISTS "india_advances_employees_view_own" ON india_employee_advances;
CREATE POLICY "india_advances_employees_view_own"
  ON india_employee_advances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_advances_admins_manage" ON india_employee_advances;
CREATE POLICY "india_advances_admins_manage"
  ON india_employee_advances FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 17: RLS POLICIES FOR india_gratuity_calculations
-- ============================================================

DROP POLICY IF EXISTS "india_gratuity_employees_view_own" ON india_gratuity_calculations;
CREATE POLICY "india_gratuity_employees_view_own"
  ON india_gratuity_calculations FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_gratuity_admins_manage" ON india_gratuity_calculations;
CREATE POLICY "india_gratuity_admins_manage"
  ON india_gratuity_calculations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 18: RLS POLICIES FOR india_bank_transfer_files
-- ============================================================

DROP POLICY IF EXISTS "india_bank_files_admins_manage" ON india_bank_transfer_files;
CREATE POLICY "india_bank_files_admins_manage"
  ON india_bank_transfer_files FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 19: RLS POLICIES FOR india_tds_declarations
-- ============================================================

DROP POLICY IF EXISTS "india_tds_employees_manage_own" ON india_tds_declarations;
CREATE POLICY "india_tds_employees_manage_own"
  ON india_tds_declarations FOR ALL
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "india_tds_admins_manage" ON india_tds_declarations;
CREATE POLICY "india_tds_admins_manage"
  ON india_tds_declarations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- PART 20: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_india_salary_employee ON india_salary_components(employee_id);
CREATE INDEX IF NOT EXISTS idx_india_salary_org ON india_salary_components(organization_id);
CREATE INDEX IF NOT EXISTS idx_india_salary_active ON india_salary_components(is_active);

CREATE INDEX IF NOT EXISTS idx_india_payroll_employee ON india_payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_india_payroll_org ON india_payroll_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_india_payroll_period ON india_payroll_records(pay_period_year, pay_period_month);
CREATE INDEX IF NOT EXISTS idx_india_payroll_status ON india_payroll_records(status);
CREATE INDEX IF NOT EXISTS idx_india_payroll_payment_status ON india_payroll_records(payment_status);

CREATE INDEX IF NOT EXISTS idx_india_attendance_employee_month ON india_monthly_attendance(employee_id, month, year);
CREATE INDEX IF NOT EXISTS idx_india_attendance_org ON india_monthly_attendance(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_loans_employee ON india_employee_loans(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_india_loans_org ON india_employee_loans(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_advances_employee ON india_employee_advances(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_india_advances_org ON india_employee_advances(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_gratuity_employee ON india_gratuity_calculations(employee_id);
CREATE INDEX IF NOT EXISTS idx_india_gratuity_org ON india_gratuity_calculations(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_bank_files_org ON india_bank_transfer_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_india_bank_files_period ON india_bank_transfer_files(pay_period_year, pay_period_month);

CREATE INDEX IF NOT EXISTS idx_india_tds_employee_fy ON india_tds_declarations(employee_id, financial_year);
CREATE INDEX IF NOT EXISTS idx_india_tds_org ON india_tds_declarations(organization_id);

-- ============================================================
-- PART 21: CREATE UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_india_salary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_india_salary_updated_at ON india_salary_components;
CREATE TRIGGER trigger_india_salary_updated_at
  BEFORE UPDATE ON india_salary_components
  FOR EACH ROW
  EXECUTE FUNCTION update_india_salary_updated_at();

DROP TRIGGER IF EXISTS trigger_india_payroll_updated_at ON india_payroll_records;
CREATE TRIGGER trigger_india_payroll_updated_at
  BEFORE UPDATE ON india_payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION update_india_salary_updated_at();

DROP TRIGGER IF EXISTS trigger_india_config_updated_at ON india_payroll_config;
CREATE TRIGGER trigger_india_config_updated_at
  BEFORE UPDATE ON india_payroll_config
  FOR EACH ROW
  EXECUTE FUNCTION update_india_salary_updated_at();

-- ============================================================
-- PART 22: GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON india_salary_components TO authenticated;
GRANT ALL ON india_payroll_records TO authenticated;
GRANT ALL ON india_payroll_config TO authenticated;
GRANT ALL ON india_monthly_attendance TO authenticated;
GRANT ALL ON india_employee_loans TO authenticated;
GRANT ALL ON india_employee_advances TO authenticated;
GRANT ALL ON india_gratuity_calculations TO authenticated;
GRANT ALL ON india_bank_transfer_files TO authenticated;
GRANT ALL ON india_tds_declarations TO authenticated;

-- ============================================================
-- SCHEMA COMPLETE
-- India Payroll System Tables:
-- 1. india_salary_components - Employee salary structure
-- 2. india_payroll_records - Monthly payroll records
-- 3. india_payroll_config - Organization payroll settings
-- 4. india_monthly_attendance - Attendance summary
-- 5. india_employee_loans - Employee loans
-- 6. india_employee_advances - Salary advances
-- 7. india_gratuity_calculations - Gratuity tracking
-- 8. india_bank_transfer_files - NEFT/RTGS files
-- 9. india_tds_declarations - Tax declarations
-- ============================================================


