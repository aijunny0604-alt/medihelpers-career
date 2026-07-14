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
- consultation leads
- hospital advertisement orders
- matching workflow
- account and verification
- admin operations

## Current Rules

- 결제 승인, 권한 검사, 개인정보 접근은 브라우저에서 확정하지 않습니다.
- 업로드 파일은 공개 URL로 두지 않고 만료형 접근 권한을 사용합니다.
- 상담 접수와 결제 웹훅은 중복 호출되어도 한 번만 처리되게 설계합니다.

## Related Docs

- `DB.md`
- `API.md`
- `AUTH.md`

