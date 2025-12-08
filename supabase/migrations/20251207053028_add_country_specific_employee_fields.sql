/*
  # Add Country-Specific Employee Profile Fields

  ## Overview
  Add comprehensive country-specific fields for Qatar, Saudi Arabia, and India
  to support complete employee record management per regional requirements.

  ## Qatar-Specific Fields
  - Qatar ID details and expiry
  - Residence Permit (RP) details
  - Work permit details
  - Health card information
  - Sponsor information
  - Labor card details
  - Medical fitness certificate
  - Police clearance details
  - Accommodation details (provided by company)
  - Contract type and duration

  ## Saudi Arabia-Specific Fields
  - Muqeem ID
  - Kafala/sponsor details
  - Medical insurance details
  - Accommodation information
  - Contract type (limited/unlimited)
  - Jawazat details
  - Absher ID

  ## India-Specific Fields
  - Professional Tax registration
  - Provident Fund (PF) details
  - Gratuity eligibility
  - Labour Welfare Fund
  - Insurance policy details

  ## Common Employment Fields
  - Contract start and end dates
  - Probation details
  - Notice period
  - Insurance details
  - Medical fitness details
  - Accommodation information
  - Transportation allowance
  - Food allowance
  - Other benefits

  ## Security
  - All fields optional and can be filled during onboarding
  - Sensitive fields only accessible to HR/Admin
  - Document expiry dates indexed for tracking
*/

-- Qatar-specific fields
DO $$
BEGIN
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
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'sponsor_id') THEN
    ALTER TABLE employees ADD COLUMN sponsor_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'labor_card_number') THEN
    ALTER TABLE employees ADD COLUMN labor_card_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'labor_card_expiry') THEN
    ALTER TABLE employees ADD COLUMN labor_card_expiry date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'medical_fitness_certificate') THEN
    ALTER TABLE employees ADD COLUMN medical_fitness_certificate text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'medical_fitness_expiry') THEN
    ALTER TABLE employees ADD COLUMN medical_fitness_expiry date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'police_clearance_certificate') THEN
    ALTER TABLE employees ADD COLUMN police_clearance_certificate text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'police_clearance_expiry') THEN
    ALTER TABLE employees ADD COLUMN police_clearance_expiry date;
  END IF;
END $$;

-- Saudi Arabia-specific fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'muqeem_id') THEN
    ALTER TABLE employees ADD COLUMN muqeem_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'kafala_sponsor_name') THEN
    ALTER TABLE employees ADD COLUMN kafala_sponsor_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'kafala_sponsor_id') THEN
    ALTER TABLE employees ADD COLUMN kafala_sponsor_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'jawazat_number') THEN
    ALTER TABLE employees ADD COLUMN jawazat_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'absher_id') THEN
    ALTER TABLE employees ADD COLUMN absher_id text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'medical_insurance_number') THEN
    ALTER TABLE employees ADD COLUMN medical_insurance_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'medical_insurance_provider') THEN
    ALTER TABLE employees ADD COLUMN medical_insurance_provider text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'medical_insurance_expiry') THEN
    ALTER TABLE employees ADD COLUMN medical_insurance_expiry date;
  END IF;
END $$;

-- India-specific fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'professional_tax_number') THEN
    ALTER TABLE employees ADD COLUMN professional_tax_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pf_account_number') THEN
    ALTER TABLE employees ADD COLUMN pf_account_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'pf_uan') THEN
    ALTER TABLE employees ADD COLUMN pf_uan text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'gratuity_nominee_name') THEN
    ALTER TABLE employees ADD COLUMN gratuity_nominee_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'gratuity_nominee_relationship') THEN
    ALTER TABLE employees ADD COLUMN gratuity_nominee_relationship text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'lwf_number') THEN
    ALTER TABLE employees ADD COLUMN lwf_number text;
  END IF;
END $$;

-- Common employment and accommodation fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'contract_start_date') THEN
    ALTER TABLE employees ADD COLUMN contract_start_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'contract_end_date') THEN
    ALTER TABLE employees ADD COLUMN contract_end_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'contract_duration_months') THEN
    ALTER TABLE employees ADD COLUMN contract_duration_months integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'notice_period_days') THEN
    ALTER TABLE employees ADD COLUMN notice_period_days integer DEFAULT 30;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'accommodation_provided') THEN
    ALTER TABLE employees ADD COLUMN accommodation_provided boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'accommodation_address') THEN
    ALTER TABLE employees ADD COLUMN accommodation_address text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'accommodation_type') THEN
    ALTER TABLE employees ADD COLUMN accommodation_type text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'accommodation_allowance') THEN
    ALTER TABLE employees ADD COLUMN accommodation_allowance numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'transportation_provided') THEN
    ALTER TABLE employees ADD COLUMN transportation_provided boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'transportation_allowance') THEN
    ALTER TABLE employees ADD COLUMN transportation_allowance numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'food_allowance') THEN
    ALTER TABLE employees ADD COLUMN food_allowance numeric(10,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'other_allowances') THEN
    ALTER TABLE employees ADD COLUMN other_allowances jsonb DEFAULT '[]'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'insurance_policy_number') THEN
    ALTER TABLE employees ADD COLUMN insurance_policy_number text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'insurance_provider') THEN
    ALTER TABLE employees ADD COLUMN insurance_provider text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'insurance_coverage_amount') THEN
    ALTER TABLE employees ADD COLUMN insurance_coverage_amount numeric(12,2);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'insurance_expiry') THEN
    ALTER TABLE employees ADD COLUMN insurance_expiry date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'dependents_covered') THEN
    ALTER TABLE employees ADD COLUMN dependents_covered integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'end_of_service_benefit_eligible') THEN
    ALTER TABLE employees ADD COLUMN end_of_service_benefit_eligible boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'annual_leave_days') THEN
    ALTER TABLE employees ADD COLUMN annual_leave_days integer DEFAULT 21;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'sick_leave_days') THEN
    ALTER TABLE employees ADD COLUMN sick_leave_days integer DEFAULT 15;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'religion') THEN
    ALTER TABLE employees ADD COLUMN religion text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'place_of_birth') THEN
    ALTER TABLE employees ADD COLUMN place_of_birth text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_issue_date') THEN
    ALTER TABLE employees ADD COLUMN passport_issue_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'passport_issue_place') THEN
    ALTER TABLE employees ADD COLUMN passport_issue_place text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_issue_date') THEN
    ALTER TABLE employees ADD COLUMN visa_issue_date date;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'visa_sponsor') THEN
    ALTER TABLE employees ADD COLUMN visa_sponsor text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'work_location') THEN
    ALTER TABLE employees ADD COLUMN work_location text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'job_grade') THEN
    ALTER TABLE employees ADD COLUMN job_grade text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'job_level') THEN
    ALTER TABLE employees ADD COLUMN job_level text;
  END IF;
END $$;

-- Create indexes for document expiry tracking
CREATE INDEX IF NOT EXISTS idx_employees_qatar_id_expiry ON employees(qatar_id_expiry) WHERE qatar_id_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_rp_expiry ON employees(residence_permit_expiry) WHERE residence_permit_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_work_permit_expiry ON employees(work_permit_expiry) WHERE work_permit_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_health_card_expiry ON employees(health_card_expiry) WHERE health_card_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_labor_card_expiry ON employees(labor_card_expiry) WHERE labor_card_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_medical_fitness_expiry ON employees(medical_fitness_expiry) WHERE medical_fitness_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_police_clearance_expiry ON employees(police_clearance_expiry) WHERE police_clearance_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_medical_insurance_expiry ON employees(medical_insurance_expiry) WHERE medical_insurance_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_insurance_expiry ON employees(insurance_expiry) WHERE insurance_expiry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_contract_end ON employees(contract_end_date) WHERE contract_end_date IS NOT NULL;

-- Create index for country-specific filtering
CREATE INDEX IF NOT EXISTS idx_employees_org_country ON employees(organization_id) WHERE organization_id IS NOT NULL;
