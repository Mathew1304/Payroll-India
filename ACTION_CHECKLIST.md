# ✅ Action Checklist - Fix Tasks Visibility

## What You Need to Do (5 minutes total)

### ☐ Step 1: Run the Quick Fix (2 minutes)

1. Open your browser and go to your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Copy this SQL query:

```sql
UPDATE user_profiles up
SET organization_id = e.organization_id,
    updated_at = now()
FROM employees e
WHERE up.employee_id = e.id
  AND (up.organization_id IS NULL OR up.organization_id != e.organization_id);
```

4. Paste it into the SQL Editor
5. Click **RUN**
6. Wait for "Success" message

**Expected Result:** `Success. No rows returned` or `Success. X rows affected`

---

### ☐ Step 2: Test It Works (1 minute)

1. Open your PayrollQatar application
2. Log out if you're logged in
3. Log in as the employee (the one who couldn't see tasks)
4. Navigate to **Tasks** page
5. **You should now see the tasks!** ✅

---

### ☐ Step 3: Apply Permanent Fix (2 minutes)

**Option A: Using Supabase CLI (Recommended)**

Open PowerShell or Command Prompt:

```powershell
cd "C:\Users\Mathew Fedrick 13\Downloads\PayrollQatar"
supabase db push
```

**Option B: Manual Application**

1. Open the file: `supabase/migrations/20260102000001_fix_tasks_visibility.sql`
2. Copy ALL the contents
3. Go back to Supabase SQL Editor
4. Paste the contents
5. Click **RUN**

**Expected Result:** `Success. Multiple statements executed`

---

### ☐ Step 4: Verify Everything (1 minute)

Run this verification query in Supabase SQL Editor:

```sql
-- Check that all profiles are synced
SELECT 
  COUNT(*) as total_employees,
  COUNT(CASE WHEN up.organization_id = e.organization_id THEN 1 END) as synced,
  COUNT(CASE WHEN up.organization_id IS NULL OR up.organization_id != e.organization_id THEN 1 END) as not_synced
FROM employees e
LEFT JOIN user_profiles up ON up.employee_id = e.id
WHERE e.is_active = true AND e.user_id IS NOT NULL;
```

**Expected Result:** `not_synced` should be `0`

---

## Done! 🎉

Your tasks visibility issue is now fixed!

### What Changed:

✅ Employees can now see tasks assigned to them  
✅ RLS policy works correctly  
✅ Future employees will automatically have correct permissions  
✅ System is more robust  

---

## If Something Goes Wrong

### Tasks Still Not Showing?

1. **Check if tasks actually exist:**
   - Log in as admin
   - Go to Tasks page
   - Verify you created and assigned tasks to the employee

2. **Run the diagnostic:**
   - Open `COMPLETE_DIAGNOSTIC.sql`
   - Copy and paste into Supabase SQL Editor
   - Click **RUN**
   - Review the output for issues

3. **Check browser console:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for error messages
   - Share any errors you see

4. **Verify employee and organization IDs:**
   ```sql
   SELECT 
     e.id as employee_id,
     e.organization_id,
     up.organization_id as profile_org_id,
     t.id as task_id
   FROM employees e
   LEFT JOIN user_profiles up ON up.employee_id = e.id
   LEFT JOIN tasks t ON t.assigned_to = e.id
   WHERE e.id = 'dea84837-2d36-432c-a226-ad050dfe38c9';
   ```

---

## Reference Documents

- **FIX_NOW.md** - Quick 2-minute guide
- **README_TASKS_FIX.md** - Complete documentation
- **SOLUTION_SUMMARY.md** - Visual explanation
- **TASKS_VISIBILITY_FIX.md** - Technical deep-dive

---

## Summary

| Step | Action | Time | Status |
|------|--------|------|--------|
| 1 | Run quick fix SQL | 2 min | ☐ |
| 2 | Test tasks visible | 1 min | ☐ |
| 3 | Apply migration | 2 min | ☐ |
| 4 | Verify everything | 1 min | ☐ |

**Total Time:** ~5 minutes  
**Difficulty:** Easy  
**Impact:** High  

---

**Start with Step 1 now!** 👆

