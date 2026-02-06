# 🦅 DevOps Guardian

> **Your Autonomous Site Reliability Engineer (Release 1.0)**
>
> _Detects incidents, finds the root cause, writes the fix, and verifies it in a sandbox—all automatically._

<p align="center">
  <img src="https://img.shields.io/badge/Status-Beta-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/AI-Gemini%202.0%20Flash-purple?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Stack-Next.js%20%7C%20Node.js%20%7C%20Prisma-black?style=for-the-badge" />
</p>

---

## 🚀 What is DevOps Guardian?

DevOps Guardian is an autonomous AI agent that acts as a Tier-1 SRE. It connects to your infrastructure streams (AWS CloudWatch, Datadog), detects errors in real-time, and orchestrates a team of specialized AI agents to resolve incidents without human intervention.

Unlike standard monitoring tools that just _alert_ you, Guardian **fixes** the problem.

### The Autonomous Loop

1.  **👁️ Monitor**: Listens to live log streams and detects anomalies or errors.
2.  **🧠 RCA Agent**: Analyzes the stack trace and codebase to identify the root cause.
3.  **💊 Patch Agent**: Writes a code fix (patch) for the identified issue.
4.  **🧪 Verify Agent**: Spins up an isolated E2B sandbox to test the fix against the codebase.
5.  **✅ Resolve**: Creates a Pull Request and notifies your team via Slack.

---

## ✨ Key Features

### 🖥️ Unified Incident Command Center

- **Real-Time Terminal**: Watch the AI "think" and work in a hacker-style terminal interface.
- **Live Log Streaming**: See logs stream from your production servers with \<100ms latency.
- **Project Health**: At-a-glance status checks for all your repositories.

### 🤖 Specialized AI Agents

- **Pipeline Agent**: Automatically generates enterprise-grade CI/CD pipelines (Jenkins, GitHub Actions).
- **RCA Agent**: Deep code analysis using Gemini 2.0 Flash reasoning.
- **Patch Agent**: Context-aware code generation that respects your project's style.
- **Verifier Agent**: Runs "npm test" or custom verification scripts in a secure sandbox.

### 🛡️ Enterprise-Grade Security

- **AWS Secrets Manager Integration**: GitHub tokens and sensitive keys are never stored in plain text.
- **Role-Based Access**: Granular control over what the AI can and cannot do.
- **Approval Workflows**: Production fixes require explicit Slack/Dashboard approval. CI/CD fixes can be set to auto-merge.

### 💬 Deep Slack Integration

- **Interactive Notifications**: Approve or reject fixes directly from Slack.
- **Rich Reports**: Get detailed RCA reports and diff previews in your channel.
- **Threaded Updates**: Follow the investigation timeline in a single thread.

---

## 🛠️ Architecture

```mermaid
graph TD
    A[Log Source\n(AWS/Datadog)] -->|Webhook| B(API Gateway)
    B --> C{Log Ingestion}
    C -->|Detect Error| D[Orchestrator]

    subgraph "Autonomous Brain"
    D --> E[RCA Agent]
    E --> F[Patch Agent]
    F --> G[Verify Agent]
    end

    G -->|Success| H[GitHub PR]
    G -->|Fail| E

    D -->|Real-time Events| I[Socket.io Service]
    I --> J[Next.js Dashboard]

    D -->|Notifications| K[Slack Bot]
    K -->|Human Approval| D
```

---

## 💻 Tech Stack

- **Frontend**: Next.js 14, TailwindCSS, shadcn/ui, Framer Motion
- **Backend**: Node.js, Express, Socket.io
- **Database**: PostgreSQL, Prisma ORM
- **AI Core**: Google Gemini 2.0 Flash (via `@google/genai`)
- **Infrastructure**: AWS SDK (Secrets Manager), E2B (Sandboxing)

---

## 🚦 Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL
- GitHub Token (repo scope)
- Gemini API Key
- AWS Credentials (for Secrets Manager)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/your-org/devops-guardian.git
    cd devops-guardian
    ```

2.  **Install Dependencies**

    ```bash
    npm install
    ```

3.  **Environment Setup**
    Copy `.env.example` to `.env` and fill in your keys:

    ```env
    DATABASE_URL="postgresql://..."
    GEMINI_API_KEY="AIza..."
    AWS_ACCESS_KEY_ID="AKIA..."
    SLACK_BOT_TOKEN="xoxb-..."
    ```

4.  **Run Development Server**

    ```bash
    npx prisma generate
    npm run dev
    ```

5.  **Access Dashboard**
    Open `http://localhost:3000` to start onboarding your projects.

---

## 🧪 Testing

We include a chaotic simulation script to test the autonomous capabilities:

```bash
# Simulates a CI/CD build failure
npm run test:cicd <PROJECT_ID>
```

Watch the dashboard terminal as the AI detects the "error", analyzes it, and pushes a fix!

---

## 📄 License

MIT License © 2026 DevOps Guardian Team
