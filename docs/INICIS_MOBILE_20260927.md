# 이니시스 키 연결·모바일 결제 검수

2026-09-27. 기존 UPmedihelp와 면세 설정 유지. 사용자가 모바일 Hash Key와 INIAPI KEY/IV를 직접 생성했다. 기존 WEB Sign Key는 조회만 했으며 재발급하지 않았다.

## 서버 설정

Cloudflare medihelpers-staging에 INICIS_MID, INICIS_SIGN_KEY, INICIS_MOBILE_HASH_KEY, INICIS_API_KEY, INICIS_API_IV를 secret_text로 저장하고 이름 목록을 확인했다. 값은 암호화 전달 후 Wrangler 표준입력으로 등록했으며 채팅·Git·평문 파일에 저장하지 않았다. 키 등록 버전은 281baec7-092d-4a04-95ce-3b920624859c이며 당시 앱 코드는 3c877ff였다.

실제 MID 키 등록과 실제 거래 개시는 별개다. 테스트 환경은 읽기 전용, checkout/refund/mobile 비활성화, INICIS_ENV=test를 유지한다. 실 MID로 거래할 때는 환경을 live로 올바르게 바꿔야 하며 테스트·운영 키를 혼용하지 않는다. 유료 서비스·R2·DNS·기존 랭크업 환경을 변경하지 않았다.

## 구현·검증

- PC와 모바일 주문 경로 분리. iPad 데스크톱 모드 포함 기기 판단, 서버에 결제 방식 저장, 다른 방식 콜백 거부.
- 모바일 SHA-512/Base64 위변조 방지, P_NOTI 주문·서명 바인딩, 쿠키 없는 결제 복귀 처리.
- PG IDC/호스트/경로 제한, MID·주문·금액·카드·거래번호 확인. 승인 처리권 선점과 중복 지급 방지.
- 승인 응답 유실·불일치·저장 실패 시 망취소. 이미 저장된 결제는 응답 유실만으로 취소하지 않으며 불확실한 결과는 대사 대상으로 남김.
- 실제 HTML의 CSP form-action에 모바일 결제 origin 허용. 공식 샘플의 동일 창 POST/문자셋 적용.
- 단위 325 + 준비 67 + 공격 58 + 회원 46 + 관리자 63 + 이니시스 Worker 68 + 배포 분리 8 + Cloudflare 22 = **657개 통과**. build/build:cf 및 Worker 문법 검증. 자산 index-UQG68snD.js.
- 키 등록 직후 기존 앱의 실제 HTTP 18개 통과. 새 코드 배포 버전과 후속 HTTP 검증은 배포 기록에서 별도 확인한다.

격리 DB에서 역할별 세션과 PG 응답을 모의 검증했다. 검수 서버는 쓰기 차단 상태라 실제 의료인·병원·관리자 신규 로그인, 실제 카드 청구·환불, 실기기 PG 인수 시험은 하지 않았다. 검사 수가 실제 거래 성공을 의미하지 않는다.

## 정식 전환 전 남은 항목

1. INIAPI clientIp 및 기존 상점의 사용 조건 확인. 문서상 요청 서버 IP가 필요하나 고정 IP 필수라고 확인된 것은 아니다. 키만으로 환불 완료라고 보고하지 않는다.
2. 통제된 PC/모바일 실승인·전액 취소·PG/사이트 원장 및 권한 회수 대사. 가상계좌/계좌이체·부분환불은 이번 카드 구현 범위 밖이다.
3. 회원 원본 DB/첨부 백업, 127개 보호 초안의 소유권·유료 광고 기간 확인, 이미지 제공, 메일·계정·복구 시험.
4. 위 조건 통과 후 DNS 기록과 복구 지점을 보존하고 정식 전환. 현재 www.medihelpers.co.kr은 기존 랭크업을 유지한다.

공식 근거: [모바일 웹결제 매뉴얼](https://manual.inicis.com/pay/stdpay_m.html), [공식 모바일 샘플](https://manual.inicis.com/download/general_mo.zip), [취소 API](https://manual.inicis.com/pay/cancel.html).
