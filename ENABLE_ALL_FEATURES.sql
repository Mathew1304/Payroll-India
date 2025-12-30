-- ============================================================
-- ADD ALL MISSING FEATURES TO YOUR ORGANIZATION
-- Run this in Supabase SQL Editor
-- ============================================================

-- Insert ALL features for your organization
INSERT INTO organization_features (organization_id, feature_key, is_enabled)
VALUES 
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'dashboard', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'employees', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'attendance', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'leave', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'payroll', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'reports', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'tasks', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'expenses', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'work-reports', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'helpdesk', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'performance', true),
  ('c004bb9d-4d1f-4d8b-9fb8-20ef0b3de7fb'::uuid, 'training', true)
ON CONFLICT (organization_id, feature_key) 
DO UPDATE SET is_enabled = true;

SELECT 'All features enabled! Reload your app (Ctrl+F5)' as message;
