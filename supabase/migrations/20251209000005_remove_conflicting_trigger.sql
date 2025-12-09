-- Remove conflicting trigger that auto-creates organizations
-- This trigger (created in 20251208173000_add_user_onboarding_trigger.sql) overrides the frontend signup flow,
-- causing the organization name to be ignored and defaulted to the email prefix.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
