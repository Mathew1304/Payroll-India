-- Fix Admin Access to Organizations
-- Currently, policies might only allow 'super_admin'. We need to allow organization members (Admins) to view their own organization.

-- 1. Organizations Policy
-- Allow users to view organizations where they are members (or owners)
DROP POLICY IF EXISTS "Members can view own organization" ON organizations;
CREATE POLICY "Members can view own organization"
ON organizations FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id
  OR
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organizations.id
    AND organization_members.user_id = auth.uid()
    AND organization_members.is_active = true
  )
);

-- 2. Subscription Policy
-- Allow members (or at least admins) to view the subscription of their organization
DROP POLICY IF EXISTS "Admins can view organization subscription" ON organization_subscriptions;
CREATE POLICY "Admins can view organization subscription"
ON organization_subscriptions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.organization_id = organization_subscriptions.organization_id
    AND organization_members.user_id = auth.uid()
    AND organization_members.role IN ('admin')
  )
);
