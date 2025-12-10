/*
  # Create Error Logs System
  
  ## Purpose
  Create a table to store application errors for debugging by Super Admins.
  
  ## Schema
  - Detailed schema as requested by the user.
  
  ## RLS Policies
  - INSERT: Authenticated users can insert their own logs.
  - SELECT: Super Admins can view ALL logs.
  - UPDATE: Super Admins can resolve logs.
*/

-- Drop the table if it already exists to ensure schema consistency
DROP TABLE IF EXISTS error_logs;

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
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
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX idx_error_logs_org ON error_logs(organization_id);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_resolved ON error_logs(is_resolved);

-- Enable RLS
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

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

-- Users can insert their own error logs
CREATE POLICY "Users can insert error logs"
ON error_logs FOR INSERT TO authenticated
WITH CHECK (
  -- Allow users to insert if they tag themselves correctly, OR if user_id is null (system error)
  (auth.uid() = user_id) OR (user_id IS NULL)
);

