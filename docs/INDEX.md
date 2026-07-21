# 문서 인덱스

## Purpose

사업, 제품, 개발 문서의 기준점을 제공합니다.

## Current State

- `STATUS.md`: 마지막 작업일, 배포 상태, 구현·미구현 범위
- `QUICK_REF.md`: 한눈에 보는 제품 정의
- `ROADMAP.md`: 단계별 출시 계획
- `DESIGN.md`: 브랜드·화면·사용자 흐름
- `ARCHITECTURE.md`: 시스템 구조
- `DB.md`: 핵심 데이터 모델
- `AUTH.md`: 회원과 권한
- `LEGAL_PRIVACY_SIGNUP.md`: 회원가입 동의 문구, 개인정보·소셜 로그인 법무/보안 기준
- `BILLING.md`: 광고 상품·결제·인재 열람권 수익모델
- `TALENT_UNLOCK_PLAN.md`: 인재 이력서 열람권(병원 결제→연락처 공개) 설계
- `RESUME_PIPELINE_PLAN.md`: 의사·의료인 이력서 등록→구직 노출(opt-in) 파이프라인
- `HEADHUNTING_BOARD_PLAN.md`: 구인·구직 게시 및 매칭 흐름
- `BILLING_INICIS_PLAN.md`: 이니시스 실결제 연동 계획(가상결제→실승인 전환)
- `SECURITY_DATA_EXPOSURE_PLAN.md`: 급여·병원·개인정보 유출 방어(서버측 필터링)
- `NOTIFICATION_SETUP.md`: 알림 발송 설정
- `API.md`: 외부 연동 및 API 원칙
- `DEPLOY.md`: 배포 운영(Sites=테스트 / Cloudflare=실결제)
- `CLOUDFLARE_MIGRATION.md`: Cloudflare Workers 이전 절차(실결제 필수 조건)
- `INICIS_SETUP_GUIDE.md`: 이니시스 키 발급·설정 가이드
- `TEST.md`: 검증 기준
- `../CHANGELOG.md`: 버전별 변경과 배포 기록
- `PROFESSION_NETWORK.md`: 의료직군별 허브와 커뮤니티 확장 전략
- `ref/README.md`: 참고자료 기록 규칙

## Current Rules

기능 작업이 끝나면 `STATUS.md`의 기준일·구현 범위, `CHANGELOG.md`, 관련 설계 문서를 함께 갱신합니다. 화면에만 존재하는 기능, D1에 저장되는 기능, 외부 공급자까지 연결된 기능을 구분합니다. 공개 목록은 정적 fixture와 운영 DB가 병합되는 현재 구조도 명시하며, 둘을 실제 연동으로 오인하게 쓰지 않습니다.

## Related Docs

- `../README.md`
- `STATUS.md`
- `QUICK_REF.md`
