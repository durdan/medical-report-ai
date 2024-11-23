-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS prompts;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  findings TEXT NOT NULL,
  content TEXT NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  prompt_id UUID REFERENCES prompts(id),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompts_updated_at
    BEFORE UPDATE ON prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin users with verified password hashes
INSERT INTO users (id, name, email, password, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Medical Admin',
  'admin@medical-ai.com',
  '$2a$10$7pgq3mHVuGFgewol9DdGRe322j8bffD1RtvCHT8Cf8O5VjUxuTJOu',  -- admin123
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, name, email, password, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Example Admin',
  'admin@example.com',
  '$2a$10$4WTUh5WbAcAV4O4Osaz1RuGf3TIYrC9u34shU5A2ph9lobGuk4yDa',  -- admin123
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- Insert initial system prompts
INSERT INTO prompts (
  id,
  title,
  content,
  category,
  is_active,
  user_id
) VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Radiology Report Generator',
  'You are an expert radiologist with years of experience in interpreting medical imaging studies. Your task is to generate a comprehensive and accurate radiology report based on the provided imaging findings.

Please follow these guidelines:
1. Use professional medical terminology
2. Structure the report clearly with appropriate sections
3. Be precise and detailed in your descriptions
4. Include relevant measurements when available
5. Note any significant findings or abnormalities
6. Provide a clear impression/conclusion

Please generate a detailed radiology report based on the provided imaging findings.',
  'Radiology',
  true,
  '550e8400-e29b-41d4-a716-446655440000'::uuid
) ON CONFLICT DO NOTHING;