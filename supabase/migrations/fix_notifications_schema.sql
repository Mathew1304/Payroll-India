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

-- Enable RLS
ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.employee_notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.employee_notifications
    FOR SELECT
    USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.employee_notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.employee_notifications
    FOR UPDATE
    USING (
        employee_id IN (
            SELECT employee_id FROM user_profiles WHERE user_id = auth.uid()
        )
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
