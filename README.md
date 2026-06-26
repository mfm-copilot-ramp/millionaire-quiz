# Millionaire Quiz 🎯

A **live, host-driven multiplayer quiz** — think *Who Wants to Be a Millionaire?* meets
Kahoot. A host creates reusable question sets, runs a live session, and players join from
their phones with a code + nickname. Everyone answers the same question against a shared,
server-authoritative countdown, and scores **accumulate across every session of a game**.

Originally a Microsoft Dataverse "ERP Millionaire" solution, rebuilt as a public, free-to-host
web app.

---

## Features

- **Host accounts** (email + password) so question sets, games, and scores persist.
- **Reusable question sets** with six question formats:
  | Type | Description |
  | --- | --- |
  | `MULTIPLE_CHOICE` | Single correct answer, 2–6 options (default 4) |
  | `TRUE_FALSE` | Two fixed options |
  | `MULTIPLE_SELECT` | "Select all that apply" (all-or-nothing by default) |
  | `SHORT_TEXT` | Typed answer matched against accepted answers (normalized) |
  | `NUMERIC` | Numeric answer within a tolerance |
  | `POLL` | No correct answer — just shows the live distribution |
- **Two scoring modes**, each with **preset** or **custom** values:
  - **Weighted** — every answer carries its own point value.
  - **Escalating** — one correct answer per question; value climbs Q1 → Qn.
  - Optional **speed bonus** for fast correct answers.
- **Live gameplay** — shared timer, answer locking, live answer counts, reveal with answer
  distribution, and a running leaderboard.
- **Cumulative leaderboard** — scores roll up across all sessions of a game, by nickname.
- **Reconnection-friendly** — players can drop and rejoin; the server stays authoritative.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Socket.IO** for realtime, hosted by a **custom Node server** (`server.ts`) alongside Next
- **Prisma ORM** — SQLite for local dev, PostgreSQL for production
- **Tailwind CSS v4** for the millionaire-themed UI
- **Vitest** for unit tests (scoring, question forms, game config, cumulative leaderboard)

> Because the app needs a persistent WebSocket process, it is **not** a serverless/Vercel
> deployment — it runs as a long-lived Node container/web service.

---

## Architecture

```mermaid
flowchart LR
  Host[Host presenter view] -- host:* --> S((Socket.IO server))
  P1[Player phone] -- player:* --> S
  P2[Player phone] -- player:* --> S
  S -- state / timer --> Host
  S -- state / timer --> P1
  S -- state / timer --> P2
  S --> DB[(Prisma · SQLite/Postgres)]
```

The server owns the clock: it starts a question, ticks a countdown, locks answers at the
deadline (or when everyone has answered), scores with a pure scoring engine, persists
responses, and broadcasts personalized state to each client. Clients only render what
they're sent — they never decide timing or correctness.

- **Realtime engine:** `src/server/game-engine.ts` (one in-memory `Room` per session)
- **Event protocol:** `src/server/events.ts` (shared by server and client)
- **Host socket auth:** short-lived JWT minted server-side (`src/lib/socket-token.ts`)
- **Scoring (pure, tested):** `src/lib/scoring.ts`
- **Cumulative rollup (pure, tested):** `src/lib/cumulative.ts`

---

## Local development

**Prerequisites:** Node.js 20+.

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
#   The defaults work out of the box (SQLite + a dev JWT secret).

# 3. Create the local SQLite database and seed demo data
npm run db:push
npm run db:seed

# 4. Start the dev server (Next + Socket.IO with hot reload)
npm run dev
```

Open <http://localhost:3000>.

**Demo host account** (from the seed):

- **Email:** `host@example.com`
- **Password:** `password123`

It comes with a 5-question ERP set (one of every scoring-relevant type) and a demo game.

### Try a full game locally

1. Sign in as the demo host and open a game → **Start session**. You get a join code.
2. In another browser / incognito window / your phone, go to `/join/<CODE>`, pick a nickname.
3. Back on the host screen, click **Start quiz** and drive the game with the primary button
   (Reveal → Next → … → Finish). Players answer on their own screens.
4. After the game, open **Leaderboard** to see cumulative scores across sessions.

---

## npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server (Next + Socket.IO, hot reload) |
| `npm run build` | Production build |
| `npm start` | Run the production server (`NODE_ENV=production`) |
| `npm test` | Run the Vitest unit suite |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync the Prisma schema to the database |
| `npm run db:seed` | Seed the demo host, question set, and game |
| `npm run use:postgres` / `use:sqlite` | Switch the Prisma datasource provider |

---

## Deploy — fully free

The app is a persistent Node process with WebSockets, so deploy it as a **web service /
container**, not a static site. The zero-cost stack below needs no credit card.

### Option A — Render + Neon (recommended)

1. **Database:** create a free Postgres at **[Neon](https://neon.tech)** and copy the
   connection string (it looks like `postgresql://user:pass@host/db?sslmode=require`).
2. **App:** push this repo to GitHub, then in **[Render](https://render.com)** choose
   **New → Blueprint** and select the repo. The committed [`render.yaml`](./render.yaml)
   provisions a free web service.
3. When prompted, paste the Neon string as **`DATABASE_URL`**. `JWT_SECRET` is generated
   automatically.
4. Deploy. The build switches Prisma to Postgres, pushes the schema, and builds the app.

> **Free-tier note:** the service spins down after ~15 minutes idle and wakes in ~50s.
> Open the host page first to wake it, then share the join code.

To seed demo data on the hosted DB (optional), run `npm run db:seed` once with the
production `DATABASE_URL` exported in your shell.

### Option B — Docker (any container host)

A [`Dockerfile`](./Dockerfile) is included and works on Render (Docker), Azure Container
Apps, Fly.io, etc.

```bash
docker build -t millionaire-quiz .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" \
  -e JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")" \
  millionaire-quiz
```

The container pushes the schema to the database on boot, then starts the server.

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string in production (SQLite `file:./dev.db` for dev) |
| `JWT_SECRET` | ✅ | Long random secret used to sign host session + socket tokens |
| `PORT` | — | Defaults to `3000` |
| `HOST` | — | Defaults to `0.0.0.0` |
| `SOCKET_CORS_ORIGIN` | — | Allowed Socket.IO origin; set to your domain in production |

---

## Project structure

```
server.ts                     Custom server: Next.js + Socket.IO
prisma/
  schema.prisma               8 models, 4 enums (provider switched for prod)
  seed.ts                     Demo host, question set, game
src/
  app/                        App Router pages
    (host)/                   Auth-gated host area (dashboard, sets, games, sessions)
    join/[code]/              Player join-by-code
    play/[code]/              Player live game screen
  components/                 UI + realtime client (host-stage, play-stage, hooks)
  lib/                        Auth, db, scoring, game-config, cumulative, etc.
  server/                     Socket.IO engine + shared event protocol
```

---

## Testing

```bash
npm test          # unit tests
npm run typecheck # types
npm run lint      # lint
npm run build     # production build
```

The unit suite covers the pure logic that matters most: the scoring engine (both modes,
all question types, speed bonus, text normalization), question-form parsing, game-config
serialization, and the cumulative leaderboard rollup.
