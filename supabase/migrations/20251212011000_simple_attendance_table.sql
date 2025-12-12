-- Create a simple attendance table that works
-- Drop the problematic table and start fresh
DROP TABLE IF EXISTS simple_attendance CASCADE;

CREATE TABLE simple_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  attendance_date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text DEFAULT 'present',
  is_manual_entry boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_id, attendance_date)
);

-- Enable RLS
ALTER TABLE simple_attendance ENABLE ROW LEVEL SECURITY;

-- Simple policy: anyone can do anything (for testing)
CREATE POLICY "allow_all" ON simple_attendance
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index
CREATE INDEX idx_simple_attendance_emp_date ON simple_attendance(employee_id, attendance_date);
