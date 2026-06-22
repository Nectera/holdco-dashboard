-- Supabase Schema for Nectera Holdings Dashboard
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALENDAR EVENTS
-- ============================================
CREATE TABLE calendar_events (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date VARCHAR(50),
  time VARCHAR(50),
  company VARCHAR(255),
  notes TEXT,
  assigned_to VARCHAR(255),
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTES (per company)
-- ============================================
CREATE TABLE notes (
  id BIGSERIAL PRIMARY KEY,
  company VARCHAR(255) NOT NULL,
  content JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AI ASSISTANT MEMORIES (Nora)
-- ============================================
CREATE TABLE ai_memories (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  fact TEXT NOT NULL,
  date VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_memories_user_id ON ai_memories(user_id);

-- ============================================
-- PROJECT COMMENTS
-- ============================================
CREATE TABLE project_comments (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  text TEXT NOT NULL,
  author VARCHAR(255),
  author_id BIGINT,
  reactions JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_comments_project_id ON project_comments(project_id);

-- ============================================
-- PROJECT ATTACHMENTS
-- ============================================
CREATE TABLE project_attachments (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  url VARCHAR(1000),
  name VARCHAR(255),
  size BIGINT,
  type VARCHAR(100),
  uploaded_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_attachments_project_id ON project_attachments(project_id);

-- ============================================
-- SUBTASKS
-- ============================================
CREATE TABLE subtasks (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subtasks_project_id ON subtasks(project_id);

-- ============================================
-- CONVERSATIONS & MESSAGES
-- ============================================
CREATE TABLE conversations (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'dm' CHECK (type IN ('dm', 'group')),
  members JSONB DEFAULT '[]',
  created_by BIGINT,
  created_at BIGINT,
  last_message JSONB DEFAULT '{}',
  last_read JSONB DEFAULT '{}'
);

CREATE TABLE messages (
  id VARCHAR(100) PRIMARY KEY,
  convo_id VARCHAR(100) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id BIGINT,
  sender_name VARCHAR(255),
  text TEXT NOT NULL,
  timestamp BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_convo_id ON messages(convo_id);

-- ============================================
-- EMPLOYEES / TEAM
-- ============================================
CREATE TABLE employees (
  id BIGSERIAL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LIGHT TASKS
-- ============================================
CREATE TABLE light_tasks (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  assigned_to VARCHAR(255),
  due_date VARCHAR(50),
  priority VARCHAR(50) DEFAULT 'Medium',
  company VARCHAR(255),
  status VARCHAR(100) DEFAULT 'Not Started',
  notes TEXT,
  recurrence VARCHAR(50) DEFAULT 'none',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_light_tasks_due_date ON light_tasks(due_date);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE goals (
  id BIGSERIAL PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================
CREATE TABLE notification_preferences (
  user_id BIGINT PRIMARY KEY,
  due_soon BOOLEAN DEFAULT TRUE,
  overdue BOOLEAN DEFAULT TRUE,
  new_comment BOOLEAN DEFAULT TRUE,
  assigned BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MENTION NOTIFICATIONS (in-app)
-- ============================================
CREATE TABLE mention_notifications (
  id BIGSERIAL PRIMARY KEY,
  mentioned_user_id BIGINT NOT NULL,
  mentioned_by_name VARCHAR(255),
  mentioned_by_id BIGINT,
  project_name VARCHAR(255),
  project_id VARCHAR(255),
  comment_text TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mention_notifications_user ON mention_notifications(mentioned_user_id, is_read);

-- ============================================
-- TASKS (project tasks per company)
-- ============================================
CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  company_key VARCHAR(50) NOT NULL,
  company VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  lead VARCHAR(255) DEFAULT '',
  status VARCHAR(100) DEFAULT '',
  priority VARCHAR(50) DEFAULT '',
  due_date VARCHAR(50) DEFAULT '',
  team_members TEXT DEFAULT '',
  last_touched VARCHAR(50) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_company_key ON tasks(company_key);

-- ============================================
-- QUICKBOOKS OAUTH TOKENS
-- ============================================
CREATE TABLE qb_tokens (
  company VARCHAR(100) PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  realm_id VARCHAR(255),
  expires_at BIGINT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISABLE RLS ON ALL TABLES (API routes handle auth)
-- ============================================
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE light_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE qb_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE mention_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
