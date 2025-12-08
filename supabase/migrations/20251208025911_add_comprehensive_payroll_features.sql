/*
  # Add Comprehensive Payroll Features
  
  ## Overview
  This migration adds all missing critical payroll features required for GCC compliance and enterprise payroll management.
  
  ## New Tables
  
  ### 1. payroll_validations
  Stores pre-payroll validation errors and warnings
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `payroll_period_month` (integer)
  - `payroll_period_year` (integer)
  - `validation_type` (text) - 'error' | 'warning'
  - `category` (text) - 'missing_data' | 'salary_structure' | 'leave_deduction' | 'compliance'
  - `employee_id` (uuid, foreign key, nullable)
  - `error_code` (text)
  - `error_message` (text)
  - `resolved` (boolean)
  - `created_at` (timestamptz)
  
  ### 2. payroll_adjustments
  Manual adjustments, bonuses, penalties, and one-time payments
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `adjustment_type` (text) - 'bonus' | 'penalty' | 'allowance' | 'deduction' | 'incentive' | 'adjustment'
  - `amount` (decimal)
  - `description` (text)
  - `apply_month` (integer)
  - `apply_year` (integer)
  - `status` (text) - 'pending' | 'applied' | 'cancelled'
  - `applied_to_payroll_id` (uuid, nullable)
  - `created_by` (uuid)
  - `created_at` (timestamptz)
  
  ### 3. employee_loans
  Employee loan management with installments
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `loan_type` (text) - 'personal' | 'emergency' | 'advance' | 'other'
  - `loan_amount` (decimal)
  - `installment_amount` (decimal)
  - `total_installments` (integer)
  - `paid_installments` (integer)
  - `remaining_balance` (decimal)
  - `start_month` (integer)
  - `start_year` (integer)
  - `status` (text) - 'active' | 'completed' | 'cancelled'
  - `notes` (text)
  - `approved_by` (uuid)
  - `created_at` (timestamptz)
  
  ### 4. advance_salary_requests
  Advance salary management
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `amount` (decimal)
  - `request_date` (date)
  - `deduct_from_month` (integer)
  - `deduct_from_year` (integer)
  - `status` (text) - 'pending' | 'approved' | 'rejected' | 'deducted'
  - `reason` (text)
  - `approved_by` (uuid, nullable)
  - `approved_date` (date, nullable)
  - `deducted_from_payroll_id` (uuid, nullable)
  - `created_at` (timestamptz)
  
  ### 5. eosb_accruals
  End of Service Benefits monthly accrual tracking
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `accrual_month` (integer)
  - `accrual_year` (integer)
  - `basic_salary` (decimal)
  - `accrued_amount` (decimal)
  - `total_accrued` (decimal) - Running total
  - `paid_amount` (decimal)
  - `balance` (decimal)
  - `calculation_method` (text) - 'qatar_21days' | 'saudi_half_month' | 'custom'
  - `created_at` (timestamptz)
  
  ### 6. off_cycle_payroll
  Off-cycle payroll runs (final settlement, bonus, etc.)
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `payroll_type` (text) - 'final_settlement' | 'bonus' | 'eosb_payout' | 'one_time' | 'thirteenth_salary'
  - `payroll_date` (date)
  - `description` (text)
  - `total_employees` (integer)
  - `total_amount` (decimal)
  - `status` (text) - 'draft' | 'approved' | 'processed' | 'paid'
  - `created_by` (uuid)
  - `approved_by` (uuid, nullable)
  - `created_at` (timestamptz)
  
  ### 7. off_cycle_payroll_details
  Individual employee records for off-cycle payroll
  - `id` (uuid, primary key)
  - `off_cycle_payroll_id` (uuid, foreign key)
  - `employee_id` (uuid, foreign key)
  - `gross_amount` (decimal)
  - `deductions` (decimal)
  - `net_amount` (decimal)
  - `components` (jsonb) - Breakdown of payments
  - `notes` (text)
  
  ### 8. payroll_snapshots
  Frozen payroll data for audit and historical reference
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `payroll_period_month` (integer)
  - `payroll_period_year` (integer)
  - `payroll_type` (text) - 'regular' | 'off_cycle'
  - `snapshot_data` (jsonb) - Complete frozen payroll data
  - `total_employees` (integer)
  - `total_gross` (decimal)
  - `total_deductions` (decimal)
  - `total_net` (decimal)
  - `locked_at` (timestamptz)
  - `locked_by` (uuid)
  
  ### 9. payroll_audit_logs
  Complete audit trail of all payroll operations
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `action_type` (text) - 'run_payroll' | 'approve' | 'edit' | 'lock' | 'unlock' | 'adjustment' | 'export'
  - `entity_type` (text) - 'payroll_record' | 'salary_component' | 'adjustment' | 'loan'
  - `entity_id` (uuid)
  - `user_id` (uuid)
  - `action_description` (text)
  - `old_values` (jsonb, nullable)
  - `new_values` (jsonb, nullable)
  - `ip_address` (text, nullable)
  - `created_at` (timestamptz)
  
  ### 10. gl_export_batches
  General Ledger export tracking for accounting integration
  - `id` (uuid, primary key)
  - `organization_id` (uuid, foreign key)
  - `batch_number` (text)
  - `payroll_period_month` (integer)
  - `payroll_period_year` (integer)
  - `export_format` (text) - 'excel' | 'csv' | 'json' | 'd365bc'
  - `total_debit` (decimal)
  - `total_credit` (decimal)
  - `exported_by` (uuid)
  - `exported_at` (timestamptz)
  - `file_path` (text, nullable)
  
  ### 11. gl_export_entries
  Individual GL entries for each payroll transaction
  - `id` (uuid, primary key)
  - `gl_batch_id` (uuid, foreign key)
  - `entry_number` (integer)
  - `account_code` (text)
  - `account_name` (text)
  - `department_code` (text, nullable)
  - `cost_center` (text, nullable)
  - `debit_amount` (decimal)
  - `credit_amount` (decimal)
  - `description` (text)
  - `employee_id` (uuid, nullable)
  
  ## Modified Tables
  
  ### qatar_payroll_records - Add workflow fields
  - `status` (text) - Change to support: 'draft' | 'reviewed' | 'approved' | 'locked' | 'paid'
  - `reviewed_by` (uuid, nullable)
  - `reviewed_at` (timestamptz, nullable)
  - `approved_by` (uuid, nullable)
  - `approved_at` (timestamptz, nullable)
  - `locked_by` (uuid, nullable)
  - `locked_at` (timestamptz, nullable)
  - `validation_passed` (boolean)
  - `validation_warnings` (jsonb)
  
  ### saudi_payroll_records - Add workflow fields
  - Same fields as qatar_payroll_records
  
  ### employees - Add validation tracking fields
  - `last_validation_check` (timestamptz, nullable)
  - `validation_status` (text) - 'valid' | 'warning' | 'error'
  - `validation_errors` (jsonb, nullable)
  
  ## Security
  - Enable RLS on all new tables
  - Policies for organization isolation
  - Role-based access (Admin, HR, Finance, Manager)
*/

-- =====================================================
-- 1. PAYROLL VALIDATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_period_month INTEGER NOT NULL CHECK (payroll_period_month BETWEEN 1 AND 12),
  payroll_period_year INTEGER NOT NULL CHECK (payroll_period_year BETWEEN 2020 AND 2100),
  validation_type TEXT NOT NULL CHECK (validation_type IN ('error', 'warning', 'info')),
  category TEXT NOT NULL CHECK (category IN ('missing_data', 'salary_structure', 'leave_deduction', 'compliance', 'wps')),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  field_name TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payroll_validations_org ON payroll_validations(organization_id);
CREATE INDEX idx_payroll_validations_period ON payroll_validations(payroll_period_year, payroll_period_month);
CREATE INDEX idx_payroll_validations_employee ON payroll_validations(employee_id);
CREATE INDEX idx_payroll_validations_resolved ON payroll_validations(resolved);

-- =====================================================
-- 2. PAYROLL ADJUSTMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('bonus', 'penalty', 'allowance', 'deduction', 'incentive', 'adjustment', 'overtime_manual')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  apply_month INTEGER NOT NULL CHECK (apply_month BETWEEN 1 AND 12),
  apply_year INTEGER NOT NULL CHECK (apply_year BETWEEN 2020 AND 2100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'cancelled')),
  applied_to_payroll_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payroll_adjustments_org ON payroll_adjustments(organization_id);
CREATE INDEX idx_payroll_adjustments_employee ON payroll_adjustments(employee_id);
CREATE INDEX idx_payroll_adjustments_period ON payroll_adjustments(apply_year, apply_month);
CREATE INDEX idx_payroll_adjustments_status ON payroll_adjustments(status);

-- =====================================================
-- 3. EMPLOYEE LOANS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  loan_type TEXT NOT NULL CHECK (loan_type IN ('personal', 'emergency', 'advance', 'housing', 'education', 'other')),
  loan_amount DECIMAL(12,2) NOT NULL CHECK (loan_amount > 0),
  installment_amount DECIMAL(12,2) NOT NULL CHECK (installment_amount > 0),
  total_installments INTEGER NOT NULL CHECK (total_installments > 0),
  paid_installments INTEGER DEFAULT 0 CHECK (paid_installments >= 0),
  remaining_balance DECIMAL(12,2) NOT NULL,
  start_month INTEGER NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  start_year INTEGER NOT NULL CHECK (start_year BETWEEN 2020 AND 2100),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_employee_loans_org ON employee_loans(organization_id);
CREATE INDEX idx_employee_loans_employee ON employee_loans(employee_id);
CREATE INDEX idx_employee_loans_status ON employee_loans(status);

-- =====================================================
-- 4. ADVANCE SALARY REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS advance_salary_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  request_date DATE DEFAULT CURRENT_DATE,
  deduct_from_month INTEGER NOT NULL CHECK (deduct_from_month BETWEEN 1 AND 12),
  deduct_from_year INTEGER NOT NULL CHECK (deduct_from_year BETWEEN 2020 AND 2100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'deducted')),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_date DATE,
  deducted_from_payroll_id UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_advance_salary_org ON advance_salary_requests(organization_id);
CREATE INDEX idx_advance_salary_employee ON advance_salary_requests(employee_id);
CREATE INDEX idx_advance_salary_status ON advance_salary_requests(status);

-- =====================================================
-- 5. EOSB ACCRUALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS eosb_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  accrual_month INTEGER NOT NULL CHECK (accrual_month BETWEEN 1 AND 12),
  accrual_year INTEGER NOT NULL CHECK (accrual_year BETWEEN 2020 AND 2100),
  basic_salary DECIMAL(12,2) NOT NULL,
  accrued_amount DECIMAL(12,2) NOT NULL,
  total_accrued DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2) NOT NULL,
  calculation_method TEXT DEFAULT 'qatar_21days' CHECK (calculation_method IN ('qatar_21days', 'saudi_half_month', 'custom')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, employee_id, accrual_year, accrual_month)
);

CREATE INDEX idx_eosb_accruals_org ON eosb_accruals(organization_id);
CREATE INDEX idx_eosb_accruals_employee ON eosb_accruals(employee_id);
CREATE INDEX idx_eosb_accruals_period ON eosb_accruals(accrual_year, accrual_month);

-- =====================================================
-- 6. OFF-CYCLE PAYROLL TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS off_cycle_payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_type TEXT NOT NULL CHECK (payroll_type IN ('final_settlement', 'bonus', 'eosb_payout', 'one_time', 'thirteenth_salary', 'commission')),
  payroll_date DATE NOT NULL,
  description TEXT NOT NULL,
  total_employees INTEGER DEFAULT 0,
  total_gross DECIMAL(15,2) DEFAULT 0,
  total_deductions DECIMAL(15,2) DEFAULT 0,
  total_net DECIMAL(15,2) DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'processed', 'paid', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_off_cycle_payroll_org ON off_cycle_payroll(organization_id);
CREATE INDEX idx_off_cycle_payroll_status ON off_cycle_payroll(status);
CREATE INDEX idx_off_cycle_payroll_date ON off_cycle_payroll(payroll_date);

-- =====================================================
-- 7. OFF-CYCLE PAYROLL DETAILS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS off_cycle_payroll_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  off_cycle_payroll_id UUID NOT NULL REFERENCES off_cycle_payroll(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  gross_amount DECIMAL(12,2) DEFAULT 0,
  deductions DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  components JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_off_cycle_details_payroll ON off_cycle_payroll_details(off_cycle_payroll_id);
CREATE INDEX idx_off_cycle_details_employee ON off_cycle_payroll_details(employee_id);

-- =====================================================
-- 8. PAYROLL SNAPSHOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  payroll_period_month INTEGER NOT NULL CHECK (payroll_period_month BETWEEN 1 AND 12),
  payroll_period_year INTEGER NOT NULL CHECK (payroll_period_year BETWEEN 2020 AND 2100),
  payroll_type TEXT DEFAULT 'regular' CHECK (payroll_type IN ('regular', 'off_cycle')),
  snapshot_data JSONB NOT NULL,
  total_employees INTEGER NOT NULL,
  total_gross DECIMAL(15,2) NOT NULL,
  total_deductions DECIMAL(15,2) NOT NULL,
  total_net DECIMAL(15,2) NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT now(),
  locked_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, payroll_period_year, payroll_period_month, payroll_type)
);

CREATE INDEX idx_payroll_snapshots_org ON payroll_snapshots(organization_id);
CREATE INDEX idx_payroll_snapshots_period ON payroll_snapshots(payroll_period_year, payroll_period_month);

-- =====================================================
-- 9. PAYROLL AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payroll_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('run_payroll', 'approve', 'edit', 'lock', 'unlock', 'adjustment', 'export', 'delete', 'loan_add', 'loan_payment', 'advance_approve')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('payroll_record', 'salary_component', 'adjustment', 'loan', 'advance', 'eosb', 'off_cycle')),
  entity_id UUID,
  user_id UUID REFERENCES auth.users(id),
  action_description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payroll_audit_org ON payroll_audit_logs(organization_id);
CREATE INDEX idx_payroll_audit_user ON payroll_audit_logs(user_id);
CREATE INDEX idx_payroll_audit_entity ON payroll_audit_logs(entity_type, entity_id);
CREATE INDEX idx_payroll_audit_date ON payroll_audit_logs(created_at DESC);

-- =====================================================
-- 10. GL EXPORT BATCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gl_export_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  payroll_period_month INTEGER NOT NULL CHECK (payroll_period_month BETWEEN 1 AND 12),
  payroll_period_year INTEGER NOT NULL CHECK (payroll_period_year BETWEEN 2020 AND 2100),
  export_format TEXT DEFAULT 'csv' CHECK (export_format IN ('excel', 'csv', 'json', 'd365bc', 'sap')),
  total_debit DECIMAL(15,2) NOT NULL,
  total_credit DECIMAL(15,2) NOT NULL,
  exported_by UUID REFERENCES auth.users(id),
  exported_at TIMESTAMPTZ DEFAULT now(),
  file_path TEXT
);

CREATE INDEX idx_gl_batches_org ON gl_export_batches(organization_id);
CREATE INDEX idx_gl_batches_period ON gl_export_batches(payroll_period_year, payroll_period_month);
CREATE INDEX idx_gl_batches_number ON gl_export_batches(batch_number);

-- =====================================================
-- 11. GL EXPORT ENTRIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS gl_export_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gl_batch_id UUID NOT NULL REFERENCES gl_export_batches(id) ON DELETE CASCADE,
  entry_number INTEGER NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  department_code TEXT,
  cost_center TEXT,
  debit_amount DECIMAL(12,2) DEFAULT 0,
  credit_amount DECIMAL(12,2) DEFAULT 0,
  description TEXT,
  employee_id UUID REFERENCES employees(id)
);

CREATE INDEX idx_gl_entries_batch ON gl_export_entries(gl_batch_id);
CREATE INDEX idx_gl_entries_account ON gl_export_entries(account_code);
CREATE INDEX idx_gl_entries_employee ON gl_export_entries(employee_id);

-- =====================================================
-- 12. MODIFY QATAR PAYROLL RECORDS - ADD WORKFLOW
-- =====================================================
DO $$
BEGIN
  -- Add workflow columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'reviewed_by') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'reviewed_at') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'approved_by') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'approved_at') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'locked_by') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN locked_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'locked_at') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'validation_passed') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN validation_passed BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'validation_warnings') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN validation_warnings JSONB DEFAULT '[]';
  END IF;
END $$;

-- =====================================================
-- 13. MODIFY SAUDI PAYROLL RECORDS - ADD WORKFLOW
-- =====================================================
DO $$
BEGIN
  -- Add workflow columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'reviewed_by') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'reviewed_at') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'approved_by') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'approved_at') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'locked_by') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN locked_by UUID REFERENCES auth.users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'locked_at') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN locked_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'validation_passed') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN validation_passed BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'validation_warnings') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN validation_warnings JSONB DEFAULT '[]';
  END IF;
END $$;

-- =====================================================
-- 14. MODIFY EMPLOYEES - ADD VALIDATION TRACKING
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'last_validation_check') THEN
    ALTER TABLE employees ADD COLUMN last_validation_check TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'validation_status') THEN
    ALTER TABLE employees ADD COLUMN validation_status TEXT DEFAULT 'valid' CHECK (validation_status IN ('valid', 'warning', 'error'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'validation_errors') THEN
    ALTER TABLE employees ADD COLUMN validation_errors JSONB DEFAULT '[]';
  END IF;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE payroll_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_salary_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE eosb_accruals ENABLE ROW LEVEL SECURITY;
ALTER TABLE off_cycle_payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE off_cycle_payroll_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_export_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE gl_export_entries ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - PAYROLL VALIDATIONS
-- =====================================================
CREATE POLICY "Users can view validations in their organization"
  ON payroll_validations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and HR can insert validations"
  ON payroll_validations FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admins and HR can update validations"
  ON payroll_validations FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admins can delete validations"
  ON payroll_validations FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - PAYROLL ADJUSTMENTS
-- =====================================================
CREATE POLICY "Users can view adjustments in their organization"
  ON payroll_adjustments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins, HR, and Finance can insert adjustments"
  ON payroll_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admins, HR, and Finance can update adjustments"
  ON payroll_adjustments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

CREATE POLICY "Admins can delete adjustments"
  ON payroll_adjustments FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- RLS POLICIES - EMPLOYEE LOANS
-- =====================================================
CREATE POLICY "Users can view loans in their organization"
  ON employee_loans FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins, HR, and Finance can manage loans"
  ON employee_loans FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

-- =====================================================
-- RLS POLICIES - ADVANCE SALARY REQUESTS
-- =====================================================
CREATE POLICY "Users can view advance requests in their organization"
  ON advance_salary_requests FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create their own advance requests"
  ON advance_salary_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins, HR, and Finance can manage advance requests"
  ON advance_salary_requests FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

-- =====================================================
-- RLS POLICIES - EOSB ACCRUALS
-- =====================================================
CREATE POLICY "Users can view EOSB accruals in their organization"
  ON eosb_accruals FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins, HR, and Finance can manage EOSB accruals"
  ON eosb_accruals FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

-- =====================================================
-- RLS POLICIES - OFF-CYCLE PAYROLL
-- =====================================================
CREATE POLICY "Users can view off-cycle payroll in their organization"
  ON off_cycle_payroll FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins, HR, and Finance can manage off-cycle payroll"
  ON off_cycle_payroll FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'hr', 'finance')
    )
  );

-- =====================================================
-- RLS POLICIES - OFF-CYCLE PAYROLL DETAILS
-- =====================================================
CREATE POLICY "Users can view off-cycle details through payroll"
  ON off_cycle_payroll_details FOR SELECT
  TO authenticated
  USING (
    off_cycle_payroll_id IN (
      SELECT id FROM off_cycle_payroll
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins, HR, and Finance can manage off-cycle details"
  ON off_cycle_payroll_details FOR ALL
  TO authenticated
  USING (
    off_cycle_payroll_id IN (
      SELECT id FROM off_cycle_payroll
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'hr', 'finance')
      )
    )
  );

-- =====================================================
-- RLS POLICIES - PAYROLL SNAPSHOTS
-- =====================================================
CREATE POLICY "Users can view snapshots in their organization"
  ON payroll_snapshots FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Finance can create snapshots"
  ON payroll_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'finance')
    )
  );

-- =====================================================
-- RLS POLICIES - PAYROLL AUDIT LOGS
-- =====================================================
CREATE POLICY "Admins can view all audit logs"
  ON payroll_audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON payroll_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - GL EXPORT BATCHES
-- =====================================================
CREATE POLICY "Finance and Admins can view GL exports"
  ON gl_export_batches FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'finance')
    )
  );

CREATE POLICY "Finance and Admins can create GL exports"
  ON gl_export_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'finance')
    )
  );

-- =====================================================
-- RLS POLICIES - GL EXPORT ENTRIES
-- =====================================================
CREATE POLICY "Finance and Admins can view GL entries"
  ON gl_export_entries FOR SELECT
  TO authenticated
  USING (
    gl_batch_id IN (
      SELECT id FROM gl_export_batches
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'finance')
      )
    )
  );

CREATE POLICY "Finance and Admins can create GL entries"
  ON gl_export_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    gl_batch_id IN (
      SELECT id FROM gl_export_batches
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'finance')
      )
    )
  );
