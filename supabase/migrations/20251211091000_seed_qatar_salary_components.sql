-- Seed Qatar Salary Components from Employees table
-- This migration populates the qatar_salary_components table using existing data in the employees table.

INSERT INTO qatar_salary_components (
  organization_id,
  employee_id,
  basic_salary,
  housing_allowance,
  food_allowance,
  transport_allowance,
  mobile_allowance,
  utility_allowance,
  other_allowances,
  effective_from,
  is_active
)
SELECT 
  e.organization_id,
  e.id as employee_id,
  COALESCE(e.basic_salary, 0) as basic_salary,
  COALESCE(e.accommodation_allowance, 0) as housing_allowance,
  COALESCE(e.food_allowance, 0) as food_allowance,
  COALESCE(e.transportation_allowance, 0) as transport_allowance,
  0 as mobile_allowance, -- Default to 0 as not in employees table directly
  0 as utility_allowance, -- Default to 0
  0 as other_allowances, -- Default to 0 (jsonb handling is complex here)
  COALESCE(e.date_of_joining, CURRENT_DATE) as effective_from,
  true as is_active
FROM employees e
WHERE 
  e.is_active = true 
  AND NOT EXISTS (
    SELECT 1 FROM qatar_salary_components qsc 
    WHERE qsc.employee_id = e.id AND qsc.is_active = true
  );

-- Optional: Create a trigger to automatically create salary component when employee is created/updated
-- This ensures future employees also get a record.

CREATE OR REPLACE FUNCTION sync_employee_salary_to_qatar_components()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we need to insert or update
  IF EXISTS (SELECT 1 FROM qatar_salary_components WHERE employee_id = NEW.id AND is_active = true) THEN
    -- Update existing active record
    UPDATE qatar_salary_components
    SET 
      basic_salary = COALESCE(NEW.basic_salary, 0),
      housing_allowance = COALESCE(NEW.accommodation_allowance, 0),
      food_allowance = COALESCE(NEW.food_allowance, 0),
      transport_allowance = COALESCE(NEW.transportation_allowance, 0),
      updated_at = now()
    WHERE employee_id = NEW.id AND is_active = true;
  ELSE
    -- Insert new record
    INSERT INTO qatar_salary_components (
      organization_id,
      employee_id,
      basic_salary,
      housing_allowance,
      food_allowance,
      transport_allowance,
      effective_from,
      is_active
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      COALESCE(NEW.basic_salary, 0),
      COALESCE(NEW.accommodation_allowance, 0),
      COALESCE(NEW.food_allowance, 0),
      COALESCE(NEW.transportation_allowance, 0),
      COALESCE(NEW.date_of_joining, CURRENT_DATE),
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_qatar_salary ON employees;
CREATE TRIGGER trigger_sync_qatar_salary
  AFTER INSERT OR UPDATE OF basic_salary, accommodation_allowance, food_allowance, transportation_allowance
  ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_salary_to_qatar_components();
