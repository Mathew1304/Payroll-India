/*
  # Create Work Reports System

  1. New Tables
    - `work_reports`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key)
      - `report_date` (date) - Date of the report
      - `report_type` (text) - 'daily', 'weekly', 'monthly', 'project'
      - `title` (text) - Report title
      - `summary` (text) - Brief summary
      - `detailed_report` (text) - Full report content
      - `tasks_completed` (jsonb) - Array of completed tasks
      - `tasks_in_progress` (jsonb) - Array of ongoing tasks
      - `tasks_planned` (jsonb) - Array of planned tasks
      - `challenges` (text) - Issues faced
      - `achievements` (text) - Key accomplishments
      - `hours_worked` (numeric) - Hours spent
      - `status` (text) - 'draft', 'submitted', 'reviewed', 'approved'
      - `submitted_at` (timestamptz)
      - `reviewed_by` (uuid) - Manager who reviewed
      - `reviewed_at` (timestamptz)
      - `review_comments` (text)
      - `attachments` (jsonb) - File references
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `work_report_comments`
      - `id` (uuid, primary key)
      - `work_report_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `comment` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Employees can create and view own reports
    - Managers can view team reports
    - HR can view all reports

  3. Indexes
    - Organization lookups
    - Employee lookups
    - Date ranges
    - Status filtering
*/

-- Create work_reports table
CREATE TABLE IF NOT EXISTS work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_type text NOT NULL DEFAULT 'daily',
  title text NOT NULL,
  summary text,
  detailed_report text,
  tasks_completed jsonb DEFAULT '[]'::jsonb,
  tasks_in_progress jsonb DEFAULT '[]'::jsonb,
  tasks_planned jsonb DEFAULT '[]'::jsonb,
  challenges text,
  achievements text,
  hours_worked numeric(5,2),
  status text NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_comments text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_report_type CHECK (report_type IN ('daily', 'weekly', 'monthly', 'project')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected'))
);

-- Create work_report_comments table
CREATE TABLE IF NOT EXISTS work_report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id uuid NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  employee_id uuid REFERENCES employees(id),
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_report_comments ENABLE ROW LEVEL SECURITY;

-- Policies for work_reports

-- Employees can view their own reports
CREATE POLICY "Employees can view own reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Managers and HR can view reports of employees in their organization
CREATE POLICY "Managers can view team reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Employees can create their own reports
CREATE POLICY "Employees can create own reports"
  ON work_reports FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Employees can update their own reports (if draft or submitted)
CREATE POLICY "Employees can update own reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

-- Managers can update reports (for review)
CREATE POLICY "Managers can review reports"
  ON work_reports FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Employees can delete their own draft reports
CREATE POLICY "Employees can delete own draft reports"
  ON work_reports FOR DELETE
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
    AND status = 'draft'
  );

-- Policies for work_report_comments

-- Users can view comments on reports they can access
CREATE POLICY "Users can view comments on accessible reports"
  ON work_report_comments FOR SELECT
  TO authenticated
  USING (
    work_report_id IN (
      SELECT id FROM work_reports WHERE
        employee_id IN (
          SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
          SELECT organization_id FROM employees WHERE id IN (
            SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
          )
        )
    )
  );

-- Users can create comments on reports they can access
CREATE POLICY "Users can create comments"
  ON work_report_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    work_report_id IN (
      SELECT id FROM work_reports WHERE
        employee_id IN (
          SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
        OR
        organization_id IN (
          SELECT organization_id FROM employees WHERE id IN (
            SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
          )
        )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON work_report_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON work_report_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_reports_organization ON work_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_employee ON work_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_work_reports_date ON work_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_work_reports_status ON work_reports(status);
CREATE INDEX IF NOT EXISTS idx_work_reports_type ON work_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_work_reports_org_date ON work_reports(organization_id, report_date);
CREATE INDEX IF NOT EXISTS idx_work_report_comments_report ON work_report_comments(work_report_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_work_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_work_reports_updated_at
  BEFORE UPDATE ON work_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_work_reports_updated_at();
