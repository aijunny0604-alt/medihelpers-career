# 무료 테스트 환경 및 기존 이니시스 연동 검수

기준일: 2026-09-27. 현재 운영 전환 완료 문서가 아니다.

## 사용자 결정

- Cloudflare 무료 범위에서 진행. 유료 플랜 업그레이드·R2 구독·결제수단 등록을 대행하지 않는다.
- 기존 이니시스 MID **UPmedihelp** 및 기존 계약을 유지하는 방향. 새 MID 발급이나 계약 변경은 신청하지 않는다.
- 기존 Rankup 호스팅과 현재 도메인은 유지하고 새 서버 검증 후 전환한다.

## 무료 환경

- 계정: `1e0ba31ca051e54621c65a126a874280`. Workers 화면에서 일일 요청 한도 100,000 확인.
- 별도 D1 `medihelpers-staging` (`f29e16f1-c8b3-4151-96ce-be2239e4c3ce`) 생성. 사용자 테이블이 없는 새 DB임을 확인하고 0000~0018의 20개 SQL 파일 적용.
- 별도 설정: `deploy/cloudflare.staging.jsonc`. R2·도메인 route·실제 PG 키·회원 데이터 없음.
- 화면 확인 전용: 회원가입, 로그인, 쓰기, 결제 승인/취소 요청은 503으로 차단. 예시 화면은 실제 운영 데이터가 아니다.
- `STAGING_NOINDEX=true`, robots 검색 수집 차단. 고정 도메인 연결 없음.
- 무료량을 넘으면 서비스가 중단될 수 있다. R2의 무료량 초과 과금과 혼동하지 않는다. 실제 사진·서류 업로드, 자동 외부 백업은 아직 연결하지 않았다.
- 기존 Sites의 DB/R2는 새 Cloudflare 계정에 자동 이전되지 않는다. 무료 환경에 이를 연결하거나 복사하지 않았다.

## 이번 코드 보완

- PC WEBSTANDARD 보안 필드 verification/use_chkfake, IDC 코드 및 서버 서명 return state.
- 정확한 PG 호스트/경로만 허용. 스테이징과 운영 IDC를 혼용하지 않는다.
- MID·MOID·정수 금액·Card·거래번호·결과코드를 모두 확인한 후 원장 기록.
- 승인 전에 D1에 주문별 처리권을 한 번만 확보. 중복 호출·타임아웃 뒤 자동 재승인 금지.
- 승인 저장 실패 시 망취소. 이미 저장된 승인은 응답 손실 때문에 다시 취소하지 않음.
- 전액 카드 취소 어댑터와 관리자 경로 연결. PG 취소 확인 전 권한 회수 금지. 확인 후 DB 저장 실패는 PG 재취소 없이 로컬 저장만 재시도.
- 환불 완료와 지연된 권한 지급이 경합할 때 주문 상태를 SQL에서 다시 검사.
- 실제/가상 환불 안내 분리. 키 일부만 설정된 경우 가상 승인으로 떨어지지 않게 차단.
- `INICIS_REFUNDS_ENABLED=false` 기본값. 구현은 활성화·실 PG 검증을 뜻하지 않는다.

## 기존 상점 실연동 전 필수 확인

2026-09-27 관리자 직접 조회: 기존 웹결제 Sign Key 값 존재. INIAPI KEY·IV는 빈 값 및 생성 버튼 표시. 키 생성/갱신·계약·세금 설정 변경 없음. 상세 법무·세무 확인은 [검수표](LEGAL_LAUNCH_REVIEW_20260927.md)를 참조한다.

- [ ] UPmedihelp의 현재 WEBSTANDARD 및 새 서버 사용 가능 여부 확인. 기존 랭크업 결제 모듈과 동일 지원을 추정하지 않음.
- [ ] 상점정보 → 계약정보 → KEY 정보의 웹결제 Sign Key 확인. **기존 키를 임의 재발급하면 랭크업에 영향을 줄 수 있으므로 재발급 금지.**
- [ ] INIAPI 취소용 API Key와 서버 IP 등록 조건 확인. Cloudflare Workers의 발신 IP를 고정 IP로 가정하지 않음. signKey를 API Key로 대신 사용하지 않음.
- [ ] 사용자 제공 이니시스 부가정보 화면의 면세 표시와 앱의 공급가/부가세 계산 일치 여부 확인. 현재 10% 분리 계산을 운영 세금 기준으로 확정하지 않음.
- [ ] 기존 진행 거래·미입금 가상계좌·환불 잔액 인수 목록 확보. 새 어댑터는 전액 Card에 한정되며 기존 모든 수단을 이미 지원한다고 보고하지 않음.
- [ ] 모바일 별도 결제 연동 및 브라우저/카드사 인증 검수. 현재 모듈은 PC WEBSTANDARD다.
- [ ] 실제 결제창 열기 → 사용자 카드 인증 → 서버 승인 → PG 관리자 거래와 원장 일치 → 권리 1회 지급 → 실제 취소 → 권리 회수 → PG 취소내역 일치 확인.
- [ ] 오류/응답 손실 건의 PG 조회·일별 원장 대사 및 운영 절차 검증. 현재 미확인 건은 자동 재승인/재취소하지 않고 보류한다.
- [ ] 비공개 연락처·열람권 약관과 실제 환불 정책 확인. 이미 열람된 개인정보 자체를 환불로 회수할 수는 없음.
- [ ] 무료 Workers의 CPU·D1 질의 제한 내 로그인/검색/승인 부하 시험. 호스팅 요금 무료가 PG 결제 수수료 면제를 뜻하지 않음.

## DNS 확인값 — 변경하지 않음

- www A: `121.254.171.115` (TTL 600)
- NS: `ns1.whoiskorea.co.kr`, `ns1.koreafree.co.kr`
- MX: `ASPMX.daum.net` (10), `ALT.ASPMX.daum.net` (20)
- SPF: `v=spf1 include:_spf.daum.net ~all`
- 이 값은 전체 zone 백업이 아니다. DKIM/DMARC/기타 서브도메인/DNSSEC를 확인한 뒤 전환한다.
- 사용자 제공 과거 SQL은 실제 DB 백업이 아니라 오류 HTML이었다. 회원 원본 확보·리허설·최종 증분 대사 전 이전 완료로 보고하지 않는다.

## 공식 근거

- https://manual.inicis.com/pay/stdpay_pc.html
- https://manual.inicis.com/pay/cancel.html
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/

검사 수와 배포 버전은 STATUS/TEST 및 이후 배포 기록을 참조한다. 자동 테스트는 격리 DB와 모의 PG 응답을 사용하며 실제 카드 청구·취소를 실행하지 않는다.
