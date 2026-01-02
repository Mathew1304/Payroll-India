# Tasks Not Showing for Employees - Complete Fix Guide

## Quick Summary

**Problem:** Admin assigned a task to an employee, but the employee can't see it.

**Root Cause:** The `user_profiles.organization_id` doesn't match `employees.organization_id`, causing Row Level Security (RLS) to block the tasks.

**Solution:** Sync the `organization_id` from `employees` to `user_profiles`.

---

## 🚀 Quick Fix (Do This First)

### Step 1: Run the Quick Fix SQL

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this query:

```sql
UPDATE user_profiles up
SET organization_id = e.organization_id,
    updated_at = now()
FROM employees e
WHERE up.employee_id = e.id
  AND (up.organization_id IS NULL OR up.organization_id != e.organization_id);
```

3. Click **RUN**
4. You should see: `Success. No rows returned` (this is normal)

### Step 2: Test

1. Log out and log back in as the employee
2. Go to Tasks page
3. Tasks should now be visible! ✅

---

## 📊 Diagnostic Tools

If you want to understand what's happening before applying the fix:

### Option 1: Complete Diagnostic
Run `COMPLETE_DIAGNOSTIC.sql` in Supabase SQL Editor to see:
- User profile sync status
- Specific employee details
- Tasks assigned
- RLS policy simulation
- Organization verification
- Summary and recommendations

### Option 2: Quick Diagnostic
Run `QUICK_FIX_TASKS_VISIBILITY.sql` which includes both diagnostic and fix.

### Option 3: Simple Diagnostic
Run `debug_tasks_issue.sql` for a focused check on the specific employee.

---

## 🔧 Permanent Fix (Recommended)

To prevent this issue from happening again:

### Apply the Migration

**Option A: Using Supabase CLI**
```bash
cd "C:\Users\Mathew Fedrick 13\Downloads\PayrollQatar"
supabase db push
```

**Option B: Manual Application**
1. Open `supabase/migrations/20260102000001_fix_tasks_visibility.sql`
2. Copy all contents
3. Paste into Supabase SQL Editor
4. Click **RUN**

### What the Migration Does

1. ✅ Syncs all existing `user_profiles.organization_id` from `employees.organization_id`
2. ✅ Adds performance indexes
3. ✅ Updates RLS policies for clarity
4. ✅ Creates a trigger to auto-sync `organization_id` when employees are linked to users
5. ✅ Ensures this issue won't happen for new employees

---

## 📁 Files Reference

| File | Purpose |
|------|---------|
| `FIX_NOW.md` | Quick 2-minute fix guide |
| `TASKS_VISIBILITY_FIX.md` | Complete technical explanation |
| `QUICK_FIX_TASKS_VISIBILITY.sql` | Diagnostic + Fix in one script |
| `COMPLETE_DIAGNOSTIC.sql` | Comprehensive diagnostic tool |
| `debug_tasks_issue.sql` | Simple focused diagnostic |
| `fix_tasks_rls_issue.sql` | Alternative fix script with verification |
| `supabase/migrations/20260102000001_fix_tasks_visibility.sql` | Permanent fix migration |

---

## 🔍 Technical Details

### Why This Happens

The RLS policy on the `tasks` table checks:

```sql
organization_id IN (
  SELECT organization_id 
  FROM user_profiles 
  WHERE user_id = auth.uid()
)
```

When an employee registers:
1. Their `employees` record has the correct `organization_id`
2. Their `user_profiles` record might have `NULL` or wrong `organization_id`
3. RLS policy checks `user_profiles.organization_id` (not `employees.organization_id`)
4. If they don't match → tasks are blocked

### The Fix

Sync `user_profiles.organization_id` from `employees.organization_id`:

```sql
UPDATE user_profiles up
SET organization_id = e.organization_id
FROM employees e
WHERE up.employee_id = e.id
  AND (up.organization_id IS NULL OR up.organization_id != e.organization_id);
```

### Prevention

The migration adds a trigger that automatically syncs whenever an employee is linked to a user:

```sql
CREATE TRIGGER trigger_sync_user_profile_organization
  AFTER UPDATE OF user_id ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_profile_organization();
```

---

## 🐛 Enhanced Debugging

The `TasksPage.tsx` has been updated with enhanced logging:

```typescript
// Now logs:
- User profile organization_id check
- Detailed error information
- Task count
- Helpful warnings if no tasks found
```

Check browser console for detailed logs when loading tasks.

---

## ✅ Verification Checklist

After applying the fix:

- [ ] Run diagnostic SQL to verify sync status
- [ ] Check that `user_profiles.organization_id` matches `employees.organization_id`
- [ ] Log in as employee
- [ ] Navigate to Tasks page
- [ ] Verify tasks are visible
- [ ] Check browser console for success logs
- [ ] Apply permanent fix migration (optional but recommended)

---

## 🆘 Still Not Working?

If tasks still don't show after the fix:

1. **Check if tasks actually exist:**
   ```sql
   SELECT * FROM tasks 
   WHERE assigned_to = 'dea84837-2d36-432c-a226-ad050dfe38c9';
   ```

2. **Verify organization IDs match:**
   ```sql
   SELECT 
     e.organization_id as employee_org,
     up.organization_id as profile_org,
     t.organization_id as task_org
   FROM employees e
   JOIN user_profiles up ON up.employee_id = e.id
   LEFT JOIN tasks t ON t.assigned_to = e.id
   WHERE e.id = 'dea84837-2d36-432c-a226-ad050dfe38c9';
   ```

3. **Check browser console** for error messages

4. **Run COMPLETE_DIAGNOSTIC.sql** for full analysis

---

## 📞 Support

If you need help:
1. Run `COMPLETE_DIAGNOSTIC.sql`
2. Share the output
3. Check browser console logs
4. Verify the employee ID and organization ID are correct

---

## Summary

✅ **Quick Fix:** Run the UPDATE query in Supabase SQL Editor  
✅ **Permanent Fix:** Apply the migration  
✅ **Verification:** Use diagnostic tools  
✅ **Prevention:** Trigger auto-syncs for new employees  

The issue is now resolved! 🎉

