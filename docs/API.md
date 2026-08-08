# API

## 현재 엔드포인트

| 경로 | 메서드 | 권한 | 용도 |
|---|---|---|---|
| `/api/categories` | GET | 공개 | 활성 진료과·지역·의료인 직군 |
| `/api/site-operations` | GET | 공개/역할별 | 사이트 설정·기능 플래그·게시 콘텐츠 |
| `/api/account` | GET·POST·DELETE | 인증 | 가입 가능 상태, 계정 생성·탈퇴 |
| `/api/account-recovery` | POST | 공개 | 가입 이메일 확인·비밀번호 재설정 본인 확인 요청을 D1에 접수하고 접수번호 반환 |
| `/api/auth/register` | POST | 공개 | 자체 이메일·비밀번호 계정 생성 및 로그인. 요청 헤더가 보조 세션을 명시하면 탭 토큰도 반환 |
| `/api/auth/login` | POST | 공개 | 자체 계정 로그인 및 보안 세션 쿠키 발급. 요청 헤더가 보조 세션을 명시하면 탭 토큰도 반환 |
| `/api/auth/logout` | POST | 로그인 | 현재 D1 세션 폐기 및 보안 쿠키 삭제. 클라이언트는 탭 보조 토큰도 함께 삭제 |
| `/api/member-center` | GET·POST·PATCH | 회원 | GET 프로필·알림·활동·상담·주문 / POST `refund_request`(환불 요청)·`job_create`(403 차단) / PATCH 프로필·알림 |
| `/api/payment-orders` | GET·POST | 회원 | 본인 주문 조회·상품 신청. 병원 광고 신청은 관리자 검수용 공고(`draft`)도 같은 D1 배치로 생성 |
| `/api/consultations` | POST | 로그인 | 구직·구인 상담 접수 |
| `/api/consultations` | GET | 관리자 | 상담 목록 |
| `/api/consultations/:id` | PATCH | 관리자 | 상담 상태·메모 |
| `/api/recruitment-crm` | GET·POST | 관리자 | 채용 건 목록·생성 |
| `/api/recruitment-crm/:id` | PATCH | 관리자 | 채용 단계 변경 |
| `/api/admin-console` | GET·PATCH | 관리자 | 통합 운영 데이터와 관리 작업 |
| `/api/payment-approve` | POST | 주문 소유자 / PG 리턴 | 결제 승인 확정(금액·서명·멱등성 검증). 키 미설정 시 테스트(가상) 승인 |
| `/api/resumes` | GET·POST | 의료인 회원 | 본인 이력서 목록 조회·신규 등록·수정(최대 20개 반환, 공개 범위 선택) |
| `/api/saved-jobs` | GET·POST | 회원 | 관심공고 조회(jobId 배열)·토글 |
| `/api/talent-detail/:id` | GET | 병원(열람권)·관리자 | 인재 상세. **공개(public/proposal) 이력서만** 실명·연락처 제공, 열람 감사 기록 |
| `/api/talent-access-audit` | GET | 관리자 | 병원별 열람량·이상 열람 감사 |

## 결제·열람권 규칙 (코드 기준)

- **상품**: 병원 채용광고 3종 + 병원 인재 열람권 3종(단건 3,900 / 10명팩 29,000 / 30명팩 69,000원). 의사 멤버십은 폐지.
- **열람권 팩 = 크레딧 방식**: 팩 결제 시 `talent_credit_pools`에 크레딧 적립, 새 인재를 열 때 1개 소모(원자적 차감). 자세한 건 [[DB]].
- **역할 게이트**: 광고·열람권 모두 병원 회원만 구매(의사 결제 시 403).
- **환불 회수**: 전액 환불 시 단건·팩 열람권과 남은 크레딧을 모두 회수.

## 현재 보안 규칙

- 인증은 메디헬퍼스 자체 이메일·비밀번호 + D1 세션을 사용합니다(OpenAI/Sites 인증 헤더 아님). 보안 쿠키가 기본이며 쿠키 차단 브라우저에서는 같은 출처 API에만 보내는 탭 단위 Bearer 토큰을 보조 수단으로 사용합니다.
- 관리자는 `ADMIN_EMAILS` 허용목록으로 재검사합니다.
- 상태 변경 요청은 동일 출처 여부를 검사합니다.
- 회원 키는 `ACCOUNT_HASH_SECRET` 기반 HMAC으로 생성합니다.
- 상품과 금액은 클라이언트 입력이 아니라 서버 카탈로그에서 확정합니다.
- 상담은 인증 계정 이메일로 회원 내역에 연결하며 가입 계정이 있으면 역할도 검사합니다. `ACCOUNT_HASH_SECRET`이 약하면 검사를 건너뛰지 않고 **503으로 차단**(fail-closed)합니다.
- 의료인 상담·공고 지원에서 `payload.resumeId`를 보내면 서버가 로그인 계정의 이력서 소유권을 확인합니다. 접수 기록에는 서버가 조회한 제목과 이력서 스냅샷을 함께 저장하므로 이후 원본이 수정되어도 접수 당시 제출 내용을 확인할 수 있습니다.
- 이력서 신규 추가는 `POST /api/resumes`에 `createNew: true`, 특정 이력서 수정은 본인 소유 `resumeId`를 보냅니다. 기존 클라이언트는 별도 값이 없을 때 최근 이력서를 수정하는 방식으로 호환됩니다.
- 후보 추천은 동의(`consent_status='granted'`)가 확인된 건만 병원에 노출합니다.
- 응답은 `no-store`, JSON, `nosniff`를 기본으로 사용합니다. 공개 카테고리는 60초 캐시를 허용합니다.
- 등록되지 않은 `/api/*` 경로는 SPA HTML로 폴백하지 않고 JSON 오류와 HTTP 404를 반환합니다.
- 핸들러 밖으로 나간 예외는 최상위 try/catch가 잡아 API는 JSON `{error}`, HTML은 일반 텍스트 500으로 통일합니다(D1 오류 문구 유출 방지).

## 미구현 API

- PG 결제 승인·취소
- PG 웹훅 서명 검증·중복 처리
- 환불 실행·완료 콜백
- R2 이미지·이력서 업로드
- 면허·사업자·재직 인증
- 후보자 병원별 제3자 제공 동의와 철회

## 데이터 보호 API

| 경로 | 메서드 | 권한 | 기능 |
|---|---|---|---|
| `/api/admin-backups` | GET | 관리자 | R2 백업 목록과 실행 이력, 선택 백업 다운로드 |
| `/api/admin-backups` | POST | 관리자 | 전체 D1 수동 백업 생성과 감사 로그 기록 |
| `/api/data-protection-health` | GET | 공개 | 저장소 구성 여부와 마지막 백업·보존 정리 시각(개인정보 없음) |

화면이나 DB 테이블이 존재하더라도 위 API가 연결되기 전에는 실제 결제·파일 보관·자격 인증이 완료된 것으로 표현하지 않습니다.
