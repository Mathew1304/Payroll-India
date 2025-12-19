-- Ensure days_per_year exists in leave_types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leave_types' AND column_name = 'days_per_year') THEN
        ALTER TABLE leave_types ADD COLUMN days_per_year NUMERIC(5, 2) DEFAULT 0;
    END IF;
END $$;

-- Create leave_balances table (replacing employee_leave_balances)
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  employee_id uuid not null,
  leave_type_id uuid not null,
  year integer not null,
  opening_balance numeric(5, 2) null default 0,
  accrued numeric(5, 2) null default 0,
  used numeric(5, 2) null default 0,
  adjustment numeric(5, 2) null default 0,
  encashed numeric(5, 2) null default 0,
  carried_forward numeric(5, 2) null default 0,
  closing_balance numeric(5, 2) null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint leave_balances_pkey primary key (id),
  constraint leave_balances_employee_id_leave_type_id_year_key unique (employee_id, leave_type_id, year),
  constraint leave_balances_employee_id_fkey foreign KEY (employee_id) references employees (id) on delete CASCADE,
  constraint leave_balances_leave_type_id_fkey foreign KEY (leave_type_id) references leave_types (id) on delete CASCADE,
  constraint leave_balances_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

-- Create index
create index IF not exists idx_leave_balances_employee on public.leave_balances using btree (employee_id) TABLESPACE pg_default;

-- Create trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

drop trigger if exists trigger_update_leave_balances_updated_at on leave_balances;
create trigger trigger_update_leave_balances_updated_at BEFORE
update on leave_balances for EACH row
execute FUNCTION update_updated_at_column ();

-- Enable RLS
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own leave balances" ON leave_balances
    FOR SELECT USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE employee_id = leave_balances.employee_id
    ));

CREATE POLICY "Admins and HR can manage leave balances" ON leave_balances
    FOR ALL USING (auth.uid() IN (
        SELECT user_id FROM user_profiles WHERE role IN ('admin', 'hr', 'super_admin') AND organization_id = leave_balances.organization_id
    ));
