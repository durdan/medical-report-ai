-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS prompts;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  specialty TEXT,
  is_system BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  findings TEXT NOT NULL,
  report TEXT NOT NULL,
  specialty TEXT,
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create functions for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers
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

-- Insert initial admin users
INSERT INTO users (id, name, email, password, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'Medical Admin',
  'admin@medical-ai.com',
  '$2a$10$YMxhPL/0JkgXgAzz8jjZU.H8GA2dgK7rv7RPAYVuJqkw4QXoVjZ.O', -- Password: SecureAdminPass123!
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, name, email, password, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  'Example Admin',
  'admin@example.com',
  '$2a$10$YMxhPL/0JkgXgAzz8jjZU.H8GA2dgK7rv7RPAYVuJqkw4QXoVjZ.O', -- Password: admin123
  'ADMIN'
) ON CONFLICT (email) DO NOTHING;

-- Insert system prompts
INSERT INTO prompts (id, title, content, specialty, is_system, user_id)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  'General Medical Report',
  'You are a professional medical report generator. Your task is to generate a clear, concise, and accurate medical report based on the provided findings. Please follow these guidelines:

1. Use professional medical terminology
2. Maintain a clear and logical structure
3. Include all relevant findings
4. Highlight any critical observations
5. Suggest follow-up actions if necessary

Please generate a comprehensive medical report based on the provided findings.',
  'General',
  true,
  '550e8400-e29b-41d4-a716-446655440000'::uuid
) ON CONFLICT DO NOTHING;

INSERT INTO prompts (id, title, content, specialty, is_system, user_id)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  'Radiology Report',
  'You are a specialized radiologist. Your task is to generate a detailed radiology report based on the provided imaging findings. Please follow these guidelines:

1. Use standard radiological terminology
2. Follow systematic approach (e.g., from superior to inferior)
3. Describe all relevant anatomical structures
4. Note any abnormalities or pathological findings
5. Compare with prior studies if available
6. Provide clear impressions and recommendations

Please generate a detailed radiology report based on the provided imaging findings.',
  'Radiology',
  true,
  '550e8400-e29b-41d4-a716-446655440000'::uuid
) ON CONFLICT DO NOTHING;Email: admin@example.com
Password: admin123