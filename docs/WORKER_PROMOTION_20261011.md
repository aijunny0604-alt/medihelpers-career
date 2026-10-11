# 기존 비밀값을 보존하는 운영 전환 준비

## 2026-10-11 도메인 연결 후보와 복구 구성

- `deploy/cloudflare.cutover.json`: promotion 구성을 기반으로 www/apex 두 Custom Domain을 명시했다. 동일 Worker와 운영 DB, 비밀값 보존 방식을 유지한다. drain/read-only/가입·결제 차단은 유지한다. **점검 상태로 도메인 연결을 준비하는 후보이며 정상 서비스 개방본이 아니다.**
- `deploy/cloudflare.rollback.json`: 동일 Worker를 시험 DB/workers.dev로 되돌리고 `routes: []`를 명시한다. 준비 시점의 구성이며 실행 직전 실제 설정과 다시 대조한다.
- 두 구성 모두 `wrangler deploy --dry-run --config ...` 성공. 이 검사는 패키징/설정 검증일 뿐 원격 DNS 충돌·인증서 발급·권한·실제 도메인 연결 성공을 검증하지 않는다. 실제 배포 없음.
- `node scripts/cutover-config-report.mjs deploy/cloudflare.cutover.json`은 도메인 누락 항목이 해소되지만 점검/읽기 전용으로 종료코드2를 유지한다.
- 복구 때 `routes: []` 배포만으로 랭크업 DNS가 복원됐다고 판단하지 않는다. Cloudflare의 Custom Domain 연결이 제거됐는지 확인하고, 보존한 apex/www A `121.254.171.115` DNS-only를 복구한 뒤 실제 해석/HTTPS를 확인한다. MX/TXT와 랭크업 데이터는 보존한다. 두 DB는 자동 역동기화하지 않는다.

Cloudflare Custom Domain은 Worker를 원본 서버로 사용하며 DNS와 인증서를 관리한다. 기존 호스트를 넘기는 작업이므로 dry-run 이후 실제 적용은 정식 전환 단계에만 수행한다. [공식 Custom Domains 문서](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

검증: 두 빌드·19묶음1,638개 통과, 두 Wrangler dry-run 통과. 증거는 Git 밖 `domain-candidate-audit.log`, `domain-cutover-dryrun.log`, `domain-rollback-dryrun.log`.

2026-10-11 실제 `secret list`에서 인증 ACCOUNT_HASH_SECRET/ADMIN_EMAILS, RESEND_API_KEY/RESEND_FROM, 이니시스 MID/SignKey/MobileHashKey/API key·IV 이름을 확인했다. 값은 읽거나 출력하지 않았고 재발급하지 않았다. 존재 확인은 유효성·실결제 성공 검증이 아니다.

## 다음 전환에서 사용할 구성

`deploy/cloudflare.promotion.json`은 현재 `medihelpers-staging` Worker의 식별자를 유지하면서 DB만 검증한 `medihelpers-production`에 연결하는 후보이다. Worker 이름은 내부 자원 이름이므로 정식 도메인 이름과 일치할 필요가 없다. 별도 Worker를 만드는 이전 `cloudflare.production.json` 구상 대신 이 전환 구성을 사용하면 기존 비밀값을 옮길 필요가 없다. 별도 Worker 구성은 참고용이며 현재 실행안이 아니다.

ACCOUNT_HASH_SECRET은 이메일로 회원 식별자를 계산하는 데 사용된다. 임의 새 키 생성/교체는 하지 않는다. 기존 D1_UPLOADS_ENABLED도 secret으로 등록되어 있으므로 같은 이름의 일반 vars를 넣지 않았다. 운영 적용 시 기존 비밀값 보존 여부를 배포 전후 이름 목록으로 대조한다.

아직 이 구성을 배포하지 않았다. 적용하면 기존 workers.dev 주소가 닫히고 DB 연결이 바뀌므로 현재 시험 서버와 동시에 사용할 수 없다. 로컬 테스트는 유지된다. 준비 시점 이후 두 DB의 변경분을 먼저 대조하고, 기존 관리자 세션과 재설정 토큰을 운영 개방 전에 처리해야 한다.

## 실행 전 남은 조건

2026-10-11 `npm run check:cutover-config` 추가. 현재 준비본은 정식 www/apex route 없음, 공개 진입점 없음, drain/read-only 때문에 의도적으로 종료코드2를 반환한다. 로컬 통합 검사 통과와 실제 오픈 준비 완료를 혼동하지 않는다. 이 명령은 읽기 전용이며 배포·DNS 변경을 하지 않는다. 설정만 검사하므로 성공하더라도 DNS/TLS/회원/실결제 검수는 별도다.

전환 순서는 다음과 같다.

1. 최신 원본 DNS·두 D1 export·현재 Worker 버전과 secret 이름 목록을 보호 보관한다.
2. 원래 랭크업 A레코드와 MX를 복구 기준으로 고정하고, 새 글쓰기 이후의 변경분을 복구 시 별도 대사할 담당/절차를 확보한다.
3. 보류 회원·공고·기존 주문 콜백의 처리 범위를 확정한다. 과거 PG 응답을 새 주문으로 처리하지 않는다.
4. 준비본을 그대로 배포하지 않는다. 검증된 도메인 연결 설정을 포함한 실제 적용본을 만들어 검사하고, 라우팅·TLS 준비와 DB 연결 전환을 같은 작업으로 관리한다.
5. 정식 URL의 HTTPS/로그인/이전 공고 경로/메일을 확인한 뒤 허용할 쓰기 기능을 개방한다. 실결제는 사용자 시험 전까지 차단한다.
6. 실패하면 원래 웹 DNS와 이전 Worker/DB 연결로 복귀하되, 전환 후 생성된 자료·결제 요청이 있다면 먼저 보존·대사한다. 네임서버 전체를 되돌리거나 새 메일 DNS를 지울 필요가 있는지는 별도 판단한다.

- 점검/읽기 전용·가입/결제 차단 유지. 실제 검수 없이 PG 환경을 production으로 바꾸지 않는다.
- www/apex route는 최종 전환에서 별도 적용한다. 현재 구성에는 route가 없으므로 이를 배포하는 것만으로 정식 홈페이지가 열리지 않는다.
- 잘못 배포했을 때는 기존 `cloudflare.staging.jsonc`와 검증한 이전 앱 버전/DB 바인딩으로 돌아간다. 실제 데이터가 쓰인 뒤에는 DB 차이 대사 없이 전환하지 않는다.
- 랭크업 원본 문제는 사용자 요청으로 보류한 상태이며 해결된 것이 아니다.

검증: 두 빌드 및18묶음1,630개 통과. Worker명 유지·운영 DB 선택·secret과 일반 변수 충돌 방지·결제 차단 확인. 실제 설정/DB/도메인/키 변경 없음. 앱18ac426/Workerff470704 유지.
