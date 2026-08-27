# DEPLOY

## Purpose

메디헬퍼스 사이트를 안전하게 배포하는 기준입니다.

## ⚠️ 배포 대상이 둘이며, 결제 가능 여부가 다릅니다

| 대상 | 빌드 | 산출물 | 실결제 |
|---|---|---|---|
| OpenAI Sites (현재 테스트본) | `npm run build` | `dist/` | ❌ **불가** |
| Cloudflare Workers (운영 예정) | `npm run build:cf` | `dist-cf/` | ✅ 가능 |

**OpenAI Sites에서는 실결제를 받을 수 없습니다.** 이용약관 §2.5/3.3이 결제·PCI 데이터 처리를
금지합니다. 현재 Sites 배포본은 이니시스 키가 없어 결제창이 아예 막혀 있으므로 **테스트 용도로는 문제 없습니다**.
이니시스 키를 넣고 실제 카드결제를 받는 시점에는 반드시 Cloudflare로 이전해야 합니다 →
절차는 `CLOUDFLARE_MIGRATION.md`.

## Current State

- 2026-08-21 최신 공개본: OpenAI Sites v292. 클로드 최신 작업, 인재 독립 상세 페이지, 헤드헌터 인증 제거, 다른 PC 로그인 최신화가 반영됐습니다.
- 다음 배포부터 GitHub `agent/medihelpers-ui-stability`와 Sites `main`에 검증된 동일 SHA를 반영하는 `DEPLOY_GUARDRAILS.md` 규칙을 강제합니다.
- 배포 경로 메모: Sites 소스 저장소(`origin`, `git.chatgpt-team.site`)는 별도 자격증명이 필요합니다. 자격증명이 없으면 `git ls-remote`가 401로 실패하고, 비대화형 환경에서는 로그인 창에 응답할 수 없어 배포가 불가합니다. 이 경우 Codex 세션에서 배포하거나 `CLOUDFLARE_MIGRATION.md`의 이전을 진행합니다.
- 공개 URL: https://medihelpers-career.junnyai.chatgpt.site

- 기본 공개본: OpenAI Sites 프로젝트 `medihelpers-career` (**테스트 전용 — 실결제 불가**)
- 보조 공개본: GitHub Pages `aijunny0604-alt.github.io/medihelpers-career`
- 소스 저장소: GitHub `aijunny0604-alt/medihelpers-career`
- 현재 Sites 작업 브랜치: `agent/medihelpers-ui-stability`
- 운영 목표 도메인: `medihelpers.co.kr` (Cloudflare 이전 시 연결)
- 이니시스 키: 미발급 → 결제 비활성 상태
- Resend 메일 키: 미등록 → 축하·가입 알림·계정 복구 메일은 `RESEND_API_KEY`, `RESEND_FROM` 등록 후 활성화

## Current Rules

- 최상위 강제 규칙은 `DEPLOY_GUARDRAILS.md`를 따릅니다. 해당 게이트를 통과하지 않은 배포는 금지합니다.
- GitHub `agent/medihelpers-ui-stability`만 개발·배포 기준으로 사용하고 Sites `main`은 동일 커밋의 미러로만 사용합니다.
- 배포 전 클로드 작업 폴더의 미커밋 변경과 원격 최신 커밋을 확인하며, 기준 브랜치 누락 커밋이 있으면 배포를 중단합니다.
- 배포 전 `npm run build`(Sites) 또는 `npm run build:cf`(Cloudflare) 성공을 확인합니다.
- ⚠️ **`build:cf`는 `EBUSY`로 조용히 실패할 수 있습니다.** `dist-cf`를 쓰는 프로세스(로컬 `wrangler dev`의 workerd, 그 안에서 띄운 `cloudflared`)가 폴더를 잠그면 빌드는 "built in"으로 성공처럼 보이지만 산출물이 갱신되지 않습니다. **"코드를 고쳤는데 화면이 그대로"의 실제 원인**입니다. 빌드 전 해당 프로세스를 종료하고, 산출물 타임스탬프가 갱신됐는지 확인하세요(`scripts/dev-share.sh`가 자동 처리).
  - 프로세스를 모두 죽여도 폴더 핸들이 잠시 남아 `rmdir`이 계속 실패할 수 있습니다. **rename은 잠긴 폴더에도 통하므로** `mv dist-cf dist-cf-stale-$$ && rm -rf dist-cf-stale-$$`로 우회합니다(스크립트에 반영됨).
  - 빌드 로그에 `built in`이 찍혀도 뒤에 `EBUSY`가 따라오면 실패입니다. 성공 판정은 `EBUSY` 부재 + `dist-cf/public` 존재로 확인하세요.
  - `build:cf`는 `dist-cf/wrangler.toml`을 새로 생성하므로 로컬용 환경변수(`ACCOUNT_HASH_SECRET`·`SIGNUP_ENABLED`·`LEGAL_DOCUMENT_STATUS`)와 `database_id`가 매번 초기화됩니다. 재빌드 후에는 반드시 다시 채워야 로그인·가입이 동작합니다.
- `npm test` 통과를 확인합니다(현재 157건).
- 기존 `.openai/hosting.json`의 프로젝트 연결을 유지합니다.
- D1 바인딩 `DB`는 재생성·재연결하지 않고 R2 바인딩 `BACKUPS`를 유지합니다. Sites의 병원 이미지 업로드는 이 저장소의 `hospitals/` 경로를 사용하며, Cloudflare는 전용 `UPLOADS` 바인딩을 우선 사용합니다.
- 배포 후 `/api/data-protection-health`에서 `configured:true`와 최근 성공 시각을 확인합니다.
- 비밀값은 저장소가 아닌 호스팅 환경변수에 저장합니다.
- 메일 활성화 시 `RESEND_API_KEY`는 Secret으로 저장하고, `RESEND_FROM`은 인증된 `@medihelpers.co.kr` 주소를 사용합니다. `ALERT_EMAIL_TO`는 기존 대표자 수신 주소를 보존합니다.
- 공개 배포 전 샘플 데이터와 개인정보를 재검토합니다.
- 정식 공개 직전 `TEST_ACCOUNT_SWITCH_ENABLED=false`를 설정해 테스트 역할 전환 UI와 API를 함께 닫습니다.
- 검색 노출 전 `/robots.txt`, `/sitemap.xml`, canonical URL, `/manifest.webmanifest`의 실제 도메인을 확인합니다.
- 검증된 변경과 문서를 GitHub `main`과 Sites 소스 `main`에 같은 커밋으로 푸시합니다.
- GitHub Pages 미러의 배포 브랜치는 별도 워크플로 설정을 확인한 뒤 동기화합니다.
- Sites는 GitHub와 동일한 커밋을 소스 저장소에 반영한 뒤 버전을 저장하고 공개 배포합니다.
- 로컬 저장만으로 자동 푸시하지 않으며, 검증되지 않은 변경을 공개하지 않습니다.

## Release Checklist

- `DEPLOY_GUARDRAILS.md`의 작업 시작·배포·다른 PC 인증·배포 후 게이트 전체 통과
- GitHub 기준 브랜치가 배포 후보의 조상이며 GitHub와 Sites가 동일 SHA인지 확인
- 클로드 작업 폴더의 미커밋 파일이 누락·덮어쓰기되지 않았는지 확인
- 쿠키 없는 새 세션에서 의료인·병원·관리자 역할별 보호 API 확인
- 주요 메뉴와 모바일 레이아웃
- 상담·광고 주문 폼의 필수값과 동의
- 전화·이메일 링크
- 결제 관련 표현과 가격
- 개인정보처리방침과 이용약관
- README·CHANGELOG·STATUS의 버전, 커밋, 공개 URL 일치 여부
- GitHub Pages 메인과 주요 하위 URL 직접 접근
- Sites와 GitHub의 배포 대상 커밋 일치 여부
- **CSP에 이니시스 도메인(`stdpay.inicis.com`, `stgstdpay.inicis.com`)이 남아 있는지** — 빠지면 결제창이 조용히 안 뜹니다(`AUTH.md` 보안 헤더 절 참고)
- 보안 헤더 응답 확인: `curl -I <배포URL> | grep -i "content-security-policy\|strict-transport"`

## Cloudflare 배포 (실결제 시작 시)

전체 절차는 `CLOUDFLARE_MIGRATION.md`에 있습니다. 요약하면:

```bash
npm run build:cf
cd dist-cf
wrangler d1 create medihelpers        # database_id를 wrangler.toml에 기입
wrangler secret put INICIS_MID        # 그 외 시크릿은 마이그레이션 문서 참고
wrangler deploy
```

- ⚠️ `wrangler.toml`은 빌드마다 재생성되므로 확정된 `database_id`를 매번 다시 넣어야 합니다.
- ⚠️ `SITE_ORIGIN`은 결제 `returnUrl`에 직결되므로 도메인과 정확히 일치해야 합니다(apex/www 주의).

## Related Docs

- `TEST.md`
- `BILLING.md`
- `CLOUDFLARE_MIGRATION.md`
- `INICIS_SETUP_GUIDE.md`

