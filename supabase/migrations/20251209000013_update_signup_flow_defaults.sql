/*
  # Update Signup Flow Defaults
  
  ## Changes
  - Updates `create_new_organization_flow` to insert default enabled features for new organizations.
  - Ensures 'dashboard', 'payroll', 'tasks', etc. are enabled by default.
*/

CREATE OR REPLACE FUNCTION create_new_organization_flow(
  p_user_id uuid,
  p_user_email text,
  p_org_name text,
  p_country text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
  v_subdomain text;
  v_plan_id uuid;
BEGIN
  -- 1. Generate Slug and Subdomain
  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_subdomain := v_slug || '-' || substr(md5(random()::text), 1, 6);

  -- 2. Create Organization
  INSERT INTO organizations (
    name,
    slug,
    subdomain,
    country,
    owner_id,
    trial_ends_at
  ) VALUES (
    p_org_name,
    v_subdomain,
    v_subdomain, -- utilizing subdomain as slug fallback if needed
    p_country,
    p_user_id,
    (now() + interval '14 days')
  )
  RETURNING id INTO v_org_id;

  -- 3. Create Organization Member (Admin)
  INSERT INTO organization_members (
    organization_id,
    user_id,
    role,
    is_active
  ) VALUES (
    v_org_id,
    p_user_id,
    'admin',
    true
  );

  -- 4. Create User Profile
  -- Check if profile exists first (trigger might have created it)
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = p_user_id) THEN
    INSERT INTO user_profiles (
      user_id,
      current_organization_id,
      role,
      is_active
    ) VALUES (
      p_user_id,
      v_org_id,
      'admin',
      true
    );
  ELSE
    UPDATE user_profiles
    SET current_organization_id = v_org_id, role = 'admin', is_active = true
    WHERE user_id = p_user_id;
  END IF;

  -- 5. Add Subscription (Starter Plan)
  SELECT id INTO v_plan_id FROM subscription_plans WHERE name = 'Starter' LIMIT 1;
  
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO organization_subscriptions (
      organization_id,
      plan_id,
      status,
      interval,
      amount,
      current_period_start,
      current_period_end,
      trial_start,
      trial_end
    ) VALUES (
      v_org_id,
      v_plan_id,
      'trial',
      'monthly',
      999,
      now(),
      (now() + interval '14 days'),
      now(),
      (now() + interval '14 days')
    );
  END IF;

  -- 6. Enable Default Features
  INSERT INTO organization_features (organization_id, feature_key, is_enabled)
  VALUES 
    (v_org_id, 'dashboard', true),
    (v_org_id, 'payroll', true),
    (v_org_id, 'reports', true),
    (v_org_id, 'tasks', true),
    (v_org_id, 'work-reports', true),
    (v_org_id, 'employees', true),
    (v_org_id, 'attendance', true),
    (v_org_id, 'leave', true),
    (v_org_id, 'expenses', true),
    (v_org_id, 'performance', true),
    (v_org_id, 'training', true),
    (v_org_id, 'helpdesk', true),
    (v_org_id, 'announcements', true),
    (v_org_id, 'help', true),
    (v_org_id, 'settings', true)
  ON CONFLICT (organization_id, feature_key) DO NOTHING;

  RETURN json_build_object(
    'organization_id', v_org_id,
    'slug', v_slug
  );
END;
$$;
