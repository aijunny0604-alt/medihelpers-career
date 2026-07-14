# DB

## Purpose

플랫폼이 영구 보관할 핵심 데이터를 정의합니다.

## Current State

현재 화면 데이터는 샘플입니다. Phase 2에서 아래 테이블을 Supabase에 생성합니다.

## Core Tables

- `profiles`: 공통 회원 정보와 역할
- `doctor_profiles`: 진료과, 경력, 희망조건, 공개범위
- `hospitals`: 병원 정보와 인증상태
- `jobs`: 채용공고, 근무조건, 게시기간, 상태
- `applications`: 지원 및 진행상태
- `consultations`: 의료인/병원 상담 리드
- `matches`: 헤드헌터 추천과 단계
- `ad_products`: 광고 상품·가격·노출 규칙
- `orders`: 광고 주문과 결제 상태
- `payments`: PG 거래, 승인·취소 기록
- `audit_logs`: 민감정보 열람과 중요 변경 이력

## Current Rules

- 개인정보와 공개 공고 데이터를 분리합니다.
- 삭제 요청과 법적 보관기간을 함께 처리할 수 있어야 합니다.
- 결제 금액은 주문 생성 시점의 상품 스냅샷으로 보존합니다.

## Related Docs

- `AUTH.md`
- `BILLING.md`

