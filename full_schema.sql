-- FULL SCHEMA EXPORT


-- ==========================================
-- FROM FILE: 20251215000001_complete_hrms_schema.sql
-- ==========================================


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
-- SCHEMA COMPLETE - Core HRMS Tables Created
-- ============================================================;


-- ==========================================
-- FROM FILE: 20251215000002_india_payroll_schema.sql
-- ==========================================


-- ============================================================
-- INDIA PAYROLL SYSTEM - Complete Schema with RLS Policies
-- Compliant with: PF Act 1952, ESI Act 1948, Income Tax Act 1961
-- Payment of Gratuity Act 1972, Payment of Wages Act 1936
-- ============================================================

-- ============================================================
-- PART 1: CREATE INDIA SALARY COMPONENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_salary_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Salary Components
  basic_salary numeric(12,2) NOT NULL,
  dearness_allowance numeric(12,2) DEFAULT 0,          -- DA
  house_rent_allowance numeric(12,2) DEFAULT 0,        -- HRA
  conveyance_allowance numeric(12,2) DEFAULT 0,
  medical_allowance numeric(12,2) DEFAULT 0,
  special_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  
  -- Employer PF Contribution Settings
  is_pf_applicable boolean DEFAULT true,
  pf_contribution_type text DEFAULT 'statutory',       -- statutory / voluntary / opted_out
  pf_wage_ceiling numeric(12,2) DEFAULT 15000,         -- Current PF wage ceiling
  
  -- ESI Settings
  is_esi_applicable boolean DEFAULT true,              -- Auto-calculated based on gross
  
  -- Effective Dates
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean DEFAULT true,
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 2: CREATE INDIA PAYROLL RECORDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_payroll_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  salary_component_id uuid REFERENCES india_salary_components(id),
  
  -- Pay Period
  pay_period_month integer NOT NULL,
  pay_period_year integer NOT NULL,
  
  -- Earnings - Salary Components
  basic_salary numeric(12,2) NOT NULL,
  dearness_allowance numeric(12,2) DEFAULT 0,
  house_rent_allowance numeric(12,2) DEFAULT 0,
  conveyance_allowance numeric(12,2) DEFAULT 0,
  medical_allowance numeric(12,2) DEFAULT 0,
  special_allowance numeric(12,2) DEFAULT 0,
  other_allowances numeric(12,2) DEFAULT 0,
  
  -- Additional Earnings
  overtime_hours numeric(5,2) DEFAULT 0,
  overtime_amount numeric(12,2) DEFAULT 0,
  bonus numeric(12,2) DEFAULT 0,
  incentive numeric(12,2) DEFAULT 0,
  arrears numeric(12,2) DEFAULT 0,
  
  -- Statutory Deductions (Employee Share)
  pf_employee numeric(12,2) DEFAULT 0,                 -- 12% of Basic + DA
  esi_employee numeric(12,2) DEFAULT 0,                -- 0.75% if gross <= 21000
  professional_tax numeric(12,2) DEFAULT 0,            -- State-wise
  tds numeric(12,2) DEFAULT 0,                         -- Income Tax TDS
  lwf numeric(12,2) DEFAULT 0,                         -- Labour Welfare Fund
  
  -- Employer Contributions (for CTC & Compliance)
  pf_employer numeric(12,2) DEFAULT 0,                 -- 12% of Basic + DA
  esi_employer numeric(12,2) DEFAULT 0,                -- 3.25% if gross <= 21000
  
  -- Other Deductions
  absence_deduction numeric(12,2) DEFAULT 0,
  loan_deduction numeric(12,2) DEFAULT 0,
  advance_deduction numeric(12,2) DEFAULT 0,
  penalty_deduction numeric(12,2) DEFAULT 0,
  other_deductions numeric(12,2) DEFAULT 0,
  
  -- Calculated Totals
  gross_salary numeric(12,2) NOT NULL,
  total_statutory_deductions numeric(12,2) DEFAULT 0,
  total_deductions numeric(12,2) DEFAULT 0,
  net_salary numeric(12,2) NOT NULL,
  ctc numeric(12,2) DEFAULT 0,                         -- Cost to Company
  
  -- Days
  working_days integer DEFAULT 26,
  days_present integer DEFAULT 26,
  days_absent integer DEFAULT 0,
  days_leave integer DEFAULT 0,
  loss_of_pay_days integer DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft',
  payment_status text DEFAULT 'pending',
  payment_date date,
  payment_method text DEFAULT 'bank_transfer',
  bank_reference_number text,
  
  -- Audit
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_india_status CHECK (status IN ('draft', 'approved', 'paid', 'cancelled')),
  CONSTRAINT valid_india_payment_status CHECK (payment_status IN ('pending', 'processing', 'paid', 'confirmed', 'failed')),
  CONSTRAINT unique_india_employee_period UNIQUE(employee_id, pay_period_month, pay_period_year)
);

-- ============================================================
-- PART 3: CREATE INDIA PAYROLL CONFIG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_payroll_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Company Registration Numbers
  pf_establishment_code text,                          -- EPFO Establishment Code
  esi_establishment_code text,                         -- ESIC Code
  tan_number text,                                     -- TAN for TDS
  company_pan text,                                    -- Company PAN
  
  -- Bank Details for Salary Disbursement
  company_bank_account text,
  company_bank_ifsc text,
  company_bank_name text,
  
  -- Default Settings
  default_working_days_per_month integer DEFAULT 26,
  weekend_days text[] DEFAULT ARRAY['sunday']::text[],
  
  -- PF Settings
  pf_employee_rate numeric(5,4) DEFAULT 0.12,          -- 12%
  pf_employer_rate numeric(5,4) DEFAULT 0.12,          -- 12%
  pf_wage_ceiling numeric(12,2) DEFAULT 15000,
  eps_rate numeric(5,4) DEFAULT 0.0833,                -- 8.33% to EPS from employer
  
  -- ESI Settings
  esi_employee_rate numeric(5,4) DEFAULT 0.0075,       -- 0.75%
  esi_employer_rate numeric(5,4) DEFAULT 0.0325,       -- 3.25%
  esi_wage_ceiling numeric(12,2) DEFAULT 21000,
  
  -- Professional Tax (Default Maharashtra)
  pt_state text DEFAULT 'Maharashtra',
  pt_slab_1_limit numeric(12,2) DEFAULT 7500,
  pt_slab_1_tax numeric(12,2) DEFAULT 0,
  pt_slab_2_limit numeric(12,2) DEFAULT 10000,
  pt_slab_2_tax numeric(12,2) DEFAULT 175,
  pt_above_slab_2_tax numeric(12,2) DEFAULT 200,
  
  -- Overtime Settings
  ot_rate_multiplier numeric(3,2) DEFAULT 2.00,        -- 2x as per Factories Act
  
  -- Gratuity Settings
  gratuity_eligibility_years integer DEFAULT 5,
  gratuity_max_amount numeric(12,2) DEFAULT 2000000,   -- ₹20 Lakh max
  
  -- Audit
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- ============================================================
-- PART 4: CREATE INDIA MONTHLY ATTENDANCE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_monthly_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  
  total_working_days integer NOT NULL DEFAULT 26,
  days_present integer DEFAULT 0,
  days_absent integer DEFAULT 0,
  days_leave integer DEFAULT 0,
  days_weekend integer DEFAULT 0,
  days_holiday integer DEFAULT 0,
  late_days integer DEFAULT 0,
  half_days integer DEFAULT 0,
  overtime_hours numeric(6,2) DEFAULT 0,
  loss_of_pay_days integer DEFAULT 0,
  
  is_finalized boolean DEFAULT false,
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, employee_id, month, year)
);

-- ============================================================
-- PART 5: CREATE INDIA EMPLOYEE LOANS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  loan_number text,
  loan_type text DEFAULT 'personal' CHECK (loan_type IN ('personal', 'housing', 'vehicle', 'emergency', 'festival', 'other')),
  loan_amount numeric(12,2) NOT NULL,
  installment_amount numeric(12,2) NOT NULL,
  total_installments integer NOT NULL,
  paid_installments integer DEFAULT 0,
  remaining_amount numeric(12,2),
  start_date date NOT NULL,
  end_date date,
  interest_rate numeric(5,2) DEFAULT 0,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'cancelled', 'rejected')),
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 6: CREATE INDIA EMPLOYEE ADVANCES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_employee_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  advance_number text,
  advance_amount numeric(12,2) NOT NULL,
  recovery_amount numeric(12,2) NOT NULL,
  total_recoveries integer NOT NULL DEFAULT 1,
  paid_recoveries integer DEFAULT 0,
  remaining_amount numeric(12,2),
  advance_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'active', 'completed', 'rejected')),
  
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 7: CREATE INDIA GRATUITY CALCULATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_gratuity_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  joining_date date NOT NULL,
  
  years_of_service numeric(10,2) NOT NULL,
  last_drawn_basic numeric(12,2) NOT NULL,
  last_drawn_da numeric(12,2) DEFAULT 0,
  
  -- Gratuity = (Basic + DA) × 15 × Years / 26
  gratuity_amount numeric(12,2) NOT NULL,
  
  calculation_type text DEFAULT 'estimate' CHECK (calculation_type IN ('estimate', 'final', 'resignation', 'retirement', 'termination', 'death')),
  
  is_eligible boolean DEFAULT true,
  is_final boolean DEFAULT false,
  separation_date date,
  separation_reason text,
  
  notes text,
  calculated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 8: CREATE INDIA BANK TRANSFER FILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_bank_transfer_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  file_name text NOT NULL,
  pay_period_month integer NOT NULL,
  pay_period_year integer NOT NULL,
  
  total_employees integer NOT NULL,
  total_amount numeric(14,2) NOT NULL,
  
  file_content text NOT NULL,
  file_format text DEFAULT 'csv' CHECK (file_format IN ('csv', 'txt', 'xlsx')),
  
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'uploaded', 'processed', 'failed')),
  
  generated_by uuid REFERENCES auth.users(id),
  generated_at timestamptz DEFAULT now(),
  
  utr_reference text,
  processed_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PART 9: CREATE INDIA TDS DECLARATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS india_tds_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  financial_year text NOT NULL,                        -- e.g., '2024-25'
  tax_regime text DEFAULT 'new' CHECK (tax_regime IN ('old', 'new')),
  
  -- Section 80C Deductions
  life_insurance numeric(12,2) DEFAULT 0,
  ppf numeric(12,2) DEFAULT 0,
  elss numeric(12,2) DEFAULT 0,
  nsc numeric(12,2) DEFAULT 0,
  housing_loan_principal numeric(12,2) DEFAULT 0,
  tuition_fees numeric(12,2) DEFAULT 0,
  sukanya_samriddhi numeric(12,2) DEFAULT 0,
  
  -- Section 80D - Health Insurance
  health_insurance_self numeric(12,2) DEFAULT 0,
  health_insurance_parents numeric(12,2) DEFAULT 0,
  preventive_checkup numeric(12,2) DEFAULT 0,
  
  -- Section 24 - Housing Loan Interest
  housing_loan_interest numeric(12,2) DEFAULT 0,
  
  -- HRA Exemption
  actual_rent_paid numeric(12,2) DEFAULT 0,
  city_type text DEFAULT 'non_metro' CHECK (city_type IN ('metro', 'non_metro')),
  
  -- Other Deductions
  section_80e_education_loan numeric(12,2) DEFAULT 0,
  section_80g_donations numeric(12,2) DEFAULT 0,
  section_80tta_savings_interest numeric(12,2) DEFAULT 0,
  nps_80ccd_1b numeric(12,2) DEFAULT 0,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'verified', 'approved')),
  
  submitted_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(employee_id, financial_year)
);

-- ============================================================
-- PART 20: CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_india_salary_employee ON india_salary_components(employee_id);

CREATE INDEX IF NOT EXISTS idx_india_salary_org ON india_salary_components(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_salary_active ON india_salary_components(is_active);

CREATE INDEX IF NOT EXISTS idx_india_payroll_employee ON india_payroll_records(employee_id);

CREATE INDEX IF NOT EXISTS idx_india_payroll_org ON india_payroll_records(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_payroll_period ON india_payroll_records(pay_period_year, pay_period_month);

CREATE INDEX IF NOT EXISTS idx_india_payroll_status ON india_payroll_records(status);

CREATE INDEX IF NOT EXISTS idx_india_payroll_payment_status ON india_payroll_records(payment_status);

CREATE INDEX IF NOT EXISTS idx_india_attendance_employee_month ON india_monthly_attendance(employee_id, month, year);

CREATE INDEX IF NOT EXISTS idx_india_attendance_org ON india_monthly_attendance(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_loans_employee ON india_employee_loans(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_india_loans_org ON india_employee_loans(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_advances_employee ON india_employee_advances(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_india_advances_org ON india_employee_advances(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_gratuity_employee ON india_gratuity_calculations(employee_id);

CREATE INDEX IF NOT EXISTS idx_india_gratuity_org ON india_gratuity_calculations(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_bank_files_org ON india_bank_transfer_files(organization_id);

CREATE INDEX IF NOT EXISTS idx_india_bank_files_period ON india_bank_transfer_files(pay_period_year, pay_period_month);

CREATE INDEX IF NOT EXISTS idx_india_tds_employee_fy ON india_tds_declarations(employee_id, financial_year);

CREATE INDEX IF NOT EXISTS idx_india_tds_org ON india_tds_declarations(organization_id);

-- ============================================================
-- PART 21: CREATE UPDATE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_india_salary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_india_salary_updated_at ON india_salary_components;

CREATE TRIGGER trigger_india_salary_updated_at
  BEFORE UPDATE ON india_salary_components
  FOR EACH ROW
  EXECUTE FUNCTION update_india_salary_updated_at();

DROP TRIGGER IF EXISTS trigger_india_payroll_updated_at ON india_payroll_records;

CREATE TRIGGER trigger_india_payroll_updated_at
  BEFORE UPDATE ON india_payroll_records
  FOR EACH ROW
  EXECUTE FUNCTION update_india_salary_updated_at();

DROP TRIGGER IF EXISTS trigger_india_config_updated_at ON india_payroll_config;

CREATE TRIGGER trigger_india_config_updated_at
  BEFORE UPDATE ON india_payroll_config
  FOR EACH ROW
  EXECUTE FUNCTION update_india_salary_updated_at();

-- ============================================================
-- SCHEMA COMPLETE
-- India Payroll System Tables:
-- 1. india_salary_components - Employee salary structure
-- 2. india_payroll_records - Monthly payroll records
-- 3. india_payroll_config - Organization payroll settings
-- 4. india_monthly_attendance - Attendance summary
-- 5. india_employee_loans - Employee loans
-- 6. india_employee_advances - Salary advances
-- 7. india_gratuity_calculations - Gratuity tracking
-- 8. india_bank_transfer_files - NEFT/RTGS files
-- 9. india_tds_declarations - Tax declarations
-- ============================================================;


-- ==========================================
-- FROM FILE: 20251215000003_create_database_functions.sql
-- ==========================================


-- ============================================================
-- DATABASE FUNCTIONS FOR USER REGISTRATION AND MANAGEMENT
-- ============================================================

-- ============================================================
-- FUNCTION 1: Create New Organization Flow
-- Called during user registration to set up organization
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_new_organization_flow(
  p_user_id uuid,
  p_user_email text,
  p_org_name text,
  p_country text DEFAULT 'India'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  -- Generate a unique slug from organization name
  v_slug := lower(regexp_replace(p_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  
  -- Make slug unique by appending random string if needed
  IF EXISTS (SELECT 1 FROM organizations WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  END IF;

  -- 1. Create Organization
  INSERT INTO organizations (
    name,
    slug,
    country,
    currency,
    timezone,
    email,
    is_active,
    subscription_plan,
    subscription_status,
    created_by
  ) VALUES (
    p_org_name,
    v_slug,
    COALESCE(p_country, 'India'),
    CASE 
      WHEN p_country = 'Qatar' THEN 'QAR'
      WHEN p_country = 'Saudi Arabia' THEN 'SAR'
      WHEN p_country = 'UAE' THEN 'AED'
      ELSE 'INR'
    END,
    CASE 
      WHEN p_country = 'Qatar' THEN 'Asia/Qatar'
      WHEN p_country = 'Saudi Arabia' THEN 'Asia/Riyadh'
      WHEN p_country = 'UAE' THEN 'Asia/Dubai'
      ELSE 'Asia/Kolkata'
    END,
    p_user_email,
    true,
    'free',
    'trial',
    p_user_id
  ) RETURNING id INTO v_org_id;

  -- 2. Create User Profile
  INSERT INTO user_profiles (
    user_id,
    organization_id,
    full_name,
    email,
    role,
    is_active,
    is_onboarded,
    onboarded_at
  ) VALUES (
    p_user_id,
    v_org_id,
    split_part(p_user_email, '@', 1), -- Use email prefix as default name
    p_user_email,
    'admin', -- First user is admin
    true,
    true,
    now()
  );

  -- 3. Create default leave types for the organization
  INSERT INTO leave_types (organization_id, name, code, days_per_year, is_paid, is_encashable)
  VALUES 
    (v_org_id, 'Casual Leave', 'CL', 12, true, false),
    (v_org_id, 'Earned Leave', 'EL', 15, true, true),
    (v_org_id, 'Sick Leave', 'SL', 12, true, false),
    (v_org_id, 'Maternity Leave', 'ML', 180, true, false),
    (v_org_id, 'Paternity Leave', 'PL', 15, true, false);

  -- 4. Create default departments
  INSERT INTO departments (organization_id, name, code, is_active)
  VALUES 
    (v_org_id, 'Administration', 'ADMIN', true),
    (v_org_id, 'Human Resources', 'HR', true),
    (v_org_id, 'Finance', 'FIN', true),
    (v_org_id, 'Operations', 'OPS', true),
    (v_org_id, 'Sales', 'SALES', true),
    (v_org_id, 'Marketing', 'MKT', true),
    (v_org_id, 'IT', 'IT', true);

  -- 5. Create default designations
  INSERT INTO designations (organization_id, name, code, level, is_active)
  VALUES 
    (v_org_id, 'Chief Executive Officer', 'CEO', 10, true),
    (v_org_id, 'Chief Operating Officer', 'COO', 9, true),
    (v_org_id, 'Chief Financial Officer', 'CFO', 9, true),
    (v_org_id, 'Director', 'DIR', 8, true),
    (v_org_id, 'Manager', 'MGR', 7, true),
    (v_org_id, 'Senior Executive', 'SR-EXEC', 6, true),
    (v_org_id, 'Executive', 'EXEC', 5, true),
    (v_org_id, 'Senior Associate', 'SR-ASSOC', 4, true),
    (v_org_id, 'Associate', 'ASSOC', 3, true),
    (v_org_id, 'Trainee', 'TRAINEE', 2, true),
    (v_org_id, 'Intern', 'INTERN', 1, true);

  -- 6. Create default expense categories
  INSERT INTO expense_categories (organization_id, name, requires_receipt, is_active)
  VALUES 
    (v_org_id, 'Travel', true, true),
    (v_org_id, 'Meals & Entertainment', true, true),
    (v_org_id, 'Office Supplies', true, true),
    (v_org_id, 'Accommodation', true, true),
    (v_org_id, 'Communication', true, true),
    (v_org_id, 'Training', true, true),
    (v_org_id, 'Other', true, true);

  -- 7. Create default ticket categories
  INSERT INTO ticket_categories (organization_id, name, sla_hours, is_active)
  VALUES 
    (v_org_id, 'IT Support', 24, true),
    (v_org_id, 'HR Query', 48, true),
    (v_org_id, 'Payroll Issue', 24, true),
    (v_org_id, 'Leave Request', 48, true),
    (v_org_id, 'General Query', 72, true);

  -- 8. Create default goal types
  INSERT INTO goal_types (organization_id, name, is_active)
  VALUES 
    (v_org_id, 'Sales Target', true),
    (v_org_id, 'Project Delivery', true),
    (v_org_id, 'Skill Development', true),
    (v_org_id, 'Customer Satisfaction', true),
    (v_org_id, 'Process Improvement', true);

  -- 9. Create India payroll config if country is India
  IF p_country = 'India' THEN
    INSERT INTO india_payroll_config (
      organization_id,
      default_working_days_per_month,
      pf_employee_rate,
      pf_employer_rate,
      pf_wage_ceiling,
      esi_employee_rate,
      esi_employer_rate,
      esi_wage_ceiling,
      pt_state,
      ot_rate_multiplier,
      gratuity_eligibility_years,
      created_by
    ) VALUES (
      v_org_id,
      26,
      0.12,
      0.12,
      15000,
      0.0075,
      0.0325,
      21000,
      'Maharashtra',
      2.00,
      5,
      p_user_id
    );
  END IF;

  -- Log successful creation
  RAISE NOTICE 'Organization % created successfully with ID: %', p_org_name, v_org_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create organization: %', SQLERRM;
END;
$$;

-- ============================================================
-- FUNCTION 2: Link Employee to User (For Employee Registration)
-- ============================================================

CREATE OR REPLACE FUNCTION public.link_employee_to_user(
  invitation_code_param text,
  user_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation record;
  v_employee_id uuid;
  v_organization_id uuid;
BEGIN
  -- 1. Find and validate invitation
  SELECT * INTO v_invitation
  FROM employee_invitations
  WHERE invitation_code = invitation_code_param
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation code'
    );
  END IF;

  v_employee_id := v_invitation.employee_id;
  v_organization_id := v_invitation.organization_id;

  -- 2. Update employee record with user_id
  UPDATE employees
  SET user_id = user_id_param,
      updated_at = now()
  WHERE id = v_employee_id;

  -- 3. Create or update user profile
  INSERT INTO user_profiles (
    user_id,
    organization_id,
    employee_id,
    email,
    role,
    is_active,
    is_onboarded,
    onboarded_at
  ) VALUES (
    user_id_param,
    v_organization_id,
    v_employee_id,
    v_invitation.email,
    'employee',
    true,
    true,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    organization_id = v_organization_id,
    employee_id = v_employee_id,
    is_onboarded = true,
    onboarded_at = now();

  -- 4. Mark invitation as accepted
  UPDATE employee_invitations
  SET status = 'accepted',
      accepted_at = now()
  WHERE invitation_code = invitation_code_param;

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', v_employee_id,
    'organization_id', v_organization_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================
-- FUNCTION 3: Get User Organization (Helper Function)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_organization(user_id_param uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id 
  FROM user_profiles 
  WHERE user_id = user_id_param 
  LIMIT 1;
$$;

-- ============================================================
-- FUNCTION 4: Check if User is Admin (Helper Function)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = user_id_param 
    AND role IN ('admin', 'hr_manager', 'super_admin')
  );
$$;

-- ============================================================
-- FUNCTION 5: Auto-generate Employee Code
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_employee_code(org_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_code text;
BEGIN
  -- Get count of employees in organization
  SELECT COUNT(*) INTO v_count
  FROM employees
  WHERE organization_id = org_id;

  -- Generate code like EMP001, EMP002, etc.
  v_code := 'EMP' || LPAD((v_count + 1)::text, 4, '0');

  -- Check if code exists, if yes increment
  WHILE EXISTS (SELECT 1 FROM employees WHERE organization_id = org_id AND employee_code = v_code) LOOP
    v_count := v_count + 1;
    v_code := 'EMP' || LPAD((v_count + 1)::text, 4, '0');
  END LOOP;

  RETURN v_code;
END;
$$;

-- ============================================================
-- TABLE: Employee Invitations (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  
  invitation_code text UNIQUE NOT NULL,
  email text NOT NULL,
  
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  
  expires_at timestamptz,
  accepted_at timestamptz,
  
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, email)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_employee_invitations_code ON employee_invitations(invitation_code);

CREATE INDEX IF NOT EXISTS idx_employee_invitations_org ON employee_invitations(organization_id);

CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON employee_invitations(status);

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON FUNCTION public.create_new_organization_flow IS 'Creates a new organization with default settings during user registration';

COMMENT ON FUNCTION public.link_employee_to_user IS 'Links an employee record to a user account using invitation code';

COMMENT ON FUNCTION public.get_user_organization IS 'Returns the organization ID for a given user';

COMMENT ON FUNCTION public.is_user_admin(uuid) IS 'Checks if a user has admin privileges';

COMMENT ON FUNCTION public.generate_employee_code IS 'Auto-generates unique employee code for an organization';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================;


-- ==========================================
-- FROM FILE: 20251216000001_fix_rls_and_logging.sql
-- ==========================================


-- ============================================================
-- PART 3: CREATE LOG_ERROR RPC FUNCTION
-- ============================================================

-- Drop if exists
DROP FUNCTION IF EXISTS public.log_error(jsonb);

-- Create the log_error function
CREATE OR REPLACE FUNCTION public.log_error(
  error_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_organization_id uuid;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Get the organization ID for the user (if available)
  IF v_user_id IS NOT NULL THEN
    SELECT organization_id INTO v_organization_id
    FROM user_profiles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;
  
  -- Insert the error log
  INSERT INTO error_logs (
    user_id,
    organization_id,
    error_type,
    error_message,
    error_stack,
    page_url,
    user_agent,
    additional_data,
    created_at
  ) VALUES (
    v_user_id,
    v_organization_id,
    COALESCE(error_data->>'error_type', 'client_error'),
    COALESCE(error_data->>'error_message', 'Unknown error'),
    error_data->>'error_stack',
    error_data->>'page_url',
    error_data->>'user_agent',
    error_data - 'error_type' - 'error_message' - 'error_stack' - 'page_url' - 'user_agent',
    now()
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail if error logging fails to prevent infinite loops
    RAISE WARNING 'Failed to log error: %', SQLERRM;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.log_error IS 'Logs client-side errors to the error_logs table';

-- ============================================================
-- PART 4: CREATE HELPER FUNCTION TO GET USER ORG (SECURITY DEFINER)
-- ============================================================

-- This function bypasses RLS to get the user's organization ID
-- This prevents recursion in RLS policies
DROP FUNCTION IF EXISTS public.get_user_org_id_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_user_org_id_safe(p_user_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get organization ID without triggering RLS
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  RETURN v_org_id;
END;
$$;

-- ============================================================
-- PART 5: CREATE HELPER FUNCTION TO CHECK USER ROLE (SECURITY DEFINER)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_user_role_safe(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role_safe(p_user_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_role text;
  v_user_id uuid;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get role without triggering RLS
  SELECT role INTO v_role
  FROM user_profiles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'employee');
END;
$$;

-- Similar updates for remaining tables...
-- (Tickets, Expenses, Tasks, Goals, etc.)

-- ============================================================
-- PART 7: VERIFY FUNCTIONS EXIST
-- ============================================================

-- Verify that all required functions exist
DO $$
BEGIN
  -- Check if log_error exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'log_error' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'log_error function was not created successfully';
  END IF;
  
  -- Check if helper functions exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_org_id_safe' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'get_user_org_id_safe function was not created successfully';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_user_role_safe' 
    AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'get_user_role_safe function was not created successfully';
  END IF;
  
  RAISE NOTICE 'All functions created successfully!';
END $$;


-- ==========================================
-- FROM FILE: 20251218000001_fix_leave_applications_rls.sql
-- ==========================================



-- ==========================================
-- FROM FILE: 20251219000001_create_attendance_records_view.sql
-- ==========================================


-- ============================================================
-- Create office_locations and attendance_records tables
-- ============================================================
-- 
-- These tables store office location data and employee attendance
-- records including check-in/check-out times, location data, and work type.
-- ============================================================

-- First, create office_locations table (required for foreign keys)
CREATE TABLE IF NOT EXISTS public.office_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  address text NULL,
  city text NULL,
  state text NULL,
  country text NULL,
  pincode text NULL,
  latitude numeric(10, 8) NULL,
  longitude numeric(11, 8) NULL,
  radius_meters integer NULL DEFAULT 100,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT office_locations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes for office_locations
CREATE INDEX IF NOT EXISTS idx_office_locations_org ON public.office_locations USING btree (organization_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_office_locations_active ON public.office_locations USING btree (organization_id, is_active) TABLESPACE pg_default;

-- Create trigger for office_locations
DROP TRIGGER IF EXISTS update_office_locations_updated_at ON office_locations;

CREATE TRIGGER update_office_locations_updated_at 
  BEFORE UPDATE ON office_locations 
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Now create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  date date NOT NULL,
  check_in_time timestamp with time zone NULL,
  check_out_time timestamp with time zone NULL,
  status text NULL,
  work_type text NULL,
  location_id uuid NULL,
  check_in_location text NULL,
  check_out_location text NULL,
  check_in_latitude numeric(10, 8) NULL,
  check_in_longitude numeric(11, 8) NULL,
  check_out_latitude numeric(10, 8) NULL,
  check_out_longitude numeric(11, 8) NULL,
  total_hours numeric(5, 2) NULL,
  overtime_hours numeric(5, 2) NULL,
  break_hours numeric(5, 2) NULL,
  notes text NULL,
  approved_by uuid NULL,
  approved_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  gps_verified boolean NULL DEFAULT false,
  check_in_location_id uuid NULL,
  CONSTRAINT attendance_records_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_records_employee_id_date_key UNIQUE (employee_id, date),
  CONSTRAINT attendance_records_check_in_location_id_fkey FOREIGN KEY (check_in_location_id) REFERENCES office_locations (id),
  CONSTRAINT attendance_records_location_id_fkey FOREIGN KEY (location_id) REFERENCES office_locations (id),
  CONSTRAINT attendance_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT attendance_records_status_check CHECK (
    status = ANY (
      ARRAY[
        'Present'::text,
        'Absent'::text,
        'Half Day'::text,
        'Late'::text,
        'On Leave'::text,
        'Holiday'::text,
        'Week Off'::text
      ]
    )
  ),
  CONSTRAINT attendance_records_work_type_check CHECK (
    work_type = ANY (
      ARRAY[
        'In Office'::text,
        'Remote'::text,
        'Hybrid'::text,
        'Field Work'::text
      ]
    )
  )
) TABLESPACE pg_default;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance_records USING btree (employee_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records USING btree (date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON public.attendance_records USING btree (organization_id, date) TABLESPACE pg_default;

-- Create trigger to auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_attendance_records_updated_at ON attendance_records;

CREATE TRIGGER update_attendance_records_updated_at 
  BEFORE UPDATE ON attendance_records 
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- FROM FILE: 20251219000002_create_payroll_settings.sql
-- ==========================================


-- Create payroll_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Global Toggles
  pf_enabled boolean DEFAULT true,
  esi_enabled boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id)
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_payroll_settings_updated_at ON payroll_settings;

CREATE TRIGGER update_payroll_settings_updated_at 
  BEFORE UPDATE ON payroll_settings 
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- FROM FILE: 20251219000003_add_code_generation_functions.sql
-- ==========================================


-- Function to generate a random invitation code
CREATE OR REPLACE FUNCTION public.generate_invitation_code()
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || chars[1+floor(random()*array_length(chars, 1))::integer];
    END LOOP;
    RETURN result;
END;
$function$;

-- Function to generate an onboarding token (UUID)
CREATE OR REPLACE FUNCTION public.generate_onboarding_token()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT gen_random_uuid();
$$;


-- ==========================================
-- FROM FILE: 20251219000004_update_employee_invitations_schema.sql
-- ==========================================


-- Add missing columns to employee_invitations table
ALTER TABLE public.employee_invitations
ADD COLUMN IF NOT EXISTS invitation_type text DEFAULT 'full_onboarding',
ADD COLUMN IF NOT EXISTS onboarding_token uuid;

-- Add index for onboarding_token as it will be queried
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON public.employee_invitations(onboarding_token);


-- ==========================================
-- FROM FILE: 20251230000001_add_user_id_to_employees.sql
-- ==========================================


-- Add user_id column to employees table to link with auth.users
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);

-- Add a comment
COMMENT ON COLUMN employees.user_id IS 'Link to the auth.users table for login capability';


-- ==========================================
-- FROM FILE: 20251230000002_create_organization_admins.sql
-- ==========================================


-- Create organization_admins table
CREATE TABLE IF NOT EXISTS organization_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  first_name text,
  last_name text,
  email text,
  mobile_number text,
  alternate_number text,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth date,
  date_of_joining date DEFAULT CURRENT_DATE,
  designation text DEFAULT 'Administrator',
  admin_code text,
  current_address text,
  city text,
  state text,
  pincode text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, admin_code),
  UNIQUE(user_id)
);

-- Add to database types (conceptual, will be done in TS file separately);


-- ==========================================
-- FROM FILE: 20251230000003_claim_employee_profile.sql
-- ==========================================


-- Function to claim an employee profile by email
-- This helps users self-onboard if their email matches an existing employee record
CREATE OR REPLACE FUNCTION public.claim_employee_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_email text;
  v_employee_id uuid;
  v_org_id uuid;
  v_result jsonb;
BEGIN
  -- Get current user context
  v_user_id := auth.uid();
  v_user_email := auth.email();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- 1. Find a matching employee record by email
  SELECT id, organization_id INTO v_employee_id, v_org_id
  FROM employees
  WHERE (LOWER(company_email) = LOWER(v_user_email) OR LOWER(personal_email) = LOWER(v_user_email))
    AND (user_id IS NULL OR user_id = v_user_id) -- Only claim if unassigned or assigned to self
  LIMIT 1;

  IF v_employee_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No matching employee record found for email ' || v_user_email);
  END IF;

  -- 2. Link User Profile to Employee
  UPDATE user_profiles
  SET 
    employee_id = v_employee_id,
    organization_id = v_org_id, -- Auto-join the organization
    updated_at = now()
  WHERE user_id = v_user_id;

  -- 3. Link Employee to User Record
  UPDATE employees
  SET 
    user_id = v_user_id,
    updated_at = now()
  WHERE id = v_employee_id;

  RETURN jsonb_build_object(
    'success', true, 
    'employee_id', v_employee_id,
    'organization_id', v_org_id
  );
END;
$$;


-- ==========================================
-- FROM FILE: 20251230000004_fix_employee_self_view_rls.sql
-- ==========================================


-- Also ensure specific columns are readable if RLS is very strict (usually not needed if table RLS is on);


-- ==========================================
-- FROM FILE: 20251230000005_add_banking_columns.sql
-- ==========================================


-- Add missing banking columns to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS bank_iban text,
ADD COLUMN IF NOT EXISTS bank_ifsc_code text;

-- Add index for performance if needed (optional for these)
-- CREATE INDEX IF NOT EXISTS idx_employees_bank_iban ON employees(bank_iban);;


-- ==========================================
-- FROM FILE: add_early_checkout_reason.sql
-- ==========================================


-- Add early_checkout_reason column to attendance_records table
-- This column stores the reason when employees check out before completing 8 hours

ALTER TABLE attendance_records 
ADD COLUMN IF NOT EXISTS early_checkout_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN attendance_records.early_checkout_reason IS 'Reason provided by employee when checking out before completing 8 hours of work';


-- ==========================================
-- FROM FILE: add_goals_department_fk.sql
-- ==========================================


-- Add department_id column if it doesn't exist
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS department_id uuid;

-- Add foreign key relationship between goals and departments
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_department_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;


-- ==========================================
-- FROM FILE: add_office_location_fields.sql
-- ==========================================


-- Add requires_gps column to office_locations if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'office_locations' AND column_name = 'requires_gps') THEN
        ALTER TABLE office_locations ADD COLUMN requires_gps BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'office_locations' AND column_name = 'timezone') THEN
        ALTER TABLE office_locations ADD COLUMN timezone TEXT DEFAULT 'UTC';
    END IF;
END $$;


-- ==========================================
-- FROM FILE: add_task_submission_fields.sql
-- ==========================================


-- Add submission fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_url text;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_notes text;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_at timestamptz;


-- ==========================================
-- FROM FILE: add_tasks_columns.sql
-- ==========================================


-- Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours numeric DEFAULT 0;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_repo text;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_issue_number integer;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS github_pr_number integer;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type text DEFAULT 'feature';

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium';


-- ==========================================
-- FROM FILE: create_goal_details_tables.sql
-- ==========================================


-- Create goal_milestones table
CREATE TABLE IF NOT EXISTS public.goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    due_date TIMESTAMPTZ,
    is_completed BOOLEAN DEFAULT false,
    completed_date TIMESTAMPTZ,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create goal_comments table
CREATE TABLE IF NOT EXISTS public.goal_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.employees(id) ON DELETE SET NULL, -- References employee who made the comment
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON public.goal_milestones(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_comments_goal_id ON public.goal_comments(goal_id);


-- ==========================================
-- FROM FILE: fix_goals_completion_date.sql
-- ==========================================


-- Add completion_date column to goals table if it doesn't exist
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMPTZ;

-- Also ensure progress_percentage is there (it should be from original schema, but just in case)
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Drop 'progress' column if we want to clean up, but maybe keep it to avoid breakage if other things use it.
-- For now, just ensuring completion_date exists to fix the Admin Modal error.;


-- ==========================================
-- FROM FILE: fix_goals_progress.sql
-- ==========================================


-- Add progress column to goals table if it doesn't exist
ALTER TABLE public.goals 
ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;

-- Ensure it has a check constraint for valid percentage if needed, but simple int is fine for now.
-- Ideally we want it between 0 and 100
ALTER TABLE public.goals 
DROP CONSTRAINT IF EXISTS goals_progress_check;

ALTER TABLE public.goals
ADD CONSTRAINT goals_progress_check CHECK (progress >= 0 AND progress <= 100);


-- ==========================================
-- FROM FILE: fix_goals_schema.sql
-- ==========================================


-- DATA SAFETY: Wrap in transaction
BEGIN;

-- 1. Ensure department_id column exists
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS department_id uuid;

-- 2. Fix 'departments' Foreign Key (The specific error reported)
-- Drop if exists to avoid conflicts, then recreate
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_department_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_department_id_fkey
FOREIGN KEY (department_id)
REFERENCES departments(id)
ON DELETE SET NULL;

-- 3. Fix 'goal_types' Foreign Key (Preventative)
-- Ensure the column exists first
ALTER TABLE goals
ADD COLUMN IF NOT EXISTS goal_type_id uuid;

ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_goal_type_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_goal_type_id_fkey
FOREIGN KEY (goal_type_id)
REFERENCES goal_types(id)
ON DELETE SET NULL;

-- 4. Fix 'employees' Foreign Key (Preventative)
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_employee_id_fkey;

ALTER TABLE goals
ADD CONSTRAINT goals_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;

COMMIT;


-- ==========================================
-- FROM FILE: fix_notifications_schema.sql
-- ==========================================


-- Create employee_notifications table
CREATE TABLE IF NOT EXISTS public.employee_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
-- Assuming update_updated_at_column function exists, else create it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_employee_notifications_updated_at ON employee_notifications;

CREATE TRIGGER update_employee_notifications_updated_at
    BEFORE UPDATE ON employee_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ==========================================
-- FROM FILE: fix_performance_reviews_schema.sql
-- ==========================================


-- Fix performance_reviews table schema to match UI expectations
ALTER TABLE public.performance_reviews 
    ADD COLUMN IF NOT EXISTS review_cycle TEXT,
    ADD COLUMN IF NOT EXISTS review_period TEXT,
    ADD COLUMN IF NOT EXISTS overall_rating NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS feedback TEXT,
    ADD COLUMN IF NOT EXISTS areas_for_improvement TEXT,
    ADD COLUMN IF NOT EXISTS goals_met BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS achievements TEXT,
    ADD COLUMN IF NOT EXISTS goals_for_next_period TEXT,
    ADD COLUMN IF NOT EXISTS manager_comments TEXT,
    ADD COLUMN IF NOT EXISTS employee_comments TEXT,
    ADD COLUMN IF NOT EXISTS reviewed_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL;

-- Remove old date-based unique constraint that causes 409 Conflicts
ALTER TABLE public.performance_reviews 
    DROP CONSTRAINT IF EXISTS performance_reviews_employee_id_review_period_start_review_period_key;

-- Add new flexible period-based unique constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_reviews_employee_id_review_period_key') THEN
        ALTER TABLE public.performance_reviews 
            ADD CONSTRAINT performance_reviews_employee_id_review_period_key 
            UNIQUE (employee_id, review_period);
    END IF;
END $$;

-- Make old specific date columns optional
ALTER TABLE public.performance_reviews 
    ALTER COLUMN review_period_start DROP NOT NULL,
    ALTER COLUMN review_period_end DROP NOT NULL;

-- Sync naming conventions
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_reviews' AND column_name = 'areas_of_improvement') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'performance_reviews' AND column_name = 'areas_for_improvement') THEN
        ALTER TABLE public.performance_reviews RENAME COLUMN areas_of_improvement TO areas_for_improvement;
    END IF;
END $$;


-- ==========================================
-- FROM FILE: update_tasks_status_check.sql
-- ==========================================


-- Update tasks_status_check constraint to include 'in_review'
-- Also ensuring 'pending' is allowed and 'todo' is allowed (for backward compatibility if needed, though we moved to pending)

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check CHECK (
  status = ANY (ARRAY[
    'pending'::text,
    'todo'::text, 
    'in_progress'::text,
    'in_review'::text,
    'completed'::text,
    'cancelled'::text,
    'on_hold'::text
  ])
);