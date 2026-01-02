# 🔧 Fix: accommodation_allowance Column Missing Error

## Problem
You're getting this error when trying to add an employee:
```
Could not find the 'accommodation_allowance' column of 'employees' in the schema cache
```

## Solution (Takes 2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to **https://supabase.com/dashboard**
2. Select your project (the one with URL: xbqzohdjjppfgzxbjlsa.supabase.co)
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run the Migration
1. Open the file: `APPLY_THIS_IN_SUPABASE.sql` (in this folder)
2. **Copy ALL the contents** (Ctrl+A, Ctrl+C)
3. **Paste** into the Supabase SQL Editor
4. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify Success
You should see:
- ✅ Several "NOTICE" messages about columns being added
- ✅ A table showing 3 columns: accommodation_allowance, transportation_allowance, food_allowance
- ✅ Status: "SUCCESS: Column exists"

### Step 4: Test in Your App
1. Go back to your application (http://localhost:5173 or wherever it's running)
2. Try adding an employee again
3. ✅ It should work now!

---

## What This Does

The migration script:
1. ✅ Adds the missing `accommodation_allowance` column
2. ✅ Adds `transportation_allowance` and `food_allowance` columns
3. ✅ Adds all other missing employee fields (family info, education, Qatar-specific fields, etc.)
4. ✅ **Forces PostgREST to reload its schema cache** (this fixes the PGRST204 error)
5. ✅ Verifies the columns were added successfully

The script is **safe to run multiple times** - it checks if columns exist before adding them.

---

## If It Still Doesn't Work

If you still get the error after running the migration:

**Option 1: Wait 2-3 minutes**
- PostgREST automatically refreshes its cache every few minutes
- Just wait and try again

**Option 2: Restart Your Supabase Project**
1. Go to Supabase Dashboard → Project Settings → General
2. Click "Pause project"
3. Wait 30 seconds
4. Click "Resume project"
5. Wait 1-2 minutes for it to fully restart

**Option 3: Hard Refresh Your Browser**
- Press Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- This clears any cached API responses

---

## Need Help?

If you're still having issues:
1. Check the Supabase SQL Editor output for any error messages
2. Make sure you ran the ENTIRE script (all the way to the bottom)
3. Verify you're logged into the correct Supabase project
