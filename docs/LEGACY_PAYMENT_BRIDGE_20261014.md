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
