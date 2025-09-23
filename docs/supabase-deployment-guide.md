# Supabase Deployment Guide for ChangeSim Research Mode

This guide walks you through setting up Supabase persistence for ChangeSim's Research Mode to collect real organizational dynamics data.

## 🚀 Quick Setup (5 minutes)

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project to initialize (~2 minutes)

### 2. Set Up Database Schema
1. Open your Supabase dashboard
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of [`docs/supabase-schema.sql`](./supabase-schema.sql)
5. Click **Run** to execute the schema

### 3. Configure Environment Variables
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   # Get these from your Supabase project settings
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Enable research features
   ENABLE_RUN_LOGGING=true
   ENABLE_TRACE_LOGGING=true
   FRAMEWORK_VERSION=1.0.0-alpha
   ```

3. **Important**: Keep `SUPABASE_SERVICE_ROLE_KEY` secret and server-only!

### 4. Test the Integration
1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open ChangeSim in your browser
3. Toggle **Research Mode** ON
4. Run an impact analysis
5. Check your Supabase dashboard under **Table Editor** → `changesim_runs` to see the data

## 🔒 Security Configuration

### Row Level Security (RLS)
The schema automatically enables RLS with "deny all" policies. This means:
- ✅ Server-side API routes can write data (using service role)
- ❌ Client-side code cannot read/write data
- ❌ Unauthorized users cannot access data

### Service Role Key Safety
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to client-side code
- Only use it in server-side API routes
- Add it to your deployment platform's environment variables
- Rotate the key if accidentally exposed

## 📊 Data Collection

### What Gets Collected

#### Basic Mode (All Requests)
```sql
-- Core analysis data
role, change_desc, risk_level, risk_scoring
model_meta, tokens_in, tokens_out
trace_id, framework_version, timestamp
```

#### Research Mode (When Enabled)
```sql
-- Additional principled analysis
principles_result    -- Organizational law violations
stakeholder_result   -- Multi-perspective gaps
human_centered_result -- Dignity and stress analysis
plan_result         -- Recommended interventions
actions_result      -- Subagent recommendations

-- Performance tracing
changesim_traces    -- Event-by-event timing data
```

### Data Privacy
- No personally identifiable information (PII) is stored
- Only organizational change descriptions and analysis results
- User IDs and session IDs are optional and configurable
- All data is encrypted at rest by Supabase

## 📈 Analytics and Insights

### Built-in Analytics View
Query framework performance:
```sql
SELECT * FROM changesim_framework_analytics;
```

### Custom Analytics Examples

**Principle Violation Trends:**
```sql
SELECT
  created_at::date as date,
  COUNT(*) as total_runs,
  COUNT(CASE WHEN principles_result->>'violations' != '[]' THEN 1 END) as runs_with_violations,
  (COUNT(CASE WHEN principles_result->>'violations' != '[]' THEN 1 END) * 100.0 / COUNT(*)) as violation_rate
FROM changesim_runs
WHERE created_at >= now() - interval '7 days'
GROUP BY created_at::date
ORDER BY date DESC;
```

**Most Common Change Types:**
```sql
SELECT
  risk_scoring->>'scope' as scope,
  risk_scoring->>'severity' as severity,
  COUNT(*) as frequency
FROM changesim_runs
GROUP BY risk_scoring->>'scope', risk_scoring->>'severity'
ORDER BY frequency DESC;
```

**Performance Tracking:**
```sql
SELECT
  event_type,
  AVG(ms) as avg_duration_ms,
  COUNT(*) as frequency
FROM changesim_traces
WHERE created_at >= now() - interval '24 hours'
GROUP BY event_type
ORDER BY avg_duration_ms DESC;
```

## 🚀 Deployment Configurations

### Vercel Deployment
1. Add environment variables to Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENABLE_RUN_LOGGING=true`
   - `ENABLE_TRACE_LOGGING=true`

2. Deploy normally - persistence will work automatically

### Other Platforms
- **Netlify**: Add env vars to site settings
- **Railway**: Add to environment variables
- **Docker**: Include in environment or docker-compose

## 🔧 Maintenance

### Monitoring
```sql
-- Check recent activity
SELECT COUNT(*) as runs_today
FROM changesim_runs
WHERE created_at >= current_date;

-- Storage usage
SELECT pg_size_pretty(pg_total_relation_size('changesim_runs')) as table_size;
```

### Cleanup (Optional)
```sql
-- Remove traces older than 30 days
DELETE FROM changesim_traces WHERE created_at < now() - interval '30 days';

-- Archive old runs (example: keep 90 days)
-- Consider exporting to cold storage instead of deleting
DELETE FROM changesim_runs WHERE created_at < now() - interval '90 days';
```

## 🐛 Troubleshooting

### Common Issues

**"Supabase env vars missing" error:**
- Check `.env.local` has correct variable names
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart development server after adding env vars

**No data appearing in Supabase:**
- Check browser console for errors
- Verify `ENABLE_RUN_LOGGING=true` in environment
- Check Supabase logs for authentication errors

**Research Mode not working:**
- Ensure toggle is ON in the UI
- Check that imports resolve in API route
- Verify all framework functions are available

### Debug Mode
Enable detailed logging:
```env
NODE_ENV=development
ENABLE_TRACE_LOGGING=true
```

Check server logs for detailed trace information.

## 📚 Next Steps

1. **Set up monitoring dashboards** using Supabase's built-in analytics
2. **Create data export scripts** for research analysis
3. **Implement user-specific analytics** if user authentication is added
4. **Set up automated backups** for critical organizational research data

Your ChangeSim instance is now collecting valuable organizational dynamics data that can drive future research and framework improvements! 🎉