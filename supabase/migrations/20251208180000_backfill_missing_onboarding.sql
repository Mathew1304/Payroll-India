/*
  # Backfill Missing Onboarding Data

  ## Problem
  Existing users who signed up before the onboarding trigger was added do not have:
  - Organization
  - User Profile
  - Organization Membership
  
  ## Solution
  Run a one-time script to backfill this data for any user in `auth.users` who does not have a corresponding `user_profiles` entry.
*/

DO $$
DECLARE
  missing_user RECORD;
  new_org_id uuid;
  org_name text;
  org_slug text;
BEGIN
  -- Loop through users who don't have a profile
  FOR missing_user IN 
    SELECT id, email 
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.user_id = u.id)
  LOOP
    
    -- 1. Determine Organization Name and Slug
    org_name := COALESCE(SPLIT_PART(missing_user.email, '@', 1), 'My Organization');
    org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-z0-9]+', '-', 'g')) || '-' || SUBSTRING(missing_user.id::text, 1, 8);

    -- 2. Create Organization
    INSERT INTO organizations (
      name,
      slug,
      subdomain,
      owner_id,
      trial_ends_at,
      is_active
    ) VALUES (
      org_name,
      org_slug,
      org_slug,
      missing_user.id,
      NOW() + INTERVAL '14 days',
      true
    )
    RETURNING id INTO new_org_id;

    -- 3. Create Default Subscription
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
    )
    SELECT
      new_org_id,
      id,
      'trial',
      'monthly',
      0,
      NOW(),
      NOW() + INTERVAL '14 days',
      NOW(),
      NOW() + INTERVAL '14 days'
    FROM subscription_plans
    WHERE name = 'Starter'
    LIMIT 1;

    -- 4. Create User Profile
    INSERT INTO user_profiles (
      user_id,
      role,
      current_organization_id,
      is_active
    ) VALUES (
      missing_user.id,
      'admin',
      new_org_id,
      true
    );

    -- 5. Add User as Organization Member
    INSERT INTO organization_members (
      organization_id,
      user_id,
      role,
      is_active
    ) VALUES (
      new_org_id,
      missing_user.id,
      'admin',
      true
    );

    RAISE NOTICE 'Backfilled data for user: %', missing_user.email;
  END LOOP;
END $$;
