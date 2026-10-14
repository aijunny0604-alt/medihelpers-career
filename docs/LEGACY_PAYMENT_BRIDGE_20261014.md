# 기존 결제 응답 보존 후보 — 미적용

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
