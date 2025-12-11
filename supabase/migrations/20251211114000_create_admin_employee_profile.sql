-- Migration to create employee profile for admin user pixelfactory11@gmail.com

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_emp_id uuid;
  v_email text := 'pixelfactory11@gmail.com';
BEGIN
  -- 1. Get User ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User % not found', v_email;
    RETURN;
  END IF;

  -- 2. Get Organization ID (assuming user is owner or member)
  -- Try finding from organization_members first
  SELECT organization_id INTO v_org_id 
  FROM organization_members 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  -- If not found, try organizations owner
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations WHERE owner_id = v_user_id LIMIT 1;
  END IF;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Organization not found for user %', v_email;
    RETURN;
  END IF;

  -- 3. Check if employee exists
  SELECT id INTO v_emp_id FROM employees WHERE company_email = v_email;
  
  IF v_emp_id IS NULL THEN
    -- Insert new employee
    INSERT INTO employees (
      organization_id,
      first_name, 
      last_name, 
      company_email, 
      personal_email,
      mobile_number, 
      date_of_joining,
      employment_type,
      employment_status,
      is_active
    ) VALUES (
      v_org_id,
      'Pixel',
      'Factory',
      v_email,
      v_email,
      '0000000000', -- Placeholder
      CURRENT_DATE,
      'full_time',
      'active',
      true
    ) RETURNING id INTO v_emp_id;
    
    RAISE NOTICE 'Created employee record %', v_emp_id;
  ELSE
    RAISE NOTICE 'Employee record already exists: %', v_emp_id;
  END IF;

  -- 4. Link to organization_members
  UPDATE organization_members 
  SET employee_id = v_emp_id 
  WHERE user_id = v_user_id AND organization_id = v_org_id;
  
  -- 5. Link to user_profiles
  UPDATE user_profiles
  SET employee_id = v_emp_id
  WHERE user_id = v_user_id;
  
END $$;
