# 🚀 Deploy send-employee-credentials Edge Function

## Quick Deploy

Run this command in your terminal:

```bash
cd "c:\Users\Mathew Fedrick 13\Downloads\PayrollQatar"
supabase functions deploy send-employee-credentials
```

---

## Manual Deployment (Alternative)

If the CLI doesn't work, deploy manually:

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/xbqzohdjjppfgzxbjlsa/functions
2. Click **"Create a new function"** or find **`send-employee-credentials`** if it exists
3. If it exists, click **"Edit Function"**
4. Copy the entire contents of: `supabase/functions/send-employee-credentials/index.ts`
5. Paste it into the function editor
6. Click **"Deploy"**

---

## Set Environment Variables (Optional but Recommended)

For production, set the Resend API key as an environment variable:

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Add a new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_D7YUfF6W_HWmW8RmDWQJtg52ZrwNftKmE`

Or via CLI:
```bash
supabase secrets set RESEND_API_KEY=re_D7YUfF6W_HWmW8RmDWQJtg52ZrwNftKmE
```

---

## Verify Deployment

After deploying:

1. Refresh your browser (Ctrl+R or Ctrl+Shift+R)
2. Try adding a new employee with "Create Login" checked
3. Check the browser console - you should see:
   - ✅ No 401 errors
   - ✅ Email sent successfully message

---

## Troubleshooting

### "supabase: command not found"
Install Supabase CLI:
```powershell
npm install -g supabase
```

### "Project not linked"
Link your project:
```powershell
supabase link --project-ref xbqzohdjjppfgzxbjlsa
```

### "Permission denied"
Make sure you're logged in:
```powershell
supabase login
```

### Still getting 401 after deployment
1. Wait 1-2 minutes for deployment to propagate
2. Hard refresh browser (Ctrl+Shift+R)
3. Check function logs in Supabase Dashboard → Edge Functions → Logs

---

## What This Function Does

- Sends welcome email via Resend API when a new employee is added
- Includes login credentials (email and password)
- Includes onboarding form link
- Uses the Resend API key you provided
- Falls back gracefully if email sending fails (employee is still created)

