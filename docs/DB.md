# DB

## 핵심 테이블

- `profiles`: 공통 회원 정보와 역할
- `professions`: 보건의료 직군과 직군별 검색 스키마
- `professional_credentials`: 면허·자격 종류, 검증 상태, 만료·갱신 정보
- `doctor_profiles`: 진료과, 경력, 희망 조건, 공개 범위
- `hospitals`: 병원 정보와 인증 상태
- `jobs`: 채용공고, 근무조건, 공개 등급, 게시 상태
- `talent_snapshots`: 병원에 노출할 익명 인재 요약
- `applications`: 지원과 진행 상태
- `consultations`: 의료인·병원 상담 리드
- `matches`: 헤드헌터 추천과 단계
- `ad_products`: 광고 상품, 가격, 노출 규칙
- `membership_plans`: 회원 유형별 멤버십과 건별 상품
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

- 개인정보와 공개 검색용 데이터를 분리합니다.
- 유료 권한은 클라이언트 표시가 아니라 서버에서 검증합니다.
- 주문 금액과 상품 조건은 주문 생성 시점의 스냅샷으로 보존합니다.
- 후보자 동의 전에는 병원 응답에 직접 식별정보를 포함하지 않습니다.
- 권한 만료, 환불, 소개 완료는 원본 거래 기록을 지우지 않고 상태 이력으로 남깁니다.
