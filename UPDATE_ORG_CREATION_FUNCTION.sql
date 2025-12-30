-- ============================================================
-- UPDATE ORGANIZATION CREATION TO AUTO-ENABLE ALL FEATURES
-- This ensures new organizations get all features enabled by default
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
    split_part(p_user_email, '@', 1),
    p_user_email,
    'admin',
    true,
    true,
    now()
  );

  -- 3. Create default organization features (NEW!)
  INSERT INTO organization_features (organization_id, feature_key, is_enabled)
  VALUES 
    (v_org_id, 'dashboard', true),
    (v_org_id, 'employees', true),
    (v_org_id, 'attendance', true),
    (v_org_id, 'leave', true),
    (v_org_id, 'payroll', true),
    (v_org_id, 'reports', true),
    (v_org_id, 'tasks', true),
    (v_org_id, 'expenses', true),
    (v_org_id, 'work-reports', true),
    (v_org_id, 'helpdesk', true),
    (v_org_id, 'performance', true),
    (v_org_id, 'training', true);

  -- 4. Create default leave types
  INSERT INTO leave_types (organization_id, name, code, days_per_year, is_paid, is_encashable)
  VALUES 
    (v_org_id, 'Casual Leave', 'CL', 12, true, false),
    (v_org_id, 'Earned Leave', 'EL', 15, true, true),
    (v_org_id, 'Sick Leave', 'SL', 12, true, false),
    (v_org_id, 'Maternity Leave', 'ML', 180, true, false),
    (v_org_id, 'Paternity Leave', 'PL', 15, true, false);

  -- 5. Create default departments
  INSERT INTO departments (organization_id, name, code, is_active)
  VALUES 
    (v_org_id, 'Administration', 'ADMIN', true),
    (v_org_id, 'Human Resources', 'HR', true),
    (v_org_id, 'Finance', 'FIN', true),
    (v_org_id, 'Operations', 'OPS', true),
    (v_org_id, 'Sales', 'SALES', true),
    (v_org_id, 'Marketing', 'MKT', true),
    (v_org_id, 'IT', 'IT', true);

  -- 6. Create default designations
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

  -- 7. Create default expense categories
  INSERT INTO expense_categories (organization_id, name, requires_receipt, is_active)
  VALUES 
    (v_org_id, 'Travel', true, true),
    (v_org_id, 'Meals & Entertainment', true, true),
    (v_org_id, 'Office Supplies', true, true),
    (v_org_id, 'Accommodation', true, true),
    (v_org_id, 'Communication', true, true),
    (v_org_id, 'Training', true, true),
    (v_org_id, 'Other', true, true);

  -- 8. Create default ticket categories
  INSERT INTO ticket_categories (organization_id, name, sla_hours, is_active)
  VALUES 
    (v_org_id, 'IT Support', 24, true),
    (v_org_id, 'HR Query', 48, true),
    (v_org_id, 'Payroll Issue', 24, true),
    (v_org_id, 'Leave Request', 48, true),
    (v_org_id, 'General Query', 72, true);

  -- 9. Create default goal types
  INSERT INTO goal_types (organization_id, name, is_active)
  VALUES 
    (v_org_id, 'Sales Target', true),
    (v_org_id, 'Project Delivery', true),
    (v_org_id, 'Skill Development', true),
    (v_org_id, 'Customer Satisfaction', true),
    (v_org_id, 'Process Improvement', true);

  -- 10. Create India payroll config if country is India
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

SELECT 'Organization creation function updated! New signups will get all features.' as message;
