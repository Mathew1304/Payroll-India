-- Fix RLS policy for goals to allow admins to see all goals in their organization
-- The previous policy failed for admins because it checked user_profiles.employee_id which admins don't have

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view relevant goals" ON goals;

-- Recreate the policy with better admin handling
CREATE POLICY "Users can view relevant goals" ON goals
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            -- Admins, managers, HR can see all goals in their organization
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
            OR
            -- Employees can see goals where they are the assigned employee
            employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
            OR
            -- Employees can see goals they created (if they have employee_id)
            (created_by IS NOT NULL AND created_by = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1))
        )
    );
