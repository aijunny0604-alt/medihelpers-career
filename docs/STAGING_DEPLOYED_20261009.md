# 2026-10-09 별도 검수 사이트 배포

사용자가 기존 홈페이지를 보존하며 별도 사이트에서 진행하는 방식을 승인했다. 이번 승인은 검수 사이트 선배포 후 실제 역할 검수 순서에 한정된다. 정식 도메인 전환·실결제 오픈·회원 활성화를 승인하거나 완료한 기록이 아니다. 기존 세 역할 사전 검수 규칙의 검수 환경 한정 순서 변경을 기록한다.

## 실제 배포

- URL: https://medihelpers-staging.aijunny0604.workers.dev/
- 앱 소스: fa09a254fbe23bcaeab4e97767c1618e6c426bdb
- Worker 버전: 52e5f83c-bdfd-45a7-b1e9-01e8c9fc2c29
- 배포 ID: d8603b03-9a37-4ac1-9c94-e0cefce989df
- 배포 시각: 2026-10-09 22:07 KST, 해당 버전 100% 확인.
- GitHub 기준 브랜치와 Sites 소스 미러 동일 SHA 확인 후 Cloudflare에 배포했다. Sites에 게시하지 않았다.
- 기존 deploy/cloudflare.staging.jsonc 및 --keep-vars 사용. 기존 DB·secret 유지, R2·유료 서비스·정식 도메인 route 추가 없음.
- CHECKOUT_ENABLED=false, INICIS_ENV=test, INICIS_REFUNDS_ENABLED=false, INICIS_REFUND_MODE=manual. 회원가입·QA 전환 비활성, 검색 노출 차단 유지.

## 검증 결과

- audit:precutover: 18묶음 1,610개 통과(단위436 포함), 일반/Cloudflare 빌드 및 Worker 문법 검사 통과.
- 루트 HTTP200, HTML no-store, noindex/nofollow. 로컬 빌드의 JS/CSS 해시 파일명과 원격 HTML 일치, 주요 JS HTTP200.
- 익명 /api/account HTTP200, 관리자 보호 API403. robots.txt200.
- 실제 배포본 아이디 찾기 빈 입력: 이름·휴대전화 각각 구체적 오류 표시. X 버튼 오른쪽 정렬 및 닫기 동작 확인. 메일 발송 없음.
- 이번 브라우저에서는 관리자 세션이 만료되어 권한 필요 화면이 나왔다. 이전 로그인 성공 기록을 이번 배포의 인증 검증으로 대체하지 않는다. 관리자 재로그인 및 새 세션 의료인/병원 역할 검수는 미완료.
- www.medihelpers.co.kr A=121.254.171.115 재확인. 이번 작업에서 DNS·기존 랭크업·PG 설정 변경 없음.

## 반영 내용과 남은 범위

로그인/회원가입/복구 안내, 오류 알림 닫기 버튼, DB 스키마 확인의 LIMIT 0 및 초기화 동시 요청 합치기, 수동 환불 대조/원장 기능 등을 후보에서 실제 검수 서버로 반영했다. D1 읽기량 최적화의 실제 감소율은 아직 측정하지 않았다.

이전 회원281명 및 공고127건의 보호 상태를 변경하지 않았다. 원본 인수·광고 권리 대조, 세 역할 실사용 검수, 사용자가 나중에 진행할 실카드 승인/취소 확인, 정식 도메인 전환은 남아 있다. 따라서 이번 완료 범위는 별도 검수 사이트 업데이트이며 정식 서비스 오픈 완료가 아니다.

증거는 비공개 감사 폴더의 staging-release-audit.log, staging-deploy-20261009.log, staging-release-deployments.json, staging-release-http.json, staging-release-proof-20261009.png에 보관한다. 이후 문서 커밋은 위 실제 배포 앱 SHA와 구별한다.
