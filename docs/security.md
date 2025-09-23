# Security Architecture & Data Handling

This document outlines how ChangeSim handles sensitive data, maintains security, and protects user privacy in its research infrastructure.

## 🔒 Security Overview

ChangeSim implements **defense-in-depth** security with multiple layers protecting organizational data and ensuring research integrity.

### Architecture Principles
- **Zero-Trust**: No client-side access to raw data
- **Principle of Least Privilege**: Service roles have minimal required permissions
- **Data Minimization**: Only essential data is collected and stored
- **Transparency**: All security measures are documented and auditable

## 🛡️ Data Protection Layers

### 1. Environment Variable Security
```env
# ✅ Public (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co

# ❌ Private (server-only, never expose)
SUPABASE_SERVICE_ROLE_KEY=***
OPENAI_API_KEY=***
```

**Protection Measures:**
- Service role keys never sent to client
- Environment variables validated on server startup
- Development vs. production key separation
- Automatic rotation recommendations

### 2. Row Level Security (RLS)
```sql
-- Default deny policy on all tables
create policy "deny_all_runs" on changesim_runs for all using (false);
create policy "deny_all_traces" on changesim_traces for all using (false);
```

**How It Works:**
- All database tables have RLS enabled
- Default policy: **DENY ALL** access
- Service role bypasses RLS for API writes only
- Client code cannot read/write data directly
- Even compromised client cannot access database

### 3. API Route Security
```typescript
// Server-side only imports
import { getServerSupabase } from '@/lib/supabase-server'

// Validation + sanitization
const validation = impactInputSchema.safeParse(body)
if (!validation.success) {
  return NextResponse.json({ error: "..." }, { status: 400 })
}
```

**Security Features:**
- Input validation with Zod schemas
- SQL injection prevention through Supabase client
- Error handling that doesn't leak internal state
- Rate limiting through platform (Vercel/Netlify)

## 📊 Data Handling Practices

### What We Collect
```typescript
interface DataCollection {
  // ✅ Organizational context (anonymizable)
  role: string                    // "Engineering Manager"
  changeDescription: string       // "VP departure without successor"

  // ✅ Analysis results (research data)
  principleViolations: string[]   // Organizational law analysis
  stakeholderGaps: string[]       // Perspective coverage
  recommendations: string[]       // Actionable guidance

  // ✅ Technical metadata (performance)
  traceId: string                // Request correlation
  latencyMs: number              // Performance tracking
  frameworkVersion: string       // Research evolution
}
```

### What We DON'T Collect
- ❌ Personal identifiable information (PII)
- ❌ Employee names or contact details
- ❌ Financial data or sensitive business metrics
- ❌ Authentication tokens or passwords
- ❌ IP addresses or device fingerprints

### Data Anonymization Strategy
```typescript
// Example anonymization patterns
const anonymize = {
  // Replace specific names with roles
  "John Smith" → "Engineering Manager"
  "Acme Corp" → "Technology Company"

  // Generalize specific details
  "Q4 2024 layoffs" → "workforce reduction"
  "AWS migration" → "infrastructure change"

  // Remove sensitive metrics
  "$2M budget cut" → "budget adjustment"
  "40% headcount" → "significant organizational change"
}
```

## 🔍 Research Ethics

### Purpose Limitation
Data is collected exclusively for:
- ✅ Improving organizational change analysis
- ✅ Validating organizational dynamics frameworks
- ✅ Research into stress reduction and human dignity
- ❌ Commercial surveillance or tracking
- ❌ Individual performance evaluation
- ❌ Organizational competitive intelligence

### Data Retention
```typescript
// Automated retention policies
const retentionRules = {
  traceEvents: "30 days",      // Performance debugging only
  researchData: "2 years",     // Longitudinal research
  aggregatedInsights: "indefinite" // Anonymized patterns
}
```

### User Rights
- **Transparency**: This documentation explains all data practices
- **Control**: Users explicitly enable Research Mode
- **Deletion**: Contact for data removal (when technically feasible)
- **Portability**: Data export available on request

## 🚀 Deployment Security

### Environment Separation
```bash
# Development
FRAMEWORK_VERSION=1.0.0-dev
ENABLE_TRACE_LOGGING=true

# Production
FRAMEWORK_VERSION=1.0.0
ENABLE_TRACE_LOGGING=false  # Reduce data collection in prod
```

### Secret Management
```yaml
# Recommended secret handling
platforms:
  vercel:
    secrets: "Environment Variables (encrypted)"
  netlify:
    secrets: "Environment Variables (encrypted)"
  railway:
    secrets: "Environment Variables (encrypted)"

recommendations:
  - Use platform-native secret management
  - Rotate keys quarterly
  - Monitor for key exposure in logs
  - Never commit secrets to version control
```

### Monitoring & Alerting
```sql
-- Security monitoring queries
SELECT COUNT(*) as suspicious_activity
FROM changesim_traces
WHERE event_type = 'error'
AND created_at > now() - interval '1 hour';
```

## 🧪 Research Data Governance

### IRB/Ethics Considerations
- **Informed Consent**: Users explicitly enable Research Mode
- **Minimal Risk**: No sensitive personal data collected
- **Beneficence**: Research benefits organizational well-being
- **Justice**: Insights shared publicly to benefit all organizations

### Data Sharing
```typescript
// Public research outputs (anonymized)
const researchFindings = {
  aggregatedPatterns: "Most common principle violations",
  frameworkEffectiveness: "Stress reduction measurement",
  organizationalInsights: "Change success patterns",

  // Never shared
  specificOrganizations: null,
  individualCases: null,
  identifiableData: null
}
```

### Academic Collaboration
- Anonymized datasets available for research partnerships
- All data sharing requires explicit organizational consent
- Research publications follow academic ethics standards
- Code and methodology remain open source

## 🔧 Technical Security Measures

### Database Security
```sql
-- Encryption at rest (Supabase default)
-- TLS 1.3 for data in transit
-- Automated backups with encryption
-- Geographic data residency controls
```

### Application Security
```typescript
// Security headers
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
}
```

### Dependency Security
```bash
# Regular security audits
npm audit
pnpm audit

# Automated dependency updates
dependabot: enabled
security-alerts: enabled
```

## 📞 Security Contact

### Reporting Security Issues
- **Email**: [security contact - add when available]
- **Response Time**: 48 hours for assessment
- **Disclosure**: Coordinated disclosure preferred

### Compliance Questions
For questions about data handling, privacy, or compliance:
1. Review this documentation
2. Check the public repository for implementation details
3. Contact for specific organizational requirements

---

## 🎯 Security Commitment

ChangeSim is committed to being a **trustworthy platform** for organizational research. We believe that security and transparency are essential for building systems that organizations can confidently use to improve their change management practices.

Our security model is designed to protect organizational data while enabling valuable research that benefits the broader community working on human-centered organizational change.