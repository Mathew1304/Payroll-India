-- Ensure goal types exist for all organizations
-- This migration ensures that all organizations have the default goal types

-- Insert default goal types for all organizations that don't have them yet
INSERT INTO goal_types (organization_id, name, is_active)
SELECT o.id, 'Annual Goal', true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM goal_types gt 
    WHERE gt.organization_id = o.id AND gt.name = 'Annual Goal'
);

INSERT INTO goal_types (organization_id, name, is_active)
SELECT o.id, 'Quarterly Goal', true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM goal_types gt 
    WHERE gt.organization_id = o.id AND gt.name = 'Quarterly Goal'
);

INSERT INTO goal_types (organization_id, name, is_active)
SELECT o.id, 'Project Goal', true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM goal_types gt 
    WHERE gt.organization_id = o.id AND gt.name = 'Project Goal'
);

INSERT INTO goal_types (organization_id, name, is_active)
SELECT o.id, 'Development Goal', true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM goal_types gt 
    WHERE gt.organization_id = o.id AND gt.name = 'Development Goal'
);

INSERT INTO goal_types (organization_id, name, is_active)
SELECT o.id, 'Performance Goal', true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM goal_types gt 
    WHERE gt.organization_id = o.id AND gt.name = 'Performance Goal'
);

INSERT INTO goal_types (organization_id, name, is_active)
SELECT o.id, 'Team Goal', true
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM goal_types gt 
    WHERE gt.organization_id = o.id AND gt.name = 'Team Goal'
);
