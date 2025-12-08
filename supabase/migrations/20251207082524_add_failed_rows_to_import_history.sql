/*
  # Add Failed Rows Tracking to Import History

  1. Changes
    - Add `failed_rows` column to store details about rows that failed to import
    - This helps users understand exactly what went wrong during bulk import

  2. Structure
    - failed_rows will be a JSONB array containing objects with:
      - row_number: which row failed
      - row_data: the data from that row
      - error: the specific error message
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_import_history' 
    AND column_name = 'failed_rows'
  ) THEN
    ALTER TABLE employee_import_history ADD COLUMN failed_rows jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
