# ChangeSim – Impact Analysis Agent

> _Predict how organizational changes affect roles and teams_

[![Deployed on Fly.io](https://img.shields.io/badge/Deployed%20on-Fly.io-black?style=for-the-badge&logo=fly.io)](https://fly.io)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

---

## 📖 Overview

ChangeSim is an **AI-powered agent** that analyzes organizational changes and predicts their human impact.  
Instead of just mapping processes, ChangeSim highlights how shifts—like a new CRM rollout—may affect trust, training needs, and team resistance.

- **Input**: Role or team, plus a short description of the proposed change
- **Output**: Structured JSON that includes a markdown summary, normalized risk level, risk scoring dimensions, decision trace, and curated sources
- **Why it matters**: Leaders can anticipate challenges _before_ rollout and communicate with empathy.

> **🎯 Value for Leaders**
>
> ChangeSim helps leaders anticipate risks, protect trust, and guide teams through change with empathy.  
> By understanding human impact before implementation, you can prepare support systems, adjust timelines,  
> and communicate in ways that build confidence rather than resistance.

![Watch the demo](./demo.gif)

---

## 🛠️ How It Works

1. Enter a **role/team** and a **proposed change** in the sidebar form
2. The agent calls an OpenAI model through the [AI SDK](https://ai-sdk.dev/) using a strict Zod schema
3. The response is validated, risk-scored, and rendered as an interactive report artifact
   - Example: _“Sales team will need retraining on the new CRM, expect short-term productivity dips, schedule hands-on workshops to smooth adoption.”_

### Key Features

- Structured output with schema validation powered by `generateObject`
- Deterministic risk normalization via `mapRiskLevel`
- Decision trace and source links to explain model reasoning
- Copy-to-clipboard artifact optimized for distributing the report
- **Run logging and analytics** with session-based tracking and recent runs history

---

## ⚙️ Tech Stack

- **Framework**: Next.js App Router (15.x) with React 19 and TypeScript (strict mode)
- **UI**: Tailwind CSS 4, Radix UI, custom artifact components
- **AI Integration**: AI SDK (`ai`) with `@ai-sdk/openai` for structured object generation
- **Database**: Supabase with PostgreSQL for run logging, session tracking, and caching
- **Architecture**: Domain-driven folder structure with clear separation of concerns
  - `lib/ai/`: AI model configuration and prompts
  - `lib/business/`: Core business logic, risk evaluation, and data normalization
  - `lib/client/`: Browser-safe utilities and UI helpers
  - `lib/server/`: Server-only utilities (session management)
  - `lib/db/`: Database clients and queries
- **Risk Logic**: Multi-layered evaluation system with enum normalization, decision trace bounds, and guardrails
- **Testing**: Comprehensive test suite (90 tests) with domain-organized structure covering business logic, API integration, and UI components
- **Code Quality**: ESLint + Prettier with strict TypeScript and kebab-case naming conventions
- **Deployment**: Containerized with Docker (multi-stage builds), nginx reverse proxy, and deployed on Fly.io with auto-scaling
- **Security**: Comprehensive security headers, non-root execution, and secure error handling

---

## 🧠 Architecture Notes

### Core Components
- **API Route** (`app/api/impact-analysis/route.ts`): Handles validation, invokes `generateObject`, applies risk mapping with normalization and bounds checking, includes session-based caching
- **Client Form** (`components/impact-analysis/analysis-form.tsx`): Collects user input and triggers analysis with `submitImpactAnalysis`
- **Report Rendering** (`components/impact-analysis/analysis-report-artifact.tsx`): Displays structured response with copy-to-clipboard functionality
- **Types & Schema** (`types/impact-analysis.ts`): Shared contracts ensuring API and UI stay in sync

### Business Logic Layer
- **Risk Evaluation** (`lib/business/evaluator.ts`): Deterministic risk mapping with organizational guardrails
- **Enum Normalization** (`lib/business/normalize.ts`): Prevents silent fallbacks by normalizing schema enums to evaluator expectations
- **Decision Trace Bounds** (`lib/business/decision-trace.ts`): Prevents prompt drift by enforcing schema limits when system notes are added

### Data Persistence
- **Session-based Caching**: Reduces token costs by caching identical requests within sessions
- **Run Logging**: Full analysis runs stored in Supabase for analytics and debugging
- **Input Hashing**: Deterministic cache keys based on normalized inputs

### Risk Evaluation Logic

The system uses a hybrid approach with this evaluation flow:

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐    ┌─────────────────┐
│ AI Analysis │ ──▶│ Enum            │ ──▶│ Deterministic   │ ──▶│ Guardrails  │ ──▶│ Final           │
│             │    │ Normalization   │    │ Mapping         │    │ & Bounds    │    │ Classification  │
└─────────────┘    └─────────────────┘    └─────────────────┘    └─────────────┘    └─────────────────┘
    │                       │                      │                    │                    │
    │                       │                      │                    │                    │
    ▼                       ▼                      ▼                    ▼                    ▼
Contextual               Schema-to-           Business Rules         Scope Caps          Reliable
Risk Scoring            Evaluator            (mapRiskLevel)         Decision Trace      Risk Level
Dimensions              Alignment                                   Bounds              (Critical/High/
                        (normalize.ts)                              (decision-trace.ts) Medium/Low)
```

1. **AI Analysis**: GPT-4o-mini generates contextual risk scoring dimensions (scope, severity, human_impact, time_sensitivity)
2. **Enum Normalization**: `normalize.ts` aligns schema enums with evaluator expectations to prevent silent fallbacks
3. **Deterministic Mapping**: `mapRiskLevel()` function applies consistent business rules to ensure reliable risk classification
4. **Guardrails & Bounds**: Organizational scope caps, single-person limits, and decision trace bounds (`decision-trace.ts`) prevent over-classification and prompt drift
5. **Final Classification**: Produces a reliable risk level (Critical / High / Medium / Low)
   that leaders can use to anticipate impact and plan supportive actions.
   
---

## 🔐 API Authentication

ChangeSim implements a dual-mode authentication system:

### **Frontend Access (Same-Origin)**
- Web interface calls APIs without tokens
- Uses referer header validation for same-origin detection
- Seamless user experience with built-in security

### **External API Access**
- Requires API token via `Authorization: Bearer <token>` header
- Alternative `X-API-Key: <token>` header support
- Protects against unauthorized external usage

### **API Endpoints**
- **POST** `/api/impact-analysis` - Generate impact analysis (requires auth for external calls)
- **GET** `/health` - Application health status (requires auth for external calls)

---

## 🚀 Setup

### Prerequisites

- Node.js and pnpm installed
- OpenAI API key
- Supabase project with database access

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/agenisea/changesim-impact-analysis-agent.git
   cd changesim-impact-analysis-agent
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   - Copy the example environment file:
     ```bash
     cp .env.local.example .env.local
     ```
   - Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Set up your Supabase project and get credentials from [Supabase Dashboard](https://supabase.com/dashboard)
   - Add your keys to `.env.local`:
     ```
     OPENAI_API_KEY=your_actual_api_key_here
     SUPABASE_URL=your_supabase_project_url
     SUPABASE_KEY=your_supabase_service_role_key
     API_TOKEN=your_secure_api_token_here
     # Optional: Enable verbose debug logging (default: false)
     SHOW_DEBUG_LOGS=true
     ```

4. **Set up the database**
   - Run the SQL migration in your Supabase SQL Editor:
     ```bash
     # Copy the contents of database/supabase/changesim_impact_analysis.sql
     # and execute it in your Supabase SQL Editor
     ```
   - Or use the Supabase CLI:
     ```bash
     supabase db push
     ```

5. **Start the development server**

   ```bash
   pnpm dev
   ```

6. _(Optional)_ **Run quality checks**
   ```bash
   pnpm lint              # Check code style with ESLint
   pnpm format            # Format code with Prettier
   pnpm test              # Run comprehensive test suite including risk evaluation edge cases
   pnpm test:watch        # Run tests in watch mode during development
   pnpm build             # Build for production
   ```

## 🚀 Deployment to Fly.io

### Prerequisites

- [Fly CLI](https://fly.io/docs/flyctl/install/) installed and authenticated
- Docker installed locally (for testing)

### Deployment Steps

1. **Install and authenticate with Fly CLI**
   ```bash
   # Install Fly CLI (macOS)
   curl -L https://fly.io/install.sh | sh

   # Or using Homebrew
   brew install flyctl

   # Login to Fly.io
   fly auth login
   ```

2. **Launch your app** (one-time setup)
   ```bash
   fly launch --no-deploy
   ```
   This creates the app and generates `fly.toml` configuration.

3. **Set environment variables**
   ```bash
   fly secrets set OPENAI_API_KEY=your_openai_api_key_here
   fly secrets set SUPABASE_URL=your_supabase_project_url
   fly secrets set SUPABASE_KEY=your_supabase_service_role_key
   fly secrets set API_TOKEN=your_api_token_here
   fly secrets set SHOW_DEBUG_LOGS=false
   ```

4. **Deploy your application**
   ```bash
   fly deploy
   ```

5. **Open your deployed app**
   ```bash
   fly open
   ```

### Fly.io Configuration

The `fly.toml` file is configured with:
- **Resource allocation**: 1 shared CPU, 1GB memory
- **Auto-scaling**: Machines start/stop based on traffic
- **HTTPS**: Automatic SSL certificate management
- **Security**: Multi-stage Docker build with non-root user execution
- **API Authentication**: Token-based security for external API access

### Benefits of Fly.io Deployment

- **No cold starts**: Unlike serverless, your app stays warm
- **Better database connections**: Persistent connections to Supabase
- **Longer request timeouts**: No 10-second limit for embedding processing
- **Container flexibility**: Full control over the runtime environment
- **Global edge deployment**: Deploy close to your users

### Security & Reliability

The application implements multiple security layers:

- **Container Security**: Multi-stage Docker builds with non-root user execution
- **Process Isolation**: nginx runs as root for port 80 binding, Next.js as dedicated `nextjs` user
- **API Authentication**: Token-based security with same-origin detection for frontend calls
- **Error Handling**: Secure error responses that don't expose sensitive internal information
- **Data Privacy**: No sensitive data logged or exposed in API responses
- **Network Security**: Comprehensive security headers via nginx reverse proxy

### Troubleshooting

**Authentication Issues**
```bash
# Check if API_TOKEN is set correctly
fly secrets list

# Test API endpoint with token
curl -H "Authorization: Bearer YOUR_API_TOKEN" https://your-app.fly.dev/api/impact-analysis

# View application logs
fly logs
```

**Deployment Issues**
```bash
# View machine status
fly status

# Scale up if needed
fly scale count 1
```

**Container Issues**
```bash
# SSH into running machine for debugging
fly ssh console

# Restart the application
fly machine restart
```

**Database Connection Issues**
- Verify `SUPABASE_URL` and `SUPABASE_KEY` are set correctly
- Check Supabase project status and connection limits
- Ensure database schema is up to date with `changesim_impact_analysis.sql`

---

## License

This codebase is licensed under the **Business Source License 1.1 (BUSL-1.1)**.  
- ✅ Free for non-production, non-commercial use  
- 💼 All production or commercial use requires a license from **Resilient AI™**  
- ⏳ This grant has **no automatic conversion date**; the work will remain under BUSL indefinitely  

See [`LICENSE`](./LICENSE) for full terms and parameters.

---

## 🤝 Contributing

This project is in **active exploration**. Feedback, issues, and ideas welcome.
