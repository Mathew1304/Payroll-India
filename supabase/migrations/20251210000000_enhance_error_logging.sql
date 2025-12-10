/*
  # Enhance Error Logging System
  
  ## Changes
  1. Add columns for deduplication:
     - occurrence_count (default 1)
     - last_occurred_at (default now())
     - updated_at (default now())
  
  2. Create a secure RPC function `log_error` to handle logging:
     - Bypasses RLS (SECURITY DEFINER) to allow logging from unauthenticated states (login page, etc.)
     - Implements deduplication logic: if an unresolved error with the same message and stack exists, update it instead of inserting.
*/

-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'occurrence_count') THEN
    ALTER TABLE error_logs ADD COLUMN occurrence_count INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'last_occurred_at') THEN
    ALTER TABLE error_logs ADD COLUMN last_occurred_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'error_logs' AND column_name = 'updated_at') THEN
    ALTER TABLE error_logs ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Create the log_error function
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
SECURITY DEFINER -- Run as owner to bypass RLS for inserts
SET search_path = public -- Secure search path
AS $$
DECLARE
  v_existing_id UUID;
BEGIN
  -- Check for existing unresolved error with same message and stack (or type if stack is null)
  -- We group by organization_id to keep errors separate per org, but global errors (null org) are grouped together
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
      -- Update user info to the latest user who encountered it
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

-- Grant execute permission to everyone (including anon for login errors)
GRANT EXECUTE ON FUNCTION log_error TO anon, authenticated, service_role;
