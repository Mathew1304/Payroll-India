-- Fix tickets RLS policies to use organization_members instead of user_profiles
-- This allows both employees and admins to create and manage tickets

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view relevant tickets" ON tickets;
DROP POLICY IF EXISTS "Employees can create tickets" ON tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON tickets;
DROP POLICY IF EXISTS "Users can view comments on visible tickets" ON ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to visible tickets" ON ticket_comments;
DROP POLICY IF EXISTS "Users can view history of visible tickets" ON ticket_history;

-- Recreate tickets policies with organization_members

-- Policy: Users can see tickets of their organization
CREATE POLICY "Users can view relevant tickets" ON tickets
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            created_by = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
            OR
            assigned_to = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
            OR
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
        )
    );

-- Policy: Users can create tickets for their organization
CREATE POLICY "Employees can create tickets" ON tickets
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND
        created_by = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    );

-- Policy: Admins and creators can update tickets
CREATE POLICY "Users can update tickets" ON tickets
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
            OR
            created_by = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- Recreate ticket_comments policies

CREATE POLICY "Users can view comments on visible tickets" ON ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets WHERE id = ticket_comments.ticket_id
            AND organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
            AND (
                 created_by = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 assigned_to = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
            )
        )
    );

CREATE POLICY "Users can add comments to visible tickets" ON ticket_comments
    FOR INSERT WITH CHECK (
        user_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM tickets WHERE id = ticket_comments.ticket_id
            AND organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
             AND (
                 created_by = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 assigned_to = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
            )
        )
    );

-- Recreate ticket_history policies

CREATE POLICY "Users can view history of visible tickets" ON ticket_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets WHERE id = ticket_history.ticket_id
            AND organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
             AND (
                 created_by = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 assigned_to = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
            )
        )
    );
