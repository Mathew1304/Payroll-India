/*
  # Add Comprehensive Employee Profile Fields

  ## Overview
  Add additional employee profile fields for a complete HR profile including:
  - Family information
  - Emergency contacts
  - Educational qualifications
  - Previous employment history
  - Skills, certifications, and languages
  - Document expiry tracking
  - Health and other personal information

  ## New Fields Added
  
  ### Family Information
  - `father_name` (text) - Father's full name
  - `mother_name` (text) - Mother's full name
  - `spouse_name` (text) - Spouse's name (if married)
  - `number_of_children` (integer) - Number of dependent children
  
  ### Emergency Contact
  - `emergency_contact_name` (text) - Emergency contact person name
  - `emergency_contact_relationship` (text) - Relationship with employee
  - `emergency_contact_phone` (text) - Emergency contact phone number
  - `emergency_contact_alternate` (text) - Alternate emergency contact number
  
  ### Education
  - `highest_qualification` (text) - Highest education degree/diploma
  - `institution` (text) - Name of institution/university
  - `year_of_completion` (integer) - Year of completion
  - `specialization` (text) - Field of study/specialization
  - `additional_qualifications` (jsonb) - Array of additional qualifications
  
  ### Previous Employment
  - `previous_employer` (text) - Last employer name
  - `previous_designation` (text) - Previous job title
  - `previous_employment_from` (date) - Previous employment start date
  - `previous_employment_to` (date) - Previous employment end date
  - `previous_salary` (numeric) - Previous CTC/salary
  - `reason_for_leaving` (text) - Reason for leaving previous job
  - `total_experience_years` (numeric) - Total years of experience
  
  ### Skills & Certifications
  - `skills` (jsonb) - Array of skills
  - `certifications` (jsonb) - Array of certifications with details
  - `languages_known` (jsonb) - Array of languages with proficiency
  
  ### Documents & IDs
  - `passport_expiry` (date) - Passport expiration date
  - `pan_expiry` (date) - PAN card expiry (if applicable)
  - `driving_license_number` (text) - Driving license number
  - `driving_license_expiry` (date) - DL expiry date
  
  ### Health & Personal
  - `medical_conditions` (text) - Any medical conditions to be aware of
  - `allergies` (text) - Known allergies
  - `disabilities` (text) - Any disabilities requiring accommodation
  - `hobbies` (text) - Personal hobbies and interests
  
  ### Professional
  - `linkedin_url` (text) - LinkedIn profile URL
  - `github_url` (text) - GitHub profile URL
  - `portfolio_url` (text) - Personal portfolio/website URL
  - `professional_summary` (text) - Brief professional summary/bio
  
  ## Security
  - All fields are optional and can be filled by employees during onboarding
  - Sensitive data (medical, disabilities) should only be visible to HR/Admin
  - RLS policies remain unchanged, leveraging existing organization-based access
*/

-- Add family information fields
DO $$
BEGIN
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
END $$;

-- Add emergency contact fields
DO $$
BEGIN
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
END $$;

-- Add education fields
DO $$
BEGIN
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
END $$;

-- Add previous employment fields
DO $$
BEGIN
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
END $$;

-- Add skills, certifications, languages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'skills') THEN
    ALTER TABLE employees ADD COLUMN skills jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'certifications') THEN
    ALTER TABLE employees ADD COLUMN certifications jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'languages_known') THEN
    ALTER TABLE employees ADD COLUMN languages_known jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add document expiry fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_expiry') THEN
    ALTER TABLE employees ADD COLUMN passport_expiry date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pan_expiry') THEN
    ALTER TABLE employees ADD COLUMN pan_expiry date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'driving_license_number') THEN
    ALTER TABLE employees ADD COLUMN driving_license_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'driving_license_expiry') THEN
    ALTER TABLE employees ADD COLUMN driving_license_expiry date;
  END IF;
END $$;

-- Add health and personal fields
DO $$
BEGIN
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
END $$;

-- Add professional profile fields
DO $$
BEGIN
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
END $$;

-- Create index for document expiry tracking
CREATE INDEX IF NOT EXISTS idx_employees_passport_expiry ON employees(passport_expiry) WHERE passport_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_visa_expiry ON employees(visa_expiry) WHERE visa_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_iqama_expiry ON employees(iqama_expiry) WHERE iqama_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_dl_expiry ON employees(driving_license_expiry) WHERE driving_license_expiry IS NOT NULL;
