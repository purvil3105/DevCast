# DevCast — Deployment Guide (Free Tier / $0)

A step-by-step guide to deploying DevCast entirely on free tiers. The stack splits into
four deployables: **Postgres**, **Redis**, the **backend** (API + WebSocket servers), and
the **client** (static React build).

> **Scope note.** This is a portfolio project. The guide targets a $0 hobby deployment,
> not a hardened production rollout. The one piece that does **not** fit a free PaaS — the
> Docker code sandbox — is called out honestly in [§5](#5-code-sandbox-the-honest-caveat).

---

## Architecture recap

```
Client (Vercel/Netlify static)
   │  HTTPS + WSS
   ▼
API server (Render)  ── REST/Auth ──┐
WS server  (Render)  ── Socket.IO ──┤
                                    ├──► Postgres (Neon)
                                    └──► Redis (Upstash)   ◄── BullMQ AI worker
```

The backend runs as **two processes** from one repo:
- `npm run start:api -w server` → REST/Auth on port 3000
- `npm run start:ws -w server`  → Socket.IO on port 3001

---

## 0. Prerequisites

- A GitHub repo with this code pushed.
- Accounts (all free): [Neon](https://neon.tech), [Upstash](https://upstash.com),
  [Render](https://render.com), [Vercel](https://vercel.com) (or Netlify).
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier).

Use [`.env.example`](.env.example) as the source of truth for every variable below. The
root `.env` is loaded by the server; Vite variables must also be supplied to the client
build, either through the Docker build args or the hosting provider's client project.

---

## 1. Database — Neon (Postgres)

1. Create a Neon project → copy the **pooled** connection string.
2. Save it as `DATABASE_URL` (keep `?sslmode=require&pgbouncer=true`).
3. From your machine, push the schema and seed demo data:
   ```bash
   DATABASE_URL="<neon-url>" npm run db:push
   DATABASE_URL="<neon-url>" npm run db:seed
   ```
   `db:push` also creates the indexes defined in `schema.prisma`.

## 2. Redis — Upstash

1. Create an Upstash Redis database → copy the `rediss://` URL.
2. Save it as `REDIS_URL`. (BullMQ + Socket.IO adapter + rate limiting all use this.)

## 3. Backend — Render (two web services, one repo)

Create **two** Render web services from the same GitHub repo.

**Shared settings:**
- Build command: `npm ci && npm run db:generate -w server && npm run build -w server`
- Environment: set the server vars from `.env.example` — `DATABASE_URL`, `REDIS_URL`,
  `JWT_SECRET` (generate: `openssl rand -hex 32`), `INTERNAL_API_SECRET`
  (`openssl rand -hex 32`), `GEMINI_API_KEY`, `GEMINI_MODEL`, `NODE_ENV=production`,
  `CORS_ORIGIN` (your client URL), `WS_PUBLIC_URL` (your WS service URL, `wss://…`).

**Service A — API:**
- Start command: `npm run start:api -w server`

**Service B — WS:**
- Start command: `npm run start:ws -w server`

> `NODE_ENV=production` activates the config fail-fast checks: the server refuses to boot
> with a weak/default `JWT_SECRET` or a missing `INTERNAL_API_SECRET`. Set real secrets.

## 4. Client — Vercel (or Netlify)

1. Import the repo; set the project root to `client/`.
2. Build command: `npm run build` — output directory: `dist`.
3. Environment variables:
   - `VITE_API_URL` = your Render API URL (`https://…`)
   - `VITE_WS_URL`  = your Render WS URL (`wss://…`)
4. After the client deploys, set the backend's `CORS_ORIGIN` to the client URL and redeploy
   the API service.

## 5. Code sandbox — the honest caveat

The code-execution sandbox (`sandbox/`) runs each submission in a **Docker container**
(`docker run --network none …`). Free PaaS tiers (Render/Vercel/etc.) **do not provide a
Docker daemon inside the app container** (no Docker-in-Docker), so the sandbox can't run
there as-is.

Options, cheapest first:
1. **Local / demo only** — run the sandbox on your own machine (`npm run dev -w sandbox`)
   for demos; the deployed API points `SANDBOX_URL` at it via a tunnel (e.g. ngrok).
2. **Small self-hosted VM** — a free/low-cost VM (Oracle Cloud Always Free, Fly.io VM)
   with Docker installed; deploy the sandbox there and set `SANDBOX_URL` to it.
3. **Swap the isolation layer** (future work) — a hosted execution API (Judge0) or
   Firecracker microVMs. Out of scope for the free tier.

This is a deliberate, documented limitation of the $0 deployment — the rest of the app
(streaming, challenges, AI hints, leaderboard) runs fully on free tiers.

## 6. Media server (RTMP → HLS) — optional

`docker compose up rtmp` runs the nginx-rtmp media server locally for live streaming.
It authenticates broadcasters via the `on_publish` callback to `/api/streams/rtmp/auth`,
so point that callback at your deployed API (or keep the whole media pipeline local for
demos). Free PaaS tiers generally don't expose the RTMP port (1935), so treat live
ingestion as a local/self-hosted-VM concern like the sandbox.

---

## Deployment checklist

- [ ] Neon `DATABASE_URL` set; `db:push` + `db:seed` run
- [ ] Upstash `REDIS_URL` set
- [ ] Render API service up (`start:api`), strong `JWT_SECRET` + `INTERNAL_API_SECRET`
- [ ] Render WS service up (`start:ws`), `WS_PUBLIC_URL` set
- [ ] Client deployed; `VITE_API_URL` / `VITE_WS_URL` point at Render
- [ ] Backend `CORS_ORIGIN` = client URL
- [ ] Sandbox limitation understood (§5)

## Health checks and smoke test

After deployment, verify these endpoints before testing login:

```text
GET https://<api-host>/health       -> {"status":"ok"}
GET https://<ws-host>/health        -> {"status":"ok"}
GET https://<sandbox-host>/health   -> {"status":"ok","service":"sandbox"}
```

Then open the client, register a test account, log in, and confirm that a viewer can
load the streams page. Do not use the seeded demo password on a public deployment.
