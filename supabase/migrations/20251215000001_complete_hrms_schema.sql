-- ============================================================
-- COMPLETE HRMS SCHEMA - India Payroll System
-- Creates ALL tables from scratch with RLS policies
-- ============================================================

-- ============================================================
-- PART 1: ORGANIZATIONS TABLE (Multi-Tenant Foundation)
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  country text DEFAULT 'India',
  currency text DEFAULT 'INR',
  timezone text DEFAULT 'Asia/Kolkata',
  
  -- Company Details
  legal_name text,
  registration_number text,
  tax_id text,                                        -- GST Number for India
  pan_number text,                                    -- Company PAN
  tan_number text,                                    -- TAN for TDS
  
  -- Address
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  
  -- Contact
  email text,
  phone text,
  website text,
  
  -- Logo
  logo_url text,
  
  -- Settings
  settings jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  
  -- Subscription
  subscription_plan text DEFAULT 'free',
  subscription_status text DEFAULT 'active',
  
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 2: USER PROFILES TABLE (Links auth.users to system)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  employee_id uuid,                                   -- Will reference employees table
  
  -- User Info
  full_name text,
  email text,
  phone text,
  avatar_url text,
  
  -- Role & Permissions
  role text DEFAULT 'employee' CHECK (role IN ('super_admin', 'admin', 'hr_manager', 'manager', 'employee')),
  permissions jsonb DEFAULT '[]',
  
  -- Settings
  preferences jsonb DEFAULT '{}',
  notification_settings jsonb DEFAULT '{}',
  
  -- Status
  is_active boolean DEFAULT true,
  is_onboarded boolean DEFAULT false,
  onboarded_at timestamptz,
  last_login_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 3: DEPARTMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  manager_id uuid,                                    -- References employees
  parent_department_id uuid REFERENCES departments(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- ============================================================
-- PART 4: DESIGNATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS designations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  level integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- ============================================================
-- PART 5: EMPLOYEES TABLE (Core Employee Data)
-- ============================================================

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Info
  employee_code text NOT NULL,
  first_name text NOT NULL,
  last_name text,
  middle_name text,
  
  -- Contact
  personal_email text,
  company_email text,
  mobile_number text,
  alternate_phone text,
  
  -- Personal Details
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  marital_status text CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
  blood_group text,
  nationality text DEFAULT 'Indian',
  
  -- Address
  current_address text,
  current_city text,
  current_state text,
  current_pincode text,
  permanent_address text,
  permanent_city text,
  permanent_state text,
  permanent_pincode text,
  
  -- Indian Identity Documents
  aadhaar_number text,                               -- 12 digit Aadhaar
  pan_number text,                                   -- XXXXX9999X format
  passport_number text,
  passport_expiry date,
  voter_id text,
  driving_license text,
  
  -- Bank Details
  bank_name text,
  bank_account_number text,
  ifsc_code text,
  bank_branch text,
  
  -- PF & ESI
  uan_number text,                                   -- Universal Account Number (EPFO)
  pf_number text,
  esi_number text,
  
  -- Tax
  tax_regime text DEFAULT 'new' CHECK (tax_regime IN ('old', 'new')),
  
  -- Employment Details
  date_of_joining date,
  confirmation_date date,
  probation_end_date date,
  department_id uuid REFERENCES departments(id),
  designation_id uuid REFERENCES designations(id),
  reporting_manager_id uuid REFERENCES employees(id),
  
  -- Employment Status
  employment_status text DEFAULT 'active' CHECK (employment_status IN ('active', 'probation', 'notice_period', 'resigned', 'terminated', 'retired', 'absconding')),
  employment_type text DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern', 'consultant')),
  
  -- Work Location
  work_location text,
  work_state text,                                   -- For Professional Tax
  is_remote boolean DEFAULT false,
  
  -- Separation Details
  resignation_date date,
  last_working_date date,
  separation_reason text,
  
  -- Emergency Contact
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relation text,
  
  -- Photo
  photo_url text,
  
  -- Status
  is_active boolean DEFAULT true,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, employee_code)
);

-- Add foreign key for user_profiles.employee_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_profiles_employee'
  ) THEN
    ALTER TABLE user_profiles 
      ADD CONSTRAINT fk_user_profiles_employee 
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add foreign key for departments.manager_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_manager'
  ) THEN
    ALTER TABLE departments 
      ADD CONSTRAINT fk_departments_manager 
      FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- PART 6: LEAVE TYPES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  
  -- Leave Settings
  days_per_year numeric(5,2) DEFAULT 0,
  is_paid boolean DEFAULT true,
  is_encashable boolean DEFAULT false,
  max_carry_forward numeric(5,2) DEFAULT 0,
  min_days_per_request numeric(5,2) DEFAULT 0.5,
  max_days_per_request numeric(5,2),
  requires_approval boolean DEFAULT true,
  requires_document boolean DEFAULT false,
  
  -- Applicability
  applicable_from_days integer DEFAULT 0,            -- Days after joining
  applicable_gender text,                            -- null = all, 'male', 'female'
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, name)
);

-- ============================================================
-- PART 7: LEAVE BALANCES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  
  year integer NOT NULL,
  
  opening_balance numeric(5,2) DEFAULT 0,
  accrued numeric(5,2) DEFAULT 0,
  used numeric(5,2) DEFAULT 0,
  adjustment numeric(5,2) DEFAULT 0,
  encashed numeric(5,2) DEFAULT 0,
  carried_forward numeric(5,2) DEFAULT 0,
  closing_balance numeric(5,2) DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, leave_type_id, year)
);

-- ============================================================
-- PART 8: LEAVE APPLICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id uuid NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  
  start_date date NOT NULL,
  end_date date NOT NULL,
  days numeric(5,2) NOT NULL,
  
  reason text,
  contact_during_leave text,
  
  -- Half Day Support
  is_half_day boolean DEFAULT false,
  half_day_type text CHECK (half_day_type IN ('first_half', 'second_half')),
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),
  
  -- Approval
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  rejection_reason text,
  
  -- Documents
  document_url text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 9: HOLIDAYS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  date date NOT NULL,
  holiday_type text DEFAULT 'public' CHECK (holiday_type IN ('public', 'restricted', 'optional', 'weekend')),
  description text,
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, date)
);

-- ============================================================
-- PART 10: ATTENDANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  date date NOT NULL,
  
  -- Check In/Out
  check_in_time timestamptz,
  check_out_time timestamptz,
  
  -- Location
  check_in_location text,
  check_in_latitude numeric(10,8),
  check_in_longitude numeric(11,8),
  check_out_location text,
  check_out_latitude numeric(10,8),
  check_out_longitude numeric(11,8),
  
  -- Calculated
  working_hours numeric(5,2),
  overtime_hours numeric(5,2) DEFAULT 0,
  
  -- Status
  status text DEFAULT 'present' CHECK (status IN ('present', 'absent', 'half_day', 'leave', 'holiday', 'weekend', 'work_from_home')),
  
  -- Regularization
  is_regularized boolean DEFAULT false,
  regularization_reason text,
  regularized_by uuid REFERENCES employees(id),
  regularized_at timestamptz,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, date)
);

-- ============================================================
-- PART 11: ANNOUNCEMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  content text NOT NULL,
  
  -- Targeting
  target_type text DEFAULT 'all' CHECK (target_type IN ('all', 'department', 'designation', 'specific')),
  target_departments uuid[],
  target_designations uuid[],
  target_employees uuid[],
  
  -- Scheduling
  publish_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  
  -- Priority
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned boolean DEFAULT false,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 12: HELPDESK / TICKETS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sla_hours integer DEFAULT 24,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  ticket_number text NOT NULL,
  subject text NOT NULL,
  description text,
  
  category_id uuid REFERENCES ticket_categories(id),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed')),
  
  -- Requestor
  created_by_employee_id uuid REFERENCES employees(id),
  created_by_user_id uuid REFERENCES auth.users(id),
  
  -- Assignment
  assigned_to uuid REFERENCES employees(id),
  assigned_at timestamptz,
  
  -- Resolution
  resolved_at timestamptz,
  resolution_notes text,
  
  -- SLA
  due_at timestamptz,
  is_overdue boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, ticket_number)
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  
  content text NOT NULL,
  is_internal boolean DEFAULT false,
  
  created_by_employee_id uuid REFERENCES employees(id),
  created_by_user_id uuid REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 13: EXPENSES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  max_amount numeric(12,2),
  requires_receipt boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  expense_number text,
  category_id uuid REFERENCES expense_categories(id),
  
  expense_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'INR',
  
  description text,
  merchant_name text,
  
  -- Receipt
  receipt_url text,
  
  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'reimbursed')),
  
  -- Approval
  approved_by uuid REFERENCES employees(id),
  approved_at timestamptz,
  rejection_reason text,
  
  -- Reimbursement
  reimbursed_at date,
  reimbursement_reference text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 14: TASKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  
  -- Assignment
  assigned_to uuid REFERENCES employees(id),
  assigned_by uuid REFERENCES employees(id),
  
  -- Dates
  start_date date,
  due_date date,
  completed_at timestamptz,
  
  -- Priority & Status
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
  
  -- Progress
  progress_percentage integer DEFAULT 0,
  
  -- Parent Task (for subtasks)
  parent_task_id uuid REFERENCES tasks(id),
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 15: GOALS / PERFORMANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS goal_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  
  goal_type_id uuid REFERENCES goal_types(id),
  
  -- Period
  start_date date,
  end_date date,
  
  -- Metrics
  target_value numeric(12,2),
  current_value numeric(12,2) DEFAULT 0,
  unit text,
  
  -- Weight for performance review
  weight numeric(5,2) DEFAULT 100,
  
  -- Status
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  progress_percentage integer DEFAULT 0,
  
  -- Manager Assessment
  manager_rating numeric(3,2),
  manager_comments text,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  review_period_start date NOT NULL,
  review_period_end date NOT NULL,
  review_type text DEFAULT 'annual' CHECK (review_type IN ('annual', 'half_yearly', 'quarterly', 'probation')),
  
  -- Ratings (out of 5)
  self_rating numeric(3,2),
  manager_rating numeric(3,2),
  final_rating numeric(3,2),
  
  -- Comments
  self_assessment text,
  manager_assessment text,
  
  -- Strengths & Improvements
  strengths text,
  areas_of_improvement text,
  
  -- Recommendations
  promotion_recommended boolean DEFAULT false,
  increment_recommended boolean DEFAULT false,
  training_recommended text,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'self_review', 'manager_review', 'completed')),
  
  reviewer_id uuid REFERENCES employees(id),
  reviewed_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, review_period_start, review_period_end)
);

-- ============================================================
-- PART 16: TRAINING TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  title text NOT NULL,
  description text,
  
  -- Schedule
  start_date date,
  end_date date,
  duration_hours numeric(5,2),
  
  -- Type
  training_type text DEFAULT 'internal' CHECK (training_type IN ('internal', 'external', 'online', 'certification')),
  
  -- Location
  location text,
  is_virtual boolean DEFAULT false,
  meeting_link text,
  
  -- Trainer
  trainer_name text,
  trainer_organization text,
  
  -- Capacity
  max_participants integer,
  
  -- Status
  status text DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  enrollment_date timestamptz DEFAULT now(),
  
  -- Attendance
  attended boolean DEFAULT false,
  attendance_date date,
  
  -- Completion
  completion_status text DEFAULT 'enrolled' CHECK (completion_status IN ('enrolled', 'attended', 'completed', 'failed', 'dropped')),
  completion_date date,
  
  -- Assessment
  score numeric(5,2),
  certificate_url text,
  
  feedback text,
  rating numeric(3,2),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(training_id, employee_id)
);

-- ============================================================
-- PART 17: WORK REPORTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  report_date date NOT NULL,
  report_type text DEFAULT 'daily' CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  
  -- Content
  tasks_completed text,
  tasks_in_progress text,
  tasks_planned text,
  blockers text,
  
  -- Time
  hours_worked numeric(4,2),
  
  -- Status
  status text DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  
  reviewed_by uuid REFERENCES employees(id),
  reviewed_at timestamptz,
  review_comments text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, report_date, report_type)
);

-- ============================================================
-- PART 18: DOCUMENTS / FILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  document_type text NOT NULL,                        -- aadhaar, pan, passport, offer_letter, etc.
  document_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  mime_type text,
  
  -- Verification
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  
  -- Expiry
  expiry_date date,
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 19: ERROR LOGS TABLE (For debugging)
-- ============================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES auth.users(id),
  
  error_type text,
  error_message text,
  error_stack text,
  
  context jsonb,
  
  page_url text,
  user_agent text,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 20: IMPORT HISTORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  import_type text NOT NULL,                          -- employees, attendance, etc.
  file_name text,
  
  total_rows integer DEFAULT 0,
  successful_rows integer DEFAULT 0,
  failed_rows integer DEFAULT 0,
  
  status text DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'partial')),
  
  error_log jsonb,
  
  imported_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ============================================================
-- PART 21: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 22: RLS POLICIES - ORGANIZATIONS
-- ============================================================

DROP POLICY IF EXISTS "org_users_can_view_own" ON organizations;
CREATE POLICY "org_users_can_view_own"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

DROP POLICY IF EXISTS "org_admins_can_update" ON organizations;
CREATE POLICY "org_admins_can_update"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "org_anyone_can_create" ON organizations;
CREATE POLICY "org_anyone_can_create"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- PART 23: RLS POLICIES - USER_PROFILES
-- ============================================================

DROP POLICY IF EXISTS "users_can_view_own_profile" ON user_profiles;
CREATE POLICY "users_can_view_own_profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "users_can_update_own_profile" ON user_profiles;
CREATE POLICY "users_can_update_own_profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_insert_own_profile" ON user_profiles;
CREATE POLICY "users_can_insert_own_profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PART 24: RLS POLICIES - EMPLOYEES
-- ============================================================

DROP POLICY IF EXISTS "employees_org_members_can_view" ON employees;
CREATE POLICY "employees_org_members_can_view"
  ON employees FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "employees_admins_can_manage" ON employees;
CREATE POLICY "employees_admins_can_manage"
  ON employees FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 25: RLS POLICIES - DEPARTMENTS & DESIGNATIONS
-- ============================================================

DROP POLICY IF EXISTS "departments_org_members_view" ON departments;
CREATE POLICY "departments_org_members_view"
  ON departments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "departments_admins_manage" ON departments;
CREATE POLICY "departments_admins_manage"
  ON departments FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "designations_org_members_view" ON designations;
CREATE POLICY "designations_org_members_view"
  ON designations FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "designations_admins_manage" ON designations;
CREATE POLICY "designations_admins_manage"
  ON designations FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 26: RLS POLICIES - LEAVE MANAGEMENT
-- ============================================================

DROP POLICY IF EXISTS "leave_types_org_view" ON leave_types;
CREATE POLICY "leave_types_org_view"
  ON leave_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "leave_types_admins_manage" ON leave_types;
CREATE POLICY "leave_types_admins_manage"
  ON leave_types FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_balances_view_own" ON leave_balances;
CREATE POLICY "leave_balances_view_own"
  ON leave_balances FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_balances_admins_manage" ON leave_balances;
CREATE POLICY "leave_balances_admins_manage"
  ON leave_balances FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_applications_view_own" ON leave_applications;
CREATE POLICY "leave_applications_view_own"
  ON leave_applications FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_applications_employees_create" ON leave_applications;
CREATE POLICY "leave_applications_employees_create"
  ON leave_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "leave_applications_manage" ON leave_applications;
CREATE POLICY "leave_applications_manage"
  ON leave_applications FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 27: RLS POLICIES - ATTENDANCE
-- ============================================================

DROP POLICY IF EXISTS "attendance_view_own" ON attendance;
CREATE POLICY "attendance_view_own"
  ON attendance FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "attendance_employees_punch" ON attendance;
CREATE POLICY "attendance_employees_punch"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "attendance_update" ON attendance;
CREATE POLICY "attendance_update"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 28: RLS POLICIES - HOLIDAYS
-- ============================================================

DROP POLICY IF EXISTS "holidays_org_view" ON holidays;
CREATE POLICY "holidays_org_view"
  ON holidays FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "holidays_admins_manage" ON holidays;
CREATE POLICY "holidays_admins_manage"
  ON holidays FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 29: RLS POLICIES - ANNOUNCEMENTS
-- ============================================================

DROP POLICY IF EXISTS "announcements_org_view" ON announcements;
CREATE POLICY "announcements_org_view"
  ON announcements FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "announcements_admins_manage" ON announcements;
CREATE POLICY "announcements_admins_manage"
  ON announcements FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 30: RLS POLICIES - TICKETS
-- ============================================================

DROP POLICY IF EXISTS "ticket_categories_org_view" ON ticket_categories;
CREATE POLICY "ticket_categories_org_view"
  ON ticket_categories FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "ticket_categories_admins_manage" ON ticket_categories;
CREATE POLICY "ticket_categories_admins_manage"
  ON ticket_categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "tickets_view_own_or_admin" ON tickets;
CREATE POLICY "tickets_view_own_or_admin"
  ON tickets FOR SELECT
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR
    created_by_employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "tickets_create" ON tickets;
CREATE POLICY "tickets_create"
  ON tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tickets_update" ON tickets;
CREATE POLICY "tickets_update"
  ON tickets FOR UPDATE
  TO authenticated
  USING (
    created_by_user_id = auth.uid()
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "ticket_comments_view" ON ticket_comments;
CREATE POLICY "ticket_comments_view"
  ON ticket_comments FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT id FROM tickets WHERE 
        created_by_user_id = auth.uid()
        OR organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "ticket_comments_create" ON ticket_comments;
CREATE POLICY "ticket_comments_create"
  ON ticket_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM tickets WHERE 
        organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- PART 31: RLS POLICIES - EXPENSES
-- ============================================================

DROP POLICY IF EXISTS "expense_categories_org_view" ON expense_categories;
CREATE POLICY "expense_categories_org_view"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "expense_categories_admins_manage" ON expense_categories;
CREATE POLICY "expense_categories_admins_manage"
  ON expense_categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expenses_view_own" ON expenses;
CREATE POLICY "expenses_view_own"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expenses_employees_create" ON expenses;
CREATE POLICY "expenses_employees_create"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "expenses_manage" ON expenses;
CREATE POLICY "expenses_manage"
  ON expenses FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 32: RLS POLICIES - TASKS
-- ============================================================

DROP POLICY IF EXISTS "tasks_view" ON tasks;
CREATE POLICY "tasks_view"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_create" ON tasks;
CREATE POLICY "tasks_create"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- PART 33: RLS POLICIES - GOALS & PERFORMANCE
-- ============================================================

DROP POLICY IF EXISTS "goal_types_org_view" ON goal_types;
CREATE POLICY "goal_types_org_view"
  ON goal_types FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "goal_types_admins_manage" ON goal_types;
CREATE POLICY "goal_types_admins_manage"
  ON goal_types FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "goals_view_own" ON goals;
CREATE POLICY "goals_view_own"
  ON goals FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "goals_manage" ON goals;
CREATE POLICY "goals_manage"
  ON goals FOR ALL
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "performance_reviews_view_own" ON performance_reviews;
CREATE POLICY "performance_reviews_view_own"
  ON performance_reviews FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "performance_reviews_manage" ON performance_reviews;
CREATE POLICY "performance_reviews_manage"
  ON performance_reviews FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 34: RLS POLICIES - TRAININGS
-- ============================================================

DROP POLICY IF EXISTS "trainings_org_view" ON trainings;
CREATE POLICY "trainings_org_view"
  ON trainings FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainings_admins_manage" ON trainings;
CREATE POLICY "trainings_admins_manage"
  ON trainings FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "training_enrollments_view" ON training_enrollments;
CREATE POLICY "training_enrollments_view"
  ON training_enrollments FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    training_id IN (
      SELECT id FROM trainings WHERE 
        organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "training_enrollments_manage" ON training_enrollments;
CREATE POLICY "training_enrollments_manage"
  ON training_enrollments FOR ALL
  TO authenticated
  USING (
    training_id IN (
      SELECT id FROM trainings WHERE 
        organization_id IN (
          SELECT organization_id FROM user_profiles 
          WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
        )
    )
  )
  WITH CHECK (
    training_id IN (
      SELECT id FROM trainings WHERE 
        organization_id IN (SELECT organization_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- ============================================================
-- PART 35: RLS POLICIES - WORK REPORTS
-- ============================================================

DROP POLICY IF EXISTS "work_reports_view_own" ON work_reports;
CREATE POLICY "work_reports_view_own"
  ON work_reports FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "work_reports_employees_manage" ON work_reports;
CREATE POLICY "work_reports_employees_manage"
  ON work_reports FOR ALL
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'manager', 'super_admin')
    )
  )
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 36: RLS POLICIES - DOCUMENTS
-- ============================================================

DROP POLICY IF EXISTS "employee_documents_view_own" ON employee_documents;
CREATE POLICY "employee_documents_view_own"
  ON employee_documents FOR SELECT
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "employee_documents_manage" ON employee_documents;
CREATE POLICY "employee_documents_manage"
  ON employee_documents FOR ALL
  TO authenticated
  USING (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    employee_id IN (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 37: RLS POLICIES - ERROR LOGS & IMPORT HISTORY
-- ============================================================

DROP POLICY IF EXISTS "error_logs_admins_view" ON error_logs;
CREATE POLICY "error_logs_admins_view"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "error_logs_anyone_insert" ON error_logs;
CREATE POLICY "error_logs_anyone_insert"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "import_history_org_view" ON import_history;
CREATE POLICY "import_history_org_view"
  ON import_history FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "import_history_admins_manage" ON import_history;
CREATE POLICY "import_history_admins_manage"
  ON import_history FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'hr_manager', 'super_admin')
    )
  );

-- ============================================================
-- PART 38: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_org_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee_id ON user_profiles(employee_id);

CREATE INDEX IF NOT EXISTS idx_employees_org_id ON employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_code ON employees(employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(is_active);

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_designations_org ON designations(organization_id);

CREATE INDEX IF NOT EXISTS idx_leave_types_org ON leave_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_employee ON leave_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);

CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance(organization_id);

CREATE INDEX IF NOT EXISTS idx_holidays_org_date ON holidays(organization_id, date);

CREATE INDEX IF NOT EXISTS idx_announcements_org ON announcements(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

CREATE INDEX IF NOT EXISTS idx_expenses_employee ON expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_goals_employee ON goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);

CREATE INDEX IF NOT EXISTS idx_trainings_org ON trainings(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee ON training_enrollments(employee_id);

CREATE INDEX IF NOT EXISTS idx_work_reports_employee_date ON work_reports(employee_id, report_date);

CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id);

-- ============================================================
-- PART 39: CREATE HELPER FUNCTIONS
-- ============================================================

-- Function to get current user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'hr_manager', 'super_admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Function to get user's employee ID
CREATE OR REPLACE FUNCTION get_user_employee_id()
RETURNS uuid AS $$
  SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PART 40: CREATE UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to all relevant tables
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'organizations', 'user_profiles', 'departments', 'designations', 'employees',
      'leave_types', 'leave_balances', 'leave_applications', 'attendance',
      'announcements', 'tickets', 'expenses', 'tasks', 'goals', 'performance_reviews',
      'trainings', 'work_reports', 'employee_documents'
    ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_%s_updated_at ON %s', t, t);
    EXECUTE format('
      CREATE TRIGGER trigger_update_%s_updated_at
      BEFORE UPDATE ON %s
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    ', t, t);
  END LOOP;
END;
$$;

-- ============================================================
-- PART 41: GRANT PERMISSIONS
-- ============================================================

GRANT ALL ON organizations TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON departments TO authenticated;
GRANT ALL ON designations TO authenticated;
GRANT ALL ON employees TO authenticated;
GRANT ALL ON leave_types TO authenticated;
GRANT ALL ON leave_balances TO authenticated;
GRANT ALL ON leave_applications TO authenticated;
GRANT ALL ON holidays TO authenticated;
GRANT ALL ON attendance TO authenticated;
GRANT ALL ON announcements TO authenticated;
GRANT ALL ON ticket_categories TO authenticated;
GRANT ALL ON tickets TO authenticated;
GRANT ALL ON ticket_comments TO authenticated;
GRANT ALL ON expense_categories TO authenticated;
GRANT ALL ON expenses TO authenticated;
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON goal_types TO authenticated;
GRANT ALL ON goals TO authenticated;
GRANT ALL ON performance_reviews TO authenticated;
GRANT ALL ON trainings TO authenticated;
GRANT ALL ON training_enrollments TO authenticated;
GRANT ALL ON work_reports TO authenticated;
GRANT ALL ON employee_documents TO authenticated;
GRANT ALL ON error_logs TO authenticated;
GRANT ALL ON import_history TO authenticated;

-- ============================================================
-- SCHEMA COMPLETE - Core HRMS Tables Created
-- ============================================================

