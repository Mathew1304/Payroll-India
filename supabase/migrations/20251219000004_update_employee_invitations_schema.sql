-- Add missing columns to employee_invitations table
ALTER TABLE public.employee_invitations
ADD COLUMN IF NOT EXISTS invitation_type text DEFAULT 'full_onboarding',
ADD COLUMN IF NOT EXISTS onboarding_token uuid;

-- Add index for onboarding_token as it will be queried
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON public.employee_invitations(onboarding_token);
