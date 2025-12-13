-- SAFE MIGRATION TO ADD ALL COMPREHENSIVE EMPLOYEE FIELDS
-- Run this in your Supabase SQL Editor to ensure all columns exist.
-- It checks if columns exist before adding them, so it's safe to run multiple times.

DO $$
BEGIN
  -- 1. Family Information
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

  -- 2. Emergency Contact
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

  -- 3. Education
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

  -- 4. Previous Employment
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

  -- 5. Skills
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'skills') THEN
    ALTER TABLE employees ADD COLUMN skills jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'certifications') THEN
    ALTER TABLE employees ADD COLUMN certifications jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'languages_known') THEN
    ALTER TABLE employees ADD COLUMN languages_known jsonb DEFAULT '[]'::jsonb;
  END IF;

  -- 6. Qatar Specific
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'qatar_id') THEN
    ALTER TABLE employees ADD COLUMN qatar_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'qatar_id_expiry') THEN
    ALTER TABLE employees ADD COLUMN qatar_id_expiry date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'residence_permit_number') THEN
    ALTER TABLE employees ADD COLUMN residence_permit_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'residence_permit_expiry') THEN
    ALTER TABLE employees ADD COLUMN residence_permit_expiry date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_permit_number') THEN
    ALTER TABLE employees ADD COLUMN work_permit_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_permit_expiry') THEN
    ALTER TABLE employees ADD COLUMN work_permit_expiry date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'health_card_number') THEN
    ALTER TABLE employees ADD COLUMN health_card_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'health_card_expiry') THEN
    ALTER TABLE employees ADD COLUMN health_card_expiry date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'sponsor_name') THEN
    ALTER TABLE employees ADD COLUMN sponsor_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'labor_card_number') THEN
    ALTER TABLE employees ADD COLUMN labor_card_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'labor_card_expiry') THEN
    ALTER TABLE employees ADD COLUMN labor_card_expiry date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_issue_date') THEN
    ALTER TABLE employees ADD COLUMN visa_issue_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_sponsor') THEN
    ALTER TABLE employees ADD COLUMN visa_sponsor text;
  END IF;
  
  -- 7. Allowances (Critical)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'accommodation_allowance') THEN
    ALTER TABLE employees ADD COLUMN accommodation_allowance numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'transportation_allowance') THEN
    ALTER TABLE employees ADD COLUMN transportation_allowance numeric(10,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'food_allowance') THEN
    ALTER TABLE employees ADD COLUMN food_allowance numeric(10,2);
  END IF;
  
  -- 8. Missing Basic Fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'nationality') THEN
    ALTER TABLE employees ADD COLUMN nationality text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_number') THEN
    ALTER TABLE employees ADD COLUMN visa_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_expiry') THEN
    ALTER TABLE employees ADD COLUMN visa_expiry date;
  END IF;

END $$;
