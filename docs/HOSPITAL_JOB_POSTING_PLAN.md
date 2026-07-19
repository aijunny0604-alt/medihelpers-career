# 병원 자기계정 공고 등록 → 지원 → 병원 알림 (end-to-end) 설계

기준일: 2026-07-19
관련: [[project-medihelpers-career]], AUTH.md, BILLING.md

## 배경 / 확정 방향

- 사용자(아버지) 확정: **일반 병원이 올린 공고 = 그 병원에게 직접 지원 접수. 아빠 인증 공고 = 헤드헌터(관리자) 경유.**
- 점검 결과 현재 사슬이 여러 곳에서 끊김:
  1. 병원이 공고 올리는 입구 없음(광고신청=결제 체크아웃일 뿐, 공고 내용 입력칸 없음)
  2. 결제와 공고 게시 미연결(paymentApproveApi가 admin_content_records INSERT 안 함)
  3. 공고 등록은 관리자(admin)만(content_create가 adminIdentity 게이트), created_by도 항상 admin
  4. 방금 추가한 지원 알림 코드 미발화: (A) cleanConsultationPayload가 jobId 제거 (B) 공고 id 접두사 `admin-` 불일치

## 목표 사슬

병원 로그인 → 공고 작성(제목·직군·지역·급여·조건) → (광고상품 선택·결제 또는 무료 기본) → 공고 게시(admin_content_records, created_by=병원계정, status=published) → /jobs·/medical-staff 목록 노출 → 의사·의료인이 그 공고에 지원 → 서버가 공고 소유 병원 계정에 알림(member_activity) → 병원 마이페이지 '문의·후보'에서 지원자 확인.

## 구현 단계 (순차)

### M1. 병원 공고 등록 API (병원 계정 허용)
- 새 액션 또는 엔드포인트: 병원 회원이 자기 공고를 admin_content_records에 INSERT.
  - content_type: `doctor_job`(의사) / `medical_job`(의료인)
  - **created_by = 병원 계정 이메일**(admin.email 아님)
  - status: 결제 완료 시 `published`, 미결제 시 `draft`(또는 검수 대기 `pending`)
  - payload: 제목·병원명·지역·직군·급여·근무조건·마감일 등(공개 리스트에서 쓰는 필드와 정합)
- 권한: hospital 역할 계정만. 자기 공고만 수정/삭제(created_by 확인).
- **주의**: content_create는 admin 전용 유지. 병원용은 별도 경로(예: memberCenterApi POST action='job_create' 또는 신규 /api/my-jobs).

### M2. 병원 공고 작성 UI
- /advertise/apply를 "결제만"에서 "공고 작성 + 상품 선택 + 결제"로 확장, 또는 신규 페이지.
- 폼: 제목·직군·지역·급여·근무형태·마감일·상세(모집개요·담당업무·자격요건·복리후생).
- 광고 상품(basic/featured/intensive) 선택 → 결제 → 게시. 무료 기본 등급 여부는 정책 결정 필요.

### M3. 결제 ↔ 게시 연결
- 광고 결제 승인(paymentApproveApi, product.type doctor_ad/medical_staff_ad) 시:
  - 해당 병원의 draft 공고를 published로 전이(또는 주문 metadata에 담긴 공고 id로 연결).
  - 노출기간(exposureDays)과 공고 노출을 함께 관리.

### M4. 공고 id 정합 + 지원 알림 버그 수정
- **결함 A**: cleanConsultationPayload 화이트리스트에 `jobId` 추가(값 보존).
- **결함 B**: operationalDoctorJobs/MedicalJobs가 job.id를 `admin-<uuid>`로 만드니, 지원 시 서버가 접두사 제거 후 admin_content_records.id로 조회하거나, 프런트가 원본 id를 별도 필드로 전달. (정적 data.js 공고는 DB에 없으므로 알림 대상 아님 — 실제 등록 공고만.)
- 알림 라우팅(consultationApi): created_by가 병원 계정이면 그 계정 member_activity에 'job_application' 기록(구현됨, 버그만 수정하면 발화).

### M5. 병원 마이페이지 지원자 표시
- member-center가 'job_application' 활동/지원자를 '문의·후보' 탭에 표시.
- (선택) 알림 이메일/문자를 병원에게 발송(Resend/Solapi, NOTIFICATION_SETUP.md).

## 확정 정책 (2026-07-19 사용자)
- **기본 무료 + 광고 유료**: 병원은 공고를 무료로 등록. 상단고정·추천·배너 등 광고 상품만 결제.
- **아빠 검수 후 게시**: 병원 등록 → status='pending_review'(검수 대기) → 관리자(아빠) 승인 시 published. 즉시 게시 아님.
  → 병원 공고 등록 API는 status를 강제로 pending 계열로. 관리자 콘솔에서 승인(published 전환).
- 정적 데모 공고(data.js)는 유지(화면 채우기)하되 지원 알림 대상 아님 — 실제 등록 공고만 알림.

### 검수 상태 흐름
- 병원 등록: status='pending_review'(신규 값 — 스키마 CHECK 확인 필요), created_by=병원이메일.
- 관리자 콘솔 콘텐츠 관리: pending 목록 노출 → 승인(published)/반려(hidden).
- 공개 목록(/jobs·/medical-staff): published만 노출(기존 유지).

## 현재 상태
- M4의 알림 라우팅 골격 + 이력서 양방향 연동은 커밋됨(47f1e1c). 단 버그(A/B)로 미발화.
- M1~M3, M5 미구현.
