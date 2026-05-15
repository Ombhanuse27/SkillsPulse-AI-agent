# SkillPulse.ai — The Autonomous AI Career Architect 🚀

**SkillPulse.ai** is a production-grade, multi-agent platform designed to bridge the gap between your current experience and your dream role. It doesn't just analyze; it **architects** your growth through a coordinated neural engine that audits resumes, generates gamified learning missions, and simulates high-pressure technical interviews.

---

## 🧠 The Multi-Agent Neural Engine

SkillPulse utilizes a hybrid intelligence architecture, matching the processing logic to the complexity of the career task.

### 1. The Auditor (Resume Agent) — *Powered by LangChain*
**Goal:** High-precision document analysis and ATS optimization.
* **Context Hydration:** Merges raw PDF text with structured database records (Experiences, Skills, Projects) to build a 360-degree Candidate Profile.
* **Strict Scoring Algorithm:** Implements heuristic ceilings—if a candidate's experience is <50% of the JD requirement, the score is capped at 50% to ensure realistic feedback.
* **ATS Fixer:** Autonomously rewrites weak bullet points using the **Action-Verb + Metric + Result** formula for maximum recruiter impact.
* **Skill-Gap Extraction:** Generates a filtered JSON of technologies required by the JD but missing from the profile, which is passed directly to the Architect.

### 2. The Architect (Learning Agent) — *Powered by LangGraph*
**Goal:** Transforming skill gaps into actionable, autonomous research missions.
* **Adaptive Planning:** Detects time-boxed intent (e.g., "Master Docker in 3 days") and switches the graph state to **Intensive Mode**, prioritizing "Crash Course" resources over deep theory.
* **Autonomous Research (Tavily Loop):** Executes multi-step web scraping to find high-relevance YouTube videos, GitHub repos, and documentation for every milestone.
* **Knowledge Gating:** Implements the **S-A-B Progression Rule**. Milestones remain locked until the user passes an AI-generated technical test with a Grade B or higher.
* **Neural Mentor:** A sub-500ms streaming assistant providing real-time Q&A specific to the current active milestone context.

### 3. The Interviewer (Mock Agent) — *Powered by LangGraph*
**Goal:** Stress-testing skills through high-fidelity, voice-enabled simulation.
* **Technical Grammar Mapping:** Utilizes a custom technical vocabulary list to ensure Speech-to-Text accuracy for industry jargon like "ACID Properties" or "Kubernetes Pods."
* **Dynamic Pivot Logic:** Adjusts the difficulty and topic of the next question based on the score and sentiment of the user's previous response.
* **Live Evaluator:** Provides instant critique, confidence metrics, and a "Senior-Level Suggested Answer" after every turn.
* **Hiring Report:** Generates a comprehensive final analysis with a hiring recommendation (Strong Hire to No Hire).

---

## 🎮 Gamification & XP Economy

SkillPulse operates on a strict **XP Economy** to drive consistency and prevent "Tutorial Hell."

| Action | Reward / Cost | Impact |
| :--- | :--- | :--- |
| **Start Learning Mission** | `-100 XP` | Ensures users commit to the generated roadmap. |
| **Pass Milestone Test** | `+100 XP` | High-stakes validation required to unlock the next step. |
| **Retry Failed Test** | `-50 XP` | Penalty for guessing; encourages deep focus on resources. |
| **Neural Mentor Quiz** | `+25 XP` | Quick daily wins for active learning. |
| **Daily Streak** | `Bonus Multiplier` | Interactive "Fire" animations track habit consistency. |

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion, Redux Toolkit.
* **AI Orchestration:** LangChain (Linear Chains), LangGraph (Stateful Cycles), Groq (Llama 3.3 70B), Tavily Search.
* **API & Backend:** GraphQL (Yoga & Apollo), Next.js API Routes.
* **Database & ORM:** PostgreSQL (Supabase), Prisma ORM.
* **Infrastructure:** Docker, GitHub Actions (CI/CD), Supabase Auth.

---

## 🚀 Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/Ombhanuse27/SkillsPulse-AI-agent
    cd SkillPulse-AI-agent
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    Create a `.env` file:
    ```env
    GROQ_API_KEY=gsk_...
    TAVILY_API_KEY=tvly-...
    DATABASE_URL="postgresql://..."
    NEXT_PUBLIC_SUPABASE_URL="..."
    NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
    ```

4.  **Sync Database:**
    ```bash
    npx prisma db push
    ```

5.  **Run Development Server:**
    ```bash
    npm run dev
    ```

---

## 👤 Author
**Om Bhanuse**
*Full Stack Developer Intern | MERN & Next.js Specialist*
*Architecting Future Careers with AI.*