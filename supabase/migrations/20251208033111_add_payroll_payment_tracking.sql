/*
  # Add Payroll Payment Tracking

  ## Overview
  Add payment status tracking and bank transfer reference fields to payroll records.
  This allows tracking the complete payment lifecycle from processing to bank transfer.

  ## Changes to Existing Tables

  ### qatar_payroll_records
  - Add payment_status field
  - Add payment_date field  
  - Add bank_reference_number field
  - Add wps_submission_date field
  - Add wps_submission_status field

  ### saudi_payroll_records
  - Same fields as Qatar

  ## Payment Status Flow
  1. draft - Payroll processed but not paid
  2. pending_payment - WPS file generated, awaiting bank upload
  3. submitted_to_bank - Uploaded to bank, awaiting transfer
  4. paid - Bank transfer completed
  5. confirmed - Payment confirmed and WPS submitted to ministry

  ## Security
  - No new tables, only column additions
  - Existing RLS policies apply
*/

-- =====================================================
-- ADD PAYMENT TRACKING TO QATAR PAYROLL RECORDS
-- =====================================================
DO $$
BEGIN
  -- Add payment_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'payment_status') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN payment_status TEXT DEFAULT 'draft' 
      CHECK (payment_status IN ('draft', 'pending_payment', 'submitted_to_bank', 'paid', 'confirmed'));
  END IF;

  -- Add payment_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'payment_date') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN payment_date DATE;
  END IF;

  -- Add bank_reference_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'bank_reference_number') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN bank_reference_number TEXT;
  END IF;

  -- Add wps_submission_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'wps_submission_date') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN wps_submission_date DATE;
  END IF;

  -- Add wps_submission_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'wps_submission_status') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN wps_submission_status TEXT
      CHECK (wps_submission_status IN ('not_submitted', 'pending', 'accepted', 'rejected'));
  END IF;

  -- Add paid_by column (who marked as paid)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'paid_by') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN paid_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add payment_notes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'qatar_payroll_records' AND column_name = 'payment_notes') THEN
    ALTER TABLE qatar_payroll_records ADD COLUMN payment_notes TEXT;
  END IF;
END $$;

-- =====================================================
-- ADD PAYMENT TRACKING TO SAUDI PAYROLL RECORDS
-- =====================================================
DO $$
BEGIN
  -- Add payment_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'payment_status') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN payment_status TEXT DEFAULT 'draft'
      CHECK (payment_status IN ('draft', 'pending_payment', 'submitted_to_bank', 'paid', 'confirmed'));
  END IF;

  -- Add payment_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'payment_date') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN payment_date DATE;
  END IF;

  -- Add bank_reference_number column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'bank_reference_number') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN bank_reference_number TEXT;
  END IF;

  -- Add wps_submission_date column (MOLHSS in Saudi)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'wps_submission_date') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN wps_submission_date DATE;
  END IF;

  -- Add wps_submission_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'wps_submission_status') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN wps_submission_status TEXT
      CHECK (wps_submission_status IN ('not_submitted', 'pending', 'accepted', 'rejected'));
  END IF;

  -- Add paid_by column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'paid_by') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN paid_by UUID REFERENCES auth.users(id);
  END IF;

  -- Add payment_notes column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saudi_payroll_records' AND column_name = 'payment_notes') THEN
    ALTER TABLE saudi_payroll_records ADD COLUMN payment_notes TEXT;
  END IF;
END $$;

-- =====================================================
-- CREATE INDEXES FOR PAYMENT QUERIES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_qatar_payroll_payment_status 
  ON qatar_payroll_records(payment_status) 
  WHERE payment_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qatar_payroll_payment_date 
  ON qatar_payroll_records(payment_date) 
  WHERE payment_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saudi_payroll_payment_status 
  ON saudi_payroll_records(payment_status) 
  WHERE payment_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saudi_payroll_payment_date 
  ON saudi_payroll_records(payment_date) 
  WHERE payment_date IS NOT NULL;

-- =====================================================
-- UPDATE EXISTING RECORDS TO HAVE DEFAULT STATUS
-- =====================================================
UPDATE qatar_payroll_records 
SET payment_status = 'draft' 
WHERE payment_status IS NULL;

UPDATE saudi_payroll_records 
SET payment_status = 'draft' 
WHERE payment_status IS NULL;
