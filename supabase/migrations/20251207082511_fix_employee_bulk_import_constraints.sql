/*
  # Fix Employee Bulk Import Constraints

  1. Changes
    - Make `date_of_joining` nullable to allow imports without this field
    - This allows CSV imports where date_of_joining might be empty
    - Organizations can update this field later through the employee profile

  2. Notes
    - This fixes the bulk import issue where all rows were failing
    - date_of_joining is still an important field, but not required during import
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' 
    AND column_name = 'date_of_joining'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE employees ALTER COLUMN date_of_joining DROP NOT NULL;
  END IF;
END $$;
