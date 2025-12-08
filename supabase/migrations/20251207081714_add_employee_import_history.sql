/*
  # Add Employee Import History Tracking

  1. New Tables
    - `employee_import_history`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key to organizations)
      - `uploaded_by` (uuid, foreign key to auth.users)
      - `file_name` (text) - original CSV file name
      - `total_rows` (integer) - total rows in file
      - `successful_imports` (integer) - number of successfully imported employees
      - `failed_imports` (integer) - number of failed rows
      - `imported_employees` (jsonb) - array of employee details that were imported
      - `created_at` (timestamptz) - when the import happened
      - `notes` (text) - optional notes

  2. Security
    - Enable RLS on `employee_import_history` table
    - Add policy for organization members to view their organization's import history
    - Add policy for organization members to create import history records
*/

CREATE TABLE IF NOT EXISTS employee_import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  successful_imports integer NOT NULL DEFAULT 0,
  failed_imports integer NOT NULL DEFAULT 0,
  imported_employees jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE employee_import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's import history"
  ON employee_import_history
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create import history for their organization"
  ON employee_import_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_import_history_org ON employee_import_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_history_created ON employee_import_history(created_at DESC);
