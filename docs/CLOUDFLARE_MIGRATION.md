# Cloudflare 운영 환경 준비

2026-09-24 기준. [전체 전환 절차](MIGRATION_20260924.md)를 먼저 확인한다. 현재 Cloudflare 계정 배포와 도메인 연결은 미실행이다.

1. npm run build:cf로 dist-cf/server/index.js, public, drizzle, wrangler.toml을 만든다. 자동 생성 설정은 다음 빌드에 덮어쓰이므로 운영 최종 설정은 별도의 접근 제한 배포 환경에서 관리한다.
2. 운영 계정에 D1, BACKUPS R2, UPLOADS R2를 준비한다. Sites 프로젝트의 기존 바인딩은 바꾸지 않는다. 생성된 wrangler.toml의 D1 placeholder를 실제 운영 DB ID로 채운다.
3. 전체 SQL을 무작정 실행하지 말고 기존/신규 DB 여부와 마이그레이션 적용 이력을 확인한 후 drizzle 파일을 순서대로 적용한다. 회원 이전은 원본 스키마 매핑·격리 리허설을 통과한 importer로만 수행한다.
4. assets.run_worker_first=true로 HTML no-store와 요청 도메인의 canonical을 Worker에서 생성한다. 각 도메인의 HTTPS를 먼저 검증한다.
5. 기본값은 TEST_ACCOUNT_SWITCH_ENABLED=false, PAYMENT_LIVE=true, SIGNUP_ENABLED=false, LEGAL_DOCUMENT_STATUS=draft. 실제 운영자 ADMIN_EMAILS와 ACCOUNT_HASH_SECRET은 별도 시크릿으로 설정한다. 새 빌드가 임의의 테스트 관리자를 부여하지 않는다.
6. 기존 Sites 데이터를 옮기는 경우 ACCOUNT_HASH_SECRET과 사용자키 관계를 유지하거나 검증된 재매핑을 한다. 랭크업 원본 암호화 방식과는 별개다. 회원·R2 첨부·동의·결제·권리 모두 보존/대사한다.
7. 이메일과 PG는 외부 검증을 완료한 뒤 활성화한다. staging은 별도 DB와 테스트 PG를 사용한다. 테스트 계정·정적 예시 데이터는 운영본에서 별도 제거한다.
8. 백업 다운로드·복원, 역할별 인증, 브라우저/모바일, PG 성공/실패/취소, 메일 수신 확인 후 DNS 전환을 승인한다.

이전 문서의 약관상 특정 플랫폼 결제 금지 단정은 원문 재확인이 필요하다. 현재 별도 운영 환경을 준비한다는 프로젝트 결정과 약관 확인 여부를 혼동하지 않는다.
