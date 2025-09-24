# ChangeSim – Impact Analysis Agent

> _Predict how organizational changes affect roles and teams_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ppenasb-5242s-projects/v0-project1)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/mBdJcC3KTRJ)

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
2. The agent calls an OpenAI model through the [Vercel AI SDK](https://ai-sdk.dev/) using a strict Zod schema
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
- **AI Integration**: Vercel AI SDK (`ai`) with `@ai-sdk/openai` for structured object generation
- **Database**: Supabase with PostgreSQL for run logging, session tracking, and caching
- **Architecture**: Domain-driven folder structure with clear separation of concerns
  - `lib/ai/`: AI model configuration and prompts
  - `lib/business/`: Core business logic, risk evaluation, and data normalization
  - `lib/client/`: Browser-safe utilities and UI helpers
  - `lib/server/`: Server-only utilities (session management)
  - `lib/db/`: Database clients and queries
- **Risk Logic**: Multi-layered evaluation system with enum normalization, decision trace bounds, and guardrails
- **Testing**: Comprehensive test suite (89+ tests) with domain-organized structure covering business logic, API integration, and UI components
- **Code Quality**: ESLint + Prettier with strict TypeScript and kebab-case naming conventions
- **Deployment**: Optimized for Vercel (see badge), but runs locally with `pnpm dev`

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

## 🚀 Setup

### Prerequisites

- Node.js and pnpm installed
- OpenAI API key
- Supabase project with database access

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
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

---

## 🤝 Contributing

This project is in **active exploration**. Feedback, issues, and ideas welcome.
