# BILLING · 이니시스(INICIS) 결제 연동 계획

기준일: 2026-07-18
관련 문서: `BILLING.md`, `API.md`, `ARCHITECTURE.md`, `DB.md`

## 배경

기존 medihelpers.co.kr(레거시 프레임셋 사이트)에서 **KG이니시스** 결제를 운영했고, 계약은 유효하며 상점 아이디(MID)·인증키를 보유하고 있다. 새 사이트(React SPA + 서버 API)는 결제 **원장 스키마와 주문 흐름이 이미 설계**되어 있으나, 실제 PG 결제창 호출·승인·검증은 미구현(시연 상태)이다. 기존 연동 코드는 스택이 달라 그대로 이식할 수 없고, MID/키만 재사용해 새 방식으로 연동한다.

## 목표

- 실제 이니시스 결제창으로 카드 결제를 받고, 서버가 최종 승인·금액 검증 후 주문을 `paid` 처리한다.
- 결제 결과를 기존 원장 테이블(`payment_transactions` / `payment_receipts` / `payment_webhook_events`)에 멱등 저장한다.
- 결제 완료 → 광고 게시/멤버십 활성, 환불 → 노출·권한 회수까지 상태 전이를 자동화한다.

## 범위 (In / Out)

### In scope (1차)
- 이니시스 **웹 표준결제(WEBSTANDARD)** 카드 결제창 연동
- 서버 승인 API(결제창 리턴값 → 이니시스 승인요청 → 검증 → 저장)
- 금액 위변조 검증(서버 주문 금액 == 승인 금액), 멱등키(공급자 이벤트 ID)
- 결제 성공/실패 결과 화면 및 마이페이지 주문 이력 반영
- 테스트(MID) → 실거래(MID) 전환 설정 분리

### Out of scope (후속)
- 가상계좌·계좌이체·간편결제 등 카드 외 수단
- 세금계산서·현금영수증 자동 발행
- 정기결제(빌링키) — 멤버십 구독형으로 갈 경우 별도 기획
- 성공보수·광고비 세금계산서 청구(계약 기반 오프라인 유지)

## 현재 코드 연동 지점

| 위치 | 내용 |
|---|---|
| `src/main.jsx:2118` | 광고 신청 → `POST /api/payment-orders` |
| `src/main.jsx:2569` | 멤버십 결제(`MembershipCheckout`) → `POST /api/payment-orders` |
| `db/schema.js` | `payment_orders / payment_transactions / payment_refunds / payment_receipts / payment_events / payment_webhook_events` 원장 |
| `docs/BILLING.md` | 미구현 항목·운영 결제 전 필수 규칙 명시 |

## 제안 결제 흐름 (WEBSTANDARD 기준)

1. 사용자가 상품 선택 → 서버 `POST /api/payment-orders`로 **주문 생성**(금액 스냅샷 저장, 상태 `pending`).
2. 서버가 주문번호·금액·이니시스 인증에 필요한 서명(해시)을 생성해 클라이언트에 전달.
3. 클라이언트가 이니시스 표준결제창 호출(카드사 인증).
4. 결제창 리턴(인증 결과) → 서버 **승인 API**가 이니시스 승인요청 전송.
5. 승인 응답 검증: 금액 일치, 위변조 서명 확인 → 성공 시 주문 `paid`, `payment_transactions`·`payment_receipts` 기록.
6. (선택) 이니시스 통보(웹훅/노티) 수신 → `payment_webhook_events`에 멱등 저장·대사(reconcile).
7. 결제 완료 후처리: 광고 게시/멤버십 활성. 환불 요청 시 승인·노출 회수.

## 필요 준비물 (사용자 제공)

- 상점 아이디(MID) — 테스트/실거래 각각
- 웹표준 결제 **signKey**(또는 INIAPI Key/IV) — ⚠️ 서버 환경변수로만 보관, 절대 프론트/깃 커밋 금지
- 허용 결제수단, 결제 도메인(리턴 URL) 등록 정보

## 설정할 환경변수 (호스팅 시크릿, 2026-07-18 코드 반영)

승인 API 골격 구현 완료(`package-sites.mjs` buildInicisPaymentParams·paymentApproveApi). 아래 키만 넣으면 작동:

| 변수 | 값 |
|---|---|
| `INICIS_MID` | 이니시스 상점 아이디 |
| `INICIS_SIGN_KEY` | 웹표준 결제 사인키(signKey) |
| `SITE_ORIGIN` | 사이트 origin (예: https://medihelpers.co.kr) — returnUrl/closeUrl 조립용 |

미설정 시: 주문 생성 응답 `inicis.configured=false`, `/api/payment-approve`는 503. 즉 결제창이 안 뜨고 기존 "결제 요청 접수"까지만.

## 남은 구현 (키 준비 후)

- **클라이언트 결제창 호출**: MembershipCheckout/광고신청에서 주문 생성 응답의 `inicis` 파라미터로 이니시스 표준결제창 스크립트(stdpay) 로드·submit. (키 없으면 테스트 불가라 보류)
- **웹훅/노티 수신**: 이니시스 결제결과 통보 멱등 저장(`payment_webhook_events`).
- 테스트 MID → 실거래 MID 전환.

## 보안·규정 체크 (BILLING.md 필수 규칙 연계)

- 주문 금액/조건은 생성 시점 스냅샷으로 고정, 승인 금액 불일치 시 거절
- 웹훅/노티는 공급자 이벤트 ID를 멱등키로 사용
- 환불 합계 ≤ 원 결제액, 상태 전이는 허용 순서만 통과
- 키·인증정보는 서버 시크릿(예: Cloudflare Worker secret)로만 주입
- 개인정보/결제 관련 약관·환불정책은 법무·세무 검토 후 확정

## 마일스톤

1. **M1 설계 확정** — API 계약(`/api/payment-orders`, `/api/payment-approve`, 노티 수신) + 상태머신 (`docs/02` 또는 API.md 갱신)
2. **M2 테스트 연동** — 이니시스 테스트 MID로 결제창→승인→저장 성공
3. **M3 후처리 자동화** — 결제완료 게시/활성, 환불 회수
4. **M4 실거래 전환** — 실 MID·도메인 등록, 소액 실결제 검증, 오픈

## 열린 질문

- 첫 대상 상품: 광고(병원) 먼저인가, 멤버십(의사) 먼저인가?
- 서버 런타임 확인: 현재 `/api/*`가 Cloudflare Worker(D1) 기준인지 → 이니시스 서버승인 호출(아웃바운드 HTTPS) 가능 여부 점검 필요.
- 정기결제 필요 여부(멤버십 구독형이면 빌링키 별도).
