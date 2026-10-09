# DNS 복구 자료 확보 — 2026-10-09

사용자 재로그인 후 Cloudflare DNS 관리 화면에서 전체 9개 레코드를 BIND 파일로 내보냈다. DNS 설정은 변경하지 않았다. 기준 소스 `7ab3bbb`에서 수행한 읽기 전용 운영 확인이다.

## 실제 백업과 복구 값

내보낸 시각은 2026-10-09 02:43:07 UTC(11:43:07 KST). Git 밖 `C:/Users/ROSSA/medihelpers-audit-20260927/dns-zone-export-20261009.zone`에 보존했다. 파일 2,001바이트, SHA256 `7d38299a289ff03b255e03916d6e7ba666e5a51443193b054557999ac3c44af4`.

| 레코드 | 현재 값 | 설정 |
|---|---|---|
| apex / www / wildcard A (3개) | 121.254.171.115 | DNS 전용, 자동 TTL |
| apex MX (2개) | aspmx.daum.net 우선순위10 / alt.aspmx.daum.net 우선순위20 | 자동 TTL |
| apex TXT | v=spf1 include:_spf.daum.net ~all | 자동 TTL |
| rsend.notify CNAME | rsend-apne1.forge.rmta.net | DNS 전용, 자동 TTL |
| send.notify CNAME | send.forge.rmta.net | DNS 전용, 자동 TTL |
| resend._domainkey.notify TXT | 공개 DKIM 키는 백업 파일 참조 | 자동 TTL |

권한 NS는 javier.ns.cloudflare.com / lily.ns.cloudflare.com. 공개 DNS에서도 위 9개 레코드와 일치하는 응답을 확인했다. 자동 TTL은 export에서 1로 표현되며 공개 A/MX/TXT 조회에서는 300초였다. 이를 1초 TTL로 오해하지 않는다. apex/www의 AAAA·www CNAME·CAA·DS·DMARC 응답은 없었다. DS 부재는 등록기관의 모든 보안 설정 확인을 대신하지 않는다.

웹 전환 실패 시 웹 연결 A 레코드의 복구 기준은 위 기존 IP다. 메일 레코드는 웹 전환과 무관하게 보존한다. 전체 파일을 무작정 import하거나 SOA/NS를 다른 제공자에 그대로 복제하지 않는다. Worker custom domain/route를 생성한 경우 DNS 복구뿐 아니라 그 연결도 확인해야 한다. 이번에는 route 생성·프록시 전환·DNS 변경을 하지 않았다.

## DB와 서비스 재확인

- 새 검수 D1 백업: `medihelpers-20261009-024017-9faeb914.sql`, 47테이블·4,727,830바이트, 무결성/외래키 정상. SHA256 `813ee0b8d2cc49b5955bef02c547562c9420ea71587243ee89db9a2879fcc1ca`.
- 10월6일 UTC 백업과 스키마 및 전체 행 일치. 이것은 새 검수 DB의 확인이며 최신 랭크업 전체 DB 확보를 뜻하지 않는다.
- 실제 Worker 배포 목록의 현재 버전은 `2b96835c-1d77-4eb9-942f-c6d19aed3286`. 재배포 없음.
- 현재 검수 URL의 읽기 요청7개: 홈/공고/robots/계정/공개운영 API 정상, 익명 주문401·관리자403, 이전 초안 미노출. 가입·테스트 계정 전환은 false. HTML no-store, 검수 noindex 확인.
- 처음 Python 기본 User-Agent 요청은 Cloudflare 403을 반환했다. 브라우저 User-Agent로 재확인한 위 결과와 구분해 두 로그를 보존했다. 기본 요청 실패를 앱 권한 시험 성공으로 계산하지 않는다.
- 기존 apex/www HTTPS 인증서 검증 및 HTTP200 확인. 인증서 만료는 2027-01-02 23:59:59 UTC. 로그인·결제 흐름 성공을 뜻하지 않는다.

API DNS export는 현재 CLI 인증 권한으로 403이었고, 재로그인한 관리 UI의 내보내기로 해결했다. 권한을 추가하거나 토큰을 발급하지 않았다. 정상 백업 확보는 완료됐지만 DNS 변경/복구의 실제 전환 리허설, 신규 발생 데이터의 랭크업 역이전, 실제 운영 역할 로그인과 PG 실거래 검증은 별도다.

개인정보·DNS 원본·HTTP 검사 원문은 Git 밖 감사 폴더에 보관했다. 기능 코드 변경 없음. 이 문서 갱신은 일반 빌드와 diff 검사를 수행하며, 직전 코드 검사 1,514개를 다시 실행한 것으로 합산하지 않는다. GitHub와 Sites에는 동일 문서 후보를 동기화하고 앱 배포는 하지 않는다.
