/*
  # Add Country to Import History

  1. Changes
    - Add `country` column to `employee_import_history` table to track which country context the import was performed in.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_import_history' 
    AND column_name = 'country'
  ) THEN
    ALTER TABLE employee_import_history ADD COLUMN country text;
  END IF;
END $$;
