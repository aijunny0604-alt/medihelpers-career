# Cloudflare 실제 원격 실행 검증 — 2026-10-09

기준 소스 `6929fb7`. 운영 배포 대신 Wrangler remote preview로 시험했다. 운영 MID·키·DB 바인딩 없이 공식 공개 테스트 자료만 사용했으며 시험 프로세스를 종료했다. 업체 문의는 사용자 지시에 따라 발송하지 않는다. 운영 관리자 비밀번호 설정도 사용자가 다시 보류했으므로 추가 메일을 보내지 않는다.

## 확인 결과

1. Cloudflare TCP 소켓에서 iniapi.inicis.com:443 TLS 연결 성공. 응용 데이터 전송0. `localAddress`는 반환되지 않았다. 이 시험으로 운영 clientIp를 확보하지 못했다.
2. 공식 스테이징 V2 조회는 HTTP200 / SUCCESS / CANCEL을 반환했다. 공식 이미 취소된 시험 거래의 V2 취소는 HTTP200 / 500626으로 매뉴얼 기대값과 일치했다.
3. 저장소의 실제 `server/inicisStandard.js`를 원격 preview에 import해 별도 6개 검사를 통과했다. 테스트 서버에 전송된 요청은 4회다.
   - 공식 취소 거래 응답 확인
   - 실제 조회 adapter가 취소 상태를 처리
   - 결과에서 PG 개인정보/카드 필드를 제외
   - 기대 금액을 1원 다르게 주면 PG_INQUIRY_MISMATCH로 거부
   - V1 이미 취소 응답을 새 환불 성공으로 확정하지 않고 review로 보존
   - review 상태 재실행에서 추가 환불 요청과 로컬 확정을 하지 않음

주문번호·금액은 공개 테스트 서버의 조회 결과에서 얻은 fixture다. 독립적인 운영 주문 원장 대사로 인정하지 않는다. 환불 원장 동작은 메모리 대역이며 실제 D1 트랜잭션 검증도 아니다. 전체 통합검사1,514개와 이번 외부 시험6개는 서로 다른 검수 범위다.

## 완료로 인정할 수 없는 항목

테스트는 매뉴얼 예제 clientIp=127.0.0.1을 사용했다. 이는 테스트 규격을 따른 것이며 운영 환경에 같은 값을 사용할 근거가 아니다. 실제 카드의 신규 승인·환불, UPmedihelp 계약 호환성, 운영 서버 IP 처리, 실제 관리자/병원/의료인 로그인은 미검증이다. 기존 키 재발급·결제 개방·DNS 변경·운영 DB 쓰기를 하지 않았다. 실제 Worker 버전은 계속 `2b96835c-1d77-4eb9-942f-c6d19aed3286`이다.

Oracle Always Free는 공개 IP가 있는 별도 서버 후보로 조사했으나 계정 없음·자원 확보 미검증·유휴 회수 제약이 있다. 가입 화면을 연 것 외에 계정 생성이나 자원 생성은 하지 않았다. 현재 Oracle 가입은 보류하도록 안내했다. Cloudflare 연동 불가능 또는 Oracle 가입 필수로 결론 내리지 않는다. 신규 유료 자원 생성도 미승인이다.

## 증거와 공식 규격

Git 밖 감사 폴더 `C:/Users/ROSSA/medihelpers-audit-20260927/`:

- `ip-probe-result-20261009.json`
- `vendor-test-result-20261009.json`
- `app-adapter-result-20261009.json`
- `app-adapter-probe-20261009.mjs` (공식 테스트 전용, 운영 실행 금지)

[이니시스 공식 스테이징 시험](https://manual.inicis.com/download/TLS12_test_manual.pdf), [조회 규격](https://manual.inicis.com/pay/etc-inquiry.html), [취소 규격](https://manual.inicis.com/pay/cancel.html), [Cloudflare SocketInfo](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/).

이번 저장소 변경은 문서만이며 일반 빌드·diff 검사를 수행한다. GitHub 기준 브랜치와 Sites 소스 미러를 동일 SHA로 반영하며 실제 서비스 재배포는 하지 않는다.
