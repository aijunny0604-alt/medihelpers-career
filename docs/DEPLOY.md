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

- 기본 공개본: OpenAI Sites 프로젝트 `medihelpers-career` (**테스트 전용 — 실결제 불가**)
- 보조 공개본: GitHub Pages `aijunny0604-alt.github.io/medihelpers-career`
- 소스 저장소: GitHub `aijunny0604-alt/medihelpers-career`
- 현재 운영 소스 브랜치: `agent/medihelpers-ui-stability`
- 운영 목표 도메인: `medihelpers.co.kr` (Cloudflare 이전 시 연결)
- 이니시스 키: 미발급 → 결제 비활성 상태

## Current Rules

- 배포 전 `npm run build`(Sites) 또는 `npm run build:cf`(Cloudflare) 성공을 확인합니다.
- `npm test` 통과를 확인합니다(현재 49건).
- 기존 `.openai/hosting.json`의 프로젝트 연결을 유지합니다.
- 비밀값은 저장소가 아닌 호스팅 환경변수에 저장합니다.
- 공개 배포 전 샘플 데이터와 개인정보를 재검토합니다.
- 검증된 변경과 문서를 운영 소스 브랜치 `agent/medihelpers-ui-stability`에 푸시합니다.
- GitHub Pages 미러의 배포 브랜치는 별도 워크플로 설정을 확인한 뒤 동기화합니다.
- Sites는 GitHub와 동일한 커밋을 소스 저장소에 반영한 뒤 버전을 저장하고 공개 배포합니다.
- 로컬 저장만으로 자동 푸시하지 않으며, 검증되지 않은 변경을 공개하지 않습니다.

## Release Checklist

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

