-- COMPLETE DIAGNOSTIC FOR TASKS VISIBILITY ISSUE
-- Run this in Supabase SQL Editor to get a full picture of the problem

-- ============================================================
-- SECTION 1: CHECK USER PROFILES SYNC STATUS
-- ============================================================
SELECT 
  '=== USER PROFILES SYNC STATUS ===' as section;

SELECT 
  e.id as employee_id,
  e.employee_code,
  e.first_name || ' ' || e.last_name as employee_name,
  e.organization_id as employee_org_id,
  e.user_id,
  e.is_active as employee_active,
  up.id as profile_id,
  up.organization_id as profile_org_id,
  up.role,
  up.is_active as profile_active,
  CASE 
    WHEN e.user_id IS NULL THEN '⚠️ No User Account'
    WHEN up.id IS NULL THEN '❌ No Profile'
    WHEN up.organization_id IS NULL THEN '❌ Profile Org NULL'
    WHEN e.organization_id != up.organization_id THEN '❌ ORG MISMATCH'
    ELSE '✅ OK'
  END as sync_status
FROM employees e
LEFT JOIN user_profiles up ON up.employee_id = e.id
WHERE e.is_active = true
ORDER BY sync_status DESC, e.first_name;

-- ============================================================
-- SECTION 2: SPECIFIC EMPLOYEE CHECK (from logs)
-- ============================================================
SELECT 
  '=== SPECIFIC EMPLOYEE: dea84837-2d36-432c-a226-ad050dfe38c9 ===' as section;

SELECT 
  'Employee Record' as check_type,
  e.id,
  e.employee_code,
  e.first_name,
  e.last_name,
  e.organization_id,
  e.user_id,
  e.is_active
FROM employees e
WHERE e.id = 'dea84837-2d36-432c-a226-ad050dfe38c9';

SELECT 
  'User Profile Record' as check_type,
  up.id,
  up.user_id,
  up.organization_id,
  up.employee_id,
  up.role,
  up.is_active
FROM user_profiles up
WHERE up.employee_id = 'dea84837-2d36-432c-a226-ad050dfe38c9';

-- ============================================================
-- SECTION 3: TASKS ASSIGNED TO EMPLOYEE
-- ============================================================
SELECT 
  '=== TASKS ASSIGNED TO EMPLOYEE ===' as section;

SELECT 
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.organization_id as task_org_id,
  t.assigned_to,
  t.created_at,
  e.first_name || ' ' || e.last_name as assigned_to_name,
  e.organization_id as employee_org_id,
  CASE 
    WHEN t.organization_id = e.organization_id THEN '✅ Org Match'
    ELSE '❌ Org Mismatch'
  END as org_status
FROM tasks t
LEFT JOIN employees e ON e.id = t.assigned_to
WHERE t.assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9'
ORDER BY t.created_at DESC;

-- ============================================================
-- SECTION 4: RLS POLICY SIMULATION
-- ============================================================
SELECT 
  '=== RLS POLICY SIMULATION ===' as section;

-- This simulates what the RLS policy checks
SELECT 
  t.id as task_id,
  t.title,
  t.organization_id as task_org_id,
  up.organization_id as user_profile_org_id,
  up.user_id,
  CASE 
    WHEN up.organization_id IS NULL THEN '❌ BLOCKED: Profile org is NULL'
    WHEN t.organization_id = up.organization_id THEN '✅ VISIBLE: Org IDs match'
    ELSE '❌ BLOCKED: Org IDs dont match'
  END as rls_result,
  CASE 
    WHEN t.organization_id = up.organization_id THEN 'Task will be visible to employee'
    ELSE 'Task will be HIDDEN by RLS policy'
  END as explanation
FROM tasks t
CROSS JOIN user_profiles up
WHERE t.assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9'
  AND up.employee_id = 'dea84837-2d36-432c-a226-ad050dfe38c9';

-- ============================================================
-- SECTION 5: ORGANIZATION VERIFICATION
-- ============================================================
SELECT 
  '=== ORGANIZATION VERIFICATION ===' as section;

SELECT 
  o.id,
  o.name,
  o.slug,
  (SELECT COUNT(*) FROM employees WHERE organization_id = o.id AND is_active = true) as active_employees,
  (SELECT COUNT(*) FROM tasks WHERE organization_id = o.id) as total_tasks,
  (SELECT COUNT(*) FROM user_profiles WHERE organization_id = o.id) as user_profiles
FROM organizations o
WHERE o.id = '3d5e5867-d05d-4c76-b525-d4b9baadb6f0';

-- ============================================================
-- SECTION 6: ALL TASKS IN ORGANIZATION
-- ============================================================
SELECT 
  '=== ALL TASKS IN ORGANIZATION ===' as section;

SELECT 
  t.id,
  t.title,
  t.status,
  t.priority,
  t.assigned_to,
  e.first_name || ' ' || e.last_name as assigned_to_name,
  e.employee_code,
  t.created_at
FROM tasks t
LEFT JOIN employees e ON e.id = t.assigned_to
WHERE t.organization_id = '3d5e5867-d05d-4c76-b525-d4b9baadb6f0'
ORDER BY t.created_at DESC
LIMIT 20;

-- ============================================================
-- SECTION 7: SUMMARY AND RECOMMENDATIONS
-- ============================================================
SELECT 
  '=== SUMMARY ===' as section;

SELECT 
  'Total Employees' as metric,
  COUNT(*) as count
FROM employees 
WHERE organization_id = '3d5e5867-d05d-4c76-b525-d4b9baadb6f0' 
  AND is_active = true

UNION ALL

SELECT 
  'Employees with User Accounts' as metric,
  COUNT(*) as count
FROM employees 
WHERE organization_id = '3d5e5867-d05d-4c76-b525-d4b9baadb6f0' 
  AND is_active = true 
  AND user_id IS NOT NULL

UNION ALL

SELECT 
  'User Profiles with NULL org_id' as metric,
  COUNT(*) as count
FROM user_profiles up
JOIN employees e ON e.id = up.employee_id
WHERE e.organization_id = '3d5e5867-d05d-4c76-b525-d4b9baadb6f0'
  AND up.organization_id IS NULL

UNION ALL

SELECT 
  'User Profiles with WRONG org_id' as metric,
  COUNT(*) as count
FROM user_profiles up
JOIN employees e ON e.id = up.employee_id
WHERE e.organization_id = '3d5e5867-d05d-4c76-b525-d4b9baadb6f0'
  AND up.organization_id IS NOT NULL
  AND up.organization_id != e.organization_id

UNION ALL

SELECT 
  'Total Tasks in Organization' as metric,
  COUNT(*) as count
FROM tasks 
WHERE organization_id = '3d5e5867-d05d-4c76-b525-d4b9baadb6f0'

UNION ALL

SELECT 
  'Tasks Assigned to Target Employee' as metric,
  COUNT(*) as count
FROM tasks 
WHERE assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9';

-- ============================================================
-- SECTION 8: RECOMMENDATIONS
-- ============================================================
SELECT 
  '=== RECOMMENDATIONS ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN employees e ON e.id = up.employee_id
      WHERE e.id = 'dea84837-2d36-432c-a226-ad050dfe38c9'
        AND (up.organization_id IS NULL OR up.organization_id != e.organization_id)
    ) THEN '❌ ACTION REQUIRED: Run QUICK_FIX_TASKS_VISIBILITY.sql to sync organization_id'
    WHEN NOT EXISTS (
      SELECT 1 FROM tasks WHERE assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9'
    ) THEN '⚠️ No tasks assigned to this employee. Admin needs to create tasks.'
    ELSE '✅ Everything looks good. Tasks should be visible.'
  END as recommendation;

