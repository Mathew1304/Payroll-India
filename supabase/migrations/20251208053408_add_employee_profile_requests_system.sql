/*
  # Employee Profile Request System

  1. New Tables
    - `employee_profile_requests`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key to employees)
      - `requested_by` (uuid, foreign key to auth.users)
      - `requested_at` (timestamptz)
      - `completed_at` (timestamptz, nullable)
      - `status` (text: 'pending', 'completed', 'cancelled')
      - `message` (text, nullable)
      - `missing_fields` (jsonb, array of field names)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Notifications Table
    - `employee_notifications`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key to employees)
      - `user_id` (uuid, foreign key to auth.users, nullable)
      - `type` (text: 'profile_update_request', 'payslip', 'leave_approval', etc.)
      - `title` (text)
      - `message` (text)
      - `is_read` (boolean, default false)
      - `related_id` (uuid, nullable - can reference profile_requests, etc.)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on both tables
    - Admins/HR can create requests
    - Employees can view their own requests and notifications
    - Employees can update their requests to 'completed'

  4. Indexes
    - Index on employee_id for fast lookups
    - Index on status for filtering
    - Index on user_id for notifications
*/

-- Create employee_profile_requests table
CREATE TABLE IF NOT EXISTS employee_profile_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  message text,
  missing_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create employee_notifications table
CREATE TABLE IF NOT EXISTS employee_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  related_id uuid,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_requests_employee ON employee_profile_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_profile_requests_status ON employee_profile_requests(status);
CREATE INDEX IF NOT EXISTS idx_profile_requests_org ON employee_profile_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_employee ON employee_notifications(employee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON employee_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON employee_notifications(is_read, employee_id);

-- Enable RLS
ALTER TABLE employee_profile_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_profile_requests

-- Admins/HR can view all requests in their organization
CREATE POLICY "Admins can view profile requests"
  ON employee_profile_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = employee_profile_requests.organization_id
      AND organization_members.role IN ('admin', 'hr')
      AND organization_members.is_active = true
    )
  );

-- Employees can view their own profile requests
CREATE POLICY "Employees can view own profile requests"
  ON employee_profile_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_profile_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Admins/HR can create profile requests
CREATE POLICY "Admins can create profile requests"
  ON employee_profile_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = employee_profile_requests.organization_id
      AND organization_members.role IN ('admin', 'hr')
      AND organization_members.is_active = true
    )
  );

-- Employees can update their own requests (mark as completed)
CREATE POLICY "Employees can update own profile requests"
  ON employee_profile_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_profile_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_profile_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Admins can update any request
CREATE POLICY "Admins can update profile requests"
  ON employee_profile_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = employee_profile_requests.organization_id
      AND organization_members.role IN ('admin', 'hr')
      AND organization_members.is_active = true
    )
  );

-- RLS Policies for employee_notifications

-- Employees can view their own notifications
CREATE POLICY "Employees can view own notifications"
  ON employee_notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_notifications.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Admins/HR can view all notifications in their organization
CREATE POLICY "Admins can view all notifications"
  ON employee_notifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = employee_notifications.organization_id
      AND organization_members.role IN ('admin', 'hr')
      AND organization_members.is_active = true
    )
  );

-- Admins/HR can create notifications
CREATE POLICY "Admins can create notifications"
  ON employee_notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.user_id = auth.uid()
      AND organization_members.organization_id = employee_notifications.organization_id
      AND organization_members.role IN ('admin', 'hr')
      AND organization_members.is_active = true
    )
  );

-- Employees can update their own notifications (mark as read)
CREATE POLICY "Employees can update own notifications"
  ON employee_notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_notifications.employee_id
      AND employees.user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = employee_notifications.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Function to automatically mark request as completed when employee updates profile
CREATE OR REPLACE FUNCTION mark_profile_request_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- If there's a pending profile request for this employee, mark it as completed
  UPDATE employee_profile_requests
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE employee_id = NEW.id
    AND status = 'pending';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-complete profile requests when employee updates their profile
DROP TRIGGER IF EXISTS auto_complete_profile_request ON employees;
CREATE TRIGGER auto_complete_profile_request
  AFTER UPDATE ON employees
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION mark_profile_request_completed();
