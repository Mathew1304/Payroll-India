-- Diagnostic: Check why admin can't see leave applications
-- Run this as the admin user to see what's happening

-- 1. Check the admin's user profile
SELECT 
    'Admin Profile' as check_type,
    user_id,
    organization_id,
    employee_id,
    role
FROM user_profiles 
WHERE user_id = auth.uid();

-- 2. Check leave applications and their organization_id
SELECT 
    'Leave Applications' as check_type,
    id,
    organization_id,
    employee_id,
    start_date,
    end_date,
    status
FROM leave_applications;

-- 3. Check if the organization_ids match
SELECT 
    'Organization Match' as check_type,
    la.id as application_id,
    la.organization_id as app_org_id,
    up.organization_id as admin_org_id,
    CASE 
        WHEN la.organization_id = up.organization_id THEN 'MATCH'
        ELSE 'MISMATCH'
    END as match_status
FROM leave_applications la
CROSS JOIN user_profiles up
WHERE up.user_id = auth.uid();
