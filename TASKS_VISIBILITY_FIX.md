# Tasks Visibility Issue - Diagnosis and Fix

## Problem Description

Employees cannot see tasks assigned to them, even though admins have assigned tasks. The console logs show:
- `effectiveOrgId: 3d5e5867-d05d-4c76-b525-d4b9baadb6f0`
- `employee_id: dea84837-2d36-432c-a226-ad050dfe38c9`
- `isAdmin: false`
- `Tasks loaded successfully: Array(0)` ← Empty array!

## Root Cause

The issue is caused by **Row Level Security (RLS) policies** on the `tasks` table. The RLS policy allows users to view tasks only if:

```sql
organization_id IN (
  SELECT organization_id 
  FROM user_profiles 
  WHERE user_id = auth.uid()
)
```

The problem occurs when:
1. An employee's `user_profiles.organization_id` is **NULL** or **incorrect**
2. Even though the employee record has the correct `organization_id`
3. The RLS policy checks `user_profiles.organization_id`, not `employees.organization_id`

## Why This Happens

When employees are created and later linked to user accounts (during registration), there can be a sync issue where:
- The `employees` table has the correct `organization_id`
- The `user_profiles` table has `NULL` or outdated `organization_id`
- The RLS policy fails because it checks `user_profiles.organization_id`

## Solution

### Quick Fix (Run Immediately)

Run the SQL script in `QUICK_FIX_TASKS_VISIBILITY.sql` in your Supabase SQL Editor:

```sql
-- Fix all user_profiles that have missing or incorrect organization_id
UPDATE user_profiles up
SET organization_id = e.organization_id,
    updated_at = now()
FROM employees e
WHERE up.employee_id = e.id
  AND (up.organization_id IS NULL OR up.organization_id != e.organization_id);
```

This will:
1. Sync `user_profiles.organization_id` from `employees.organization_id`
2. Fix all existing employees with this issue
3. Allow the RLS policy to work correctly

### Permanent Fix (Migration)

Apply the migration in `supabase/migrations/20260102000001_fix_tasks_visibility.sql`:

```bash
# If using Supabase CLI
supabase db push

# Or apply manually in Supabase Dashboard > SQL Editor
```

This migration:
1. Syncs all existing `user_profiles.organization_id` from `employees.organization_id`
2. Adds indexes for better performance
3. Updates RLS policies to be more explicit
4. Creates a trigger to automatically sync `organization_id` when employees are linked to users
5. Ensures this issue won't happen again in the future

## Verification

After applying the fix, verify it worked:

### 1. Check User Profile

```sql
SELECT 
  e.id as employee_id,
  e.employee_code,
  e.organization_id as employee_org_id,
  up.organization_id as profile_org_id,
  CASE 
    WHEN e.organization_id = up.organization_id THEN '✅ MATCH'
    ELSE '❌ MISMATCH'
  END as status
FROM employees e
LEFT JOIN user_profiles up ON up.employee_id = e.id
WHERE e.id = 'dea84837-2d36-432c-a226-ad050dfe38c9';
```

### 2. Check Tasks

```sql
SELECT 
  t.id,
  t.title,
  t.status,
  t.organization_id,
  t.assigned_to
FROM tasks t
WHERE t.assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9';
```

### 3. Test in Application

1. Log in as the employee
2. Navigate to Tasks page
3. Tasks should now be visible

## Technical Details

### Database Schema

**user_profiles table:**
```sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id),  -- Must match employee's org
  employee_id uuid REFERENCES employees(id),
  role text,
  ...
);
```

**employees table:**
```sql
CREATE TABLE employees (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),  -- Source of truth
  user_id uuid REFERENCES auth.users(id),
  ...
);
```

**tasks table:**
```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),  -- Must match user's org
  assigned_to uuid REFERENCES employees(id),
  ...
);
```

### RLS Policy Flow

1. Employee logs in → `auth.uid()` is set
2. Employee queries tasks → RLS policy activates
3. RLS checks: `tasks.organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())`
4. If `user_profiles.organization_id` is NULL or wrong → No tasks returned
5. If `user_profiles.organization_id` matches `tasks.organization_id` → Tasks returned

### Frontend Query

The frontend correctly filters tasks:

```typescript
let query = supabase
  .from('tasks')
  .select('*, assigned_employee:employees!assigned_to(...)')
  .eq('organization_id', effectiveOrgId)
  .order('created_at', { ascending: false });

if (!isAdmin && profile?.employee_id) {
  query = query.eq('assigned_to', profile.employee_id);
}
```

The issue is **not in the frontend query** but in the **RLS policy** blocking the results.

## Prevention

The migration includes a trigger that automatically syncs `user_profiles.organization_id` whenever an employee is linked to a user:

```sql
CREATE TRIGGER trigger_sync_user_profile_organization
  AFTER UPDATE OF user_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profile_organization();
```

This ensures the issue won't happen for new employees in the future.

## Related Files

- `src/pages/Tasks/TasksPage.tsx` - Frontend task loading logic
- `supabase/migrations/20251215000001_complete_hrms_schema.sql` - Original schema
- `full_rls.sql` - All RLS policies
- `QUICK_FIX_TASKS_VISIBILITY.sql` - Immediate fix script
- `supabase/migrations/20260102000001_fix_tasks_visibility.sql` - Permanent fix migration

## Summary

**Problem:** Employees can't see their tasks due to RLS policy blocking them.

**Cause:** `user_profiles.organization_id` doesn't match `employees.organization_id`.

**Fix:** Sync `user_profiles.organization_id` from `employees.organization_id`.

**Prevention:** Trigger automatically syncs on employee-user linking.

