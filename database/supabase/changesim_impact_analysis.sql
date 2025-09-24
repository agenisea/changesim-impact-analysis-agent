CREATE TABLE IF NOT EXISTS changesim_impact_analysis_runs (
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