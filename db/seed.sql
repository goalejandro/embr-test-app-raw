-- Seed data for embr-test-app-raw
-- This file is executed after schema.sql to populate initial data

-- Insert sample users
INSERT INTO users (name, email) VALUES
  ('Alice Johnson', 'alice@example.com'),
  ('Bob Smith', 'bob@example.com')
ON CONFLICT (email) DO NOTHING;

-- Insert sample todos
INSERT INTO todos (title, completed) VALUES
  ('Learn SQL basics', true),
  ('Build a REST API', true),
  ('Deploy to Embr', true),
  ('Write documentation', false),
  ('Add more features', false)
ON CONFLICT DO NOTHING;

-- Insert sample posts (using subqueries to get author IDs)
INSERT INTO posts (title, content, published, author_id) VALUES
  ('Getting Started with Raw SQL', 'Raw SQL gives you full control over your database queries...', true, (SELECT id FROM users WHERE email = 'alice@example.com')),
  ('Best Practices for Node.js', 'Here are some tips for building Node.js applications...', true, (SELECT id FROM users WHERE email = 'bob@example.com')),
  ('Draft: Advanced Topics', 'Coming soon: advanced database optimization techniques...', false, (SELECT id FROM users WHERE email = 'alice@example.com'))
ON CONFLICT DO NOTHING;
