# 기존 결제 응답 보존 후보 — 미적용

## 임시 호스트의 실제 Route 진입 검증

Cloudflare 로그인 후 원래9개 DNS 레코드를 확인했다. www/apex/wildcard A는121.254.171.115 DNS-only이며 Daum MX와 Resend 레코드는 유지됐다. 임시 migration-probe-20261014.medihelpers.co.kr에만 proxied A와 별도 Worker Route를 만들었다. Worker는 비밀 토큰이 있는 GET /probe만 허용하며 고정된 기존 www의 close.php를 조회했다. 고객 쿠키·PG 본문은 전달하지 않고 결과의 상태/크기/표식만 반환했다.

실제 임시 호스트 HTTPS 요청200, 원본 close.php200/135바이트/닫기표식, no-store 확인. 임시 Worker 버전c71fc6a9-54cf-4a54-b4a3-11f40ef19a15. 검증 후 임시 DNS를 삭제하고 Worker 삭제 성공을 확인했다. DNS 목록은 원래9개로 돌아왔고 www/apex/MX/TXT 값과 프록시 상태가 유지됐다. 정식 앱 Worker·DB·실제 결제는 변경하지 않았다.

중요한 한계: 임시 호스트 이름으로 기존IP에 직접 HTTPS를 보내면 Windows TLS 검증에서 SEC_E_CERT_EXPIRED가 났다. 동일 조건의 www 호스트 close.php는200/TLS 검증 성공이었다. 따라서 임시 호스트를 그대로 원본으로 전달하는 시험 대신 고정 www URL을 사용했다. 이번 결과는 **임시 호스트 Route 진입 + 기존 www 조회** 증거이며, 정식 www의 동일호스트 Route fetch·PHP 로그인 세션·PG 승인 검증이 아니다. 인증서 검증을 끄거나 Cloudflare SSL 모드를 낮추지 않았다.

추가 공개 폼 조사에서 일반 광고/열람권 결제 GET은HTTP200이지만 병원회원 전용 경고 스크립트만 반환했다. 성공적인 결제폼 조회로 집계하지 않는다. 모바일 User-Agent의 다이렉트 주소도 PC INIStdPay 폼을 반환하므로 모바일 P_NEXT_URL/P_NOTI_URL 확보로 간주하지 않는다. PC 세 응답 경로는 앞선 기록과 동일했다. 결제 준비 POST·승인 엔드포인트 호출은 하지 않았다.

비공개 근거: route-probe-20261014/result.json, deploy-private.log, cleanup.log 및 legacy-more-payment-20261014.json. 실제 원격 시험만 진행했으며 앱 코드 수정/재배포나 전체 회귀 재실행은 없었다.

## POST 리다이렉트 재전송 방지 추가

격리된 가짜 원본이307을 반환했을 때 기존 후보가307/Location을 그대로 반환하는 것을 재현했다. fetch의 redirect:manual은 서버가 따라가지 않게 할 뿐, 응답을 받은 브라우저의307/308 POST 본문 재전송까지 막지는 않는다. 실제 원본이나 이니시스에서 이런 응답이 발생했다고 확인한 것은 아니다.

POST에 대한307/308은 원본 응답 스트림을 취소하고 Location/Set-Cookie 없이502·no-store·재결제 금지 안내로 바꾼다. 같은 호스트나 상대 경로도 결제 데이터 재전송을 막기 위해 동일하게 처리한다. 원본이 이미 처리했을 수 있으므로 결제 실패 확정·자동 재시도·자동 환불은 하지 않는다. POST303 영수증 이동과 GET/HEAD 이동은 유지한다.

회귀검사4개 추가, 브리지9개 및 전체19묶음1,832검사·두 빌드 통과. 비공개 로그 bridge-replay-audit-20261014.log. 생성 Worker에 연결하지 않은 후보의 수정이며 실제 배포/원격DB/DNS/PG 거래는 변경하지 않았다. 배포 앱8522745/Workerf4080523 유지. 아래의 원본 통신·세션·같은 zone Route·미확보 경로 검증은 여전히 필요하다.

## 해결하려는 문제

Custom Domain으로 www/apex 원본을 새 Worker로 바꾸면 기존 PHP 결제 응답이410으로 끝난다. 기존 호스팅을 보존하는 전환 기간에는 원본 A주소121.254.171.115를 유지한 Workers Route 방식이 후보가 될 수 있다. Cloudflare 공식 문서에 따르면 Route의 fetch(request)는 DNS에 설정된 원본으로 전달한다.

출처: https://developers.cloudflare.com/workers/configuration/routing/routes/ (2026-10-14 확인). 이는 공식 기능으로부터 도출한 이전 설계이며 실제 메디헬퍼스 경유 통신 성공을 확인한 것이 아니다.

## 구현한 격리 후보

server/legacyPaymentBridge.js는 아직 생성 Worker에 import/삽입하지 않았다. LEGACY_PAYMENT_BRIDGE_ENABLED=true일 때만 후보가 동작한다. HTTPS www/apex에서 확인된 inistdpay/INIStdPayReturn.php, close.php, popup.php의 정확한 경로만 대상으로 한다. GET/HEAD/POST 외에는405, 임의 관리자/다른 호스트/경로변형은 대상이 아니다.

원본 POST 본문과 쿼리를 보존한다. 새 사이트 Authorization 및 쿠키를 제거하고 유일한 PHPSESSID만 전달한다. 응답 쿠키도 PHPSESSID만 허용하며 캐시하지 않는다. 리다이렉트를 서버가 자동 따라가지 않는다. 전달 실패는502와 재결제 금지 안내를 반환하고 자동 재시도하지 않는다. 원본이 이미 승인 처리했을 가능성을 성공/실패로 단정하지 않는다. 기존 session 이름이 다른 경우에는 실제 근거를 확보한 뒤 수정해야 한다.

5개 단위검사에서 비활성/허용범위/본문·쿠키·헤더/리다이렉트/실패 시 단일요청/잘못된 메서드를 확인했다. 전체19묶음1,794개와 두 빌드 통과. 가짜 upstream만 사용했으며 PG·실고객 데이터 전송은 없다.

## 실제 전환 전 남은 검증

1. 별도 검증 호스트에서 Cloudflare→기존 원본 TLS와 Host 유지 확인. 실제 결제 제출 대신 무해한 읽기부터 검증한다.
2. 기존 PHP가 필요한 세션/응답 뒤 화면/추가 리소스 경로 확인. 현재 세 경로가 모든 PC광고·모바일·입금통보를 포함한다고 판단하지 않는다.
3. 프록시 DNS와 Route 구성의 실패 시 동작, Worker 무료 한도 초과 시 구 사이트로 흐를 가능성, 캐시/WAF가 PG POST에 미치는 영향 확인.
4. 검증 후 생성 Worker의 점검 gate보다 앞에 제한된 전달부를 연결하고 기존 Custom Domain 전환안과 교체한다. 두 안을 동시에 적용하지 않는다. 원본이 Worker인 Custom Domain에서 같은 request를 fetch하면 기대한 구 서버로 전달되지 않는다.
5. 전환 후 새 사이트 쓰기와 구 사이트 신규 주문을 동시에 열지 않는다. 기존 거래가 정리된 후 이 임시 의존을 제거해야 랭크업 비용 종료가 가능하다.

현재 DNS/Cloudflare Route/Worker 배포/원본 DB는 변경하지 않았다. 정식 이전 차단 사유가 해결 완료된 것이 아니라 해결 후보를 코드로 만든 상태다. 기존 신규 주문을 중단하고 모든 진행 거래를 정리하는 대안도 그대로 유효하다.

복귀: 이 Route 방식이 검증·적용된 경우 새 앱으로 가는 Route를 제거하고 기존 A/DNS-only 복원 후 실제 HTTPS 확인. Custom Domain 복구 절차와 혼동하지 않는다. 새 사이트 자료는 별도 보존·역대사해야 한다.

## Cloudflare 실제 외부 통신 검증 — 2026-10-14 KST

별도 인증된 remote preview에서 익명 GET 3건을 실행했다. 홈 200/4,381바이트, 공개 다이렉트 결제 입력화면 200/37,501바이트, 후보 전달함수를 통한 close.php 200/135바이트를 확인했다. 결제 입력화면에서 INIStdPay 표식, close.php에서 닫기 스크립트 표식 및 no-store 응답을 확인했다. 인증서 검증을 끄거나 Host를 임의 변경하지 않았다.

홈과 입력화면은 PHPSESSID 쿠키를 발급했다. 추가 쿠키 rbUser와 rankup_log_start도 관찰됐으므로 PHPSESSID 하나만으로 모든 기존 결제 흐름이 유지된다고 확정하지 않는다. 쿠키 값과 결제폼의 숨김 필드 값은 결과 문서에 저장하지 않았다.

이번 검증은 Workers에서 현재 DNS-only 원본으로 보내는 HTTPS 통신이다. 정식 호스트의 proxied A+동일 zone Route를 구성한 검증이 아니며, 결제 승인·환불·세션 연속성 검증도 아니다. INIStdPayReturn.php에는 요청하지 않았다. 기존 결제 생성/변경 및 DNS 변경은 없다. 기존 서버는 일반 GET에 따른 익명 세션/접속 로그를 기록할 수 있다.

임시 preview는 검증 후 종료했다. D1·R2·정식 Worker·Routes를 생성하거나 변경하지 않았다. 증거는 비공개 감사 폴더 bridge-probe-results-20261014.json에 보존했다. 앱 배포 버전은 23feeac2-7dec-49f8-b39b-842ea6effcc4 그대로다.

### 전환 판정에서 구분할 항목

- 완료: Workers에서 기존 호스트로 TLS 통신, 공개 결제 입력화면 접근, close.php 제한 전달 및 no-store.
- 미완료: 같은 zone Route 원본 전달, 세션을 가진 실제 기존 주문 응답, 일반 광고/모바일/입금 통보 경로 전수 확인.
- 전환안 선택 전: 기존 진행 결제를 모두 정리해 구 응답 보존이 불필요한지 확인하거나, 위 미완료 검증을 완료해야 한다. 임시 연결 후보를 검증 없이 운영에 켜지 않는다.
- 복구 범위: DNS/Route 복구는 화면 연결 복구다. 신규 가입·게시글·결제·열람권 변경의 역대사는 별도이며 자동 복구로 표현하지 않는다.

## 설정 충돌 및 익명 세션 추가 검수

기존 check:cutover-config는 LEGACY_PAYMENT_BRIDGE_ENABLED=true와 Custom Domain 조합을 configurationReady:true로 잘못 판정했다. 이제 해당 조합을 legacy-bridge-custom-domain-conflict로 차단하고 www/apex 각각 원본 Route가 없으면 호스트별 누락을 보고한다. HTTPS 명시 Route 패턴도 지원한다. 활성화하지 않은 기존 후보의 판정은 유지한다. 이 정적 검사 통과는 DNS 원본 IP·프록시 상태·실제 연결을 확인한 의미가 아니다.

회귀검사 3개를 추가했고, 전체19묶음1,797개와 두 빌드가 통과했다. 공개 결제폼을 익명 쿠키 저장소로 두 번 GET하여 PHPSESSID 유지와 200 응답을 확인했다. PHPSESSID 및 rbUser의 응답 쿠키에는 Secure/HttpOnly/SameSite가 지정되지 않았다. 쿠키 값은 기록하지 않았다. 반복 GET 성공은 로그인 세션이나 외부 PG POST 반환에서의 쿠키 전송을 증명하지 않는다. 원본 설정을 임의 변경하거나 불확실한 쿠키를 브리지 허용목록에 추가하지 않았다.

비공개 증거: bridge-config-audit-20261014.log, legacy-cookie-attributes-20261014.json. 이번 변경은 로컬 전환 검사 도구와 문서이며 생성 앱과 실제 배포 버전은 유지된다. 실제 카드 검수는 사용자 보류 상태다.

## 전체 경로 판정 보완

2026-10-14 도메인 경로 검사 수정: Custom Domain과 Route의 전체 경로 범위를 구분. bare Route/잘못된 wildcard Custom Domain/HTTP전용/부분경로의 준비완료 오판 차단. 전체19묶음1,860검사·두 빌드 통과. 검사도구만 변경, 앱 재배포 불필요(Worker09cd7c91 유지). www DNS121.254.171.115·공개HTTPS200·원본IP 지정 관리자GET200 확인. 실제 로그인/결제/역이전 증명 아님. 회원보류·DNS 유지.

기존 검사는 custom_domain 표시 없이 호스트명만 입력해도 configurationReady=true였다. 이제 정확한 호스트의 Custom Domain 또는 HTTPS를 포함하는 host/* Route만 전체 서비스 범위로 인정한다. 구 결제 전달·회원 보류 문제는 별개로 남는다. 공식 Route 패턴 근거: https://developers.cloudflare.com/workers/configuration/routing/routes/ . 비공개 검사 로그 route-coverage-suite-20261014.log. 원격 설정 변경 없음.

## 관리자 기술 매뉴얼 조사 — 2026-10-14

로그인된 랭크업 관리자에서 기술메뉴얼 → file/로 이동해 실제 표시 목록을 읽었다. 최상위에는 pay, rankup_module, m 폴더가 표시되지만 pay 및 rankup_module 내부에는 상위 이동 항목만 표시됐다. 이는 실제 파일이 없다는 증거가 아니라 이 매뉴얼이 내부 파일 정보를 제공하지 않는다는 관찰이다. m/content 목록에는 게시판·공고·이력서·설정·proc.ajax.php가 보였으며 결제 전용 파일은 표시되지 않았다. 미확보 주소를 추정하거나 proc.ajax.php를 결제 응답 주소로 등록하지 않았다.

| 항목 | 확인 상태 | 전환 처리 |
| --- | --- | --- |
| PC 다이렉트 return/close/popup 3경로 | 앞선 실제 입력폼에서 확인 | 브리지 후보만 존재; 승인 콜백 시험 미완료 |
| 일반 광고·열람권 결제 | 병원 로그인 제한, 관리자 파일목록 미제공 | 반환 주소 확인 전 전환 준비완료로 판정하지 않음 |
| 모바일 반환·입금 통보 | 이번 매뉴얼에서도 확보하지 못함 | 추정 경로 전달 금지 |
| 기존 진행 거래 종료 | 이니시스와 기존 주문의 대사 필요 | 파일목록·로컬 테스트로 대체 불가 |

이번 작업은 조회만 했다. 원본 파일 수정·결제 제출·회원 변경·DNS 변경·앱 배포 없음. 최신 앱은 e407104, Worker09cd7c91 유지. 전체1,860검사는 직전 결과이며 이번 조회 작업에서 재실행한 것이 아니다. 문의는 사용자 요청대로 보내지 않았다.
