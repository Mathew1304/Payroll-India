/*
  # Add Distribution Lists and Announcement Recipients System

  1. New Tables
    - `distribution_lists`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, foreign key)
      - `name` (text) - List name
      - `description` (text) - Purpose of list
      - `type` (text) - 'manual', 'department', 'designation', 'branch', 'dynamic', 'all_employees'
      - `filter_criteria` (jsonb) - For dynamic lists
      - `is_active` (boolean)
      - `created_by` (uuid)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `distribution_list_members`
      - `id` (uuid, primary key)
      - `distribution_list_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key)
      - `added_by` (uuid)
      - `added_at` (timestamptz)

    - `announcement_recipients`
      - `id` (uuid, primary key)
      - `announcement_id` (uuid, foreign key)
      - `employee_id` (uuid, foreign key)
      - `distribution_list_id` (uuid, nullable)
      - `is_read` (boolean, default false)
      - `read_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Updates to announcements
    - Add `target_type` - 'all', 'distribution_list', 'specific'
    - Add `distribution_list_ids` (jsonb array)

  3. Security
    - Enable RLS on all new tables
    - Policies for same organization access
*/

-- Create distribution_lists table
CREATE TABLE IF NOT EXISTS distribution_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'manual',
  filter_criteria jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_type CHECK (type IN ('manual', 'department', 'designation', 'branch', 'dynamic', 'all_employees'))
);

-- Create distribution_list_members table
CREATE TABLE IF NOT EXISTS distribution_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_list_id uuid NOT NULL REFERENCES distribution_lists(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id),
  added_at timestamptz DEFAULT now(),
  UNIQUE(distribution_list_id, employee_id)
);

-- Create announcement_recipients table
CREATE TABLE IF NOT EXISTS announcement_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  distribution_list_id uuid REFERENCES distribution_lists(id),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(announcement_id, employee_id)
);

-- Add new columns to announcements
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'target_type'
  ) THEN
    ALTER TABLE announcements ADD COLUMN target_type text DEFAULT 'all';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'announcements' AND column_name = 'distribution_list_ids'
  ) THEN
    ALTER TABLE announcements ADD COLUMN distribution_list_ids jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE distribution_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for distribution_lists
CREATE POLICY "Users can view distribution lists in their organization"
  ON distribution_lists FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      UNION
      SELECT current_organization_id FROM user_profiles WHERE user_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "HR can create distribution lists"
  ON distribution_lists FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "HR can update distribution lists"
  ON distribution_lists FOR UPDATE
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

CREATE POLICY "HR can delete distribution lists"
  ON distribution_lists FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM employees WHERE id IN (
        SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for distribution_list_members
CREATE POLICY "Users can view list members in their organization"
  ON distribution_list_members FOR SELECT
  TO authenticated
  USING (
    distribution_list_id IN (
      SELECT id FROM distribution_lists WHERE organization_id IN (
        SELECT organization_id FROM employees WHERE id IN (
          SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "HR can add list members"
  ON distribution_list_members FOR INSERT
  TO authenticated
  WITH CHECK (
    distribution_list_id IN (
      SELECT id FROM distribution_lists WHERE organization_id IN (
        SELECT organization_id FROM employees WHERE id IN (
          SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "HR can remove list members"
  ON distribution_list_members FOR DELETE
  TO authenticated
  USING (
    distribution_list_id IN (
      SELECT id FROM distribution_lists WHERE organization_id IN (
        SELECT organization_id FROM employees WHERE id IN (
          SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
      )
    )
  );

-- Policies for announcement_recipients
CREATE POLICY "Users can view their own announcement receipts"
  ON announcement_recipients FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create announcement recipients"
  ON announcement_recipients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their read status"
  ON announcement_recipients FOR UPDATE
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_distribution_lists_org ON distribution_lists(organization_id);
CREATE INDEX IF NOT EXISTS idx_distribution_list_members_list ON distribution_list_members(distribution_list_id);
CREATE INDEX IF NOT EXISTS idx_distribution_list_members_employee ON distribution_list_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_announcement ON announcement_recipients(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_employee ON announcement_recipients(employee_id);
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_unread ON announcement_recipients(employee_id, is_read);
