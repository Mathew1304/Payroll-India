# Employee Credentials Email Setup

This guide explains how to set up the email functionality for sending employee credentials.

## Overview

When an admin creates an employee with login access, the system:
1. Generates a random password
2. Creates the user account in Supabase Auth
3. Sends an email to the employee with their credentials
4. Shows the credentials to the admin in a modal

## Email Service Setup

The system uses Resend API to send emails. To enable email sending, you need to:

### 1. Get Resend API Key

1. Sign up for a free account at [Resend.com](https://resend.com)
2. Verify your domain (or use the default `onboarding@resend.dev` for testing)
3. Create an API key in the Resend dashboard

### 2. Deploy the Edge Function

The `send-employee-credentials` edge function needs to be deployed:

```bash
# Deploy the function
supabase functions deploy send-employee-credentials
```

### 3. Set Environment Variables

Set the Resend API key as a secret in Supabase:

```bash
# Set the Resend API key
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Optional: Set custom "from" email address
supabase secrets set RESEND_FROM_EMAIL=noreply@yourdomain.com

# Optional: Set app URL (defaults to http://localhost:5173)
supabase secrets set APP_URL=https://yourdomain.com
```

### 4. Verify the Setup

After deploying and setting the secrets:

1. Create an employee with login access from the admin panel
2. Check that the email is sent to the employee
3. Verify the credentials are shown to the admin in the modal

## Email Template

The email includes:
- Welcome message with organization name
- Email address (login username)
- Temporary password
- Security notice to change password on first login
- Login button/link

## Fallback Behavior

If Resend API key is not configured:
- The employee user account is still created
- The credentials are shown to the admin in the modal
- The admin can manually share the credentials with the employee
- The system logs a warning but continues normally

## Password Flow

1. **Employee Creation**: Admin creates employee → Random password generated
2. **Email Sent**: Employee receives email with credentials
3. **First Login**: Employee logs in with provided credentials
4. **Password Change Required**: System detects `force_password_change` flag and redirects to change password page
5. **Password Changed**: Employee sets new password → Flag cleared → Access granted

## Security Notes

- Passwords are randomly generated (format: `ORG@XXXX` where ORG is first 3 letters of org name, XXXX is 4 random digits)
- The `force_password_change` flag ensures employees must change their password on first login
- Passwords are only shown once to the admin in the modal
- Email sending failures don't block employee creation - admin can share credentials manually

