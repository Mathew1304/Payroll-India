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
