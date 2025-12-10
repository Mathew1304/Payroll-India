-- Drop existing tables if they exist (for idempotency)
DROP TABLE IF EXISTS performance_analytics CASCADE;
DROP TABLE IF EXISTS goal_comments CASCADE;
DROP TABLE IF EXISTS review_ratings CASCADE;
DROP TABLE IF EXISTS review_categories CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS goal_milestones CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS goal_types CASCADE;

-- Create Goal Types Table
CREATE TABLE goal_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE goal_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view goal types of their organization" ON goal_types
    FOR SELECT USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

-- Create Goals Table
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    created_by UUID NOT NULL REFERENCES employees(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type_id UUID REFERENCES goal_types(id),
    department_id UUID REFERENCES departments(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Overdue', 'Cancelled')) DEFAULT 'Not Started',
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')) DEFAULT 'Medium',
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    completion_date DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    weight DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT check_completion_date CHECK (completion_date IS NULL OR status = 'Completed')
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant goals" ON goals
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            created_by = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
        )
    );

CREATE POLICY "Managers and Admins can create goals" ON goals
    FOR INSERT WITH CHECK (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND
        EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
    );

CREATE POLICY "Relevant users can update goals" ON goals
    FOR UPDATE USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            created_by = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
        )
    );

-- Create Goal Milestones Table
CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    is_completed BOOLEAN DEFAULT false,
    completed_date DATE,
    completed_by UUID REFERENCES employees(id),
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones of visible goals" ON goal_milestones
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_milestones.goal_id) -- Relies on goals policy
    );

CREATE POLICY "Relevant users can update milestones" ON goal_milestones
    FOR ALL USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_milestones.goal_id) -- Relies on goals policy
    );

-- Create Performance Reviews Table
CREATE TABLE performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    reviewer_id UUID NOT NULL REFERENCES employees(id),
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('Annual', 'Mid-Year', 'Quarterly', 'Probation', 'Project-Based')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'In Progress', 'Completed', 'Approved')) DEFAULT 'Draft',
    overall_rating DECIMAL(3,2),
    strengths TEXT,
    areas_for_improvement TEXT,
    achievements TEXT,
    goals_for_next_period TEXT,
    manager_comments TEXT,
    employee_comments TEXT,
    reviewed_date DATE,
    approved_date DATE,
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant reviews" ON performance_reviews
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            reviewer_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
        )
    );

CREATE POLICY "Managers and Admins can manage reviews" ON performance_reviews
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND
        EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
    );

-- Create Review Categories Table
CREATE TABLE review_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.0,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE review_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view review categories" ON review_categories
    FOR SELECT USING (organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1));

-- Create Review Ratings Table
CREATE TABLE review_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES review_categories(id),
    rating DECIMAL(3,2) CHECK (rating BETWEEN 0 AND 5),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(review_id, category_id)
);

ALTER TABLE review_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings of visible reviews" ON review_ratings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM performance_reviews WHERE id = review_ratings.review_id)
    );

CREATE POLICY "Managers can manage ratings" ON review_ratings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM performance_reviews WHERE id = review_ratings.review_id)
        AND
        EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
    );

-- Create Goal Comments Table
CREATE TABLE goal_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES employees(id),
    comment_text TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE goal_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on visible goals" ON goal_comments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_comments.goal_id)
        AND (
            NOT is_private 
            OR 
            user_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
        )
    );

CREATE POLICY "Users can add comments to visible goals" ON goal_comments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM goals WHERE id = goal_comments.goal_id)
    );

-- Create Performance Analytics Table
CREATE TABLE performance_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    goals_completed INTEGER DEFAULT 0,
    goals_overdue INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    total_reviews INTEGER DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE performance_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant analytics" ON performance_analytics
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1)
        AND (
            employee_id = (SELECT employee_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR
            EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'manager', 'hr'))
        )
    );

-- Indexes
CREATE INDEX idx_goals_org_id ON goals(organization_id);
CREATE INDEX idx_goals_employee_id ON goals(employee_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_due_date ON goals(due_date);
CREATE INDEX idx_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX idx_reviews_org_id ON performance_reviews(organization_id);
CREATE INDEX idx_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX idx_reviews_reviewer_id ON performance_reviews(reviewer_id);
CREATE INDEX idx_reviews_status ON performance_reviews(status);
CREATE INDEX idx_ratings_review_id ON review_ratings(review_id);
CREATE INDEX idx_goal_comments_goal_id ON goal_comments(goal_id);
CREATE INDEX idx_analytics_org_id ON performance_analytics(organization_id);
CREATE INDEX idx_analytics_employee_id ON performance_analytics(employee_id);

-- Seed Default Goal Types and Review Categories for existing orgs
INSERT INTO goal_types (organization_id, name)
SELECT id, 'Annual Goal' FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO goal_types (organization_id, name)
SELECT id, 'Quarterly Goal' FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO goal_types (organization_id, name)
SELECT id, 'Project Goal' FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO goal_types (organization_id, name)
SELECT id, 'Development Goal' FROM organizations ON CONFLICT DO NOTHING;

INSERT INTO review_categories (organization_id, name, weight)
SELECT id, 'Technical Skills', 1.0 FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO review_categories (organization_id, name, weight)
SELECT id, 'Communication', 1.0 FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO review_categories (organization_id, name, weight)
SELECT id, 'Leadership', 1.0 FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO review_categories (organization_id, name, weight)
SELECT id, 'Teamwork', 1.0 FROM organizations ON CONFLICT DO NOTHING;
INSERT INTO review_categories (organization_id, name, weight)
SELECT id, 'Problem Solving', 1.0 FROM organizations ON CONFLICT DO NOTHING;
