# DevCollective

> **An AI-powered college learning and developer collaboration platform.**

DevCollective is a college-focused platform designed to help students learn, build projects, collaborate, ask questions, connect with mentors, and track their growth through **Reputation Points (REP)**.

---

## 🎯 Purpose

DevCollective brings the college developer community into one platform.

### Core goals

- Help students discover structured learning paths.
- Provide roadmaps for technical domains.
- Enable student-to-student collaboration.
- Connect students with mentors.
- Encourage students to build projects publicly.
- Reward meaningful contributions using **REP**.
- Provide branch and college-level leaderboards.
- Use AI for recommendations, resume analysis, and mentor matching.

---

## ✨ Main Features

### 👨‍🎓 Student

- Authentication and profile setup
- Learning-path selection
- Personalized dashboard
- Roadmaps
- Community discussions
- Ask questions
- Build in Public
- Reputation Points (REP)
- 6-level progression system
- Badges
- Daily streaks
- College and branch leaderboards
- Mentor discovery
- Notifications

### 🧑‍🏫 Mentor

- Mentor profile
- Student discovery
- Mentorship
- Mentor matching
- Community participation

### 🛠️ Admin

- Admin dashboard
- User management
- Mentor verification
- Community moderation
- Reputation management
- Platform analytics
- System controls

### 🤖 AI

Planned/implemented AI capabilities include:

- Learning recommendations
- Mentor matching
- Resume scanning
- Resume information extraction
- Confidence-based recommendations
- AI-assisted student guidance

---

# 🧱 Technology Stack

## Frontend

- React
- Tailwind CSS
- Framer Motion
- GSAP
- React Three Fiber
- Drei
- Three.js
- React Three Postprocessing

## Backend

- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Google OAuth
- Role-Based Access Control (RBAC)
- Socket.IO / WebSockets
- Redis

## AI Services

- Python
- FastAPI
- OpenAI / Gemini APIs
- Resume processing / document extraction

## Storage & Infrastructure

- AWS S3
- Docker
- GitHub Actions

---

# 📋 Prerequisites

Install the following before starting:

- **Node.js** 20+
- **npm** 10+
- **Git**
- **PostgreSQL**
- **Redis**
- **Python** 3.11+
- **Docker** (recommended)
- A GitHub account

Check your installations:

```bash
node --version
npm --version
git --version
python --version
docker --version
```

---

# 🚀 Getting Started

## 1. Clone the repository

```bash
git clone https://github.com/inputtext/DevCollective.git
cd DevCollective
```

---

## 2. Install frontend dependencies

From the frontend directory:

```bash
npm install
```

Core frontend packages used by the project include:

```bash
npm install react react-dom
npm install react-router-dom
npm install framer-motion
npm install gsap
npm install three @react-three/fiber @react-three/drei
npm install @react-three/postprocessing postprocessing
npm install tailwindcss
```

> **Important:** `package.json` is the source of truth for the exact frontend dependency versions. Do not reinstall packages that are already listed there unless a dependency is actually missing.

---

# 🔐 Authentication / Backend Dependencies

For the Node.js backend:

```bash
npm install express cors dotenv
npm install bcryptjs jsonwebtoken
npm install socket.io
npm install @prisma/client
```

Development dependency:

```bash
npm install -D prisma
```

If Google OAuth is enabled in the current backend, install the OAuth package used by the implementation rather than adding a second authentication library unnecessarily.

---

# 🗄️ Database

DevCollective uses **PostgreSQL** with **Prisma**.

After configuring the database connection:

```bash
npx prisma generate
```

Run migrations:

```bash
npx prisma migrate dev
```

Open Prisma Studio:

```bash
npx prisma studio
```

---

# 🤖 AI Service

The AI service is designed around **FastAPI**.

Create a Python environment:

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install the required Python packages used by the AI service:

```bash
pip install fastapi uvicorn python-dotenv
```

Install the AI SDK corresponding to the provider used by the implementation:

```bash
pip install openai
```

or:

```bash
pip install google-genai
```

Run the FastAPI service:

```bash
uvicorn main:app --reload
```

---

# 🔑 Environment Variables

Never commit real API keys, passwords, JWT secrets, database credentials, or OAuth secrets.

Create your local environment file:

```bash
.env
```

Use `.env.example` as the template.

Example:

```env
# Application
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/devcollective

# Authentication
JWT_SECRET=your_jwt_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# AI
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key

# Redis
REDIS_URL=redis://localhost:6379

# AWS
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
AWS_S3_BUCKET=your_bucket
```

Only add variables that are actually required by the current implementation.

---

# ▶️ Running the Project

The project may contain multiple services.

Typical development setup:

### Terminal 1 — Frontend

```bash
npm run dev
```

### Terminal 2 — Backend

```bash
npm run dev
```

### Terminal 3 — AI Service

```bash
uvicorn main:app --reload
```

### Terminal 4 — Redis

Run Redis locally or through Docker.

---

# 🐳 Docker

Docker can be used to run infrastructure consistently across the team.

Typical services:

- PostgreSQL
- Redis
- Backend
- AI service
- Frontend

Build:

```bash
docker compose build
```

Start:

```bash
docker compose up
```

Stop:

```bash
docker compose down
```

---

# 🌿 Git Workflow

DevCollective is developed collaboratively.

## Never work directly on `main`

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Example:

```bash
git checkout -b feature/community
```

Make changes:

```bash
git add .
git commit -m "feat: add community functionality"
```

Push:

```bash
git push -u origin feature/community
```

Then open a **Pull Request** into `main`.

### Recommended branch naming

```text
feature/<feature-name>
fix/<bug-name>
refactor/<area>
docs/<documentation>
chore/<maintenance>
```

---

# 📁 Project Architecture

The project is organized around separate application responsibilities.

```text
DevCollective/
│
├── frontend/              # React application
│
├── backend/               # Node.js + Express API
│
├── ai-service/            # FastAPI AI services
│
├── prisma/                # Database schema and migrations
│
├── public/                # Public/static assets
│
├── .env.example           # Environment variable template
├── .gitignore
├── docker-compose.yml
└── README.md
```

> Folder names should follow the actual repository structure. Update this section whenever the architecture changes.

---

# 🔒 Security Rules

**Never commit:**

```text
.env
.env.local
.env.production
API keys
JWT secrets
OAuth secrets
AWS credentials
Database passwords
Private certificates
User data
```

Use:

```text
.env.example
```

for variables that other developers need to configure locally.

---

# 🧠 Reputation System

DevCollective uses **REP (Reputation Points)**.

**XP is not used.**

REP can be awarded for meaningful platform activity such as:

- Helping other students
- Answering questions
- Completing learning activities
- Contributing to projects
- Participating in the community
- Mentoring

The platform uses **6 levels** for progression.

---

# 🏆 Leaderboards

Leaderboards are designed around the college environment.

Current concept:

- College leaderboard
- Branch leaderboard

The MVP is focused on the college community rather than a global ranking system.

---

# 🔄 Real-Time Features

Real-time functionality is planned around:

- Socket.IO
- WebSockets
- Notifications
- Community interactions
- Mentor/student communication
- Live updates where required

---

# 🧪 Development

Before creating a Pull Request:

```bash
npm run lint
npm run build
```

Run tests if available:

```bash
npm test
```

Always make sure the project builds successfully before merging.

---

# 🤝 Collaboration

DevCollective follows a Pull Request based workflow.

### Contribution flow

```text
main
 │
 ├── feature/auth
 │
 ├── feature/community
 │
 ├── feature/roadmap
 │
 └── feature/ai
       │
       ▼
   Pull Request
       │
       ▼
     Review
       │
       ▼
     main
```

Do not push unfinished experimental changes directly to `main`.

---

# 🗺️ Development Roadmap

### Phase 1 — Foundation

- Authentication
- User profiles
- Database
- Core dashboard
- Learning paths

### Phase 2 — Community

- Community posts
- Questions
- Build in Public
- REP system
- Badges
- Streaks

### Phase 3 — Mentorship

- Mentor directory
- Mentor verification
- Mentor matching
- Student/mentor communication

### Phase 4 — AI

- Recommendations
- Resume scanner
- AI mentor matching
- Confidence-based recommendations

### Phase 5 — Platform

- Admin dashboard
- Analytics
- Notifications
- Real-time features
- Performance and security improvements

---

# 📌 Project Status

**DevCollective is currently under active development.**

The architecture and feature set may change as the MVP evolves.

---

# 👥 Team

**Project:** DevCollective

**Target:** College developer community

**Repository:** https://github.com/inputtext/DevCollective

---

## 📄 License

Add the project's license here once the licensing decision has been finalized.
