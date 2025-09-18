# ChangeSim – Impact Analysis Agent  

> *Predict how organizational changes affect roles and teams*  

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ppenasb-5242s-projects/v0-project1)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/projects/mBdJcC3KTRJ)

---

## 📖 Overview  

ChangeSim is an **AI-powered agent** that analyzes organizational changes and predicts their human impact.  
Instead of just mapping processes, ChangeSim highlights how shifts—like a new CRM rollout—may affect trust, training needs, and team resistance.  

- **Input**: Role/team + proposed change  
- **Output**: Plain-language impact notes (2–3 bullet points)  
- **Why it matters**: Leaders can anticipate challenges *before* rollout and communicate with empathy.  

<img width="1909" height="819" alt="image" src="https://github.com/user-attachments/assets/cda88502-c503-4585-b80c-47e0bcb45bd6" />

---

## 🛠️ How It Works  

1. Enter a **role/team** and a **proposed change**  
2. The agent calls an LLM via API with structured prompts  
3. Returns predicted human impacts as simple insights  
   - Example: *“Sales team may need retraining, expect resistance to leaving old CRM, plan training sessions for new features.”*  

---

## ⚙️ Tech Stack  

- **Frontend**: React + TypeScript (generated via [v0.app](https://v0.app))  
- **Agent Logic**: Calls the OpenAI API with structured prompts (requires API key)  
- **Infrastructure**: Auto-synced from v0 → GitHub for version control  
- **Hosting**: Currently local development; can be deployed to Vercel, or another host when ready  

⚠️ Note: No live deployment yet — this prevents unnecessary API usage charges.  

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

---

## 🤝 Contributing

This project is in **active exploration**. Feedback, issues, and ideas welcome.  