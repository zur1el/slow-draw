# Slow Draw

Async multiplayer draw-and-guess for friend groups. One person gets a secret prompt and draws; everyone else guesses in free text; the drawer ranks who was closest. Last place gets no points. Not live — each phase has a 4-hour deadline, and anyone can pause the session.

**Production URL:** [https://draw.kodbox.mx](https://draw.kodbox.mx)

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Clerk auth
- Postgres (Docker) + Drizzle ORM
- Web Push + PWA (installable)
- Cron via host crontab (or Vercel Cron)

## Local setup

1. Copy env file and fill values:

```bash
cp .env.example .env.local
```

2. Create a [Clerk](https://clerk.com) application and paste publishable + secret keys (`pk_test_…` / `sk_test_…`).

3. Start local Postgres:

```bash
docker compose up -d
```

Connection string: `postgresql://draw:draw@localhost:5433/draw_game`  
(host port **5433** so it doesn’t clash with Postgres on 5432)

4. Generate VAPID keys for push:

```bash
npm run vapid
```

5. Set `CRON_SECRET` and `NEXT_PUBLIC_APP_URL=http://localhost:3000`.

6. Install, push schema, seed words:

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Deploy on kodbox VPS (`draw.kodbox.mx`)

### 1. DNS

Point `draw.kodbox.mx` A/AAAA record to your VPS IP.

### 2. Clerk

In the Clerk dashboard, add `https://draw.kodbox.mx` to allowed origins / redirect URLs (sign-in, sign-up, after-auth).

### 3. Env on the server

```bash
git clone <your-repo> slow-draw && cd slow-draw
cp deploy/.env.production.example .env
# edit .env — strong POSTGRES_PASSWORD, real Clerk + VAPID keys, CRON_SECRET
# NEXT_PUBLIC_APP_URL=https://draw.kodbox.mx
```

### 4. Build & run app + db

```bash
docker compose -f docker-compose.prod.yml up -d --build
# If that fails (old Docker), try:
#   docker-compose -f docker-compose.prod.yml up -d --build
# Or install the plugin:
#   sudo apt update && sudo apt install docker-compose-plugin
```

This starts Postgres and the Next.js app on host port **3000**.

### 5. Database schema + word bank

From your laptop (or the VPS) against the published DB port, or temporarily:

```bash
DATABASE_URL=postgresql://draw:YOUR_PASSWORD@127.0.0.1:5433/draw_game npm run db:push
DATABASE_URL=postgresql://draw:YOUR_PASSWORD@127.0.0.1:5433/draw_game npm run db:seed
```

### 6. Reverse proxy + HTTPS

**Caddy** (auto HTTPS) — merge [`deploy/Caddyfile.draw.kodbox.mx`](deploy/Caddyfile.draw.kodbox.mx) into your Caddyfile and reload.

**Nginx** — use [`deploy/nginx.draw.kodbox.mx.conf`](deploy/nginx.draw.kodbox.mx.conf) and Certbot for TLS.

### 7. Cron (deadlines + push reminders)

Vercel cron won’t run on the VPS. Add a host crontab:

```bash
* * * * * curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://draw.kodbox.mx/api/cron/tick >/dev/null
```

## Play loop

1. Sign in → create a group → share the invite code.
2. When a second player joins, the first round starts automatically.
3. Drawer sketches the secret prompt and submits.
4. Others guess within 4 hours.
5. Drawer ranks guesses (or marks “nobody got it”).
6. Scores update and the next drawer is rotated in.

Pause freezes the current phase timer so nobody is penalized while the group is away.

## Notifications

Open **Settings** and enable notifications. You’ll get pushes when it’s your turn to draw, a drawing is ready, ranking is needed, or a deadline is ~30 minutes away.

**iOS:** Share → Add to Home Screen (Web Push needs the installed PWA on iOS 16.4+).

## Scoring (defaults)

Configured in `src/lib/config.ts`:

- Guesser rank `r` of `N`: `max(0, N - r) × 10` (last place = 0)
- Drawer: `K × 10` where `K` is understood guesses (ranks 1…N−1), or **−15** if nobody got it
- Draw timeout skip: **−10**

## Play hours (v2)

Per-player availability calendars are intentionally deferred.
