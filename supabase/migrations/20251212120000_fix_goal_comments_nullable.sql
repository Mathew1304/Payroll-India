-- Fix goal_comments to allow NULL user_id for admin comments
-- Also update RLS policies to work with organization_members

-- Make user_id nullable to allow admin comments
ALTER TABLE goal_comments ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view comments on visible goals" ON goal_comments;
DROP POLICY IF EXISTS "Users can add comments" ON goal_comments;

-- Recreate with better policies using organization_members

-- Users can view comments on goals they have access to
CREATE POLICY "Users can view comments on visible goals" ON goal_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM goals g
            WHERE g.id = goal_comments.goal_id
            AND (
                g.employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                OR EXISTS (SELECT 1 FROM organization_members om 
                          JOIN employees e ON e.organization_id = om.organization_id
                          WHERE om.user_id = auth.uid() 
                          AND om.role IN ('admin', 'super_admin', 'hr', 'manager')
                          AND e.id = g.employee_id)
            )
        )
    );

-- Users can add comments to goals they have access to
CREATE POLICY "Users can add comments" ON goal_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM goals g
            WHERE g.id = goal_comments.goal_id
            AND (
                g.employee_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                OR EXISTS (SELECT 1 FROM organization_members om 
                          JOIN employees e ON e.organization_id = om.organization_id
                          WHERE om.user_id = auth.uid() 
                          AND om.role IN ('admin', 'super_admin', 'hr', 'manager')
                          AND e.id = g.employee_id)
            )
        )
    );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON goal_comments
    FOR UPDATE USING (
        user_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON goal_comments
    FOR DELETE USING (
        user_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    );
