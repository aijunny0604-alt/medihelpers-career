# API

## Purpose

외부 서비스와 서버 기능의 경계를 정의합니다.

## Current State

현재 프론트엔드 MVP는 외부 API를 호출하지 않습니다.

## Planned Integrations

- Toss Payments: 주문 결제, 승인, 취소, 웹훅
- Supabase: 인증, DB, 파일 저장
- Email provider: 상담 접수·운영 알림
- 선택 사항: 카카오 알림톡, 본인확인, 사업자 상태조회

## Server Endpoints

- `POST /api/consultations`
- `GET /api/jobs`
- `POST /api/jobs`
- `POST /api/orders`
- `POST /api/payments/confirm`
- `POST /api/webhooks/toss`

## Current Rules

- 비밀키는 Sites 환경변수에 저장합니다.
- 웹훅 서명과 결제 금액을 서버에서 검증합니다.
- 개인정보를 분석·광고 도구로 전달하지 않습니다.

## Related Docs

- `ARCHITECTURE.md`
- `BILLING.md`

