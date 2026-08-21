# 문서 인덱스

## Purpose

사업, 제품, 개발 문서의 기준점을 제공합니다.

## Current State

- `UPDATE_2026-08-21_TALENT_DETAIL_PAGE.md`: 구직 인재 모달의 독립 상세 페이지 전환과 헤드헌터 인증 표시 제거
- `UPDATE_2026-08-15_HOSPITAL_VERIFICATION_AND_CONTACT_PRIVACY.md`: 의료인 연락처 공개 선택, 열람권과 연락처 권한 분리, 병원 사업자등록증 제출·관리자 승인
- `UPDATE_2026-08-09_ROLE_AND_DIRECT_PUBLICATION.md`: 회원가입 역할 저장·로그인 자동 분류, 병원 광고 결제 후 즉시 게시, 하단 링크 정리
- `STATUS.md`: 마지막 작업일, 배포 상태, 구현·미구현 범위
- `HANDOFF_2026-08-08.md`: 최신 전수조사·권한별 운영 API·R2 업로드·가상결제·백업 검증 및 배포 인수인계
- `HANDOFF_2026-08-03.md`: 최신 Sites v233 배포·검증 인수인계(병원 광고 승인, 상품 등급·노출기간, 프리미엄 노출)
- `HANDOFF_2026-08-02.md`: 이전 Sites v230 배포·검증 인수인계(제출 성공 전수조사, 인증 전환, 다른 PC, 출시 준비)
- `HANDOFF_2026-07-30.md`: 이전 Sites 배포·검증 기록(공고 모달, 광고 순환, 이미지 업로드, 권한)
- `HANDOFF_2026-07-29.md`: 이전 인수인계 기록(역사 보존용, R2 업로드 한계 설명은 현재와 다름)
- `FIXES_2026-07-30.md`: 2026-07-30 기능 오류 수정과 검증 기록
- `QUICK_REF.md`: 한눈에 보는 제품 정의
- `ROADMAP.md`: 단계별 출시 계획
- `DESIGN.md`: 브랜드·화면·사용자 흐름
- `ARCHITECTURE.md`: 시스템 구조
- `DB.md`: 핵심 데이터 모델
- `AUTH.md`: 회원과 권한
- `LEGAL_PRIVACY_SIGNUP.md`: 회원가입 동의 문구, 개인정보·소셜 로그인 법무/보안 기준
- `BILLING.md`: 광고 상품·결제·인재 열람권 수익모델
- `TALENT_UNLOCK_PLAN.md`: 인재 이력서 열람권과 의료인 연락처 공개 동의 분리 설계
- `RESUME_PIPELINE_PLAN.md`: 의사·의료인 이력서 등록→구직 노출(opt-in) 파이프라인
- `HEADHUNTING_BOARD_PLAN.md`: 구인·구직 게시 및 매칭 흐름
- `BILLING_INICIS_PLAN.md`: 이니시스 실결제 연동 계획(가상결제→실승인 전환)
- `SECURITY_DATA_EXPOSURE_PLAN.md`: 급여·병원·개인정보 유출 방어(서버측 필터링)
- `DATA_PROTECTION.md`: D1→R2 일일 백업, 보존기간 자동 정리, 탈퇴·복구 운영 절차
- `NOTIFICATION_SETUP.md`: 알림 발송 설정
- `API.md`: 외부 연동 및 API 원칙
- `DEPLOY.md`: 배포 운영(Sites=테스트 / Cloudflare=실결제)
- `CLOUDFLARE_MIGRATION.md`: Cloudflare Workers 이전 절차(실결제 필수 조건)
- `INICIS_SETUP_GUIDE.md`: 이니시스 키 발급·설정 가이드
- `TEST.md`: 검증 기준
- `RELEASE_READINESS.md`: 정식 출시 전 완료 조건과 외부 계약·설정 체크리스트
- `../CHANGELOG.md`: 버전별 변경과 배포 기록
- `PROFESSION_NETWORK.md`: 의료직군별 허브와 커뮤니티 확장 전략
- `ref/README.md`: 참고자료 기록 규칙

## Current Rules

기능 작업이 끝나면 `STATUS.md`의 기준일·구현 범위, `CHANGELOG.md`, 관련 설계 문서를 함께 갱신합니다. 화면에만 존재하는 기능, D1에 저장되는 기능, 외부 공급자까지 연결된 기능을 구분합니다. 공개 목록은 정적 fixture와 운영 DB가 병합되는 현재 구조도 명시하며, 둘을 실제 연동으로 오인하게 쓰지 않습니다.

## Related Docs

- `../README.md`
- `STATUS.md`
- `QUICK_REF.md`
