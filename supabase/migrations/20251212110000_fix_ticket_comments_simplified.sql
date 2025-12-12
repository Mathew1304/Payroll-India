-- Fix ticket_comments RLS to be simpler and more permissive
-- The issue is that the INSERT policy is too strict and complex

-- Drop existing comment policies
DROP POLICY IF EXISTS "Users can view comments on visible tickets" ON ticket_comments;
DROP POLICY IF EXISTS "Users can add comments to visible tickets" ON ticket_comments;

-- Simplified policies that work better

-- Users can view comments on tickets they can access
CREATE POLICY "Users can view comments on visible tickets" ON ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t
            WHERE t.id = ticket_comments.ticket_id
            AND t.organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        )
    );

-- Users can add comments to tickets in their organization
-- Simplified: just check if ticket belongs to user's organization
CREATE POLICY "Users can add comments to visible tickets" ON ticket_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN organization_members om ON t.organization_id = om.organization_id
            WHERE t.id = ticket_comments.ticket_id
            AND om.user_id = auth.uid()
        )
    );

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON ticket_comments
    FOR UPDATE USING (
        user_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    );

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON ticket_comments
    FOR DELETE USING (
        user_id = (SELECT employee_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
    );
