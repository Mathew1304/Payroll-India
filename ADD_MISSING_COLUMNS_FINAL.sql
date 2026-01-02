-- ============================================================================
-- ADD MISSING EMPLOYEE COLUMNS
-- ============================================================================
-- Based on comparison between actual database schema and AddEmployeeModal form
-- This adds ONLY the columns that are truly missing
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Adding Missing Employee Columns';
  RAISE NOTICE '========================================';

  -- ========================================================================
  -- SALARY FIELDS (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'ctc_annual') THEN
    ALTER TABLE employees ADD COLUMN ctc_annual numeric(12,2);
    RAISE NOTICE '✓ Added ctc_annual column';
  ELSE
    RAISE NOTICE '✓ ctc_annual already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'basic_salary') THEN
    ALTER TABLE employees ADD COLUMN basic_salary numeric(12,2);
    RAISE NOTICE '✓ Added basic_salary column';
  ELSE
    RAISE NOTICE '✓ basic_salary already exists';
  END IF;

  -- ========================================================================
  -- PASSPORT FIELDS (Missing issue_place)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'passport_issue_date') THEN
    ALTER TABLE employees ADD COLUMN passport_issue_date date;
    RAISE NOTICE '✓ Added passport_issue_date column';
  ELSE
    RAISE NOTICE '✓ passport_issue_date already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'passport_issue_place') THEN
    ALTER TABLE employees ADD COLUMN passport_issue_place text;
    RAISE NOTICE '✓ Added passport_issue_place column';
  ELSE
    RAISE NOTICE '✓ passport_issue_place already exists';
  END IF;

  -- ========================================================================
  -- DRIVING LICENSE (Missing expiry)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'driving_license_number') THEN
    ALTER TABLE employees ADD COLUMN driving_license_number text;
    RAISE NOTICE '✓ Added driving_license_number column';
  ELSE
    RAISE NOTICE '✓ driving_license_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'driving_license_expiry') THEN
    ALTER TABLE employees ADD COLUMN driving_license_expiry date;
    RAISE NOTICE '✓ Added driving_license_expiry column';
  ELSE
    RAISE NOTICE '✓ driving_license_expiry already exists';
  END IF;

  -- ========================================================================
  -- CONTRACT FIELDS (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'contract_start_date') THEN
    ALTER TABLE employees ADD COLUMN contract_start_date date;
    RAISE NOTICE '✓ Added contract_start_date column';
  ELSE
    RAISE NOTICE '✓ contract_start_date already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'contract_end_date') THEN
    ALTER TABLE employees ADD COLUMN contract_end_date date;
    RAISE NOTICE '✓ Added contract_end_date column';
  ELSE
    RAISE NOTICE '✓ contract_end_date already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'contract_duration_months') THEN
    ALTER TABLE employees ADD COLUMN contract_duration_months integer;
    RAISE NOTICE '✓ Added contract_duration_months column';
  ELSE
    RAISE NOTICE '✓ contract_duration_months already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'notice_period_days') THEN
    ALTER TABLE employees ADD COLUMN notice_period_days integer DEFAULT 30;
    RAISE NOTICE '✓ Added notice_period_days column';
  ELSE
    RAISE NOTICE '✓ notice_period_days already exists';
  END IF;

  -- ========================================================================
  -- PERSONAL INFO FIELDS (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'religion') THEN
    ALTER TABLE employees ADD COLUMN religion text;
    RAISE NOTICE '✓ Added religion column';
  ELSE
    RAISE NOTICE '✓ religion already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'place_of_birth') THEN
    ALTER TABLE employees ADD COLUMN place_of_birth text;
    RAISE NOTICE '✓ Added place_of_birth column';
  ELSE
    RAISE NOTICE '✓ place_of_birth already exists';
  END IF;

  -- ========================================================================
  -- BANKING & TAX FIELDS (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'professional_tax_number') THEN
    ALTER TABLE employees ADD COLUMN professional_tax_number text;
    RAISE NOTICE '✓ Added professional_tax_number column';
  ELSE
    RAISE NOTICE '✓ professional_tax_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'pf_account_number') THEN
    ALTER TABLE employees ADD COLUMN pf_account_number text;
    RAISE NOTICE '✓ Added pf_account_number column';
  ELSE
    RAISE NOTICE '✓ pf_account_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'pf_uan') THEN
    ALTER TABLE employees ADD COLUMN pf_uan text;
    RAISE NOTICE '✓ Added pf_uan column';
  ELSE
    RAISE NOTICE '✓ pf_uan already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'gratuity_nominee_name') THEN
    ALTER TABLE employees ADD COLUMN gratuity_nominee_name text;
    RAISE NOTICE '✓ Added gratuity_nominee_name column';
  ELSE
    RAISE NOTICE '✓ gratuity_nominee_name already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'gratuity_nominee_relationship') THEN
    ALTER TABLE employees ADD COLUMN gratuity_nominee_relationship text;
    RAISE NOTICE '✓ Added gratuity_nominee_relationship column';
  ELSE
    RAISE NOTICE '✓ gratuity_nominee_relationship already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'lwf_number') THEN
    ALTER TABLE employees ADD COLUMN lwf_number text;
    RAISE NOTICE '✓ Added lwf_number column';
  ELSE
    RAISE NOTICE '✓ lwf_number already exists';
  END IF;

  -- ========================================================================
  -- SAUDI ARABIA SPECIFIC FIELDS (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'iqama_number') THEN
    ALTER TABLE employees ADD COLUMN iqama_number text;
    RAISE NOTICE '✓ Added iqama_number column';
  ELSE
    RAISE NOTICE '✓ iqama_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'iqama_expiry') THEN
    ALTER TABLE employees ADD COLUMN iqama_expiry date;
    RAISE NOTICE '✓ Added iqama_expiry column';
  ELSE
    RAISE NOTICE '✓ iqama_expiry already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'gosi_number') THEN
    ALTER TABLE employees ADD COLUMN gosi_number text;
    RAISE NOTICE '✓ Added gosi_number column';
  ELSE
    RAISE NOTICE '✓ gosi_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'border_number') THEN
    ALTER TABLE employees ADD COLUMN border_number text;
    RAISE NOTICE '✓ Added border_number column';
  ELSE
    RAISE NOTICE '✓ border_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'muqeem_id') THEN
    ALTER TABLE employees ADD COLUMN muqeem_id text;
    RAISE NOTICE '✓ Added muqeem_id column';
  ELSE
    RAISE NOTICE '✓ muqeem_id already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'kafala_sponsor_name') THEN
    ALTER TABLE employees ADD COLUMN kafala_sponsor_name text;
    RAISE NOTICE '✓ Added kafala_sponsor_name column';
  ELSE
    RAISE NOTICE '✓ kafala_sponsor_name already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'kafala_sponsor_id') THEN
    ALTER TABLE employees ADD COLUMN kafala_sponsor_id text;
    RAISE NOTICE '✓ Added kafala_sponsor_id column';
  ELSE
    RAISE NOTICE '✓ kafala_sponsor_id already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'jawazat_number') THEN
    ALTER TABLE employees ADD COLUMN jawazat_number text;
    RAISE NOTICE '✓ Added jawazat_number column';
  ELSE
    RAISE NOTICE '✓ jawazat_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'absher_id') THEN
    ALTER TABLE employees ADD COLUMN absher_id text;
    RAISE NOTICE '✓ Added absher_id column';
  ELSE
    RAISE NOTICE '✓ absher_id already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'medical_insurance_number') THEN
    ALTER TABLE employees ADD COLUMN medical_insurance_number text;
    RAISE NOTICE '✓ Added medical_insurance_number column';
  ELSE
    RAISE NOTICE '✓ medical_insurance_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'medical_insurance_provider') THEN
    ALTER TABLE employees ADD COLUMN medical_insurance_provider text;
    RAISE NOTICE '✓ Added medical_insurance_provider column';
  ELSE
    RAISE NOTICE '✓ medical_insurance_provider already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'medical_insurance_expiry') THEN
    ALTER TABLE employees ADD COLUMN medical_insurance_expiry date;
    RAISE NOTICE '✓ Added medical_insurance_expiry column';
  ELSE
    RAISE NOTICE '✓ medical_insurance_expiry already exists';
  END IF;

  -- ========================================================================
  -- QATAR SPECIFIC FIELDS (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'sponsor_id') THEN
    ALTER TABLE employees ADD COLUMN sponsor_id text;
    RAISE NOTICE '✓ Added sponsor_id column';
  ELSE
    RAISE NOTICE '✓ sponsor_id already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'medical_fitness_certificate') THEN
    ALTER TABLE employees ADD COLUMN medical_fitness_certificate text;
    RAISE NOTICE '✓ Added medical_fitness_certificate column';
  ELSE
    RAISE NOTICE '✓ medical_fitness_certificate already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'medical_fitness_expiry') THEN
    ALTER TABLE employees ADD COLUMN medical_fitness_expiry date;
    RAISE NOTICE '✓ Added medical_fitness_expiry column';
  ELSE
    RAISE NOTICE '✓ medical_fitness_expiry already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'police_clearance_certificate') THEN
    ALTER TABLE employees ADD COLUMN police_clearance_certificate text;
    RAISE NOTICE '✓ Added police_clearance_certificate column';
  ELSE
    RAISE NOTICE '✓ police_clearance_certificate already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'police_clearance_expiry') THEN
    ALTER TABLE employees ADD COLUMN police_clearance_expiry date;
    RAISE NOTICE '✓ Added police_clearance_expiry column';
  ELSE
    RAISE NOTICE '✓ police_clearance_expiry already exists';
  END IF;

  -- ========================================================================
  -- ADDRESS FIELDS (Schema uses different naming)
  -- ========================================================================
  
  -- Note: Database has current_city, current_state, current_pincode
  -- Form uses city, state, pincode - we'll add aliases
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'city') THEN
    ALTER TABLE employees ADD COLUMN city text;
    RAISE NOTICE '✓ Added city column';
  ELSE
    RAISE NOTICE '✓ city already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'state') THEN
    ALTER TABLE employees ADD COLUMN state text;
    RAISE NOTICE '✓ Added state column';
  ELSE
    RAISE NOTICE '✓ state already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'pincode') THEN
    ALTER TABLE employees ADD COLUMN pincode text;
    RAISE NOTICE '✓ Added pincode column';
  ELSE
    RAISE NOTICE '✓ pincode already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'alternate_number') THEN
    ALTER TABLE employees ADD COLUMN alternate_number text;
    RAISE NOTICE '✓ Added alternate_number column';
  ELSE
    RAISE NOTICE '✓ alternate_number already exists';
  END IF;

  -- ========================================================================
  -- JOB FIELDS (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'job_grade') THEN
    ALTER TABLE employees ADD COLUMN job_grade text;
    RAISE NOTICE '✓ Added job_grade column';
  ELSE
    RAISE NOTICE '✓ job_grade already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'job_level') THEN
    ALTER TABLE employees ADD COLUMN job_level text;
    RAISE NOTICE '✓ Added job_level column';
  ELSE
    RAISE NOTICE '✓ job_level already exists';
  END IF;

  -- ========================================================================
  -- BRANCH ID (Missing from schema)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'branch_id') THEN
    ALTER TABLE employees ADD COLUMN branch_id uuid;
    RAISE NOTICE '✓ Added branch_id column';
  ELSE
    RAISE NOTICE '✓ branch_id already exists';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- FORCE POSTGREST TO RELOAD SCHEMA CACHE
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFY CRITICAL COLUMNS WERE ADDED
-- ============================================================================
SELECT 
  'Column exists' as status,
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN (
    'ctc_annual',
    'basic_salary',
    'contract_start_date',
    'contract_end_date',
    'contract_duration_months',
    'notice_period_days',
    'religion',
    'place_of_birth',
    'city',
    'state',
    'pincode',
    'branch_id',
    'job_grade',
    'job_level'
  )
ORDER BY column_name;
