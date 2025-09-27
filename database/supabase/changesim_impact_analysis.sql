-- Complete ChangeSim Impact Analysis Database Schema
-- This file contains all the components needed for the RAG system to work

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

--changesim_impact_analysis_runs
CREATE TABLE IF NOT EXISTS public.changesim_impact_analysis_runs (
  run_id uuid primary key default gen_random_uuid(),

  process text not null,

  role text not null,
  change_description text not null,
  context text,

  analysis_summary text not null,
  risk_level text not null,
  risk_rationale text not null,
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

CREATE INDEX IF NOT EXISTS idx_changesim_impact_analysis_runs_risk_rationale
  ON changesim_impact_analysis_runs USING gin (to_tsvector('english', risk_rationale));

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
CREATE TABLE IF NOT EXISTS public.changesim_impact_analysis_run_chunks (
  chunk_id uuid not null default gen_random_uuid (),
  run_id uuid not null,
  org_role text null,
  chunk_idx integer not null,
  content text not null,
  embedding public.vector(1536) null,
  created_at timestamp with time zone null default now(),
  composite text null,
  constraint changesim_impact_analysis_run_chunks_pkey primary key (chunk_id),
  constraint changesim_impact_analysis_run_chunks_run_id_fkey foreign KEY (run_id) references changesim_impact_analysis_runs (run_id) on delete CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS changesim_impact_analysis_run_chunks_composite_idx
  ON public.changesim_impact_analysis_run_chunks using btree (composite) TABLESPACE pg_default;

-- Create proper unique constraint (not just index)
ALTER TABLE public.changesim_impact_analysis_run_chunks
DROP CONSTRAINT IF EXISTS uq_run_composite_constraint;

ALTER TABLE public.changesim_impact_analysis_run_chunks
ADD CONSTRAINT uq_run_composite_constraint
UNIQUE (run_id, composite, chunk_idx);

CREATE INDEX IF NOT EXISTS changesim_impact_analysis_run_chunks_vec_idx
  ON public.changesim_impact_analysis_run_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = '100') TABLESPACE pg_default;

--embedding_jobs
CREATE TABLE IF NOT EXISTS public.embedding_jobs (
  id bigint generated always as identity not null,
  chunk_id uuid not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  constraint embedding_jobs_pkey primary key (id),
  constraint embedding_jobs_chunk_id_fkey foreign KEY (chunk_id) references changesim_impact_analysis_run_chunks (chunk_id) on delete CASCADE
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status
  ON public.embedding_jobs using btree (status) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS idx_embedding_jobs_chunk_id_unique
  ON public.embedding_jobs using btree (chunk_id) TABLESPACE pg_default;

-- Fixed trigger function (no ON CONFLICT issues)
CREATE OR REPLACE FUNCTION public.enqueue_embedding_job()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create embedding job if chunk has content but no embedding
  IF NEW.content IS NOT NULL AND NEW.content != '' AND NEW.embedding IS NULL THEN
    -- Check if job already exists before inserting
    IF NOT EXISTS (
      SELECT 1 FROM public.embedding_jobs
      WHERE chunk_id = NEW.chunk_id
    ) THEN
      INSERT INTO public.embedding_jobs (chunk_id, status)
      VALUES (NEW.chunk_id, 'pending');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to automatically enqueue embedding jobs
DROP TRIGGER IF EXISTS trg_enqueue_embedding_job ON changesim_impact_analysis_run_chunks;
CREATE TRIGGER trg_enqueue_embedding_job
AFTER INSERT ON changesim_impact_analysis_run_chunks FOR EACH ROW
EXECUTE FUNCTION enqueue_embedding_job();

-- Custom function for inserting chunks (bypasses client issues)
CREATE OR REPLACE FUNCTION public.insert_analysis_chunk(
  p_run_id uuid,
  p_org_role text,
  p_composite text,
  p_chunk_idx integer,
  p_content text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_chunk_id uuid;
  result json;
BEGIN
  -- Try to insert the chunk
  INSERT INTO public.changesim_impact_analysis_run_chunks
    (run_id, org_role, composite, chunk_idx, content)
  VALUES
    (p_run_id, p_org_role, p_composite, p_chunk_idx, p_content)
  RETURNING chunk_id INTO new_chunk_id;

  -- Return success result
  result := json_build_object(
    'success', true,
    'chunk_id', new_chunk_id,
    'message', 'Chunk inserted successfully'
  );

  RETURN result;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle duplicate constraint violation
    result := json_build_object(
      'success', false,
      'error_code', '23505',
      'message', 'Chunk already exists'
    );
    RETURN result;

  WHEN OTHERS THEN
    -- Handle any other errors
    result := json_build_object(
      'success', false,
      'error_code', SQLSTATE,
      'message', SQLERRM
    );
    RETURN result;
END;
$$;

-- Vector search helper for RAG retrieval (1536 dimensions)
CREATE OR REPLACE FUNCTION public.match_impact_chunks(
  query_embedding vector(1536),
  match_threshold double precision default 0.72,
  match_count integer default 5,
  role_filter text default null
)
RETURNS TABLE (
  chunk_id uuid,
  run_id uuid,
  org_role text,
  composite text,
  content text,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    c.chunk_id,
    c.run_id,
    c.org_role,
    c.composite,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM public.changesim_impact_analysis_run_chunks c
  WHERE c.embedding IS NOT NULL
    AND (role_filter IS NULL OR c.org_role = role_filter)
    AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
$$;
