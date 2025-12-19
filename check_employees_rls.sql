-- Fix: Ensure admins can view employees in their organization
-- This is needed for the leave applications query which joins with employees

-- Check current employees policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'employees';
