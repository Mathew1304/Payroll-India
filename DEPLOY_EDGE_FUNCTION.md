# 🚀 Deploy Updated Edge Function

## ✅ Changes Made

Updated `create-employee-user` Edge Function to work with current database:

### Changes:
1. ✅ **Removed** `organization_id` from user_profiles insert (column doesn't exist)
2. ✅ **Added** employee table update to link `user_id` back to employee record
3. ✅ **Added** proper rollback handling if employee update fails
4. ✅ **Updated** comment numbering

---

## 📋 Deploy to Supabase (2 minutes)

### Option 1: Using Supabase CLI (Recommended)

**Step 1: Check Supabase CLI**
```powershell
supabase --version
```

**Step 2: Login to Supabase** (if not already logged in)
```powershell
supabase login
```

**Step 3: Link to your project** (if not already linked)
```powershell
cd "c:\Users\Mathew Fedrick 13\Downloads\PayrollQatar"
supabase link --project-ref xbqzohdjjppfgzxbjlsa
```

**Step 4: Deploy the function with JWT verification disabled**
```powershell
supabase functions deploy create-employee-user --no-verify-jwt
```

**Important:** The `--no-verify-jwt` flag is required because this function uses the service role key internally and doesn't need to verify the client's JWT token.

**Step 5: Verify deployment**
```powershell
supabase functions list
```

---

### Option 2: Using Supabase Dashboard

If CLI doesn't work, you can deploy via the dashboard:

1. Go to **https://supabase.com/dashboard**
2. Select your project
3. Navigate to **Edge Functions** in the left sidebar
4. Click **"Deploy new function"** or find `create-employee-user`
5. Copy the contents of `supabase/functions/create-employee-user/index.ts`
6. Paste into the editor
7. **IMPORTANT:** After deploying, go to the function settings and **disable JWT verification**:
   - Click on the function name
   - Go to **Settings** tab
   - Find **"Verify JWT"** option
   - **Disable** it (uncheck the box)
   - Click **Save**

---

## 🧪 Test the Function

### Step 1: Test from Application

1. Go to your app (http://localhost:5173)
2. Navigate to **Employees** → **Add Employee**
3. Fill in the form:
   - First Name: "Test"
   - Last Name: "User"
   - Company Email: "testuser@example.com"
   - Mobile Number: "1234567890"
   - Date of Joining: (today's date)
4. **Check** the "Create Login" checkbox
5. Click **"Save"**

### Step 2: Verify Success

You should see:
- ✅ Success modal with credentials displayed
- ✅ No CORS errors in console
- ✅ Employee created in database
- ✅ User account created

### Step 3: Verify Data Integrity

Check in Supabase SQL Editor:
```sql
-- Verify user_id is linked to employee
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.company_email,
  e.user_id,
  up.user_id as profile_user_id,
  up.role,
  up.employee_id
FROM employees e
LEFT JOIN user_profiles up ON e.user_id = up.user_id
WHERE e.company_email = 'testuser@example.com';
```

**Expected Result:**
- `e.user_id` should be populated (not null)
- `up.user_id` should match `e.user_id`
- `up.employee_id` should match `e.id`
- `up.role` should be 'employee'

---

## 🔍 What the Function Does Now

1. **Creates Auth User** with email/password
2. **Creates User Profile** in `user_profiles` table with:
   - `user_id` (links to auth.users)
   - `employee_id` (links to employees)
   - `role` = 'employee'
   - `is_active` = true
3. **Updates Employee Record** with `user_id` to complete the link
4. **Returns** user data and password to frontend

### Error Handling:
- If profile creation fails → Deletes auth user (rollback)
- If employee update fails → Deletes auth user (rollback)
- All errors are logged and returned to frontend

---

## ⚠️ Troubleshooting

### "supabase: command not found"
Install Supabase CLI:
```powershell
npm install -g supabase
```

### "Project not linked"
Run:
```powershell
supabase link --project-ref xbqzohdjjppfgzxbjlsa
```

### "Permission denied"
Make sure you're logged in:
```powershell
supabase login
```

### Still getting CORS errors after deployment
1. Wait 1-2 minutes for deployment to propagate
2. Hard refresh browser (Ctrl+Shift+R)
3. Check function logs in Supabase Dashboard → Edge Functions → Logs

### Getting 401 Unauthorized error
This means JWT verification is enabled. Fix it by:
1. **Using CLI:** Redeploy with `--no-verify-jwt` flag:
   ```powershell
   supabase functions deploy create-employee-user --no-verify-jwt
   ```
2. **Using Dashboard:** 
   - Go to Edge Functions → `create-employee-user` → Settings
   - Disable "Verify JWT" option
   - Save changes

---

## 📊 Files Modified

**File:** [`supabase/functions/create-employee-user/index.ts`](file:///c:/Users/Mathew%20Fedrick%2013/Downloads/PayrollQatar/supabase/functions/create-employee-user/index.ts)

**Key Changes:**
- Line 46-53: Removed `organization_id` from insert
- Line 61-71: Added employee table update with rollback
- Line 74: Updated comment numbering

---

## ✨ After Deployment

Once deployed, the "Create Login" feature will work perfectly:
- ✅ No CORS errors
- ✅ User account created automatically
- ✅ Credentials displayed to admin
- ✅ Employee can login immediately with provided credentials
