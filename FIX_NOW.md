# Fix Tasks Visibility Issue - Quick Steps

## The Problem
Employees cannot see tasks assigned to them because their `user_profiles.organization_id` doesn't match their `employees.organization_id`, causing the Row Level Security (RLS) policy to block the tasks.

## Fix It Now (2 minutes)

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar

### Step 2: Run This SQL Query

Copy and paste this into the SQL Editor and click **RUN**:

```sql
-- Fix user_profiles organization_id
UPDATE user_profiles up
SET organization_id = e.organization_id,
    updated_at = now()
FROM employees e
WHERE up.employee_id = e.id
  AND (up.organization_id IS NULL OR up.organization_id != e.organization_id);

-- Verify the fix
SELECT 
  'Fixed' as status,
  COUNT(*) as affected_profiles
FROM user_profiles up
JOIN employees e ON e.id = up.employee_id
WHERE up.organization_id = e.organization_id;
```

### Step 3: Test in Your App
1. Log out and log back in as the employee
2. Navigate to the Tasks page
3. Tasks should now be visible! ✅

## What This Does
- Syncs the `organization_id` from the `employees` table to the `user_profiles` table
- This allows the RLS policy to correctly match the employee's organization with the task's organization
- The employee can now see tasks assigned to them

## Apply Permanent Fix (Optional but Recommended)

To prevent this issue from happening again in the future, apply the migration:

### Option 1: Using Supabase CLI
```bash
cd "C:\Users\Mathew Fedrick 13\Downloads\PayrollQatar"
supabase db push
```

### Option 2: Manual Application
1. Open `supabase/migrations/20260102000001_fix_tasks_visibility.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **RUN**

This adds a trigger that automatically keeps `user_profiles.organization_id` in sync with `employees.organization_id` whenever an employee is linked to a user account.

## Need More Details?
See `TASKS_VISIBILITY_FIX.md` for a complete technical explanation.

