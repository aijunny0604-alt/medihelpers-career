# 기존 PG 설정과 새 사이트 지원 범위

2026-10-11 로그인된 랭크업 결제환경설정에서 키 값은 읽거나 출력하지 않고 라디오/체크박스 선택 상태만 확인했다. 저장·변경은 하지 않았다.

| 항목 | 기존 설정 | 새 구현/검수 설정 |
|---|---|---|
| PG 모듈 |이니시스 선택|이니시스 어댑터|
| PC |신용카드·실시간계좌이체·무통장입금 선택|WEBSTANDARD 요청 gopaymethod=Card, 주문 차단 중|
| 모바일 |신용카드·핸드폰·실시간계좌이체·무통장입금 선택|모바일 어댑터 P_INI_PAYMENT=CARD, 모바일 활성화 false|
| 환불 |기존 상점 관리자|사용자가 승인한 수동 상점관리자 환불·홈페이지 대사 방식|

기존 체크 상태는 실제 계약·정산 가능 여부를 증명하지 않는다. 비선택 PG인 이지스의 체크 상태는 활성 이니시스 설정으로 합산하지 않았다. 기존 ‘무통장입금’이 가상계좌인지 수동 계좌 안내인지는 이 화면만으로 확정하지 않았다.

## 응답 경로 조사

- 새 PC returnUrl 및 모바일 P_NEXT_URL은 SITE_ORIGIN + `/api/payment-approve`로 코드에서 확인했다. 기존 거래를 새 주문으로 연결하는 경로는 아니다.
- 기존 관리자 결제환경 화면에는 응답 URL 필드/안내가 노출되지 않았다. 당시 구 return/notify 경로는 미확보였다. 아래 후속 공개 폼 조사에서 PC 다이렉트 returnUrl을 확인했다. 일반적인 이니시스 예제 파일명을 실제 경로라고 추정하지 않는다.
- 이전 PHP 경로410/미등록 POST405는 잘못된 성공 표시를 막는 방어다. 기존 지연 거래 수신·복원을 해결한 기능이 아니다.
- 로컬 생성 Worker의 이니시스 합성 회귀86개 재실행 통과. 실제 승인/취소/구 콜백 통신은 수행하지 않았다.

## 전환 시 준수할 범위

‘기존 결제수단 모두 그대로 이전 완료’라고 표시하지 않는다. 현재 합의한 초기 범위는 카드·수동 환불이며, 계좌이체/휴대폰/입금 기능을 별도 검증 없이 켜지 않는다. 구 사이트가 사용 중일 때 생성된 주문은 구 원장과 이니시스 상태로 확인한다. 신청·완료 목록 집계가 같아도 PG 쪽 미완료 거래가 없음을 뜻하지 않는다.

기존 응답 경로를 모르는 상태에서 모든 구 PHP 요청을 기존 서버로 무차별 프록시하지 않는다. 관리자·세션·개인정보 경로 노출과 양쪽 쓰기 위험이 있다. 정식 전환 전에 기존 신규 주문을 중단하고 진행 중 거래·후속 통보를 정리하거나, 정확히 확인된 콜백만 보존하는 검증된 경로가 필요하다.

보호 증거: `C:/Users/ROSSA/medihelpers-audit-20260927/legacy-pg-methods-20261011.json`, `pg-method-recheck-20261011.log`. 원격 설정·키·DNS·회원권한 변경 없음.

## 후속 공개 폼 조사 — PC 다이렉트 응답 경로 확보

2026-10-11 홈페이지의 실제 링크를 따라 다이렉트 결제 페이지를 익명 GET으로 읽었다. 제출·주문 생성·키 조회·응답 엔드포인트 호출은 하지 않았다.

- 출처: https://www.medihelpers.co.kr/rankup_module/rankup_direct/direct_pay.html (HTTP 200)
- 로드한 SDK: https://stdpay.inicis.com/stdjs/INIStdPay.js
- returnUrl: `https://www.medihelpers.co.kr/rankup_module/rankup_payment/inistdpay/INIStdPayReturn.php`
- closeUrl: `https://www.medihelpers.co.kr/rankup_module/rankup_payment/inistdpay/close.php`
- popupUrl: `https://www.medihelpers.co.kr/rankup_module/rankup_payment/inistdpay/popup.php`
- 결제폼 action: `/pay/multiProcess.ajax.html`. 이는 준비/제출 경로이며 승인 콜백이라고 분류하지 않는다.

확인 범위는 PC 다이렉트 폼이다. 일반 광고·모바일·가상계좌 후속통보도 같은 경로인지, PHP 내부의 세션/DB 의존 여부는 미확인이다. 서비스 안내 페이지는 로그인 폼만 노출했다. 현재 새 사이트는 위 PHP 경로에 410을 반환하므로, DNS만 바꾸면 진행 중 구 결제 응답을 이어 처리할 수 없다. 임의 범용 프록시는 추가하지 않았다.

전환 준비 시 이 경로를 구 주문 처리 대상으로 명시하고, 기존 주문 접수 중단 및 진행 거래 정리 또는 정확한 경로 중계 검증을 적용해야 한다. 관리PC hosts 복구는 외부 PG 콜백을 복구하지 않는다.

원문은 보호 폴더 `public-payment-path-0-20261011.html`, 공개 경로와 SHA256만 추린 증거는 `legacy-callback-paths-20261011.json`에 보관했다. 실제 카드 시험·DNS 전환·배포·원격 DB 변경은 없다.
