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

---

## ⚙️ Tech Stack

- **Framework**: Next.js App Router (15.x) with React 19 and TypeScript
- **UI**: Tailwind CSS 4, Radix UI, custom artifact components
- **AI Integration**: Vercel AI SDK (`ai`) with `@ai-sdk/openai` for structured object generation
- **Risk Logic**: Custom evaluator in `lib/evaluator.ts` maps model outputs to scoped risk levels
- **Deployment**: Optimized for Vercel (see badge), but runs locally with `pnpm dev`

---

## 🧠 Architecture Notes

- **API Route** (`app/api/analyze-impact/route.ts`): Handles validation, invokes `generateObject`, applies risk mapping, and returns a typed `ImpactResult` payload.
- **Client Form** (`components/impact/impact-form.tsx`): Collects user input and triggers analysis with `submitImpactAnalysis`.
- **Report Rendering** (`components/impact/impact-artifact.tsx`): Displays the structured response, including markdown summary, risk factors, decision trace, and sources.
- **Types & Schema** (`types/impact.ts`): Shared contracts ensuring the API and UI stay in sync.

---

## 🚀 Setup

### Prerequisites

- Node.js and pnpm installed
- OpenAI API key

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

3. **Configure OpenAI API**
   - Copy the example environment file:
     ```bash
     cp .env.local.example .env.local
     ```
   - Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Add your API key to `.env.local`:
     ```
     OPENAI_API_KEY=your_actual_api_key_here
     ```

4. **Start the development server**

   ```bash
   pnpm dev
   ```

5. _(Optional)_ **Run lint checks**
   ```bash
   pnpm lint
   ```

---

## 🤝 Contributing

This project is in **active exploration**. Feedback, issues, and ideas welcome.
