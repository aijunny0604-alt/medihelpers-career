#!/usr/bin/env bash
# 로컬 서버 + 외부 공유 터널을 한 번에 띄운다.
#
#   bash scripts/dev-share.sh
#
# - 코드를 고친 뒤 이 스크립트를 다시 실행하면 최신 내용이 반영된다.
# - 터널 주소(https://xxx.trycloudflare.com)는 실행할 때마다 새로 발급된다.
# - PC를 끄거나 창을 닫으면 접속이 끊긴다(로컬 서버를 외부로 연결하는 통로일 뿐).
# - 이 주소는 아는 사람이면 누구나 들어올 수 있으므로 테스트 용도로만 쓴다.
set -u
cd "$(dirname "$0")/.."

PORT="${PORT:-8790}"

echo "[1/4] 이전 서버 정리"
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'Name=\"node.exe\"' | Where-Object { \$_.CommandLine -like '*wrangler*' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force -ErrorAction SilentlyContinue }" >/dev/null 2>&1
taskkill //F //IM workerd.exe >/dev/null 2>&1
sleep 3

echo "[2/4] Cloudflare 타깃 빌드"
npm run build:cf >/dev/null 2>&1 || { echo "빌드 실패"; exit 1; }

echo "[3/4] 로컬 설정·스키마 준비"
cd dist-cf
sed -i 's/REPLACE_WITH_D1_DATABASE_ID/00000000-0000-0000-0000-000000000000/' wrangler.toml
grep -q 'ACCOUNT_HASH_SECRET' wrangler.toml || sed -i '/^ADMIN_EMAILS/a ACCOUNT_HASH_SECRET = "local-test-secret-do-not-use-in-production"\nSIGNUP_ENABLED = "true"\nLEGAL_DOCUMENT_STATUS = "approved"\nTEST_ACCOUNT_SWITCH_ENABLED = "true"' wrangler.toml
cp ../drizzle/*.sql drizzle/ 2>/dev/null
for f in drizzle/*.sql; do npx wrangler d1 execute medihelpers --local --file="$f" >/dev/null 2>&1; done

echo "[4/4] 서버·터널 시작 (Ctrl+C 로 종료)"
npx wrangler dev --local --port "$PORT" --ip 0.0.0.0 >/tmp/mh_server.log 2>&1 &
until curl -sf -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null; do sleep 2; done
echo "  로컬:  http://127.0.0.1:$PORT"

npx --yes cloudflared tunnel --url "http://127.0.0.1:$PORT" --no-autoupdate 2>&1 | tee /tmp/mh_tunnel.log &
for _ in $(seq 1 30); do
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/mh_tunnel.log 2>/dev/null | head -1)
  [ -n "${URL:-}" ] && { echo "  공유:  $URL"; break; }
  sleep 2
done
wait
