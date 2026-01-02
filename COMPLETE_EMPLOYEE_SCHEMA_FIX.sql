-- ============================================================================
-- COMPLETE EMPLOYEE SCHEMA FIX
-- ============================================================================
-- This migration adds ALL missing columns that are referenced in the 
-- application code but don't exist in the database.
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting Complete Employee Schema Fix';
  RAISE NOTICE '========================================';

  -- ========================================================================
  -- ACCOMMODATION FIELDS
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'accommodation_provided') THEN
    ALTER TABLE employees ADD COLUMN accommodation_provided boolean DEFAULT false;
    RAISE NOTICE '✓ Added accommodation_provided column';
  ELSE
    RAISE NOTICE '✓ accommodation_provided already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'accommodation_address') THEN
    ALTER TABLE employees ADD COLUMN accommodation_address text;
    RAISE NOTICE '✓ Added accommodation_address column';
  ELSE
    RAISE NOTICE '✓ accommodation_address already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'accommodation_type') THEN
    ALTER TABLE employees ADD COLUMN accommodation_type text;
    RAISE NOTICE '✓ Added accommodation_type column';
  ELSE
    RAISE NOTICE '✓ accommodation_type already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'accommodation_allowance') THEN
    ALTER TABLE employees ADD COLUMN accommodation_allowance numeric(10,2);
    RAISE NOTICE '✓ Added accommodation_allowance column';
  ELSE
    RAISE NOTICE '✓ accommodation_allowance already exists';
  END IF;

  -- ========================================================================
  -- TRANSPORTATION FIELDS
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'transportation_provided') THEN
    ALTER TABLE employees ADD COLUMN transportation_provided boolean DEFAULT false;
    RAISE NOTICE '✓ Added transportation_provided column';
  ELSE
    RAISE NOTICE '✓ transportation_provided already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'transportation_allowance') THEN
    ALTER TABLE employees ADD COLUMN transportation_allowance numeric(10,2);
    RAISE NOTICE '✓ Added transportation_allowance column';
  ELSE
    RAISE NOTICE '✓ transportation_allowance already exists';
  END IF;

  -- ========================================================================
  -- FOOD & OTHER ALLOWANCES
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'food_allowance') THEN
    ALTER TABLE employees ADD COLUMN food_allowance numeric(10,2);
    RAISE NOTICE '✓ Added food_allowance column';
  ELSE
    RAISE NOTICE '✓ food_allowance already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'other_allowances') THEN
    ALTER TABLE employees ADD COLUMN other_allowances jsonb DEFAULT '[]'::jsonb;
    RAISE NOTICE '✓ Added other_allowances column';
  ELSE
    RAISE NOTICE '✓ other_allowances already exists';
  END IF;

  -- ========================================================================
  -- INSURANCE FIELDS
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'insurance_policy_number') THEN
    ALTER TABLE employees ADD COLUMN insurance_policy_number text;
    RAISE NOTICE '✓ Added insurance_policy_number column';
  ELSE
    RAISE NOTICE '✓ insurance_policy_number already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'insurance_provider') THEN
    ALTER TABLE employees ADD COLUMN insurance_provider text;
    RAISE NOTICE '✓ Added insurance_provider column';
  ELSE
    RAISE NOTICE '✓ insurance_provider already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'insurance_coverage_amount') THEN
    ALTER TABLE employees ADD COLUMN insurance_coverage_amount numeric(12,2);
    RAISE NOTICE '✓ Added insurance_coverage_amount column';
  ELSE
    RAISE NOTICE '✓ insurance_coverage_amount already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'insurance_expiry') THEN
    ALTER TABLE employees ADD COLUMN insurance_expiry date;
    RAISE NOTICE '✓ Added insurance_expiry column';
  ELSE
    RAISE NOTICE '✓ insurance_expiry already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'dependents_covered') THEN
    ALTER TABLE employees ADD COLUMN dependents_covered integer;
    RAISE NOTICE '✓ Added dependents_covered column';
  ELSE
    RAISE NOTICE '✓ dependents_covered already exists';
  END IF;

  -- ========================================================================
  -- LEAVE & BENEFITS FIELDS
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'end_of_service_benefit_eligible') THEN
    ALTER TABLE employees ADD COLUMN end_of_service_benefit_eligible boolean DEFAULT false;
    RAISE NOTICE '✓ Added end_of_service_benefit_eligible column';
  ELSE
    RAISE NOTICE '✓ end_of_service_benefit_eligible already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'annual_leave_days') THEN
    ALTER TABLE employees ADD COLUMN annual_leave_days integer DEFAULT 21;
    RAISE NOTICE '✓ Added annual_leave_days column';
  ELSE
    RAISE NOTICE '✓ annual_leave_days already exists';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'employees' 
                 AND column_name = 'sick_leave_days') THEN
    ALTER TABLE employees ADD COLUMN sick_leave_days integer DEFAULT 15;
    RAISE NOTICE '✓ Added sick_leave_days column';
  ELSE
    RAISE NOTICE '✓ sick_leave_days already exists';
  END IF;

  -- ========================================================================
  -- FAMILY INFORMATION (from previous migration, ensuring they exist)
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'father_name') THEN
    ALTER TABLE employees ADD COLUMN father_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'mother_name') THEN
    ALTER TABLE employees ADD COLUMN mother_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'spouse_name') THEN
    ALTER TABLE employees ADD COLUMN spouse_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'number_of_children') THEN
    ALTER TABLE employees ADD COLUMN number_of_children integer DEFAULT 0;
  END IF;

  -- ========================================================================
  -- EMERGENCY CONTACT
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact_name') THEN
    ALTER TABLE employees ADD COLUMN emergency_contact_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact_relationship') THEN
    ALTER TABLE employees ADD COLUMN emergency_contact_relationship text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact_phone') THEN
    ALTER TABLE employees ADD COLUMN emergency_contact_phone text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'emergency_contact_alternate') THEN
    ALTER TABLE employees ADD COLUMN emergency_contact_alternate text;
  END IF;

  -- ========================================================================
  -- EDUCATION
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'highest_qualification') THEN
    ALTER TABLE employees ADD COLUMN highest_qualification text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'institution') THEN
    ALTER TABLE employees ADD COLUMN institution text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'year_of_completion') THEN
    ALTER TABLE employees ADD COLUMN year_of_completion integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'specialization') THEN
    ALTER TABLE employees ADD COLUMN specialization text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'additional_qualifications') THEN
    ALTER TABLE employees ADD COLUMN additional_qualifications jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- ========================================================================
  -- PREVIOUS EMPLOYMENT
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'previous_employer') THEN
    ALTER TABLE employees ADD COLUMN previous_employer text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'previous_designation') THEN
    ALTER TABLE employees ADD COLUMN previous_designation text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'previous_employment_from') THEN
    ALTER TABLE employees ADD COLUMN previous_employment_from date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'previous_employment_to') THEN
    ALTER TABLE employees ADD COLUMN previous_employment_to date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'previous_salary') THEN
    ALTER TABLE employees ADD COLUMN previous_salary numeric(12,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'reason_for_leaving') THEN
    ALTER TABLE employees ADD COLUMN reason_for_leaving text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'total_experience_years') THEN
    ALTER TABLE employees ADD COLUMN total_experience_years numeric(4,1);
  END IF;

  -- ========================================================================
  -- SKILLS
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'skills') THEN
    ALTER TABLE employees ADD COLUMN skills jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'certifications') THEN
    ALTER TABLE employees ADD COLUMN certifications jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'languages_known') THEN
    ALTER TABLE employees ADD COLUMN languages_known jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- ========================================================================
  -- HEALTH & PERSONAL
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'medical_conditions') THEN
    ALTER TABLE employees ADD COLUMN medical_conditions text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'allergies') THEN
    ALTER TABLE employees ADD COLUMN allergies text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'disabilities') THEN
    ALTER TABLE employees ADD COLUMN disabilities text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'hobbies') THEN
    ALTER TABLE employees ADD COLUMN hobbies text;
  END IF;

  -- ========================================================================
  -- PROFESSIONAL LINKS
  -- ========================================================================
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'linkedin_url') THEN
    ALTER TABLE employees ADD COLUMN linkedin_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'github_url') THEN
    ALTER TABLE employees ADD COLUMN github_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'portfolio_url') THEN
    ALTER TABLE employees ADD COLUMN portfolio_url text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'professional_summary') THEN
    ALTER TABLE employees ADD COLUMN professional_summary text;
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
  'SUCCESS: Column exists' as status,
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'employees' 
  AND column_name IN (
    'accommodation_provided',
    'accommodation_address',
    'accommodation_type',
    'accommodation_allowance',
    'transportation_provided',
    'transportation_allowance',
    'food_allowance',
    'insurance_policy_number',
    'insurance_provider',
    'annual_leave_days',
    'sick_leave_days',
    'end_of_service_benefit_eligible',
    'other_allowances'
  )
ORDER BY column_name;
