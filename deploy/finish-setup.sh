#!/usr/bin/env bash
# Finish Slow Draw VPS setup: DB schema, seed, reverse proxy hint, cron.
# Run on the server from the repo root:
#   cd ~/slow-draw && bash deploy/finish-setup.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT — copy deploy/.env.production.example first."
  exit 1
fi

# Load .env (simple KEY=VALUE lines)
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD missing in .env}"
: "${CRON_SECRET:?CRON_SECRET missing in .env}"
: "${NEXT_PUBLIC_APP_URL:=https://draw.kodbox.mx}"

DB_URL_HOST="postgresql://${POSTGRES_USER:-draw}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_HOST_PORT:-5433}/${POSTGRES_DB:-draw_game}"

echo "==> Waiting for Postgres on port ${POSTGRES_HOST_PORT:-5433}..."
for i in $(seq 1 30); do
  if sudo docker exec slow-draw-db pg_isready -U "${POSTGRES_USER:-draw}" -d "${POSTGRES_DB:-draw_game}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "==> Pushing DB schema..."
sudo docker run --rm \
  --network host \
  -v "$ROOT:/app" \
  -w /app \
  -e DATABASE_URL="$DB_URL_HOST" \
  node:22-bookworm-slim \
  bash -lc 'npm ci >/tmp/npm.log 2>&1 && yes | npx drizzle-kit push'

echo "==> Seeding word bank..."
sudo docker run --rm \
  --network host \
  -v "$ROOT:/app" \
  -w /app \
  -e DATABASE_URL="$DB_URL_HOST" \
  node:22-bookworm-slim \
  bash -lc 'npx tsx src/db/seed.ts'

echo "==> Checking reverse proxy..."
if command -v caddy >/dev/null 2>&1; then
  if [[ ! -f /etc/caddy/Caddyfile ]] || ! grep -q 'draw.kodbox.mx' /etc/caddy/Caddyfile 2>/dev/null; then
    echo "Add this to your Caddyfile and reload:"
    echo "-----"
    cat deploy/Caddyfile.draw.kodbox.mx
    echo "-----"
    echo "Then: sudo systemctl reload caddy"
  else
    echo "Caddy already mentions draw.kodbox.mx"
  fi
elif command -v nginx >/dev/null 2>&1; then
  if [[ ! -f /etc/nginx/sites-enabled/draw.kodbox.mx ]]; then
    echo "Installing nginx site for draw.kodbox.mx (HTTP only for now)..."
    sudo cp deploy/nginx.draw.kodbox.mx.conf /etc/nginx/sites-available/draw.kodbox.mx
    # Temporarily allow HTTP-only if certs missing
    sudo tee /etc/nginx/sites-available/draw.kodbox.mx >/dev/null <<'NGINX'
server {
    listen 80;
    server_name draw.kodbox.mx;

    client_max_body_size 8m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX
    sudo ln -sf /etc/nginx/sites-available/draw.kodbox.mx /etc/nginx/sites-enabled/draw.kodbox.mx
    sudo nginx -t && sudo systemctl reload nginx
    echo "HTTP proxy ready. For HTTPS later: sudo certbot --nginx -d draw.kodbox.mx"
  else
    echo "Nginx site already present"
  fi
else
  echo "No Caddy/Nginx found. App is on :3000 — install a reverse proxy for 80/443."
  echo "Example Caddyfile is in deploy/Caddyfile.draw.kodbox.mx"
fi

echo "==> Installing cron job for deadlines..."
CRON_LINE="* * * * * curl -fsS -H \"Authorization: Bearer ${CRON_SECRET}\" ${NEXT_PUBLIC_APP_URL}/api/cron/tick >/dev/null 2>&1"
( crontab -l 2>/dev/null | grep -v 'api/cron/tick' || true; echo "$CRON_LINE" ) | crontab -
echo "Cron installed:"
crontab -l | grep cron/tick

echo "==> Local smoke test..."
curl -fsS -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/ || true

echo ""
echo "Done."
echo "Also in Clerk dashboard, allow: ${NEXT_PUBLIC_APP_URL}"
echo "Open security group / firewall for ports 80 and 443 if the site times out from the internet."
