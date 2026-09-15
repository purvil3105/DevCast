# DevCast - Interactive Live Learning Platform

DevCast is an interactive live learning platform where instructors stream lectures and
trigger coding challenges during a session. Viewers solve challenges in the browser;
the sandbox runs submissions and an AI worker delivers contextual hints asynchronously.

This repository contains an MVP. For the recommended free-tier deployment, see
[DEPLOYMENT.md](DEPLOYMENT.md). The Docker Compose stack is the fastest way to run the
full system locally.

## Architecture (Phase 1 — MVP)

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                  │
│  Video Player (HLS.js) │ Monaco Editor │ Socket.IO Client │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────┐
│              SERVER (Express + Socket.IO)                 │
│  REST API │ WebSocket Events │ BullMQ AI Workers         │
└──────┬──────────┬──────────────────┬───────────────────┘
       │          │                  │
       ▼          ▼                  ▼
  PostgreSQL    Redis           Sandbox Service
   (Neon)     (Upstash)        (Port 4000)
```

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (optional — for local Postgres + Redis)
- A [Neon](https://neon.tech) account (free Postgres) — or Docker
- An [Upstash](https://upstash.com) account (free Redis) — or Docker

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your database URL, Redis URL, and Gemini API key
```

### 2. Choose local or managed dependencies
Sign up for free tiers:
- **Neon** → Create project → Copy connection string → Set `DATABASE_URL`
- **Upstash** → Create Redis → Copy URL → Set `REDIS_URL`

For local development with Docker:
```bash
docker compose up -d
# Use the Docker URLs in .env: localhost Postgres and Redis
```

For managed services, set `DATABASE_URL` and `REDIS_URL` to the Neon and Upstash URLs
in `.env` instead. Do not mix a Docker database URL with a managed Redis URL by accident.

### 3. Install & Setup Database

```bash
npm install
npm run db:push       # Push schema to database
npm run db:seed       # Seed demo data
```

### 4. Run everything

```bash
npm run dev
```

This starts three services concurrently:
| Service | Port | Description |
|---------|------|-------------|
| API server | 3000 | REST API and AI worker |
| WebSocket server | 3001 | Socket.IO events |
| Sandbox | 4000 | Code execution |
| Client  | 5173 | React frontend |

### 5. Open & Test

1. Open http://localhost:5173
2. Login with demo credentials:
   - **Instructor:** `instructor@devcast.io` / `password123`
   - **Viewer:** `viewer@devcast.io` / `password123`

### Test the Full Flow
1. Login as instructor → click a stream → click "Go Live"
2. Open another browser tab/incognito → login as viewer → join the same stream
3. As instructor: click a challenge button to trigger it
4. As viewer: write code in Monaco editor → click Submit
5. See test results appear instantly, then AI hint appears asynchronously

## Environment variables

Copy `.env.example` to `.env` and fill in the values for your chosen services. The
minimum required server values are `DATABASE_URL` and `JWT_SECRET`. For a complete
feature set, also configure `REDIS_URL`, `GEMINI_API_KEY`, and the three Cloudinary
variables. `INTERNAL_API_SECRET` is required when `NODE_ENV=production`.

The client only reads these build-time variables:

| Variable | Local default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000` | Public API origin |
| `VITE_WS_URL` | `ws://localhost:3001` | Public Socket.IO origin |

Never prefix a server secret with `VITE_`; Vite embeds those values in browser code.

## Production deployment

The supported split deployment is:

1. Postgres on Neon.
2. Redis on Upstash.
3. Two backend services from the root repository: API on port `3000` and WebSocket on
   port `3001`.
4. The client as a static Vite build on Vercel, Netlify, or equivalent.
5. The sandbox on a Docker-capable VM or a private local host. Public free PaaS
   instances generally cannot start the Docker containers required by `sandbox/`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for Render settings, health checks, secrets, and
the sandbox/media-server limitations. For a self-contained local stack:

```bash
docker compose up --build
```

Then open http://localhost and check `http://localhost:3000/health`.

## Project Structure

```
DevCast/
├── server/                 # Backend API + WebSocket
│   ├── prisma/             # Database schema + seed
│   └── src/
│       ├── api-server.ts   # REST API + AI worker
│       ├── ws-server.ts    # Socket.IO server
│       ├── config.ts       # Environment config
│       ├── lib/            # Prisma, Redis, Socket.IO clients
│       ├── routes/         # REST API endpoints
│       ├── services/       # Sandbox client, AI worker
│       └── middleware/     # Auth, rate limiting
├── sandbox/                # Code execution service
│   └── src/
│       ├── index.ts        # Express server
│       ├── runner.ts       # Code runner
│       └── preflight.ts    # Static analysis filter
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       ├── pages/          # Page views
│       ├── hooks/          # Socket.IO + state management
│       └── lib/            # API client
├── docker-compose.yml      # Full local stack
├── DEPLOYMENT.md           # Managed-service deployment guide
└── .env.example            # Environment template
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Monaco Editor, HLS.js, Socket.IO Client |
| Backend | Express, Socket.IO, Prisma ORM, BullMQ |
| Database | PostgreSQL (Neon) |
| Cache/Queue | Redis (Upstash) |
| AI | Google Gemini API |
| Auth | JWT + bcrypt |

## Phase 1 Scope

Built:
- JWT auth (register, login, token refresh)
- Stream CRUD with go-live/end lifecycle
- Challenge trigger → WebSocket broadcast to all viewers
- Code submission → sandbox execution → test results
- AI hint evaluation via BullMQ queue
- Gemini AI with circuit breaker + static hint fallback
- Rate limiting (submissions, challenges, hints)
- Server-synced challenge timer
- Monaco editor with language support
- HLS.js video player (wired for real streams)
- WebSocket reconnection with session snapshot

Not built (Phase 2):
- Multi-region / Kubernetes
- Event replay (reconnect uses full snapshot)
- CDN for video delivery
- Docker container sandbox isolation
- OAuth / social login
- Stream recording
- Analytics pipeline
