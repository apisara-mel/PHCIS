#!/usr/bin/env bash
# Manual publish → https://bma-health.mih.co.th
# รันบน office-202 (หรือเครื่องที่ nginx/cloudflared เสิร์ฟ web root จริง)
#
# ใช้:
#   ./scripts/publish-uat-manual.sh                  # deploy run ล่าสุดที่สำเร็จ
#   ./scripts/publish-uat-manual.sh 31101665333     # ระบุ run id
#
# ปรับค่า (optional):
#   WEB_ROOT=/var/www/bma-health DEPLOY_URL=https://bma-health.mih.co.th ./scripts/publish-uat-manual.sh

set -euo pipefail

REPO="${REPO:-namonlims/bma.health}"
WEB_ROOT="${WEB_ROOT:-/var/www/bma-health}"
DEPLOY_URL="${DEPLOY_URL:-https://bma-health.mih.co.th}"
RUN_ID="${1:-}"

log() { printf '\033[36m[%s]\033[0m %s\n' "$(date '+%H:%M:%S')" "$*"; }
err() { printf '\033[31m[%s] ERROR:\033[0m %s\n' "$(date '+%H:%M:%S')" "$*" >&2; exit 1; }

command -v gh >/dev/null 2>&1 || err "ต้องมี gh CLI — brew install gh && gh auth login"
command -v rsync >/dev/null 2>&1 || err "ต้องมี rsync"

if [ -z "$RUN_ID" ]; then
  log "หา Deploy to production run ล่าสุดที่ success…"
  RUN_ID="$(gh run list -R "$REPO" --workflow="Deploy to production" --status=success -L 1 --json databaseId -q '.[0].databaseId')"
  [ -n "$RUN_ID" ] || err "ไม่พบ deploy run ที่สำเร็จ"
fi

SHA="$(gh run view "$RUN_ID" -R "$REPO" --json headSha -q .headSha)"
ARTIFACT="dist-${SHA}"
WORKDIR="$(mktemp -d /tmp/bma-publish-XXXXXX)"
trap 'rm -rf "$WORKDIR"' EXIT

log "ดาวน์โหลด artifact $ARTIFACT (run $RUN_ID)…"
gh run download "$RUN_ID" -R "$REPO" -n "$ARTIFACT" -D "$WORKDIR"

test -f "$WORKDIR/index.html" || err "artifact ไม่มี index.html"
EXPECTED="$(basename "$WORKDIR"/assets/index.*.js)"
log "bundle: $EXPECTED"

[ -d "$WEB_ROOT" ] || err "WEB_ROOT ไม่มี: $WEB_ROOT — ตั้ง WEB_ROOT=... ให้ตรง nginx root"

log "rsync → $WEB_ROOT/"
rsync -rlptvz "$WORKDIR"/ "$WEB_ROOT"/

log "ตรวจว่าเว็บเสิร์ฟ bundle ใหม่…"
for i in 1 2 3 4 5 6; do
  LIVE="$(curl -fsSL --max-time 30 "$DEPLOY_URL" | grep -oE 'index\.[a-f0-9]+\.js' | head -1 || true)"
  log "  ครั้งที่ $i: ${LIVE:-<ไม่เจอ>}"
  if [ "$LIVE" = "$EXPECTED" ]; then
    log "✅ publish สำเร็จ — $DEPLOY_URL เสิร์ฟ $EXPECTED"
    exit 0
  fi
  sleep 10
done

err "อัปโหลดแล้วแต่เว็บยังเสิร์ฟ bundle เก่า — เช็ค nginx root / purge Cloudflare cache"
