-- Attendance Management System Schema

-- 1. Office Locations
DROP TABLE IF EXISTS attendance_anomalies CASCADE;
DROP TABLE IF EXISTS attendance_settings CASCADE;
DROP TABLE IF EXISTS holidays CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS employee_schedules CASCADE;
DROP TABLE IF EXISTS work_schedules CASCADE;
DROP TABLE IF EXISTS office_locations CASCADE;

CREATE TABLE IF NOT EXISTS office_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10,8) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DECIMAL(11,8) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    radius_meters INTEGER DEFAULT 50 CHECK (radius_meters BETWEEN 10 AND 500),
    is_active BOOLEAN DEFAULT true,
    requires_gps BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_office_locations_org_id ON office_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_office_locations_is_active ON office_locations(is_active);

-- 2. Work Schedules
CREATE TABLE IF NOT EXISTS work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INTEGER DEFAULT 15,
    working_days JSONB DEFAULT '[1,2,3,4,5]'::jsonb, -- 0=Sun, 1=Mon, etc.
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_schedules_org_id ON work_schedules(organization_id);
-- Constraint to ensure only one default schedule per organization (partial index approach or trigger, keeping simple for now)

-- 3. Employee Schedules
CREATE TABLE IF NOT EXISTS employee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES work_schedules(id),
    effective_from DATE NOT NULL,
    effective_until DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employee_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_emp_id ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_sched_id ON employee_schedules(schedule_id);

-- 4. Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_in_location_id UUID REFERENCES office_locations(id),
    check_in_latitude DECIMAL(10,8),
    check_in_longitude DECIMAL(11,8),
    check_in_device_info JSONB,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_out_latitude DECIMAL(10,8),
    check_out_longitude DECIMAL(11,8),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Present', 'Absent', 'Late', 'Half Day', 'Remote', 'On Leave', 'Holiday')),
    work_type VARCHAR(50) CHECK (work_type IN ('In Office', 'Remote', 'Hybrid')),
    total_hours DECIMAL(5,2),
    notes TEXT,
    approved_by UUID REFERENCES employees(id),
    approval_notes TEXT,
    is_manual_entry BOOLEAN DEFAULT false,
    gps_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(employee_id, date),
    CHECK (check_out_time > check_in_time)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_emp_id ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- 5. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN ('Sick Leave', 'Casual Leave', 'Vacation', 'Maternity', 'Paternity', 'Unpaid Leave', 'Compensatory Off')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    reviewed_by UUID REFERENCES employees(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org_id ON leave_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_emp_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);

-- 6. Holidays
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    is_optional BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, date)
);

CREATE INDEX IF NOT EXISTS idx_holidays_org_id ON holidays(organization_id);

-- 7. Attendance Settings
CREATE TABLE IF NOT EXISTS attendance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    auto_absent_enabled BOOLEAN DEFAULT true,
    auto_absent_time TIME DEFAULT '10:00:00',
    allow_remote_checkin BOOLEAN DEFAULT true,
    require_checkout BOOLEAN DEFAULT true,
    max_work_hours_per_day INTEGER DEFAULT 12,
    overtime_threshold_minutes INTEGER DEFAULT 480,
    gps_accuracy_threshold_meters INTEGER DEFAULT 100,
    allow_manual_attendance BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Attendance Anomalies
CREATE TABLE IF NOT EXISTS attendance_anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    attendance_record_id UUID REFERENCES attendance_records(id) ON DELETE CASCADE,
    anomaly_type VARCHAR(100) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    severity VARCHAR(20) CHECK (severity IN ('Low', 'Medium', 'High')),
    details JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES employees(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anomalies_org_id ON attendance_anomalies(organization_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_record_id ON attendance_anomalies(attendance_record_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_is_resolved ON attendance_anomalies(is_resolved);

-- RLS Policies

-- Enable RLS
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;

-- Policies

-- Office Locations
CREATE POLICY "Users can view office locations of their organization" ON office_locations
    FOR SELECT USING (organization_id = (SELECT organization_id FROM employees WHERE id = auth.uid()::uuid));

CREATE POLICY "Admins can manage office locations" ON office_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = office_locations.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );

-- Work Schedules
CREATE POLICY "Users can view work schedules of their organization" ON work_schedules
    FOR SELECT USING (organization_id = (SELECT organization_id FROM employees WHERE id = auth.uid()::uuid));

CREATE POLICY "Admins can manage work schedules" ON work_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = work_schedules.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );

-- Employee Schedules
CREATE POLICY "Users can view employee schedules of their organization" ON employee_schedules
    FOR SELECT USING (organization_id = (SELECT organization_id FROM employees WHERE id = auth.uid()::uuid));

CREATE POLICY "Admins can manage employee schedules" ON employee_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = employee_schedules.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );

-- Attendance Records
CREATE POLICY "Users can view their own attendance records" ON attendance_records
    FOR SELECT USING (employee_id = auth.uid()::uuid);

CREATE POLICY "Admins can view all attendance records" ON attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = attendance_records.organization_id 
            AND role IN ('admin', 'super_admin', 'hr', 'manager')
        )
    );

CREATE POLICY "Users can insert their own attendance records" ON attendance_records
    FOR INSERT WITH CHECK (employee_id = auth.uid()::uuid);

CREATE POLICY "Admins can manage attendance records" ON attendance_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = attendance_records.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );

-- Leave Requests
CREATE POLICY "Users can view their own leave requests" ON leave_requests
    FOR SELECT USING (employee_id = auth.uid()::uuid);

CREATE POLICY "Admins can view all leave requests" ON leave_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = leave_requests.organization_id 
            AND role IN ('admin', 'super_admin', 'hr', 'manager')
        )
    );

CREATE POLICY "Users can create leave requests" ON leave_requests
    FOR INSERT WITH CHECK (employee_id = auth.uid()::uuid);

CREATE POLICY "Admins can update leave requests" ON leave_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = leave_requests.organization_id 
            AND role IN ('admin', 'super_admin', 'hr', 'manager')
        )
    );

-- Holidays
CREATE POLICY "Users can view holidays" ON holidays
    FOR SELECT USING (organization_id = (SELECT organization_id FROM employees WHERE id = auth.uid()::uuid));

CREATE POLICY "Admins can manage holidays" ON holidays
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = holidays.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );

-- Attendance Settings
CREATE POLICY "Users can view attendance settings" ON attendance_settings
    FOR SELECT USING (organization_id = (SELECT organization_id FROM employees WHERE id = auth.uid()::uuid));

CREATE POLICY "Admins can manage attendance settings" ON attendance_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = attendance_settings.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );

-- Attendance Anomalies
CREATE POLICY "Admins can view anomalies" ON attendance_anomalies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = attendance_anomalies.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );

CREATE POLICY "Admins can manage anomalies" ON attendance_anomalies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE user_id = auth.uid() 
            AND organization_id = attendance_anomalies.organization_id 
            AND role IN ('admin', 'super_admin', 'hr')
        )
    );
