-- Function to seed default data for a new organization
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after organization creation
DROP TRIGGER IF EXISTS on_org_created ON organizations;
CREATE TRIGGER on_org_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION seed_organization_defaults();
