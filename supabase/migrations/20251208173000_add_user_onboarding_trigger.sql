/*
  # Add User Onboarding Trigger

  ## Problem
  New users signing up via Supabase Auth do not have an organization or user profile created automatically.
  This results in a "User role not assigned" error and a blank dashboard.

  ## Solution
  Create a trigger on `auth.users` that executes a function `handle_new_user` to:
  1. Create a new Organization for the user (using their email domain or a default name).
  2. Create a default Subscription for that organization.
  3. Create a User Profile linked to the new organization.
  4. assign the user as an Admin of that organization.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  org_slug text;
BEGIN
  -- 1. Determine Organization Name and Slug from Email
  org_name := COALESCE(SPLIT_PART(NEW.email, '@', 1), 'My Organization');
  -- Create a unique slug: name-userid_prefix
  org_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-z0-9]+', '-', 'g')) || '-' || SUBSTRING(NEW.id::text, 1, 8);

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
    org_slug, -- Use slug as default subdomain
    NEW.id,
    NOW() + INTERVAL '14 days',
    true
  )
  RETURNING id INTO new_org_id;

  -- 3. Create Default Subscription (Starter Plan)
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
    0, -- Trial amount
    NOW(),
    NOW() + INTERVAL '14 days',
    NOW(),
    NOW() + INTERVAL '14 days'
  FROM subscription_plans
  WHERE name = 'Starter' -- Ensure 'Starter' plan exists in seed data
  LIMIT 1;

  -- 4. Create User Profile
  INSERT INTO user_profiles (
    user_id,
    role,
    current_organization_id,
    is_active
  ) VALUES (
    NEW.id,
    'admin', -- New signups are always admins of their own org
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
    NEW.id,
    'admin',
    true
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block auth (optional, but good for debugging)
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
