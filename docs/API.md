# API

## 현재 엔드포인트

| 경로 | 메서드 | 권한 | 용도 |
|---|---|---|---|
| `/api/categories` | GET | 공개 | 활성 진료과·지역·의료인 직군 |
| `/api/site-operations` | GET | 공개/역할별 | 사이트 설정·기능 플래그·게시 콘텐츠 |
| `/api/account` | GET·POST·DELETE | 인증 | 가입 가능 상태, 계정 생성·탈퇴 |
| `/api/member-center` | GET·PATCH | 회원 | 프로필·알림·활동·상담·주문 |
| `/api/payment-orders` | GET·POST | 회원 | 본인 주문 조회·상품 신청 |
| `/api/consultations` | POST | 로그인 | 구직·구인 상담 접수 |
| `/api/consultations` | GET | 관리자 | 상담 목록 |
| `/api/consultations/:id` | PATCH | 관리자 | 상담 상태·메모 |
| `/api/recruitment-crm` | GET·POST | 관리자 | 채용 건 목록·생성 |
| `/api/recruitment-crm/:id` | PATCH | 관리자 | 채용 단계 변경 |
| `/api/admin-console` | GET·PATCH | 관리자 | 통합 운영 데이터와 관리 작업 |

## 현재 보안 규칙

- 인증은 Sites 인증 헤더를 사용합니다.
- 관리자는 `ADMIN_EMAILS` 허용목록으로 재검사합니다.
- 상태 변경 요청은 동일 출처 여부를 검사합니다.
- 회원 키는 `ACCOUNT_HASH_SECRET` 기반 HMAC으로 생성합니다.
- 상품과 금액은 클라이언트 입력이 아니라 서버 카탈로그에서 확정합니다.
- 상담은 인증 계정 이메일로 회원 내역에 연결하며 가입 계정이 있으면 역할도 검사합니다.
- 응답은 `no-store`, JSON, `nosniff`를 기본으로 사용합니다. 공개 카테고리는 60초 캐시를 허용합니다.

## 미구현 API

- PG 결제 승인·취소
- PG 웹훅 서명 검증·중복 처리
- 환불 실행·완료 콜백
- R2 이미지·이력서 업로드
- 면허·사업자·재직 인증
- 후보자 병원별 제3자 제공 동의와 철회

화면이나 DB 테이블이 존재하더라도 위 API가 연결되기 전에는 실제 결제·파일 보관·자격 인증이 완료된 것으로 표현하지 않습니다.
