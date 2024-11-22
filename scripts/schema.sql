-- Drop existing tables if they exist
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS prompts;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  specialty TEXT,
  is_system BOOLEAN DEFAULT false,
  user_id TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  findings TEXT NOT NULL,
  report TEXT NOT NULL,
  specialty TEXT,
  prompt_id TEXT,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id)
);

-- Insert first admin user
INSERT INTO users (id, name, email, password, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Medical Admin',
  'admin@medical-ai.com',
  '$2a$10$8QJjx54D/Y35tFH.tsZlTeknh53obowyodU0u16drSgt2SB/kwTDq', -- Password: SecureAdminPass123!
  'ADMIN'
);

-- Insert second admin user
INSERT INTO users (id, name, email, password, role)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Example Admin',
  'admin@example.com',
  '$2a$10$GUFGT6WTXW763zlZlrqOLe1fr8OR4/meyyS22I64WX0ZEiUtFGCqG', -- Password: admin123
  'ADMIN'
);

-- Insert default prompts
INSERT INTO prompts (id, title, content, specialty, is_system, user_id)
VALUES 
(
  '650e8400-e29b-41d4-a716-446655440001',
  'General Medical Report',
  'Please analyze the following medical findings and create a comprehensive medical report. Include relevant observations, potential diagnoses, and recommendations.',
  'General',
  true,
  '550e8400-e29b-41d4-a716-446655440000'
),
(
  '650e8400-e29b-41d4-a716-446655440002',
  'Radiology Report',
  'Please analyze the following radiological findings and create a detailed report. Include imaging technique, findings, impressions, and any recommendations for follow-up studies.',
  'Radiology',
  true,
  '550e8400-e29b-41d4-a716-446655440000'
);
