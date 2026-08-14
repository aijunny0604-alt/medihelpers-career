# DB

> 아래 "핵심 테이블"은 목표 데이터 모델(개념)이다. 실제 런타임 D1 테이블은
> `scripts/package-sites.mjs`(및 `db/schema.js`)가 요청 시 생성하며, 이름이 다르다.
> 현재 구현된 테이블은 맨 아래 **"실제 런타임 테이블"**을 참고.

## 핵심 테이블

- `accounts`: 인증 이메일의 HMAC-SHA-256 키, 최소 역할, 가입·변경 시각
- `auth_credentials`: 자체 로그인 이메일, PBKDF2 비밀번호 해시·salt·반복 횟수, 실패 횟수·잠금 시각
- `auth_sessions`: 브라우저 세션 토큰의 SHA-256 해시, 계정 연결, 생성·만료 시각
- `account_recovery_requests`: 가입 이메일 확인·비밀번호 재설정 도움 요청, 연락 정보, 처리 상태, 접수·수정 시각
- `account_password_resets`: 비밀번호 재설정 요청의 계정·이메일, 토큰 SHA-256 해시, 30분 만료·사용·이메일 발송 상태. 토큰 원문은 저장하지 않음
- `consent_records`: 이용약관·연령 확인·개인정보 처리 안내 확인 유형과 문서 버전
- `profiles`: 공통 회원 정보와 역할
- `professions`: 보건의료 직군과 직군별 검색 스키마
- `professional_credentials`: 면허·자격 종류, 검증 상태, 만료·갱신 정보
- `doctor_profiles`: 진료과, 경력, 희망 조건, 공개 범위
- `hospitals`: 병원 정보, 기관 유형·위치·소개, 로고 자산과 인증·로고 사용 동의 상태
- `jobs`: 채용공고, 근무조건, 공개 등급, 게시 상태
- `talent_snapshots`: 병원에 노출할 익명 인재 요약
- `applications`: 지원과 진행 상태
- `consultations`: 의료인·병원 상담 리드
- `matches`: 헤드헌터 추천과 단계
- `ad_products`: 광고 상품, 가격, 노출 규칙
- `ad_orders`: 광고 신청의 병원 브랜드 정보, 로고 파일 참조, 공고 원고와 결제·게시 상태
- `membership_plans`: 상품 정의 테이블(테이블명은 유지하되, 의사 멤버십 폐지 후 실제 상품은 병원 광고·인재 열람권뿐)
- `orders`: 주문 금액과 상태
- `payments`: PG 승인·취소·웹훅 기록
- `subscriptions`: 정기결제 상태와 다음 결제일
- `entitlements`: 사용자별 권한, 만료일, 잔여 횟수
- `content_unlocks`: 공고·인재정보 건별 열람 기록
- `introduction_requests`: 병원의 소개 요청과 후보자 동의 상태
- `consents`: 개인정보 수집·제공 동의 버전과 시각
- `audit_logs`: 민감정보 열람과 주요 변경 이력
- `community_channels`: 직군·전문영역별 인증 커뮤니티
- `community_posts`: 익명 게시글과 공개범위
- `profession_launch_waitlist`: 직군별 오픈 알림과 초기 파트너 신청

## 데이터 규칙

- `accounts`에는 HMAC 계정 키와 역할만 저장하고, 자체 로그인 이메일은 `auth_credentials`, 이름·전화번호·기관 정보는 접근이 통제된 회원 프로필에 분리 저장합니다. 면허번호는 현재 회원가입에서 수집하지 않습니다.
- 계정 생성·조회·삭제는 자체 로그인 세션 쿠키(`mh_session`, D1 세션)로 인증된 서버 API로만 처리하고 클라이언트 역할 값을 권한으로 신뢰하지 않습니다.
- 동의·확인은 유형과 문서 버전을 분리하여 기록하고 마케팅 동의는 기본 생성하지 않습니다.
- 개인정보와 공개 검색용 데이터를 분리합니다.
- 유료 권한은 클라이언트 표시가 아니라 서버에서 검증합니다.
- 주문 금액과 상품 조건은 주문 생성 시점의 스냅샷으로 보존합니다.
- 후보자 동의 전에는 병원 응답에 직접 식별정보를 포함하지 않습니다.
- 권한 만료, 환불, 소개 완료는 원본 거래 기록을 지우지 않고 상태 이력으로 남깁니다.

## 실제 런타임 테이블 (2026-08-02 기준)

`scripts/package-sites.mjs`가 요청 시 자동 생성하는 D1 테이블. 스키마 원본은 `db/schema.js`.

**인증·회원**: `accounts`, `auth_credentials`, `auth_sessions`, `account_recovery_requests`, `account_password_resets`, `account_admin_profiles`, `member_profiles`, `member_preferences`, `member_activity`, `consent_records`, `consent_grants`, `withdrawn_members`

**공고·인재**: `admin_content_records`(관리자 게시 공고·콘텐츠), `admin_categories`, `resumes`(의료인 이력서, `visibility`: public/proposal/private), `saved_jobs`(관심공고)

**결제·수익**:
- `payment_orders`: 주문(금액 스냅샷·상태)
- `payment_transactions`·`payment_events`·`payment_receipts`·`payment_refunds`·`payment_webhook_events`·`billing_records`
- `talent_unlocks`: 병원의 인재 열람권(단건은 `order_id`=결제주문id, 팩은 `order_id`=크레딧 풀 id)
- **`talent_credit_pools`**(2026-07-24 신설): 열람권 팩의 크레딧 풀. `total_credits`/`used_credits`, `expires_at`. 병원이 새 인재를 열 때마다 크레딧 1개를 원자적 차감(`UPDATE ... WHERE used_credits=?`)해 `talent_unlocks`를 발급. `order_id`에 UNIQUE 인덱스(이중 적립 방지)

**상담·CRM·감사**: `consultation_requests`, `recruitment_cases`, `candidate_submissions`(후보 동의 `consent_status`), `interview_events`, `access_audit_logs`(열람 감사), `admin_audit_logs`, `site_settings`, `feature_flags`

### 열람권·환불 규칙 (코드 기준)
- **열람 상세 공개**: `GET /api/talent-detail/:id`는 병원+유효 열람권일 때만 상세 제공. 이력서는 `visibility IN ('public','proposal')`만 실명·연락처를 내려준다(비공개 이력서 유출 방지).
- **팩 크레딧 소모**: 비공개(private) 이력서에는 크레딧을 쓰지 않는다(낭비·열람 시도 차단).
- **환불 회수**: 전액 환불 시 단건 열람권 + 그 결제의 크레딧 풀에서 발급된 열람권을 삭제하고 풀 크레딧을 소진 처리(`talentRevokeStatementsForOrder`).

### 백업·보존

- `account_recovery_requests`는 백업 스키마 v0007부터, `account_password_resets`는 v0010부터 D1→R2 일일 백업 대상에 포함합니다. 사용했거나 만료된 재설정 토큰 기록은 7일 뒤 자동 정리합니다.
- `data_protection_runs`: 일일·수동 백업과 보존기간 정리의 성공·실패, R2 객체 키, SHA-256 체크섬, 테이블별 행 수를 기록합니다.
- 전체 D1 스냅샷은 별도 R2 `BACKUPS`에 저장하며 로그인 세션은 제외합니다.
- 탈퇴·상담·채용·거래·감사 로그의 만료 정리는 `docs/DATA_PROTECTION.md`의 기준을 따릅니다.
