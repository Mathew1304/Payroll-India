-- Drop existing tables if they exist to ensure clean state for this feature
DROP TABLE IF EXISTS ticket_history CASCADE;
DROP TABLE IF EXISTS ticket_comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS helpdesk_categories CASCADE;

-- Create Helpdesk Categories Table
CREATE TABLE helpdesk_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Categories
ALTER TABLE helpdesk_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories of their organization" ON helpdesk_categories
    FOR SELECT USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Admins can manage categories of their organization" ON helpdesk_categories
    FOR ALL USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin') LIMIT 1));


-- Create Tickets Table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES helpdesk_categories(id),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')) DEFAULT 'Open',
    created_by UUID NOT NULL REFERENCES employees(id), -- References Employee ID
    assigned_to UUID REFERENCES employees(id), -- References Employee ID
    due_date TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, ticket_number) -- Ensure unique ticket number per org (or globally if preferred, but user asked for TKT-XXXXXXX)
);

-- Enable RLS for Tickets
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see tickets of their organization
-- AND (they created it OR they are assigned to it OR they are admins)
CREATE POLICY "Users can view relevant tickets" ON tickets
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            created_by = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            assigned_to = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
        )
    );

-- Policy: Employees can create tickets for their organization
CREATE POLICY "Employees can create tickets" ON tickets
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND
        created_by = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
    );

-- Policy: Admins can update tickets (Assign, Change Status, etc.)
CREATE POLICY "Admins can update tickets" ON tickets
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND
        EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
    );
    
-- Policy: Employees can update their own tickets (e.g. add comments/description if allowed, but main update is usually status which is admin)
-- For now, let's restrict update to Admins only for status/assignment. 
-- If employees need to edit description, we can add that later.


-- Create Ticket Comments Table
CREATE TABLE ticket_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES employees(id), -- References Employee ID
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Comments
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on visible tickets" ON ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets WHERE id = ticket_comments.ticket_id
            -- The ticket visibility policy will handle the rest if we query through it, 
            -- but for direct table access we need to replicate the logic or rely on the join.
            -- Simpler: Check if user belongs to the same org as the ticket.
            AND organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
            AND (
                 created_by = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 assigned_to = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
            )
        )
    );

CREATE POLICY "Users can add comments to visible tickets" ON ticket_comments
    FOR INSERT WITH CHECK (
        user_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
        AND
        EXISTS (
            SELECT 1 FROM tickets WHERE id = ticket_comments.ticket_id
            AND organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
             AND (
                 created_by = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 assigned_to = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
            )
        )
    );


-- Create Ticket History Table
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES employees(id),
    action VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for History
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history of visible tickets" ON ticket_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets WHERE id = ticket_history.ticket_id
            AND organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
             AND (
                 created_by = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 assigned_to = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
                 OR
                 EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'hr'))
            )
        )
    );


-- Sequence for Ticket Numbers
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 2500001;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ticket_number := 'TKT-' || LPAD(nextval('ticket_number_seq')::TEXT, 7, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ticket number
CREATE TRIGGER set_ticket_number
    BEFORE INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION generate_ticket_number();


-- Insert default categories for existing organizations
-- This is a one-time operation for existing orgs. 
-- For new orgs, we should update the 'seed_organization_defaults' function.

INSERT INTO helpdesk_categories (organization_id, name, icon)
SELECT id, 'Admin/Facility', '🏢' FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO helpdesk_categories (organization_id, name, icon)
SELECT id, 'Technical/IT Support', '💻' FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO helpdesk_categories (organization_id, name, icon)
SELECT id, 'HR Support', '👥' FROM organizations
ON CONFLICT DO NOTHING;

INSERT INTO helpdesk_categories (organization_id, name, icon)
SELECT id, 'Finance', '💰' FROM organizations
ON CONFLICT DO NOTHING;

-- Update seed function to include default helpdesk categories for NEW organizations
CREATE OR REPLACE FUNCTION seed_organization_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default Departments
  INSERT INTO departments (organization_id, name, code, is_active)
  VALUES
    (NEW.id, 'Executive', 'EXEC', true),
    (NEW.id, 'Finance', 'FIN', true),
    (NEW.id, 'Marketing', 'MKT', true),
    (NEW.id, 'Developer', 'DEV', true),
    (NEW.id, 'IT', 'IT', true);

  -- Insert default Designations
  INSERT INTO designations (organization_id, title, code, level, is_active)
  VALUES
    (NEW.id, 'Associate', 'ASC', 1, true),
    (NEW.id, 'Manager', 'MGR', 3, true),
    (NEW.id, 'Analyst', 'ANL', 2, true),
    (NEW.id, 'Developer', 'DEV', 2, true),
    (NEW.id, 'Tester', 'TST', 2, true);

  -- Insert default Helpdesk Categories
  INSERT INTO helpdesk_categories (organization_id, name, icon)
  VALUES
    (NEW.id, 'Admin/Facility', '🏢'),
    (NEW.id, 'Technical/IT Support', '💻'),
    (NEW.id, 'HR Support', '👥'),
    (NEW.id, 'Finance', '💰');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
