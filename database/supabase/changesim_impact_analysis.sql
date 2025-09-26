--changesim_impact_analysis_runs
CREATE TABLE IF NOT EXISTS public.changesim_impact_analysis_runs (
  run_id uuid primary key default gen_random_uuid(),

  process text not null,

  role text not null,
  change_description text not null,
  context text,

  analysis_summary text not null,
  risk_level text not null,
  risk_factors jsonb not null,
  risk_scoring jsonb not null,
  decision_trace jsonb not null,
  sources jsonb not null,

  meta jsonb not null,

  session_id uuid,
  input_hash text,

  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_changesim_impact_analysis_runs_created
  ON changesim_impact_analysis_runs (created_at desc);

CREATE INDEX IF NOT EXISTS idx_changesim_impact_analysis_runs_risk_level
  ON changesim_impact_analysis_runs (risk_level);

CREATE INDEX IF NOT EXISTS idx_changesim_impact_analysis_runs_scope
  ON changesim_impact_analysis_runs ((risk_scoring->>'scope'));

CREATE INDEX IF NOT EXISTS idx_changesim_impact_analysis_runs_session
  ON changesim_impact_analysis_runs (session_id);

CREATE INDEX IF NOT EXISTS idx_changesim_impact_analysis_runs_input_hash
  ON changesim_impact_analysis_runs (input_hash);

CREATE UNIQUE INDEX IF NOT EXISTS changesim_impact_analysis_runs_session_input_uq
  ON changesim_impact_analysis_runs (session_id, input_hash)
  WHERE session_id IS NOT NULL AND input_hash IS NOT NULL;

--changesim_impact_analysis_run_chunks
create table public.changesim_impact_analysis_run_chunks (
  chunk_id uuid not null default gen_random_uuid (),
  run_id uuid not null,
  org_role text null,
  chunk_idx integer not null,
  content text not null,
  embedding public.vector null,
  created_at timestamp with time zone null default now(),
  composite text null,
  constraint changesim_impact_analysis_run_chunks_pkey primary key (chunk_id),
  constraint changesim_impact_analysis_run_chunks_run_id_fkey foreign KEY (run_id) references changesim_impact_analysis_runs (run_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists changesim_impact_analysis_run_chunks_composite_idx on public.changesim_impact_analysis_run_chunks using btree (composite) TABLESPACE pg_default;

create unique INDEX IF not exists uq_run_composite_idx on public.changesim_impact_analysis_run_chunks using btree (run_id, composite, chunk_idx) TABLESPACE pg_default;

create index IF not exists changesim_impact_analysis_run_chunks_vec_idx on public.changesim_impact_analysis_run_chunks using ivfflat (embedding vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default;

create trigger trg_enqueue_embedding_job
after INSERT on changesim_impact_analysis_run_chunks for EACH row
execute FUNCTION enqueue_embedding_job ();

--embedding_jobs
create table public.embedding_jobs (
  id bigint generated always as identity not null,
  chunk_id uuid not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  constraint embedding_jobs_pkey primary key (id),
  constraint embedding_jobs_chunk_id_fkey foreign KEY (chunk_id) references changesim_impact_analysis_run_chunks (chunk_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_embedding_jobs_status on public.embedding_jobs using btree (status) TABLESPACE pg_default;