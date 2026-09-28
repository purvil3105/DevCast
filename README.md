# DevCast — Interactive Live Learning & Creator Studio Platform

DevCast is an interactive live broadcasting platform built for developer education. Instructors stream coding sessions via RTMP (e.g. OBS Studio) and trigger live programming challenges directly inside the stream room. Viewers watch with sub-second HLS playback, solve challenges in an integrated Monaco editor, and receive instant sandbox test feedback alongside asynchronous AI-powered hints.

Instructors get a dedicated **Creator Studio** — a lightweight real-time analytics and monitoring cockpit that tracks peak concurrent viewers, live stream telemetry, and per-challenge submission solve rates without requiring external analytics pipelines.

---

## Key Features

- **Live RTMP & HLS Video Pipeline**: Broadcasters stream via OBS or any RTMP encoder to an integrated Nginx media server. Streams are authenticated via webhook callbacks (`on_publish`) and automatically finalized when broadcasters disconnect (`on_publish_done`). Viewers receive chunked HLS playback with automatic player state teardown.
- **Instructor Creator Studio**:
  - **Studio Overview (`/studio`)**: Channel-wide reach metrics (all-time streams, cumulative peak views, average concurrent viewers, total learner submissions), active stream telemetry, and recent broadcast sessions.
  - **Live Monitor Panel**: Real-time WebSocket telemetry for on-air streams: live concurrent viewer counters, ticking duration stopwatch, chat message velocity, and incoming submission counters, with automatic standby mode when offline.
  - **Stream History Table (`/studio/streams`)**: Searchable, filterable (All, Live, Scheduled, Ended), and paginated audit of all past and upcoming broadcasts with peak viewer stats and challenge counts.
  - **Per-Stream Detail View (`/studio/streams/:id`)**: Comprehensive breakdown of single-stream performance, overall solve rate, and per-challenge performance cards (submissions, passed/failed, solve rate %, and average execution times).
  - **Efficient Peak Tracking**: In-memory WebSocket counter with conditional, non-blocking DB flushing (`prisma.stream.updateMany` with `{ peakViewers: { lt: count } }`).
- **Interactive In-Stream Challenges**:
  - Instructors launch live coding challenges with synchronized countdown timers.
  - Viewers write code in a browser-based Monaco editor with multi-language syntax support (JavaScript, TypeScript, Python, etc.).
  - Real-time test runner lets learners test locally before submitting their final solution.
- **AI-Powered Test Generation & Evaluation**:
  - **Gemini Test Generation**: Instructors can auto-generate comprehensive edge-case test suites and starter code based on problem descriptions.
  - **Asynchronous AI Hints**: BullMQ background workers dispatch code submissions to Google Gemini to produce targeted, contextual hints without spoiling full solutions.
- **Isolated Code Sandbox**:
  - Dedicated runner service evaluates submissions against test cases with execution time limits and memory boundaries.
- **Role-Based Experience**:
  - **Instructors**: Teaching Cockpit dashboard, Creator Studio analytics, and stream broadcasting controls.
  - **Viewers**: Learner Home dashboard, live problem catalog (`/challenges`), and session/global leaderboards (`/leaderboards`).
- **First-Class Dual Theme**:
  - Precision dark mode (default) and clean light mode powered by semantic CSS custom properties and Geist/Inter/JetBrains Mono typography.

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │             OBS / RTMP Broadcaster           │
                      └──────────────────────┬───────────────────────┘
                                             │ RTMP (port 1935)
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          Nginx RTMP Media Server             │
                      │  - RTMP Stream Ingest (1935)                 │
                      │  - HLS Fragment Delivery (8080)              │
                      │  - on_publish / on_publish_done webhooks     │
                      └──────┬───────────────────────────────┬───────┘
                             │                               │
                Auth / Done  │ Webhooks                      │ HLS Stream
                             ▼                               ▼
┌──────────────────────────────────────────────┐    ┌────────────────────────────────────────┐
│               API & WS BACKEND               │    │           CLIENT (React + Vite)        │
│  - REST API (Port 3000): Auth, Studio, VOD   │    │  - VideoPlayer (HLS.js auto-teardown)  │
│  - WebSocket (Port 3001): Telemetry, Chat    │◄───┤  - Monaco Editor + Live Test Runner    │
│  - BullMQ: Asynchronous Gemini AI Worker     │    │  - Creator Studio (Telemetry & Stats)  │
└──────┬──────────────────────┬────────────────┘    │  - Role-specific Navigation & Themes   │
       │                      │                     └────────────────────────────────────────┘
       ▼                      ▼
┌──────────────┐      ┌──────────────┐              ┌────────────────────────────────────────┐
│  PostgreSQL  │      │    Redis     │              │             SANDBOX SERVICE            │
│ (Neon/Docker)│      │(Upstash/Dock)│              │  - Code execution runner (Port 4000)   │
└──────────────┘      └──────────────┘              └────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Monaco Editor, HLS.js, Socket.IO Client, Lucide Icons |
| **Backend API** | Node.js, Express, TypeScript, Prisma ORM, BullMQ, JWT, Bcrypt |
| **WebSocket Engine** | Socket.IO with Redis Adapter & Redis Emitter (horizontal scalability) |
| **Media / Streaming** | Nginx RTMP Module (HLS chunking, `on_publish` auth, `on_publish_done` auto-end) |
| **Code Sandbox** | Node.js isolated execution runner service (port 4000) |
| **Database** | PostgreSQL (Neon serverless or local Docker) |
| **Cache & Queue** | Redis 7 (Upstash or local Docker) |
| **AI Evaluation** | Google Gemini API (`gemini-1.5-flash` / `gemini-3.6-flash`) |

---

## Project Structure

```
DevCast/
├── client/                     # Frontend React + Vite application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── dashboard/      # Role-specific dashboards (Instructor & Viewer)
│   │   │   ├── studio/         # Creator Studio components (StatCard, LiveMonitor, StreamTable, ChallengeBreakdown)
│   │   │   ├── ui/             # Core design tokens (Badge, StatCard, EmptyState, SectionHeading)
│   │   │   └── VideoPlayer.tsx # HLS.js player with stream-end overlay and auto-teardown
│   │   ├── pages/              # Application routes
│   │   │   ├── studio/         # CreatorStudioLayout, StudioOverview, StreamHistory, StreamDetail
│   │   │   ├── HomePage.tsx    # Role-based dashboard dispatcher
│   │   │   ├── StreamPage.tsx  # Broadcast console & viewer live room
│   │   │   ├── ChallengesPage.tsx  # Viewer practice problem catalog
│   │   │   └── LeaderboardsPage.tsx# Standings & challenge leaderboards
│   │   ├── hooks/              # useSocket, useStreamState
│   │   └── lib/                # api.ts client, format helpers
├── server/                     # Backend API & WebSocket servers
│   ├── prisma/                 # schema.prisma & seed.ts
│   └── src/
│       ├── api-server.ts       # Express REST API & AI worker bootstrapper
│       ├── ws-server.ts        # Dedicated Socket.IO WebSocket server
│       ├── routes/
│       │   ├── studio.ts       # Creator Studio analytics & metrics endpoints
│       │   ├── streams.ts      # Stream CRUD, lifecycle & RTMP auth/done callbacks
│       │   ├── challenges.ts   # Challenge creation & AI test case generation
│       │   ├── submissions.ts  # Code execution & final submissions
│       │   └── auth.ts         # User registration & JWT authentication
│       ├── services/           # ai-worker.ts, sandbox.ts
│       └── lib/                # prisma, redis, socket helpers
├── media-server/               # Nginx RTMP container configuration
│   ├── nginx.conf              # Local dev RTMP + HLS configuration
│   └── nginx.prod.conf         # Production RTMP configuration
├── sandbox/                    # Isolated code evaluation service (Port 4000)
├── docker-compose.yml          # Full multi-container development environment
└── DEPLOYMENT.md               # Production deployment guide
```

---

## Getting Started

### Prerequisites
- **Node.js**: v20 or higher
- **Docker**: For running Postgres, Redis, and the RTMP media server locally

### 1. Clone & Configure Environment

```bash
git clone https://github.com/your-username/DevCast.git
cd DevCast
```

Copy `.env.example` to root and `server/.env`:
```bash
cp .env.example .env
cp .env.example server/.env
```

Ensure `.env` contains:
```env
DATABASE_URL="postgresql://devcast:devcast_dev@localhost:5432/devcast"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="devcast-dev-secret-change-in-production"
INTERNAL_API_SECRET="dev-internal-secret-change-me"
GEMINI_API_KEY="your-google-gemini-api-key"
GEMINI_MODEL="gemini-1.5-flash"
PORT=3000
WS_PORT=3001
VITE_API_URL="http://localhost:3000"
VITE_WS_URL="ws://localhost:3001"
```

### 2. Start Infrastructure Containers

Start PostgreSQL, Redis, and the RTMP media server:
```bash
docker compose up -d postgres redis rtmp
```

### 3. Initialize Database & Seed

```bash
# Push Prisma schema to Postgres
npm run db:push -w server

# Seed database with demo instructor, viewers, courses, and challenges
npm run db:seed -w server
```

### 4. Run Development Stack

Run all services concurrently (API, WebSocket, Sandbox, and Client):
```bash
npm run dev
```

| Service | Address | Description |
|---|---|---|
| **Client Frontend** | `http://localhost:5173` | React web application |
| **API Server** | `http://localhost:3000` | REST API, Creator Studio routes & AI worker |
| **WebSocket Server**| `ws://localhost:3001` | Socket.IO room telemetry & events |
| **Code Sandbox** | `http://localhost:4000` | Code execution sandbox service |
| **RTMP Ingestion** | `rtmp://localhost:1935/live` | OBS Studio broadcast endpoint |
| **HLS Stream Origin**| `http://localhost:8080/hls` | Nginx HTTP Live Streaming fragments |

---

## Demo Credentials

| Role | Email | Password | Available Features |
|---|---|---|---|
| **Instructor** | `instructor@devcast.io` | `password123` | Teaching Cockpit, Creator Studio, Broadcast Controls, Challenge Triggering, AI Test Gen |
| **Viewer** | `viewer@devcast.io` | `password123` | Learner Dashboard, Live Streams, Monaco Editor, Practice Challenges, Leaderboard |

---

## Streaming with OBS Studio

1. Log in as **Instructor** (`instructor@devcast.io`).
2. Go to **Dashboard** or **Creator Studio** and click **Create Stream** (or open an existing scheduled stream).
3. Copy your unique **Stream Key** from the stream room console.
4. Open **OBS Studio**:
   - Go to **Settings &rarr; Stream**.
   - **Service**: Custom...
   - **Server**: `rtmp://localhost:1935/live`
   - **Stream Key**: *(Paste your stream key)*
5. Click **Start Streaming** in OBS.
6. The Nginx media server validates your key with DevCast API via `on_publish` and begins writing HLS chunks.
7. Click **Go Live** on the DevCast console to notify all connected viewers.
8. When finished, clicking **End Stream** or stopping OBS automatically tears down playback and marks the session as `ENDED`.

---

## Production Deployment

For full cloud deployment instructions (PostgreSQL on Neon, Redis on Upstash, Dockerized RTMP, and static frontend on Vercel/Netlify), refer to **[DEPLOYMENT.md](DEPLOYMENT.md)**.
