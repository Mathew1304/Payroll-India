-- Fix Attendance RLS Policies and Add Helper Functions
-- This migration fixes the RLS policies to correctly map auth.uid() to employee_id

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can insert their own attendance records" ON attendance_records;
DROP POLICY IF EXISTS "Users can view their own leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can create leave requests" ON leave_requests;
DROP POLICY IF EXISTS "Users can view office locations of their organization" ON office_locations;
DROP POLICY IF EXISTS "Users can view work schedules of their organization" ON work_schedules;
DROP POLICY IF EXISTS "Users can view employee schedules of their organization" ON employee_schedules;
DROP POLICY IF EXISTS "Users can view holidays" ON holidays;
DROP POLICY IF EXISTS "Users can view attendance settings" ON attendance_settings;

-- Helper function to get employee_id from auth.uid()
CREATE OR REPLACE FUNCTION get_employee_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT e.id 
    FROM employees e
    INNER JOIN organization_members om ON om.employee_id = e.id
    WHERE om.user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get organization_id from auth.uid()
CREATE OR REPLACE FUNCTION get_org_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM organization_members
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has role
CREATE OR REPLACE FUNCTION has_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = auth.uid()
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has any of the roles
CREATE OR REPLACE FUNCTION has_any_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM organization_members
    WHERE user_id = auth.uid()
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_meters(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  R CONSTANT DECIMAL := 6371000; -- Earth radius in meters
  dLat DECIMAL;
  dLon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if location is within office radius
CREATE OR REPLACE FUNCTION is_within_office_radius(
  check_lat DECIMAL,
  check_lon DECIMAL,
  office_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  office_lat DECIMAL;
  office_lon DECIMAL;
  office_radius INTEGER;
  distance DECIMAL;
BEGIN
  SELECT latitude, longitude, radius_meters
  INTO office_lat, office_lon, office_radius
  FROM office_locations
  WHERE id = office_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  distance := calculate_distance_meters(check_lat, check_lon, office_lat, office_lon);
  
  RETURN distance <= office_radius;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to auto-calculate total hours
CREATE OR REPLACE FUNCTION calculate_work_hours(
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE
)
RETURNS DECIMAL AS $$
BEGIN
  IF check_in IS NULL OR check_out IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN EXTRACT(EPOCH FROM (check_out - check_in)) / 3600;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate total hours on attendance record
CREATE OR REPLACE FUNCTION update_attendance_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
    NEW.total_hours := calculate_work_hours(NEW.check_in_time, NEW.check_out_time);
  END IF;
  
  -- Auto-verify GPS if within office radius
  IF NEW.check_in_latitude IS NOT NULL AND NEW.check_in_longitude IS NOT NULL 
     AND NEW.check_in_location_id IS NOT NULL THEN
    NEW.gps_verified := is_within_office_radius(
      NEW.check_in_latitude,
      NEW.check_in_longitude,
      NEW.check_in_location_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_hours ON attendance_records;
CREATE TRIGGER trigger_update_attendance_hours
  BEFORE INSERT OR UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_total_hours();

-- Recreate RLS policies with correct employee mapping

-- Attendance Records - Employees can view and insert their own
CREATE POLICY "Employees can view their own attendance" ON attendance_records
  FOR SELECT 
  USING (employee_id = get_employee_id_from_auth());

CREATE POLICY "Employees can insert their own attendance" ON attendance_records
  FOR INSERT 
  WITH CHECK (
    employee_id = get_employee_id_from_auth()
    AND organization_id = get_org_id_from_auth()
  );

CREATE POLICY "Employees can update their own attendance" ON attendance_records
  FOR UPDATE
  USING (employee_id = get_employee_id_from_auth())
  WITH CHECK (employee_id = get_employee_id_from_auth());

-- Office Locations - Everyone in org can view
CREATE POLICY "Users can view office locations" ON office_locations
  FOR SELECT 
  USING (organization_id = get_org_id_from_auth());

-- Work Schedules - Everyone in org can view
CREATE POLICY "Users can view work schedules" ON work_schedules
  FOR SELECT 
  USING (organization_id = get_org_id_from_auth());

-- Employee Schedules - Everyone can view their own
CREATE POLICY "Employees can view their schedules" ON employee_schedules
  FOR SELECT 
  USING (
    employee_id = get_employee_id_from_auth()
    OR has_any_role(ARRAY['admin', 'hr', 'manager'])
  );

-- Leave Requests - Employees can view and create their own
CREATE POLICY "Employees can view their leave requests" ON leave_requests
  FOR SELECT 
  USING (employee_id = get_employee_id_from_auth());

CREATE POLICY "Employees can create leave requests" ON leave_requests
  FOR INSERT 
  WITH CHECK (
    employee_id = get_employee_id_from_auth()
    AND organization_id = get_org_id_from_auth()
  );

-- Holidays - Everyone in org can view
CREATE POLICY "Users can view holidays" ON holidays
  FOR SELECT 
  USING (organization_id = get_org_id_from_auth());

-- Attendance Settings - Everyone in org can view
CREATE POLICY "Users can view attendance settings" ON attendance_settings
  FOR SELECT 
  USING (organization_id = get_org_id_from_auth());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance_records(employee_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON attendance_records(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance_records(check_in_time);
CREATE INDEX IF NOT EXISTS idx_attendance_gps_verified ON attendance_records(gps_verified);

-- Create view for today's attendance
CREATE OR REPLACE VIEW today_attendance AS
SELECT 
  ar.*,
  e.first_name,
  e.last_name,
  e.employee_code,
  e.department_id,
  ol.name as office_name
FROM attendance_records ar
INNER JOIN employees e ON e.id = ar.employee_id
LEFT JOIN office_locations ol ON ol.id = ar.check_in_location_id
WHERE ar.date = CURRENT_DATE;

-- Grant access to view
GRANT SELECT ON today_attendance TO authenticated;
