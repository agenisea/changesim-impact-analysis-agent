-- Consolidated Agentic RAG Functions for ChangeSim Impact Analysis
-- Contains only the SQL functions that are actively used by the application
-- Consolidated from agentic-rag-functions.sql and enhanced-agentic-rag-functions.sql

-- Function to search for similar chunks by specific composite type
-- Used by: Pattern Analysis Agent, Role-Specific Agent, Cross-Reference Agent
CREATE OR REPLACE FUNCTION search_similar_chunks_by_type(
  query_text TEXT,
  chunk_type TEXT,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  content TEXT,
  similarity FLOAT,
  role TEXT,
  chunk_type TEXT,
  run_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Get embedding for the query
  SELECT embedding INTO query_embedding
  FROM (
    SELECT ai.embeddings(
      'text-embedding-ada-002',
      query_text,
      api_key_name => 'OPENAI_API_KEY'
    ) as embedding
  ) AS subquery;

  -- Return similar chunks filtered by composite type
  RETURN QUERY
  SELECT
    c.content::TEXT,
    (1 - (c.embedding <=> query_embedding))::FLOAT as similarity,
    c.org_role::TEXT as role,
    c.composite::TEXT as chunk_type,
    c.run_id::TEXT,
    r.created_at
  FROM changesim_impact_analysis_run_chunks c
  JOIN changesim_impact_analysis_runs r ON c.run_id = r.run_id
  WHERE c.composite = chunk_type
  AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;

EXCEPTION WHEN OTHERS THEN
  -- Return empty result on error
  RETURN;
END;
$$;

-- Function to search for chunks by role and chunk type
-- Used by: Role-Specific Agent for context analysis
CREATE OR REPLACE FUNCTION search_similar_chunks_by_role(
  target_role TEXT,
  chunk_type TEXT DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  content TEXT,
  similarity FLOAT,
  role TEXT,
  chunk_type TEXT,
  run_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.content::TEXT,
    1.0::FLOAT as similarity, -- Role-based match, not similarity-based
    c.org_role::TEXT as role,
    c.composite::TEXT as chunk_type,
    c.run_id::TEXT,
    r.created_at
  FROM changesim_impact_analysis_run_chunks c
  JOIN changesim_impact_analysis_runs r ON c.run_id = r.run_id
  WHERE (c.org_role ILIKE '%' || target_role || '%'
         OR target_role ILIKE '%' || split_part(c.org_role, ' ', 1) || '%')
  AND (chunk_type IS NULL OR c.composite = chunk_type)
  ORDER BY r.created_at DESC
  LIMIT match_count;

EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- Function to search for analyses with similar risk levels
-- Used by: Cross-Reference Agent for risk-level comparisons
CREATE OR REPLACE FUNCTION search_similar_risk_level(
  query_text TEXT,
  risk_level TEXT,
  match_count INT DEFAULT 5
)
RETURNS TABLE(
  content TEXT,
  similarity FLOAT,
  role TEXT,
  riskLevel TEXT,
  run_id TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Get embedding for the query
  SELECT embedding INTO query_embedding
  FROM (
    SELECT ai.embeddings(
      'text-embedding-ada-002',
      query_text,
      api_key_name => 'OPENAI_API_KEY'
    ) as embedding
  ) AS subquery;

  -- Return analyses with similar risk levels
  RETURN QUERY
  SELECT
    c.content::TEXT,
    (1 - (c.embedding <=> query_embedding))::FLOAT as similarity,
    c.org_role::TEXT as role,
    (r.result->>'risk_level')::TEXT as riskLevel,
    c.run_id::TEXT,
    r.created_at
  FROM changesim_impact_analysis_run_chunks c
  JOIN changesim_impact_analysis_runs r ON c.run_id = r.run_id
  WHERE (r.result->>'risk_level') = risk_level
  AND c.composite IN ('context_analysis', 'change_risks') -- Focus on analytical chunks
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;

EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION search_similar_chunks_by_type(TEXT, TEXT, FLOAT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_chunks_by_role(TEXT, TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_similar_risk_level(TEXT, TEXT, INT) TO authenticated;

-- Grant permissions to service role for server-side access
GRANT EXECUTE ON FUNCTION search_similar_chunks_by_type(TEXT, TEXT, FLOAT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION search_similar_chunks_by_role(TEXT, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION search_similar_risk_level(TEXT, TEXT, INT) TO service_role;