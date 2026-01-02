# 🔧 Fix Resend Email Domain Verification

## ❌ Current Error

```
emailError: 'Failed to send email: {"statusCode":403,"message":...,"name":"validation_error"}'
```

This error occurs because the domain `loghr.in` is not verified in your Resend account.

## ✅ Solution: Verify Your Domain in Resend

### Step 1: Go to Resend Dashboard

1. Visit https://resend.com
2. Log in to your account
3. Navigate to **Domains** in the sidebar

### Step 2: Add and Verify Domain

1. Click **"Add Domain"** button
2. Enter your domain: `loghr.in`
3. Click **"Add"**

### Step 3: Add DNS Records

Resend will provide you with DNS records to add. You need to add these to your domain's DNS settings:

**Example DNS Records (your actual records may differ):**

```
Type: TXT
Name: @
Value: (provided by Resend)

Type: CNAME
Name: resend._domainkey
Value: (provided by Resend)
```

### Step 4: Verify Domain

1. After adding DNS records, wait a few minutes for DNS propagation
2. Click **"Verify"** in Resend dashboard
3. Once verified, the domain status will show as **"Verified"**

### Step 5: Update Environment Variables

Make sure these environment variables are set in your Supabase project:

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Add/Update these secrets:

```
RESEND_API_KEY=re_d8L5pS8k_AEGnXKqp8nz4v9mydn1waJvE
RESEND_FROM_EMAIL=noreply@loghr.in
APP_URL=https://payroll-india.vercel.app
```

### Step 6: Redeploy Edge Function

After verifying the domain, redeploy the Edge Function:

```powershell
supabase functions deploy create-employee-user --no-verify-jwt
```

## 🧪 Test Email Sending

1. Create a new employee with "Create Login" enabled
2. Check the console for email status
3. The employee should receive an email at their company email address

## 📧 Alternative: Use Resend's Test Domain

If you want to test immediately without verifying your domain:

1. In Resend dashboard, go to **API Keys**
2. Use the test domain: `onboarding@resend.dev`
3. Update `RESEND_FROM_EMAIL` to `onboarding@resend.dev`

**Note:** Test domain emails will have a banner saying "Sent via Resend" and may go to spam.

## 🔍 Troubleshooting

### Still Getting 403 Error?

1. **Check domain verification status** in Resend dashboard
2. **Verify DNS records** are correctly added (can take up to 48 hours)
3. **Check API key** is correct and active
4. **Check from email** matches the verified domain

### Domain Verification Taking Too Long?

- DNS propagation can take 24-48 hours
- Make sure DNS records are added correctly
- Use a DNS checker tool to verify records are live

### Need Help?

- Resend Documentation: https://resend.com/docs
- Resend Support: https://resend.com/support

