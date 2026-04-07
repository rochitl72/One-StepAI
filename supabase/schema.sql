-- One-Step AI (OpenStep) — PostgreSQL schema for Supabase
-- Run the full file once in: Supabase Dashboard → SQL Editor

-- Profiles table (user_id = Auth0 sub)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
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

-- Contributions table (user_id = Auth0 sub, TEXT)
create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  issue_id uuid references issues(id) on delete set null,
  pr_url text,
  pr_merged boolean default false,
  xp_awarded integer default 0,
  maintainer_rating integer check (maintainer_rating >= 1 and maintainer_rating <= 5),
  maintainer_comment text,
  language text,
  issue_url text,
  repo text,
  merged_at timestamptz,
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

-- Badge awards table
create table if not exists badge_awards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  badge_slug text not null,
  awarded_at timestamptz default now(),
  unique(user_id, badge_slug)
);

create index if not exists idx_badge_awards_user_id on badge_awards(user_id);

-- RLS Policies
alter table profiles enable row level security;
alter table contributions enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on profiles for select
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Users can update their own profile
create policy "Users can update own profile"
  on profiles for update
  using (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Service role bypasses RLS (for agents using service key)
-- Service role key should be used in server-side API routes only

-- Indexes
create index if not exists idx_profiles_user_id on profiles(user_id);
create index if not exists idx_contributions_user_id on contributions(user_id);
create index if not exists idx_contributions_pr_url on contributions(pr_url);
create index if not exists idx_activity_log_username on activity_log(github_username);

-- ── DEMO DATA (optional — run manually) ──
-- Replace YOUR_AUTH0_SUB with your Auth0 User ID from the dashboard.
--
-- insert into badge_awards (user_id, badge_slug) values
--   ('YOUR_AUTH0_SUB', 'first_bug'),
--   ('YOUR_AUTH0_SUB', 'doc_writer'),
--   ('YOUR_AUTH0_SUB', 'test_author')
-- on conflict (user_id, badge_slug) do nothing;
--
-- update profiles set xp = 750, rank = 'Contributor' where user_id = 'YOUR_AUTH0_SUB';
-- Or use "Try demo mode" on the dashboard (Scout with demo fingerprint).
