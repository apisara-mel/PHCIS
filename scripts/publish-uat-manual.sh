#!/usr/bin/env bash
# Manual publish → https://PHCIS.mih.co.th
# รันบน office-202 (หรือเครื่องที่ nginx/cloudflared เสิร์ฟ web root จริง)
#
# ดึงของจาก GitHub Release tag `uat-latest` — ไม่ใช่ Actions artifact อีกแล้ว
# (artifact โควตาเต็มจน deploy fail ติดกัน 15 ครั้ง 14–25 ส.ค. 2569 ดูเหตุผลเต็ม
#  ในหัวไฟล์ .github/workflows/deploy.yml)
#
# payload แยก 2 ก้อน:
#   app.tar.gz    ~15MB  เปลี่ยนทุก build — ดึงทุกครั้ง
#   media.tar.gz  ~159MB แทบไม่เปลี่ยน — ดึงเฉพาะตอน media.sha ต่างจากที่ลงไว้
#                        (จำ sha ไว้ที่ $WEB_ROOT/.media.sha)
#
# ใช้:
#   ./scripts/publish-uat-manual.sh              # ดึง release ล่าสุดมา publish
#   FORCE_MEDIA=1 ./scripts/publish-uat-manual.sh   # บังคับลง media ใหม่
#
# ปรับค่า (optional):
#   WEB_ROOT=/var/www/bma-health DEPLOY_URL=https://PHCIS.mih.co.th ./scripts/publish-uat-manual.sh

set -euo pipefail

REPO="${REPO:-namonlims/bma.health}"
TAG="${TAG:-uat-latest}"
WEB_ROOT="${WEB_ROOT:-/var/www/bma-health}"
DEPLOY_URL="${DEPLOY_URL:-https://PHCIS.mih.co.th}"
FORCE_MEDIA="${FORCE_MEDIA:-}"

log() { printf '\033[36m[%s]\033[0m %s\n' "$(date '+%H:%M:%S')" "$*"; }
err() { printf '\033[31m[%s] ERROR:\033[0m %s\n' "$(date '+%H:%M:%S')" "$*" >&2; exit 1; }

command -v gh >/dev/null 2>&1 || err "ต้องมี gh CLI — brew install gh && gh auth login"
command -v rsync >/dev/null 2>&1 || err "ต้องมี rsync"
[ -d "$WEB_ROOT" ] || err "WEB_ROOT ไม่มี: $WEB_ROOT — ตั้ง WEB_ROOT=... ให้ตรง nginx root"

WORKDIR="$(mktemp -d /tmp/bma-publish-XXXXXX)"
trap 'rm -rf "$WORKDIR"' EXIT

log "อ่านข้อมูล build จาก release $TAG…"
gh release download "$TAG" -R "$REPO" -p 'BUILD.txt' -D "$WORKDIR" --clobber \
  || err "ไม่พบ release $TAG — สั่ง publish ก่อน: gh workflow run \"Deploy to production\" --ref main"

# BUILD.txt เป็น key=value บรรทัดละคู่ (sha / bundle / ref / run_id)
SHA="$(grep '^sha=' "$WORKDIR/BUILD.txt" | cut -d= -f2)"
EXPECTED="$(grep '^bundle=' "$WORKDIR/BUILD.txt" | cut -d= -f2)"
log "build ${SHA:0:7} · bundle $EXPECTED"

# ── media: ดึงเฉพาะตอนเปลี่ยน ────────────────────────────────────────────
NEED_MEDIA=0
if gh release download "$TAG" -R "$REPO" -p 'media.sha' -D "$WORKDIR" --clobber >/dev/null 2>&1; then
  NEW_MEDIA_SHA="$(cat "$WORKDIR/media.sha")"
  CUR_MEDIA_SHA="$(cat "$WEB_ROOT/.media.sha" 2>/dev/null || echo none)"
  if [ -n "$FORCE_MEDIA" ]; then
    NEED_MEDIA=1; log "FORCE_MEDIA — จะลง media ใหม่"
  elif [ "$NEW_MEDIA_SHA" != "$CUR_MEDIA_SHA" ]; then
    NEED_MEDIA=1; log "media เปลี่ยน (${CUR_MEDIA_SHA:0:12} → ${NEW_MEDIA_SHA:0:12}) — จะดึงมาลง"
  else
    log "media ไม่เปลี่ยน — ข้าม 159MB"
  fi
else
  log "release ไม่มี media.sha — ข้าม media (ของเดิมบนเครื่องยังใช้ได้)"
fi

log "ดาวน์โหลด app.tar.gz…"
gh release download "$TAG" -R "$REPO" -p 'app.tar.gz' -D "$WORKDIR" --clobber \
  || err "ดึง app.tar.gz ไม่ได้"

STAGE="$WORKDIR/stage"
mkdir -p "$STAGE"
tar -xzf "$WORKDIR/app.tar.gz" -C "$STAGE"
test -f "$STAGE/index.html" || err "app.tar.gz ไม่มี index.html"
test -f "$STAGE/assets/$EXPECTED" || err "app.tar.gz ไม่มี assets/$EXPECTED — payload ไม่ตรงกับ BUILD.txt"

if [ "$NEED_MEDIA" = "1" ]; then
  log "ดาวน์โหลด media.tar.gz (~159MB)…"
  gh release download "$TAG" -R "$REPO" -p 'media.tar.gz' -D "$WORKDIR" --clobber \
    || err "media.sha มีแต่ media.tar.gz ไม่มี — สั่ง publish ใหม่ด้วย force_media=true"
  tar -xzf "$WORKDIR/media.tar.gz" -C "$STAGE"
fi

# ไม่ใช้ --delete: asset hash เก่าที่ค้างอยู่ช่วยคนที่เปิดหน้าเว็บอยู่ไม่ให้ chunk หายกลางทาง
log "rsync → $WEB_ROOT/"
rsync -rlptvz "$STAGE"/ "$WEB_ROOT"/

if [ "$NEED_MEDIA" = "1" ]; then
  cp "$WORKDIR/media.sha" "$WEB_ROOT/.media.sha"
fi

log "ตรวจว่าเว็บเสิร์ฟ bundle ใหม่…"
for i in 1 2 3 4 5 6; do
  LIVE="$(curl -fsSL --max-time 30 "$DEPLOY_URL" | grep -oE 'index\.[a-f0-9]+\.js' | head -1 || true)"
  log "  ครั้งที่ $i: ${LIVE:-<ไม่เจอ>}"
  if [ "$LIVE" = "$EXPECTED" ]; then
    log "✅ publish สำเร็จ — $DEPLOY_URL เสิร์ฟ $EXPECTED (${SHA:0:7})"
    exit 0
  fi
  sleep 10
done

err "อัปโหลดแล้วแต่เว็บยังเสิร์ฟ bundle เก่า — เช็ค nginx root / purge Cloudflare cache"
