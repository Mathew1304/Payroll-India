-- Fix performance_reviews RLS policies to allow admin insert

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view relevant reviews" ON performance_reviews;
DROP POLICY IF EXISTS "Managers and Admins can manage reviews" ON performance_reviews;

-- Allow viewing reviews for employees and managers/admins
CREATE POLICY "Users can view reviews" ON performance_reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = performance_reviews.organization_id
            AND (
                -- Employee can see their own reviews
                om.employee_id = performance_reviews.employee_id
                OR
                -- Managers/admins can see all reviews in org
                om.role IN ('admin', 'super_admin', 'manager', 'hr')
            )
        )
    );

-- Allow managers/admins to create reviews
CREATE POLICY "Admins can create reviews" ON performance_reviews
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = performance_reviews.organization_id
            AND om.role IN ('admin', 'super_admin', 'manager', 'hr')
        )
    );

-- Allow managers/admins to update reviews
CREATE POLICY "Admins can update reviews" ON performance_reviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = performance_reviews.organization_id
            AND om.role IN ('admin', 'super_admin', 'manager', 'hr')
        )
    );

-- Allow managers/admins to delete reviews
CREATE POLICY "Admins can delete reviews" ON performance_reviews
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = performance_reviews.organization_id
            AND om.role IN ('admin', 'super_admin', 'manager', 'hr')
        )
    );
