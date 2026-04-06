-- OpenStep AI — Supabase Schema
-- Run this in the Supabase SQL editor

-- Profiles table
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth0_id text unique not null,
  github_username text,
  github_avatar text,
  xp integer default 0,
  rank text default 'Newbie',
  badges text[] default '{}',
  skill_fingerprint jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Issues table (matched issues cache)
create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  github_issue_id bigint unique,
  github_issue_url text,
  repo_full_name text,
  issue_number integer,
  title text,
  body text,
  labels text[],
  difficulty integer default 5,
  language text,
  created_at timestamptz default now()
);

-- Contributions table
create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  issue_id uuid references issues(id) on delete set null,
  pr_url text,
  pr_merged boolean default false,
  xp_awarded integer default 0,
  maintainer_rating integer check (maintainer_rating >= 1 and maintainer_rating <= 5),
  maintainer_comment text,
  language text,
  status text default 'in_progress',
  created_at timestamptz default now()
);

-- Activity log (for Guardian agent)
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  github_username text,
  event_type text,
  ref text,
  repo text,
  created_at timestamptz default now()
);

-- RLS Policies
alter table profiles enable row level security;
alter table contributions enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on profiles for select
  using (auth0_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using (auth0_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role bypasses RLS (for agents using service key)
-- Service role key should be used in server-side API routes only

-- Indexes
create index if not exists idx_profiles_auth0_id on profiles(auth0_id);
create index if not exists idx_contributions_user_id on contributions(user_id);
create index if not exists idx_contributions_pr_url on contributions(pr_url);
create index if not exists idx_activity_log_username on activity_log(github_username);
