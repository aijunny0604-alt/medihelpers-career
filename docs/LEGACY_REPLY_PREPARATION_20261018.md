# 기존 결제 응답 보존 준비 — 2026-10-18

사용자는 회원·실결제를 보류한 채 기존 결제 지연 통보 확인과 도메인 전환을 요청했다. 기존 랭크업의 삭제·해지·FTP 변경은 하지 않는다.

## 새로 확인한 사실

공개 다이렉트 결제 화면에서 무통장입금을 선택하면 고정 은행계좌 선택 및 입금자명 필드가 표시된다. 이 흐름은 수동 입금 안내이며 이니시스 가상계좌 발급 화면으로 간주하지 않는다. 제출·주문 생성·입금은 실행하지 않았다. 다른 일반/모바일 결제 경로까지 같은 방식이라는 증거는 아니다.

Cloudflare SSL/TLS 화면은 자동 모드, 현재 `전체`로 표시됐다. DNS는 기존 IP의 DNS-only이며 프록시를 활성화하거나 SSL 모드를 변경하지 않았다. Route 방식의 전환 전 원본 인증서 검증과 프록시 경유 통신 확인이 필요하다.

이니시스 로그인 세션이 없어 로그인 화면을 열었다. 이어 추가 인증 선택 화면이 관찰됐지만 거래 조회까지 진입하지 못했다. 공식 안내에 따라 다음을 확인해야 한다.

- 거래내역 → 가상계좌의 요청일자 기준 입금 요청/발급 대기와 결과.
- 가상계좌 입금통보 재전송 메뉴의 실패/미확인 통보. 조회만 하며 재전송을 임의 실행하지 않는다.
- 상점정보 → 계약정보 → 결제수단정보의 통보 방식과 등록 URL. 주소를 임의 변경하거나 모든 거래가 0건이라고 추정하지 않는다.

근거: [이니시스 거래조회 안내](https://manual.inicis.com/Tip/transactions.html), [이니시스 입금통보 안내](https://www.inicis.com/blog/archives/category/cs/cs_best/kg%EC%9D%B4%EB%8B%88%EC%8B%9C%EC%8A%A4%EA%B4%80%EB%A0%A8/%EA%B0%80%EB%A7%B9%EC%A0%90-%EA%B4%80%EB%A6%AC%EC%9E%90-%EC%9D%B4%EC%9A%A9-%EB%B0%A9%EB%B2%95/page/2?mainclass=2&subclass=1).

## 준비한 구현

격리 후보였던 `legacyPaymentBridge`를 Cloudflare 생성 Worker에 연결했다. Sites 빌드에는 포함하지 않는다. `LEGACY_PAYMENT_BRIDGE_ENABLED`가 정확히 `true`일 때만 기존에 실제 입력폼에서 확인한 Return/close/popup 세 경로를 원본으로 전달한다. 기본값은 꺼짐이며 기존 검수/운영 설정을 자동 변경하지 않는다.

기존 응답 처리는 새 사이트 점검 gate보다 먼저 실행한다. 새 인증 토큰·새 쿠키는 원본에 보내지 않으며, 원본에 한 번만 요청하고 불명확한 실패를 성공으로 처리하지 않는다. 미확인 notify 경로, 관리자 또는 신규 결제 API는 이 통로를 사용할 수 없다.

`cloudflare.open-with-legacy-replies.json`은 원본 A를 유지하는 Route 전환 **후보**다. Custom Domain 후보와 함께 사용하지 않는다. 가입·결제 false, production DB, noindex를 유지한다. 실제 원본 Route/TLS와 세션·미확보 통보 경로를 확인하기 전 이 후보를 배포하지 않는다. [Cloudflare 공식 Route 동작](https://developers.cloudflare.com/workers/configuration/routing/routes/)은 설계 근거이며 실제 원격 검증을 대신하지 않는다.

복귀 시 이 후보의 두 Route를 제거하고 원래 A/DNS-only로 되돌린다. 메일 DNS와 랭크업 자료는 유지하며 신규 D1 변경분은 별도로 보존한다. Custom Domain 삭제를 전제로 한 기존 복구안과 혼동하지 않는다.

## 검수

생성 Worker에 가짜 원본을 연결한 34개 검사 통과: 점검 중 기존 응답 통과, 새 작업 차단, 정확한 비활성 플래그, 단일 요청, 본문 보존, 새 인증 제거, no-store, 실패502. 전체 20묶음 1,894개 검사와 두 빌드·Worker 문법·diff 검사 통과. 후보 정적 설정 검사 통과.

실고객 로그인·실카드 승인·원격 결제 통보·DNS 변경은 이 시험에 포함되지 않는다. 운영 활성화 및 도메인 전환 완료 상태가 아니다.

## 검수 서버 배포

GitHub/Sites 미러 소스 `3b6ce8cbcd5e984de450d78998c9f4e6339c328f`를 검수 Worker에 배포했다. 버전 `ef52b611-520c-4e57-8c59-45499551afa6`. 기존 stage DB·설정·시크릿을 유지하고 전달 기능은 비활성이다. 홈페이지/서비스상태/account200, 익명 관리자403, 기존 close.php410, 모두 no-store 확인. checkoutEnabled=false. 정식 www는121.254.171.115이며 DNS는 변경하지 않았다. 실제 역할 로그인·PG 통보 성공은 미검증이다.
