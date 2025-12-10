/*
  # Fix Error Logs Schema
  
  ## Purpose
  The existing `error_logs` table seems to have an incorrect schema (e.g., missing `error_message`, has `error_code`).
  This migration will:
  1. Drop the existing `error_logs` table and `log_error` function to ensure a clean slate.
  2. Recreate the `error_logs` table with the correct columns.
  3. Recreate the `log_error` function with the correct logic.
  
  ## Changes
  - Re-creates table `error_logs`
  - Re-creates function `log_error`
*/

-- 1. Clean up existing objects
DROP FUNCTION IF EXISTS log_error;
DROP TABLE IF EXISTS error_logs;

-- 2. Create error_logs table with correct schema
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  organization_name TEXT,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_type TEXT,
  page_url TEXT,
  user_agent TEXT,
  severity TEXT DEFAULT 'error', -- 'error', 'warning', 'critical'
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_occurred_at TIMESTAMPTZ DEFAULT NOW(),
  occurrence_count INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Create Indexes
CREATE INDEX idx_error_logs_org ON error_logs(organization_id);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(is_resolved);

-- 4. Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Super admins can view all error logs
CREATE POLICY "Super admins can view all error logs"
ON error_logs FOR SELECT TO authenticated
USING (
  get_auth_user_role() = 'super_admin'
);

-- Super admins can update error logs (mark as resolved)
CREATE POLICY "Super admins can update error logs"
ON error_logs FOR UPDATE TO authenticated
USING (
  get_auth_user_role() = 'super_admin'
)
WITH CHECK (
  get_auth_user_role() = 'super_admin'
);

-- Users can insert their own error logs (fallback if RPC not used)
CREATE POLICY "Users can insert error logs"
ON error_logs FOR INSERT TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR (user_id IS NULL)
);

-- 6. Create the log_error function (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION log_error(
  p_error_message TEXT,
  p_error_stack TEXT DEFAULT NULL,
  p_error_type TEXT DEFAULT 'Error',
  p_page_url TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_user_email TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_organization_name TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'error',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Check for existing unresolved error with same message and stack
  SELECT id INTO v_existing_id
  FROM error_logs
  WHERE error_message = p_error_message
    AND (error_stack = p_error_stack OR (error_stack IS NULL AND p_error_stack IS NULL))
    AND (organization_id = p_organization_id OR (organization_id IS NULL AND p_organization_id IS NULL))
    AND is_resolved = false
  ORDER BY last_occurred_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing error
    UPDATE error_logs
    SET 
      occurrence_count = occurrence_count + 1,
      last_occurred_at = NOW(),
      updated_at = NOW(),
      user_id = COALESCE(p_user_id, user_id),
      user_email = COALESCE(p_user_email, user_email),
      user_name = COALESCE(p_user_name, user_name),
      page_url = COALESCE(p_page_url, page_url),
      user_agent = COALESCE(current_setting('request.headers', true)::json->>'user-agent', user_agent)
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  ELSE
    -- Insert new error
    INSERT INTO error_logs (
      organization_id,
      user_id,
      user_email,
      user_name,
      organization_name,
      error_message,
      error_stack,
      error_type,
      page_url,
      user_agent,
      severity,
      metadata,
      occurrence_count,
      last_occurred_at
    ) VALUES (
      p_organization_id,
      p_user_id,
      p_user_email,
      p_user_name,
      p_organization_name,
      p_error_message,
      p_error_stack,
      p_error_type,
      p_page_url,
      current_setting('request.headers', true)::json->>'user-agent',
      p_severity,
      p_metadata,
      1,
      NOW()
    )
    RETURNING id INTO v_existing_id;
    
    RETURN v_existing_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_error TO anon, authenticated, service_role;
