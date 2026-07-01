# Regal Student Companion

Your all-in-one academic workspace powered by **Regal Mail** authentication and **Regal AI**.

## Features

### Core
- **Dashboard** — Tasks, calendar, focus stats, engagement, Regal AI shortcuts
- **Tasks** — Kanban board with priorities and due dates
- **Calendar** — Schedule classes, deadlines, and study sessions
- **Dictionary** — Word lookup with saved bookmarks
- **Study Circles** — Real-time group chat
- **Leaderboard** — Engagement rankings
- **Focus Timer** — Pomodoro sessions with lo-fi ambient sound
- **Assignment Suite** — Regal AI scan, citations, essay guide, transcription, humanize
- **Regal AI Research Lab** — Notebook LM-style research workspace

### 20 Student Tools (`/tools`)
| Tool | Regal AI |
|------|----------|
| Flashcards | |
| Grade Calculator | |
| Exam Countdown | |
| Regal AI Study Planner | ✓ |
| Quick Notes + Summarize | ✓ |
| Bibliography Manager | ✓ |
| Regal AI Plagiarism Check | ✓ |
| Regal AI Math Solver | ✓ |
| Regal AI Language Tutor | ✓ |
| Regal AI Resume Builder | ✓ |
| Scholarship Tracker | |
| Study Streaks | |
| Class Schedule | |
| Reading List | |
| Regal AI Mind Map | ✓ |
| Regal AI Quiz Generator | ✓ |
| Wellness Log | |
| Budget Tracker | |
| Study Partner Match | |
| Regal AI Tutor | ✓ |

## Tech Stack

- Next.js 16 (App Router, dynamic imports, loading skeletons)
- Tailwind CSS 4
- Supabase (Regal Mail auth + database)
- Regal AI via Gemini (`GEMINI_API_KEY`)

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `@regalmail.me`.

Add `GEMINI_API_KEY` to `.env.local` for full Regal AI features.
