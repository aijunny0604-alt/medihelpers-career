# ARCHITECTURE

## Purpose

프론트엔드 MVP가 실제 플랫폼으로 성장할 때의 구조를 정의합니다.

## Current State

현재는 React SPA와 Sites 정적 런타임으로 구성됩니다. 다음 단계에서 Supabase를 운영 데이터 계층으로 연결합니다.

### Target Structure

- Frontend: React + Vite
- Hosting: OpenAI Sites
- Database/Auth/Storage: Supabase
- Payment: Toss Payments
- Email: Resend 또는 Supabase Edge Function
- Analytics: 개인정보 최소 수집형 이벤트 분석

### Main Domains

- public jobs and profiles
- profession hubs and profession-specific filters
- credential-verified profession communities
- profession launch waitlists
- consultation leads
- hospital advertisement orders
- matching workflow
- account and verification
- admin operations

## Job Exposure (균형 노출)

- 순수 모듈 `src/jobExposure.js`(테스트 `src/jobExposure.test.js`)가 목록 노출 순서를 계산합니다. React·DOM 의존이 없어 단위 테스트로 검증합니다.
- `balancedOrder`: 진료과(dept) 라운드로빈 + 지역(region) 보조 분산으로 안정적 인터리빙. 가장 작은 버킷 내부는 원본 등록 순서를 유지(최신 등록순 대용).
- `orderPremium`: 광고 등급 우선순위(spotlight→featured→basic)를 유지한 채 등급 내부에서만 진료과·지역 균형.
- 회전 seed는 UTC 일 단위(`Math.floor(Date.now()/86400000)`)로 세션당 1회 계산 → 하루 동안 순서 고정, 매일 첫 진료과만 순환. 세션 내 무작위 재정렬 없음, 항목 손실/중복 없음.
- `JobsPage`는 프리미엄 초기 6건 / 일반 초기 9건만 노출하고 더보기로 확장해, 광고가 많아도 일반 목록을 끝없이 밀어내지 않습니다(유료 최상단 유지 + 목록 균형).

## Current Rules

- 결제 승인, 권한 검사, 개인정보 접근은 브라우저에서 확정하지 않습니다.
- 업로드 파일은 공개 URL로 두지 않고 만료형 접근 권한을 사용합니다.
- 상담 접수와 결제 웹훅은 중복 호출되어도 한 번만 처리되게 설계합니다.
- 계정·결제·상담은 공통으로 운영하고, 검색 조건·자격 검증·커뮤니티 채널은 직군별 스키마로 확장합니다.

## Related Docs

- `DB.md`
- `API.md`
- `AUTH.md`

## 프리미엄 광고 로테이터

`PremiumAdCarousel`은 `orderPremium`이 만든 등급 우선·진료과·지역 균형 배열을 받아 반응형 묶음으로 순환한다. 자동 전환은 IntersectionObserver, Page Visibility API, 포인터·포커스 상태, reduced-motion 설정을 함께 확인해 실제로 광고 영역을 보고 있는 경우에만 실행한다.
