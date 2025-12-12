-- Function to initialize leave balances for employees
-- This should be called when a leave type is created or an employee joins

CREATE OR REPLACE FUNCTION initialize_employee_leave_balances(
    p_employee_id UUID,
    p_year INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_year INTEGER;
    v_org_id UUID;
    v_employment_type employment_type;
BEGIN
    -- Get current year if not provided
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    
    -- Get employee's organization and employment type
    SELECT organization_id, employment_type
    INTO v_org_id, v_employment_type
    FROM employees
    WHERE id = p_employee_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Employee not found';
    END IF;
    
    -- Insert leave balances for each active leave type in the organization
    INSERT INTO leave_balances (employee_id, leave_type_id, year, total_quota, used_leaves, pending_leaves)
    SELECT 
        p_employee_id,
        lt.id,
        v_year,
        COALESCE(lp.yearly_quota, 12), -- Default to 12 if no policy exists
        0, -- used_leaves
        0  -- pending_leaves
    FROM leave_types lt
    LEFT JOIN leave_policies lp ON lp.leave_type_id = lt.id AND lp.employment_type = v_employment_type
    WHERE lt.is_active = true
      AND lt.organization_id = v_org_id
    ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
    
END;
$$ LANGUAGE plpgsql;

-- Function to initialize leave balances for ALL employees
CREATE OR REPLACE FUNCTION initialize_all_employee_leave_balances(
    p_year INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_year INTEGER;
    v_count INTEGER := 0;
    v_employee RECORD;
BEGIN
    -- Get current year if not provided
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    
    -- Loop through all active employees
    FOR v_employee IN 
        SELECT id FROM employees WHERE is_active = true
    LOOP
        PERFORM initialize_employee_leave_balances(v_employee.id, v_year);
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Run the function to initialize leave balances for all employees for the current year
SELECT initialize_all_employee_leave_balances();
