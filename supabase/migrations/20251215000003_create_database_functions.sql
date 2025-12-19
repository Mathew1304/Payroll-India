-- ============================================================
-- DATABASE FUNCTIONS FOR USER REGISTRATION AND MANAGEMENT
-- ============================================================

-- ============================================================
-- FUNCTION 1: Create New Organization Flow
-- Called during user registration to set up organization
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_new_organization_flow(
  p_user_id uuid,
  p_user_email text,
  p_org_name text,
  p_country text DEFAULT 'India'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  -- Generate a unique slug from organization name
  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  
  -- Make slug unique by appending random string if needed
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;

  -- 1. Create Organization
  INSERT INTO organizations (
    name,
    slug,
    country,
    currency,
    timezone,
    email,
    is_active,
    subscription_plan,
    subscription_status,
    created_by
  ) VALUES (
    p_org_name,
    v_slug,
    COALESCE(p_country, 'India'),
    CASE 
      WHEN p_country = 'Qatar' THEN 'QAR'
      WHEN p_country = 'Saudi Arabia' THEN 'SAR'
      WHEN p_country = 'UAE' THEN 'AED'
      ELSE 'INR'
    END,
    CASE 
      WHEN p_country = 'Qatar' THEN 'Asia/Qatar'
      WHEN p_country = 'Saudi Arabia' THEN 'Asia/Riyadh'
      WHEN p_country = 'UAE' THEN 'Asia/Dubai'
      ELSE 'Asia/Kolkata'
    END,
    p_user_email,
    true,
    'free',
    'trial',
    p_user_id
  ) RETURNING id INTO v_org_id;

  -- 2. Create User Profile
  INSERT INTO user_profiles (
    user_id,
    organization_id,
    full_name,
    email,
    role,
    is_active,
    is_onboarded,
    onboarded_at
  ) VALUES (
    p_user_id,
    v_org_id,
    split_part(p_user_email, '@', 1), -- Use email prefix as default name
    p_user_email,
    'admin', -- First user is admin
    true,
    true,
    now()
  );

  -- 3. Create default leave types for the organization
  INSERT INTO leave_types (organization_id, name, code, days_per_year, is_paid, is_encashable)
  VALUES 
    (v_org_id, 'Casual Leave', 'CL', 12, true, false),
    (v_org_id, 'Earned Leave', 'EL', 15, true, true),
    (v_org_id, 'Sick Leave', 'SL', 12, true, false),
    (v_org_id, 'Maternity Leave', 'ML', 180, true, false),
    (v_org_id, 'Paternity Leave', 'PL', 15, true, false);

  -- 4. Create default departments
  INSERT INTO departments (organization_id, name, code, is_active)
  VALUES 
    (v_org_id, 'Administration', 'ADMIN', true),
    (v_org_id, 'Human Resources', 'HR', true),
    (v_org_id, 'Finance', 'FIN', true),
    (v_org_id, 'Operations', 'OPS', true),
    (v_org_id, 'Sales', 'SALES', true),
    (v_org_id, 'Marketing', 'MKT', true),
    (v_org_id, 'IT', 'IT', true);

  -- 5. Create default designations
  INSERT INTO designations (organization_id, name, code, level, is_active)
  VALUES 
    (v_org_id, 'Chief Executive Officer', 'CEO', 10, true),
    (v_org_id, 'Chief Operating Officer', 'COO', 9, true),
    (v_org_id, 'Chief Financial Officer', 'CFO', 9, true),
    (v_org_id, 'Director', 'DIR', 8, true),
    (v_org_id, 'Manager', 'MGR', 7, true),
    (v_org_id, 'Senior Executive', 'SR-EXEC', 6, true),
    (v_org_id, 'Executive', 'EXEC', 5, true),
    (v_org_id, 'Senior Associate', 'SR-ASSOC', 4, true),
    (v_org_id, 'Associate', 'ASSOC', 3, true),
    (v_org_id, 'Trainee', 'TRAINEE', 2, true),
    (v_org_id, 'Intern', 'INTERN', 1, true);

  -- 6. Create default expense categories
  INSERT INTO expense_categories (organization_id, name, requires_receipt, is_active)
  VALUES 
    (v_org_id, 'Travel', true, true),
    (v_org_id, 'Meals & Entertainment', true, true),
    (v_org_id, 'Office Supplies', true, true),
    (v_org_id, 'Accommodation', true, true),
    (v_org_id, 'Communication', true, true),
    (v_org_id, 'Training', true, true),
    (v_org_id, 'Other', true, true);

  -- 7. Create default ticket categories
  INSERT INTO ticket_categories (organization_id, name, sla_hours, is_active)
  VALUES 
    (v_org_id, 'IT Support', 24, true),
    (v_org_id, 'HR Query', 48, true),
    (v_org_id, 'Payroll Issue', 24, true),
    (v_org_id, 'Leave Request', 48, true),
    (v_org_id, 'General Query', 72, true);

  -- 8. Create default goal types
  INSERT INTO goal_types (organization_id, name, is_active)
  VALUES 
    (v_org_id, 'Sales Target', true),
    (v_org_id, 'Project Delivery', true),
    (v_org_id, 'Skill Development', true),
    (v_org_id, 'Customer Satisfaction', true),
    (v_org_id, 'Process Improvement', true);

  -- 9. Create India payroll config if country is India
  IF p_country = 'India' THEN
    INSERT INTO india_payroll_config (
      organization_id,
      default_working_days_per_month,
      pf_employee_rate,
      pf_employer_rate,
      pf_wage_ceiling,
      esi_employee_rate,
      esi_employer_rate,
      esi_wage_ceiling,
      pt_state,
      ot_rate_multiplier,
      gratuity_eligibility_years,
      created_by
    ) VALUES (
      v_org_id,
      26,
      0.12,
      0.12,
      15000,
      0.0075,
      0.0325,
      21000,
      'Maharashtra',
      2.00,
      5,
      p_user_id
    );
  END IF;

  -- Log successful creation
  RAISE NOTICE 'Organization % created successfully with ID: %', p_org_name, v_org_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
END;
$$;

-- ============================================================
-- FUNCTION 2: Link Employee to User (For Employee Registration)
-- ============================================================

CREATE OR REPLACE FUNCTION public.link_employee_to_user(
  invitation_code_param text,
  user_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation record;
  v_employee_id uuid;
  v_organization_id uuid;
BEGIN
  -- 1. Find and validate invitation
  SELECT * INTO v_invitation
  FROM employee_invitations
  WHERE invitation_code = invitation_code_param
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation code'
    );
  END IF;

  v_employee_id := v_invitation.employee_id;
  v_organization_id := v_invitation.organization_id;

  -- 2. Update employee record with user_id
  UPDATE employees
  SET user_id = user_id_param,
      updated_at = now()
  WHERE id = v_employee_id;

  -- 3. Create or update user profile
  INSERT INTO user_profiles (
    user_id,
    organization_id,
    employee_id,
    email,
    role,
    is_active,
    is_onboarded,
    onboarded_at
  ) VALUES (
    user_id_param,
    v_organization_id,
    v_employee_id,
    v_invitation.email,
    'employee',
    true,
    true,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    organization_id = v_organization_id,
    employee_id = v_employee_id,
    is_onboarded = true,
    onboarded_at = now();

  -- 4. Mark invitation as accepted
  UPDATE employee_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE invitation_code = invitation_code_param;

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', v_employee_id,
    'organization_id', v_organization_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================
-- FUNCTION 3: Get User Organization (Helper Function)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_organization(user_id_param uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM user_profiles 
  WHERE user_id = user_id_param 
  LIMIT 1;
$$;

-- ============================================================
-- FUNCTION 4: Check if User is Admin (Helper Function)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_id_param 
    AND role IN ('admin', 'hr_manager', 'super_admin')
  );
$$;

-- ============================================================
-- FUNCTION 5: Auto-generate Employee Code
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_employee_code(org_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_code text;
BEGIN
  -- Get count of employees in organization
  SELECT COUNT(*) INTO v_count
  FROM employees
  WHERE organization_id = org_id;

  -- Generate code like EMP001, EMP002, etc.
  v_code := 'EMP' || LPAD((v_count + 1)::text, 4, '0');

  -- Check if code exists, if yes increment
  WHILE EXISTS (SELECT 1 FROM employees WHERE organization_id = org_id AND employee_code = v_code) LOOP
    v_count := v_count + 1;
    v_code := 'EMP' || LPAD((v_count + 1)::text, 4, '0');
  END LOOP;

  RETURN v_code;
END;
$$;

-- ============================================================
-- TABLE: Employee Invitations (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  
  invitation_code text UNIQUE NOT NULL,
  email text NOT NULL,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  expires_at timestamptz,
  accepted_at timestamptz,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "employee_invitations_org_manage" ON employee_invitations;
CREATE POLICY "employee_invitations_org_manage"
  ON employee_invitations FOR ALL
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

-- Allow public read for verification (by invitation code only)
DROP POLICY IF EXISTS "employee_invitations_public_verify" ON employee_invitations;
CREATE POLICY "employee_invitations_public_verify"
  ON employee_invitations FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions
GRANT ALL ON employee_invitations TO authenticated;

-- Create index
CREATE INDEX IF NOT EXISTS idx_employee_invitations_code ON employee_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_org ON employee_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON employee_invitations(status);

-- ============================================================
-- GRANT EXECUTE PERMISSIONS ON FUNCTIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.create_new_organization_flow TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_employee_to_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_employee_code TO authenticated;

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.create_new_organization_flow IS 'Creates a new organization with default settings during user registration';
COMMENT ON FUNCTION public.link_employee_to_user IS 'Links an employee record to a user account using invitation code';
COMMENT ON FUNCTION public.get_user_organization IS 'Returns the organization ID for a given user';
COMMENT ON FUNCTION public.is_user_admin IS 'Checks if a user has admin privileges';
COMMENT ON FUNCTION public.generate_employee_code IS 'Auto-generates unique employee code for an organization';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

