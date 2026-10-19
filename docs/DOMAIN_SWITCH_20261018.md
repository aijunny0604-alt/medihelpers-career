## 2026년 10월 19일 현재 운영은 랭크업

사용자 요청으로 추가 개발을 중단하고 12:01 KST에 www/apex의 신규 앱 Route 2개를 해제했다. 정식 주소는 기존 랭크업으로 복귀했으며, 신규 Worker는 drain 상태로 DB와 함께 보존한다. 카드·실시간계좌이체·무통장 재활성화는 기존 관리자 로그인 후 완료해야 한다.

**신규 사이트 재개 요청 전에는 재배포 또는 Route 재연결을 하지 않는다.** 아래 신규 앱 배포·활성/미배포 문구는 당시 이력이며 현재 운영 상태가 아니다. [현재 운영](OPERATIONS_CURRENT.md) · [오늘 작업](WORKLOG_20261019.md) · [복구 결과](RANKUP_RESTORE_20261019.md).

# 정식 도메인 전환 기록 — 2026-10-18

> 현재 운영 상태는 [OPERATIONS_CURRENT.md](OPERATIONS_CURRENT.md)를 우선한다. 아래 표는 **전환 직후 가입·결제를 열기 전의 기록**이다. 같은 날 신규 가입·PC/모바일 카드 요청이 개방됐고, 최신 앱은 e2eea9c / Worker 012569ab-4603-497e-ab45-739a3c4d9802이다. 신규 가입 보류 해제와 기존 이전회원282의 이용 재개 보류는 별개다.

사용자는 회원 재개·실결제 시험을 보류한 상태로 도메인 전환을 승인했다. **www.medihelpers.co.kr 및 medihelpers.co.kr에 새 홈페이지 연결을 완료했다.** 기존 랭크업 파일·DB·호스팅은 보존했다. 이는 공개 화면 전환 완료이며 회원 서비스·실결제·검색엔진 공개 완료가 아니다.

## 전환 직후 상태 — 후속 기능 개방 전

| 항목 | 실제 상태 |
|---|---|
| 배포 소스 | `91d79064d9b87d4a225c27c3c6976013a2a54e5d` — 배포 시 GitHub 기준 브랜치와 Sites main 일치 |
| 공개 Worker 버전 | `14b09a15-dccc-4fe6-b153-623aa7deb592` |
| 전환 점검 Worker 버전 | `5a886aec-b1d1-47a3-8527-a47b2d99723e` |
| 연결 | www/apex 전체 경로 두 Workers Routes → medihelpers-staging. 이름에 staging이 있지만 현재 production DB에 연결됨 |
| DB | medihelpers-production / `ef6090da-544c-446f-bd31-32b631b2d2d6` |
| 회원 | 계정283, 운영자 active1 / 이전회원 suspended282. 신규 가입 false, 테스트 계정 전환 false |
| 새 결제 | checkout false, INICIS_ENV=test, 모바일·자동환불 false. 신규 주문·승인·환불·영수증 테이블 각각0행 |
| 공개 범위 | 홈·공고·기존 광고 조회. migration=open / readOnly=false이며 전체 쓰기 금지 모드는 아님. 가입·구매는 별도 서버 차단 |
| 검색·약관 | noindex=true / legal draft 유지. 검색엔진 노출 및 전체 유료 서비스 오픈 보류 |
| DNS | www/apex A 값121.254.171.115 유지·프록시 켬. wildcard DNS-only, Daum MX/SPF·Resend DNS 유지 |
| 보안 | Full(Strict), Universal SSL 활성, www/apex HTTP→HTTPS 308 규칙 활성, workers.dev/preview 비활성. 기존 secret binding11개 유지 |

최종 문서 정리 커밋은 위 앱 배포 소스와 다를 수 있다. 문서만 수정한 커밋을 새 앱 배포로 계산하지 않는다.

## 전환 직전 확인

- 이니시스 로그인 후 가상계좌 설정을 읽었다. 실시간 통보 / 수신모듈(윈도우버전), IP·PORT·URL은 공란이었다. 설정·키를 변경하거나 통보를 재전송하지 않았다.
- 가상계좌 입금요청 합계: 2025년 각 분기, 2026년 1~3분기, 2026-10-01~18에 조회내역 없음. 최근 2026-07-19~10-18 합계의 총계·미확인·수동처리도 각각 0. 최초 내역조회는 로딩에 멈춰 재접속 후 합계조회로 확인했다. 조회 범위 밖 과거 이력까지 없다는 의미는 아니다.
- 입금통보 재전송 대상: 2026-07-19~10-18 조회내역 없음. 오늘 카드 승인·취소 및 실시간계좌이체 0건. 기존 일반 완료 목록은 223건/419,000원으로 이전 집계와 같고 무통장 대기0건이다. 과거 미대사 거래를 새 결제 성공으로 바꾸지 않는다.
- 기존 카드·실시간계좌이체·무통장 선택을 중지했다. 저장 확인창 제어가 실패했지만, 이후 별도 관리자 프레임을 새로 열어 세 체크 false와 새 공개 다이렉트 화면의 수단 없음 확인. 원래 값은 셋 모두 true, 핸드폰 false다. PG 모듈·키·주문을 변경하지 않았다.

## 연결 검증

기존 www/apex 원본 IP 지정 HTTPS GET은 각각 200/TLS 검증 성공이었다. Cloudflare SSL을 Full(Strict)로 설정하고 www/apex A의 주소 121.254.171.115를 유지한 채 프록시를 켰다. wildcard와 메일 DNS는 유지했다. Universal 인증서는 활성 상태다.

임시의 정확한 두 경로에 한정된 Worker로 동일 호스트 Route fetch를 실제 확인했다. www/apex 각각 원본의 미존재 경로 404, 기존 close.php 200/135바이트/닫기 표식, 외부 응답 no-store를 확인했다. 익명 GET만 사용했다. 실제 승인 POST·고객 세션 연속성 검증은 아니다. 임시 Worker와 Route는 검증 후 제거했고 Cloudflare 화면에 운영 Route 두 개만 있는 것을 확인했다.

공개 직후 앱 안 브라우저의 www 탐색 두 번에 ERR_CONNECTION_CLOSED가 나타났으나, 별도 HTTP 요청은 두 호스트 모두200/TLS정상이었다. 이후 apex 화면을 연 뒤 www로 다시 탐색해 정상 렌더링·가입·광고 메뉴 이동을 확인했다. 원인은 확정하지 않았으며 인증서 검증을 해제하거나 TLS 수준을 낮추지 않았다.

추가 검수에서 HTTP 주소가200으로 그대로 열리는 문제를 발견해 무료 Single Redirect 규칙 `Medihelpers HTTPS for web hosts`를 활성화했다. 조건 `(http.host in {"www.medihelpers.co.kr" "medihelpers.co.kr"} and not ssl)`, 대상 `concat("https://", http.host, http.request.uri.path)`, 상태308, 쿼리 문자열 유지다. 두 웹 호스트에만 적용하며 메일·다른 서브도메인을 포함하지 않는다. [공식 설정 문서](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/)에 따라 요청 메서드 보존308을 사용했다. 무료 규칙10개 중1개 사용으로 표시된다.

## 배포 단계

- `cloudflare.drain-with-legacy-replies.json`: 두 원본 Route, production DB, 점검 모드, 신규 쓰기 차단, 확인된 기존 반환 세 경로 전달.
- `cloudflare.open-with-legacy-replies.json`: 같은 DB/Route, 공개 화면 개방, 가입·결제 차단, 기존 회원 보류 유지. noindex를 유지하므로 검색엔진 공개 완료는 아니다.
- 운영 설정 전환은 `--keep-vars` 없이 실행한다. secret binding은 유지한다. stage SQL로 production을 덮어쓰지 않는다.
- 기존 결제 반환 경로는 INIStdPayReturn.php/close.php/popup.php 세 개뿐이다. 미확인 통보 경로를 임의 허용하지 않는다. 실제 카드 시험은 사용자 보류이며 결제 성공을 보장하는 기록으로 사용하지 않는다.

## 복귀

1. 새 쓰기를 중단하고 production D1 변경분을 별도로 백업한다.
2. www/apex의 새 앱 Route를 제거하고 두 A를 121.254.171.115/DNS-only로 복원한다. 메일 DNS와 NS는 그대로 둔다.
3. 기존 관리자에서 카드·실시간계좌이체·무통장을 다시 선택·저장하고 공개 입력 화면을 확인한다. 키 재발급은 하지 않는다.
4. 새 Worker/production DB는 변경분과 진행 결제 확인을 위해 보존한다. 진행 중인 새 결제 응답이 없다는 확인과 별도 수신 대책 없이 stage 설정으로 덮어쓰지 않는다. 상세는 최신 복구 실행서를 따른다.

DNS 캐시 때문에 모든 방문자가 즉시 바뀌지는 않는다. 새 D1 변경분은 자동으로 랭크업에 역이전되지 않는다. FTP 전체 백업은 보류 상태이므로 기존 서버 자체 장애까지 포함하는 무손실 보장은 하지 않는다.

비공개 증거: 감사 폴더의 pg-request-*, pg-notification-*, pg-card-t0-20261018.txt, rankup-paid-t0-20261018.txt, old-freeze-confirmed-t0-20261018.json, route-origin-20261018/, cutover-t0-{prod,stage}-20261018.sql. 고객·키·원문 SQL은 Git에 올리지 않는다.

## 완료한 검수

- 단위473, production SQL 메모리 복사본의 공개/점검/복구24(변경행0·외부통신0), 기존 응답 합성34 통과. 두 빌드·Worker문법·diff 통과. 앞선 전체1,894검사와 구분하며 실제 카드/역할3종 로그인 검증은 이번에 실행하지 않았다.
- drain 상태 실제 도메인10검사 통과: 홈503, 기존 신규 주문 경로503, close.php200, no-store.
- 공개 상태26검사 통과: www/apex 홈·공고200, 익명관리자403, 가입·신규 주문503, 테스트 전환404, 미존재 주문 승인404, 구 신규 주문 POST405, close.php200, PC·모바일 구 공고 링크301과 새 상세200, JS해시 일치, robots 차단. 결제 시험이 아닌 차단/조회 검사이며 새 주문을 만들지 않았다.
- 실제 브라우저에서 www/apex 홈, 기존 청아병원 광고 상세, 가입 중단 및 광고 결제 중단 안내 확인. 정식 www 홈 화면을 사용자에게 열어두었다.
- 공개 Worker 원격 메타데이터에서 production DB·운영 변수·secret binding 이름/종류 확인. 비밀값은 조회·출력하지 않았다.
- 전환 후 원격 DB 집계: 계정283(이전회원282 보류), 새 주문/거래/환불/영수증0. 기존 계정 재개나 신규 결제 생성 없음.
- 구 서버 직접 IP 지정 관리자 GET200 / TLS 검증0 / 원격121.254.171.115. 기존 서버 보존·접근을 확인한 것이며 전체 백업 복원이나 실제 로그인 시험과 구분한다.
- HTTPS 보완 후 추가14검사 통과: www/apex HTTP GET·HEAD·빈 POST308, 경로·인코딩된 검색조건 보존, HTTPS 홈/서비스상태/기존 close.php200 및 결제차단 유지. 실제 결제 POST나 개인정보를 전송하지 않았다.

비공개 후속 증거: domain-{drain,open}-http-20261018.json, domain-open-version-20261018.json, domain-open-db-counts-20261018.json, domain-open-member-status-20261018.json, domain-open-routes-20261018.txt, dns-after-cutover-20261018.txt, domain-open-home-20261018.png, domain-open-advertise-20261018.png.

HTTPS 규칙 증거: domain-https-edge-20261018.json / domain-https-rule-20261018.png. DNS-only로 복귀하면 Cloudflare 엣지 규칙은 해당 호스트 요청에 적용되지 않는다. 복귀 후 프록시를 다시 켤 때 이 규칙의 존재를 함께 검토한다.

## 백업과 남은 범위

전환 전 production SQL SHA-256: `e88f730c5f515d868ed4ed7fbb6c595960d8d0ad0935237cd5d5fd92722d32d5`.
stage SQL SHA-256: `c8483c55426fe54a22d052bd0e791327a89efc3303312bd222c09bfb5a1adada`.
두 SQL 모두 비공개 감사 폴더에 보존한다.

전환 직후에는 회원 재개, 실제 카드 승인·취소/환불, 과거 주문 개별 TID 확정 대사, 미확인 모바일/일반 통보 경로, 새 도메인 실제 역할별 로그인, 랭크업 FTP 전체 백업·신규 변경분 역이전을 완료하지 않았다. 이후 신규 가입·카드 요청 개방 및 실제 운영자 인증 검수를 완료했으며 최신 구분은 운영 현황을 따른다. PG 조회의0건은 조회 범위에서의 결과이며 모든 과거 거래에 문제가 없다는 보장은 아니다.
