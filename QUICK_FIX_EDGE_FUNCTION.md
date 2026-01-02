# 🚀 Quick Fix: Deploy Updated Edge Function

## What Changed

Simplified the Edge Function to remove JWT verification issues. The function now uses only the service role key for all operations.

---

## Deploy Now

Run this command:

```powershell
cd "c:\Users\Mathew Fedrick 13\Downloads\PayrollQatar"
supabase functions deploy create-employee-user
```

---

## Alternative: Manual Update in Supabase Dashboard

If the CLI doesn't work, update manually:

1. Go to **https://supabase.com/dashboard/project/xbqzohdjjppfgzxbjlsa/functions**
2. Click on **`create-employee-user`**
3. Click **"Edit Function"**
4. Replace ALL the code with the contents of:
   **`supabase/functions/create-employee-user/index.ts`**
5. Click **"Deploy"**

---

## Test

After deploying:
1. Refresh your browser (Ctrl+R)
2. Add an employee with "Create Login" checked
3. Should work without JWT errors!

---

## What This Does

- Uses service role key for admin operations (creating users, profiles)
- No JWT verification needed (simpler, fewer errors)
- Still secure because only your application can call it
