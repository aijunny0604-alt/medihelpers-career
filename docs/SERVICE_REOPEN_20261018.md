# 신규 가입·카드 결제 재개 — 2026-10-18

운영자가 정식 도메인 공개 이후 신규 회원가입과 결제 기능을 열도록 요청했다. 앞선 신규 가입·실결제 보류 설정을 이번 요청 범위에서 해제한다. 기존 랭크업에서 이전한 계정 282명의 상태·동의 확인은 별개이며 일괄 활성화하지 않는다.

## 수정 내용

- 신규 가입 정지 시 기존 로그인 회원의 account/profile까지 null로 반환하던 결합을 제거했다.
- 가입 비밀번호 해시 처리 실패 시 임시로 생성한 계정을 정리한다.
- PC 결제 closeUrl을 일반 마이페이지에서 `/api/payment-close`로 변경했다. 공식 `INIStdPay_close.js`가 부모 결제창을 닫으며, 이 문서만 동일 출처 iframe을 허용한다. 결제 결과를 성공 처리하거나 주문을 변경하지 않는다.
- 이니시스 SDK가 실제 로딩하는 `stdux.inicis.com/stdpay/stdjs/INIStdPay_third-party.js`와 표준 결제창 CSS가 CSP로 차단되던 문제를 수정했다. 전체 도메인 와일드카드는 추가하지 않는다.
- 결제 SDK 로딩 실패/SDK 미생성 시 재시도할 수 있도록 실패 Promise와 스크립트를 정리한다. 중복 숨김 결제폼도 교체한다.
- 공개 apex GET/HEAD는 www로 경로·쿼리를 보존해 이동한다. API와 기존 PG POST 응답은 리다이렉트/재전송하지 않는다.
- 개인정보처리방침 v1.3에 현재 Cloudflare·Resend·KG이니시스 처리와 메일 보관기간을 반영했다. D1 조회 메타데이터의 APAC/SIN 배치를 확인했다. 글로벌 처리의 국가별 고정·전체 계약 적법성에 대한 법률 확인서를 의미하지 않는다.
- `LEGAL_DOCUMENT_STATUS=published`는 공개된 문서와 운영자의 기능 개방 결정을 나타낸다. 종전 approved 값도 호환하며 법률 전문가의 승인으로 표시하지 않는다.

## 운영 후보

`deploy/cloudflare.live-with-legacy-replies.json` 사용. 기존 공개 보류 설정은 `cloudflare.open-with-legacy-replies.json`에 보존한다.

| 설정 | 후보 |
|---|---|
| Worker / DB | medihelpers-staging / production D1 ef6090da-544c-446f-bd31-32b631b2d2d6 유지 |
| 신규 가입 / 새 주문 | true / true |
| PG 환경 / 모바일 | live / true |
| 환불 | 이니시스 관리자 수동 취소 → 홈페이지 증빙 반영; 자동 INIAPI 취소 false |
| 세금 | 운영자의 기존 유지 지시에 따른 exempt 유지; 세무 적합성 인증 아님 |
| 테스트 역할 전환 | false |
| 서류 자동 파기 | bounded D1 retention true, 매시간 소량 처리 |
| 공개 색인 | noindex false; 검색엔진 등록/반영 완료를 뜻하지 않음 |
| 기존 결제 응답 | 정확한 기존 3경로 전달 유지 |

무료 플랜·기존 바인딩을 유지한다. 계좌이체·가상계좌·직접 무통장의 신규 결제는 이번 카드 연동 범위에 포함하지 않는다.

## 검증 증거

- 두 빌드 및 생성 Worker 문법 검사 통과.
- 로컬 격리 20묶음 1,907검사 통과(단위 478 포함). PG 금액·MID·주문 검증, 위조 콜백 차단, 중복 승인/DB 실패, 환불 증빙·권리 회수, 등록/로그인/첨부, 기존 링크·응답 경로 포함.
- 별도 Cloudflare DB에서 실제 등록 API로 의료인·병원 합성 가입 4검사, 합성 관리자 준비 1검사 통과. 새 쿠키 없는 로그인·반대 권한 차단·로그아웃·PC/모바일 서명 요청 등 추가 40검사 통과. 실제 고객·운영 DB·실제 PG 승인과 구분한다.
- 최초 원격 검사의 unsigned approval 기대 코드 400은 실제 403 차단과 달랐다. 허용/승인이 발생한 결함이 아니며 403으로 기준을 정정해 40검사를 다시 통과했다.
- 운영자 요청으로 기존 hr@medihelpers.co.kr 비밀번호를 강한 무작위 값으로 변경하고 이전 세션/복구 토큰을 종료했다. 새 비밀번호로 실제 운영 API 로그인200/isAdmin=true 및 브라우저 관리자 콘솔 접근을 확인했다. 값은 Git·문서·대화에 저장하지 않는다.
- 변경 직전 production DB 백업 SHA256 `e88f730c5f515d868ed4ed7fbb6c595960d8d0ad0935237cd5d5fd92722d32d5`. SQLite integrity ok / FK 오류0 / 회원283 / 새 주문0 / 거래0 / 병원 첨부0 / 업로드0.
- 실제 카드 승인·취소, 카드사 앱 복귀 및 매입/정산은 수행하지 않았다. 단위·합성 검사나 결제 설정 개방을 실제 거래 성공으로 보고하지 않는다.

## 복귀

앱 기능만 중단할 때에는 기존 공개 보류 설정으로 배포한다. 서류 보존기간 준수 작업은 별도 고려한다. 랭크업으로 전체 복귀할 때에는 신규 가입·주문을 먼저 멈추고 변경분을 백업한 뒤 `ROLLBACK_RUNBOOK.md`를 따른다. 기존 호스팅·파일·PG 키는 유지하며, DNS 복귀만으로 새 회원·거래가 구 DB로 자동 이전되지 않는다.

## 공식 참고

- [이니시스 PC 규격](https://manual.inicis.com/pay/stdpay_pc.html), [모바일 규격](https://manual.inicis.com/pay/stdpay_m.html), [도메인 불일치 오류](https://manual.inicis.com/pay/qna.html)
- [Cloudflare D1 배치](https://developers.cloudflare.com/d1/configuration/data-location/), [처리계약](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [Resend 처리계약](https://resend.com/legal/dpa), [보관기간·보안](https://resend.com/security)
- [개인정보 보호법 제28조의8](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1034292881)

배포 SHA·Worker 버전·배포 후 검사는 실행 후 아래에 추가한다.
