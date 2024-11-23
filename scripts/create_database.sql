-- Create database if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'medical_reports') THEN
    CREATE DATABASE medical_reports;
  END IF;
END
$$;
