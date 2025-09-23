-- ChangeSim Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database tables

-- Enable required extensions
create extension if not exists pgcrypto;

-- Main runs table for storing analysis results
create table if not exists changesim_runs (
  -- Primary key and timestamps
  run_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Core analysis input
  role text not null,
  change_desc text not null,

  -- Basic analysis results
  risk_level text not null,
  risk_scoring jsonb not null,
  decision_trace jsonb,

  -- Research Mode analysis results (nullable)
  principles_result jsonb,
  stakeholder_result jsonb,
  human_centered_result jsonb,
  plan_result jsonb,
  actions_result jsonb,

  -- Model metadata
  model_meta jsonb,             -- {provider, model, version?, temperature, prompt_version}
  tokens_in int,
  tokens_out int,
  latency_ms int,

  -- Research tracking
  trace_id text,
  framework_version text not null default '1.0.0-alpha',
  user_id text,
  session_id text
);

-- Lightweight trace events store for performance analytics
create table if not exists changesim_traces (
  id uuid primary key default gen_random_uuid(),
  trace_id text not null,
  created_at timestamptz not null default now(),
  event_type text not null,          -- principle_validation | perspective_test | human_analysis | plan_generation | subagent_execution | error
  run_id uuid,
  ctx jsonb,                         -- any context payload
  ms int                             -- duration in milliseconds
);

-- Performance indexes
create index if not exists idx_runs_created_at on changesim_runs (created_at desc);
create index if not exists idx_runs_risk_level on changesim_runs (risk_level);
create index if not exists idx_runs_trace_id on changesim_runs (trace_id);
create index if not exists idx_runs_framework_version on changesim_runs (framework_version);
create index if not exists idx_runs_fts on changesim_runs using gin (to_tsvector('english', change_desc));

create index if not exists idx_traces_trace_id on changesim_traces (trace_id, created_at);
create index if not exists idx_traces_event_type on changesim_traces (event_type, created_at);

-- Enable Row Level Security (RLS) for data protection
alter table changesim_runs enable row level security;
alter table changesim_traces enable row level security;

-- RLS Policies: Deny all access by default (service role bypasses RLS)
create policy "deny_all_runs" on changesim_runs for all using (false);
create policy "deny_all_traces" on changesim_traces for all using (false);

-- Analytics view for framework performance monitoring
create or replace view changesim_framework_analytics as
select
  framework_version,
  count(*) as total_runs,
  avg(latency_ms) as avg_latency_ms,
  count(case when (principles_result->>'violations')::jsonb is not null then 1 end) as runs_with_violations,
  created_at::date as run_date
from changesim_runs
where created_at >= now() - interval '30 days'
group by framework_version, created_at::date
order by run_date desc;

-- Analytics function for RPC calls
create or replace function get_framework_analytics(days_back int default 30)
returns table (
  framework_version text,
  total_runs bigint,
  avg_latency_ms numeric,
  runs_with_violations bigint,
  run_date date
)
language sql
security definer
as $$
  select
    f.framework_version,
    count(*) as total_runs,
    avg(f.latency_ms) as avg_latency_ms,
    count(case when (f.principles_result->>'violations')::jsonb is not null then 1 end) as runs_with_violations,
    f.created_at::date as run_date
  from changesim_runs f
  where f.created_at >= now() - interval '1 day' * days_back
  group by f.framework_version, f.created_at::date
  order by run_date desc;
$$;

-- Grant permissions to service role (replace 'service_role' with your actual service role if different)
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Insert a test row to verify the setup (optional)
-- insert into changesim_runs (role, change_desc, risk_level, risk_scoring, framework_version)
-- values ('Test User', 'Test schema setup', 'low', '{"scope": "individual", "severity": "minor"}', '1.0.0-alpha');