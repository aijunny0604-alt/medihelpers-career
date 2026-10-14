# 배포본 공고·이미지 검증 — 2026-10-14

검수 배포 https://medihelpers-staging.aijunny0604.workers.dev/ 에 익명 GET 요청으로 검사했다. 이번에는 로컬 모의 응답이 아닌 실제 Cloudflare 응답을 사용했다. 실결제·이메일 전송·DB 쓰기·DNS 변경은 없다.

|검사|결과|
|---|---|
|이전 이미지91개|모두200, 파일별 SHA-256 및 바이트 수 일치, 합계5,057,926바이트|
|공개 site-operations API|예정된 공고324/296/285/135/140 정확히5건, visibility public|
|공개 payload|migration/ownerMapping/accountId/email/phone 키 없음. 상세 본문 전체에 민감정보가 없다는 전면 판정은 아님|
|구 서버 참조|위 공개 공고 JSON에 http(s)://[www.]medihelpers.co.kr/ 참조 없음|
|PC·모바일 구 링크|각9건, 총18건 통과: 공개5건은 지정된 새 상세로301, 마감287/147/125 및0은404|

이미지 원본 해시는 scripts/legacy-media-manifest.json을 기준으로 했다. 원본 이미지와 실제 배포 파일 일치의 증거이며 이미지 내용의 저작권/개인정보 전면 검토를 의미하지 않는다. 요청 수는 이미지91+API1+링크18=110건이다. 장애 응답을 숨기기 위한 재시도는 하지 않았다.

증거는 Git 밖 deployed-media-integrity-20261014.json, site-operations-live-20261014.json, deployed-job-links-20261014.json에 보관했다. 코드 변경과 재배포는 없으며 앱9a3793a/Worker23feeac2-7dec-49f8-b39b-842ea6effcc4 배포 기록을 유지한다.

## 남은 조건과 분리

공개 공고·이미지 경로의 검수는 통과했다. 이 결과로 기존 회원의 실제 로그인, 기존 결제 응답·진행 거래, 정식 도메인 TLS/운영 DB 연결을 완료로 처리하지 않는다. 신규 병원회원1명은 원본 이메일 정정이 필요하며, 그1건의 문제를 공개 콘텐츠 누락 문제와 혼동하지 않는다. 정식 전환은 수행하지 않았다.
