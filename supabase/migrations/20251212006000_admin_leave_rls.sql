-- Add admin policies for leave applications

-- Drop if exists
DROP POLICY IF EXISTS "admin_view_leave_apps" ON leave_applications;
DROP POLICY IF EXISTS "admin_update_leave_apps" ON leave_applications;

-- Create new policies
CREATE POLICY "admin_view_leave_apps" ON leave_applications FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN organization_members om ON e.organization_id = om.organization_id
    WHERE e.id = leave_applications.employee_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('hr', 'admin')
  )
);

CREATE POLICY "admin_update_leave_apps" ON leave_applications FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM employees e
    JOIN organization_members om ON e.organization_id = om.organization_id
    WHERE e.id = leave_applications.employee_id 
      AND om.user_id = auth.uid() 
      AND om.role IN ('hr', 'admin')
  )
);
