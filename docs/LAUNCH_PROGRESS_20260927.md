# 정식 전환 진행 기록 — 2026-09-27

## 무료 Cloudflare 검수본

- URL: https://medihelpers-staging.aijunny0604.workers.dev
- 소스 `f95f0353b0ccddc47875f5507963a5c706305333`: GitHub 기준 브랜치와 Sites main 동일 SHA 확인. Sites 공개 배포 378은 유지.
- Worker 버전 `1e83c7fa-074c-40f8-ad91-bb8dd335b14e`.
- 무료 Worker/D1, R2 구독·유료 플랜·실 PG 키·도메인 route 없음.
- HTTP 17개 검사 통과: 주요 화면/파일 200, HTML no-store, noindex/robots 차단, 회원/결제 쓰기 503, 익명 주문 401, 미등록 API 404.
- 공개 `/api/account`는 200과 signedIn=false/account=null/isAdmin=false가 정상이다. 최초 검사에서 401로 가정한 오류를 수정했다.
- D1 읽기 전용 집계 accounts=0/payment_orders=0. 실제 회원·거래 이전 없음.
- 데스크톱 화면 확인, 모바일 390px에서 body/root 폭 380px로 가로 넘침 없음.
- 실제 로그인·PG 승인/취소·운영 업로드 완료를 뜻하지 않는 화면 확인 전용 환경이다.
- 증거 폴더 `C:/Users/ROSSA/medihelpers-audit-20260927`: staging-http-audit.json, cloudflare-staging-desktop.png, cloudflare-staging-mobile.png.
- 전체 소스 이력 bundle `medihelpers-source-f95f035.bundle` 생성/verify 성공. 랭크업 데이터 백업과 별개다.

## 랭크업·후이즈 직접 조회

- 랭크업 관리자 개인회원 130명/병원회원 151명 화면 집계. 원본·중복·탈퇴·정지 포함 범위는 미대사.
- 랭크업 호스팅 만료일 2027-07-20, 보안서버 만료일 2027-01-02. 호스팅 고객계정의 기본형10GB 디스크 사용량 191.87MB 표시.
- 랭크업 DB 백업 목록에 2009년 SQL 및 .htaccess만 표시. 기존 파일 변경/삭제 없음.
- 최신 백업 실행으로 내려받은 `C:/Users/ROSSA/Downloads/db_2026-09-27-1224.sql`도 132바이트 오류 HTML이었다. CREATE TABLE/INSERT INTO 0개.
- 오류 파일 SHA256 `620144369AAECFE73E726D196F77A94375A5F7C8A26C838F64591B63727866A9`.
- 백업 도움말은 이미지 제외 DB만 제공한다고 명시. 정상 SQL 외 이미지/첨부 백업이 별도 필요하다.
- 호스팅 계정의 DB관리기 링크도 일반 만료/오류 안내로 연결됐다. 실제 호스팅 만료라고 단정하지 않는다. 정상 웹사이트와 계약 만료일이 별도로 확인된다.
- FTP/DB 비밀번호는 마스킹되어 있고 변경 버튼만 확인했다. 변경하지 않았다.
- 후이즈 로그인 후 medihelpers.co.kr 보유 확인. 만료 2027-07-07, NS ns1.koreafree.co.kr/ns1.whoiskorea.co.kr, 프리미엄 보안 설정 표시. DNS 전체 zone·DNSSEC 확인과 다르다.
- 도메인 등록은 후이즈, 현재 권한 네임서버는 랭크업 구성. 전체 DNS 원본 확보 전 네임서버/웹 연결/메일 기록을 변경하지 않는다.

## 전환 상태

정식 도메인 전환 권한은 사용자에게 받았다. 정상 DB/첨부 백업 및 역이전 리허설, 전체 DNS 백업, 세무·개인정보 검수, 실 PG 승인/취소·모바일·구 거래 통보가 미완료다. 기존 DNS/랭크업을 유지한다. 기존 서버 보존만으로 신규 거래까지 즉시 무손실 복구가 입증되지는 않는다.
