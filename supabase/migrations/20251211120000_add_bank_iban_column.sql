-- Add bank_iban column to employees table

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'bank_iban') THEN
    ALTER TABLE employees ADD COLUMN bank_iban text;
  END IF;
END $$;
