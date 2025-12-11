/*
  # Separate Admin from Employee Table
  
  ## Overview
  This migration creates a separate table for organization admins and migrates
  existing admin data from the employees table.
  
  ## Changes
  1. Create organization_admins table
  2. Migrate existing admin data from employees to organization_admins
  3. Update organization_members to reference admin_id
  4. Add helper functions for admin operations
  5. Create RLS policies for organization_admins
*/

-- ============================================================================
-- CREATE ORGANIZATION_ADMINS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL, -- References auth.users
  
  -- Personal Information
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  
  -- Contact Information
  email text NOT NULL,
  mobile_number text,
  alternate_number text,
  
  -- Profile
  profile_picture_url text,
  date_of_birth date,
  gender gender,
  
  -- Address
  current_address text,
  permanent_address text,
  city text,
  state text,
  country text,
  pincode text,
  
  -- Admin-specific fields
  admin_code text UNIQUE, -- Auto-generated: FM-ADM-0001
  designation text, -- e.g., "CEO", "Managing Director", "HR Head"
  date_of_joining date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Status
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, user_id),
  UNIQUE(organization_id, email)
);

-- Admin code sequence
CREATE SEQUENCE IF NOT EXISTS admin_code_seq START 1;

-- Function to generate admin code
CREATE OR REPLACE FUNCTION generate_admin_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.admin_code IS NULL THEN
    NEW.admin_code := 'FM-ADM-' || LPAD(nextval('admin_code_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate admin code
DROP TRIGGER IF EXISTS set_admin_code ON organization_admins;
CREATE TRIGGER set_admin_code
  BEFORE INSERT ON organization_admins
  FOR EACH ROW
  EXECUTE FUNCTION generate_admin_code();

-- ============================================================================
-- UPDATE ORGANIZATION_MEMBERS TABLE
-- ============================================================================

-- Add admin_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organization_members' AND column_name = 'admin_id'
  ) THEN
    ALTER TABLE organization_members 
      ADD COLUMN admin_id uuid REFERENCES organization_admins(id) ON DELETE SET NULL;
    
    CREATE INDEX idx_organization_members_admin ON organization_members(admin_id);
  END IF;
END $$;

-- ============================================================================
-- MIGRATE EXISTING ADMIN DATA
-- ============================================================================

DO $$
DECLARE
  admin_record RECORD;
  new_admin_id uuid;
BEGIN
  -- Find all users with admin or hr role in organization_members
  FOR admin_record IN 
    SELECT DISTINCT
      om.id as member_id,
      om.organization_id,
      om.user_id,
      om.role,
      om.employee_id,
      e.first_name,
      e.middle_name,
      e.last_name,
      e.company_email,
      e.personal_email,
      e.mobile_number,
      e.alternate_number,
      e.date_of_birth,
      e.gender,
      e.current_address,
      e.permanent_address,
      e.city,
      e.state,
      e.pincode,
      e.date_of_joining,
      au.email as auth_email
    FROM organization_members om
    LEFT JOIN employees e ON e.id = om.employee_id
    LEFT JOIN auth.users au ON au.id = om.user_id
    WHERE om.role IN ('admin', 'hr')
      AND om.admin_id IS NULL -- Only migrate if not already migrated
  LOOP
    -- Check if admin already exists for this user and organization
    SELECT id INTO new_admin_id
    FROM organization_admins
    WHERE organization_id = admin_record.organization_id
      AND user_id = admin_record.user_id;
    
    -- If admin doesn't exist, create it
    IF new_admin_id IS NULL THEN
      INSERT INTO organization_admins (
        organization_id,
        user_id,
        first_name,
        middle_name,
        last_name,
        email,
        mobile_number,
        alternate_number,
        date_of_birth,
        gender,
        current_address,
        permanent_address,
        city,
        state,
        pincode,
        designation,
        date_of_joining,
        is_active
      ) VALUES (
        admin_record.organization_id,
        admin_record.user_id,
        COALESCE(admin_record.first_name, 'Admin'),
        admin_record.middle_name,
        COALESCE(admin_record.last_name, 'User'),
        COALESCE(admin_record.company_email, admin_record.personal_email, admin_record.auth_email),
        admin_record.mobile_number,
        admin_record.alternate_number,
        admin_record.date_of_birth,
        admin_record.gender,
        admin_record.current_address,
        admin_record.permanent_address,
        admin_record.city,
        admin_record.state,
        admin_record.pincode,
        CASE 
          WHEN admin_record.role = 'admin' THEN 'Administrator'
          WHEN admin_record.role = 'hr' THEN 'HR Manager'
          ELSE 'Admin'
        END,
        COALESCE(admin_record.date_of_joining, CURRENT_DATE),
        true
      ) RETURNING id INTO new_admin_id;
      
      RAISE NOTICE 'Created admin record % for user % in org %', 
        new_admin_id, admin_record.user_id, admin_record.organization_id;
    END IF;
    
    -- Update organization_members to reference the admin
    UPDATE organization_members
    SET admin_id = new_admin_id,
        employee_id = NULL -- Remove employee reference for admins
    WHERE id = admin_record.member_id;
    
    RAISE NOTICE 'Updated organization_member % to reference admin %', 
      admin_record.member_id, new_admin_id;
    
    -- Delete the employee record if it exists (only for admins)
    IF admin_record.employee_id IS NOT NULL THEN
      DELETE FROM employees WHERE id = admin_record.employee_id;
      RAISE NOTICE 'Deleted employee record %', admin_record.employee_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Admin migration completed successfully';
END $$;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get admin ID for current user in organization
CREATE OR REPLACE FUNCTION get_user_admin_id_in_organization(org_id uuid)
RETURNS uuid AS $$
  SELECT admin_id FROM organization_members
  WHERE organization_id = org_id 
    AND user_id = auth.uid() 
    AND is_active = true
    AND role IN ('admin', 'hr');
$$ LANGUAGE sql SECURITY DEFINER;

-- Update existing function to exclude admins
CREATE OR REPLACE FUNCTION get_user_employee_id_in_organization(org_id uuid)
RETURNS uuid AS $$
  SELECT employee_id FROM organization_members
  WHERE organization_id = org_id 
    AND user_id = auth.uid() 
    AND is_active = true
    AND role NOT IN ('admin', 'hr', 'super_admin'); -- Exclude admin roles
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is admin in organization
CREATE OR REPLACE FUNCTION is_admin_in_organization(org_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'hr')
      AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES FOR ORGANIZATION_ADMINS
-- ============================================================================

ALTER TABLE organization_admins ENABLE ROW LEVEL SECURITY;

-- Admins can view their own profile
CREATE POLICY "Admins can view own profile"
  ON organization_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Organization members can view admins in their organization
CREATE POLICY "Members can view organization admins"
  ON organization_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = organization_admins.organization_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- Admins can update their own profile
CREATE POLICY "Admins can update own profile"
  ON organization_admins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Organization owners can manage admins
CREATE POLICY "Owners can manage admins"
  ON organization_admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_admins.organization_id
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE id = organization_admins.organization_id
        AND owner_id = auth.uid()
    )
  );

-- Super admins can view all admin profiles
CREATE POLICY "Super admins can view all admins"
  ON organization_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
  );

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organization_admins_org ON organization_admins(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_admins_user ON organization_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_admins_email ON organization_admins(email);
CREATE INDEX IF NOT EXISTS idx_organization_admins_active ON organization_admins(is_active);

-- ============================================================================
-- UPDATE USER_PROFILES
-- ============================================================================

-- Update user_profiles to link to admin records
DO $$
DECLARE
  admin_rec RECORD;
BEGIN
  FOR admin_rec IN 
    SELECT oa.id as admin_id, oa.user_id
    FROM organization_admins oa
  LOOP
    -- Update user_profiles if they exist
    UPDATE user_profiles
    SET employee_id = NULL -- Clear employee_id for admins
    WHERE user_id = admin_rec.user_id;
  END LOOP;
END $$;

COMMENT ON TABLE organization_admins IS 'Stores organization-specific admin profiles, separate from employees';
COMMENT ON COLUMN organization_admins.admin_code IS 'Auto-generated unique admin code (FM-ADM-XXXX)';
COMMENT ON COLUMN organization_admins.designation IS 'Admin designation (e.g., CEO, HR Manager, Administrator)';
