# 정식 전환 전 통합 검증 — 2026-10-09

기준 후보642ede0에서 서비스·설정·백업·코드·이전 자료를 묶어 확인했다. 배포 완료 보고서가 아니다. 현재 사용자 범위는 정식 도메인 전환 직전까지이며 운영자 비밀번호 설정·업체 문의는 보류/금지 상태다.

## 현재 서비스와 후보의 차이

| 항목 | 실제 원격 확인 | 최신 후보 |
|---|---|---|
| Worker | 2b96835c-1d77-4eb9-942f-c6d19aed3286, 앱82b1201 | 642ede0 기준 기능·후속 문서 |
| 읽기 전용 | STAGING_READ_ONLY=true | 동일 |
| 가입·주문 | SIGNUP_ENABLED=false, CHECKOUT_ENABLED=false | 동일 |
| 이니시스 | INICIS_ENV=test, INICIS_REFUNDS_ENABLED=false | 동일 + INICIS_REFUND_MODE=manual |
| 테스트 전환 | TEST_ACCOUNT_SWITCH_ENABLED=false | 동일, 운영 fixture 제외 |
| 검색·보존 | STAGING_NOINDEX=true, D1_RETENTION_ENABLED=false | 동일 |
| 법적 문서 상태 | LEGAL_DOCUMENT_STATUS=draft | 동일. 최종 운영 검토 미완료 |
| 웹 연결 | apex/www A121.254.171.115 | 새 라우트 연결하지 않음 |
| 메일 | aspmx.daum.net/alt.aspmx.daum.net | 변경 없음 |

원격 수동 환불 모드는 아직 없고 구현도 이전 버전이다. Git 동기화만으로 이 기능이 검수 URL에 배포됐다고 말하면 안 된다. 원격 버전 정보는 비밀키 값을 읽지 않고 필요한 일반 설정만 대조했다. 유료 자원·R2·랭크업 결제 중계를 생성하지 않았다.

## 이번에 끝낸 검증

- 실제 검수 URL8개 GET: 페이지/로그인/계정/robots 정상, 익명 관리자403·이력서401. HTML no-store와 noindex 확인. 실제 로그인 검증 아님.
- 공개 DNS4조회: apex/www 기존IP, Daum MX, Cloudflare NS 일치. 전체DNS export는 앞선9레코드 백업이며 이번에는 공개 응답을 재확인했다.
- 새 D1백업 medihelpers-20261009-064823-61be016c.sql,47테이블·4,727,830바이트. SHA256 `813ee0b8d2cc49b5955bef02c547562c9420ea71587243ee89db9a2879fcc1ca`. 앞선02:40UTC 백업과 스키마/모든 행 동일.
- 최신 후보 audit:precutover:18묶음1,598개 전부 통과, 일반/Cloudflare 빌드 통과.
- 운영 fixture/QA 제거와 로컬 유지8개 검사 통과. 이미지91개·5,057,926바이트 원본/빌드 응답 대조 통과.
- 공고101건 적용·원복/충돌 처리 리허설은 앞선 동일 해시 백업에서 성공.26건 보류를 유지한다.
- 별도 작업본의 미커밋 변경 없음 확인. GitHub 기준과 Sites 미러 동일 SHA 동기화 후 문서를 반영한다.

## 남은 필수 단계와 처리 주체

1. **운영자 본인 설정·실제 역할 로그인**: hr@medihelpers.co.kr의 비밀번호 설정은 사용자가 나중으로 미뤘다. 메일을 반복 발송하거나 대리 설정하지 않는다. 저장소 AGENTS.md/DEPLOY_GUARDRAILS.md가 실제 운영 의료인·병원·관리자 새 세션 검수를 요구하므로 합성 세션으로 통과 처리할 수 없다.
2. **실제 카드 한 건의 승인·취소·원장/권리 대사**: 테스트할 카드와 주문이 특정돼 있지 않다. 합성 검사·공식 PG 테스트 응답은 실제 UPmedihelp 거래 성공을 입증하지 않는다. 사용자 결제와 이니시스 관리자 취소 후 홈페이지 대사를 함께 확인해야 한다.
3. **이전 자료 최종 인수**: 회원281명 활성화 보류, 공고127개 보호초안 및26개 예외, 기존 광고기간/권리와 랭크업 전체DB/첨부·증분은 미확정이다. 현재 D1 백업이 이를 대체하지 않는다.
4. **후보 검수 배포와 최종 운영 검토**: 위 실제 역할 검수 및 배포 조건 충족 후 후보의 수동환불 모드를 포함한 배포·원격 미디어 제공·공개 범위·메일·문서 검수. DNS 변경/실결제 개방은 현 범위 밖이다.

고정IP/Oracle/자동 INIAPI 환불은 사용자가 선택한 수동 환불 운영의 초기 오픈 필수조건으로 되돌리지 않는다. 기존 랭크업을 삭제하거나 중계용으로 사용하지 않는다. 이후 자료와 역이전 경로 확보 없이 즉시 무손실 복구를 보장하지 않는다.

## 증거 위치

Git 밖 C:/Users/ROSSA/medihelpers-audit-20260927/에 runtime-version-bundle-20261009.json, release-public-readiness-20261009.json, release-db-comparison-20261009.json, release-bundle-audit-20261009.log 및 신규 백업/검증 manifest를 보관했다. 원본 설정·회원/결제 자료를 Git에 복사하지 않는다.

정식 전환과 실제 결제를 실행하지 않았다. 준비 검사를 모두 통과했다는 이유로 위 필수 단계가 완료된 것으로 해석하지 않는다.
