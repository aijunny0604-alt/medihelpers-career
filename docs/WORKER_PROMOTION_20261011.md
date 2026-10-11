# 기존 비밀값을 보존하는 운영 전환 준비

2026-10-11 실제 `secret list`에서 인증 ACCOUNT_HASH_SECRET/ADMIN_EMAILS, RESEND_API_KEY/RESEND_FROM, 이니시스 MID/SignKey/MobileHashKey/API key·IV 이름을 확인했다. 값은 읽거나 출력하지 않았고 재발급하지 않았다. 존재 확인은 유효성·실결제 성공 검증이 아니다.

## 다음 전환에서 사용할 구성

`deploy/cloudflare.promotion.json`은 현재 `medihelpers-staging` Worker의 식별자를 유지하면서 DB만 검증한 `medihelpers-production`에 연결하는 후보이다. Worker 이름은 내부 자원 이름이므로 정식 도메인 이름과 일치할 필요가 없다. 별도 Worker를 만드는 이전 `cloudflare.production.json` 구상 대신 이 전환 구성을 사용하면 기존 비밀값을 옮길 필요가 없다. 별도 Worker 구성은 참고용이며 현재 실행안이 아니다.

ACCOUNT_HASH_SECRET은 이메일로 회원 식별자를 계산하는 데 사용된다. 임의 새 키 생성/교체는 하지 않는다. 기존 D1_UPLOADS_ENABLED도 secret으로 등록되어 있으므로 같은 이름의 일반 vars를 넣지 않았다. 운영 적용 시 기존 비밀값 보존 여부를 배포 전후 이름 목록으로 대조한다.

아직 이 구성을 배포하지 않았다. 적용하면 기존 workers.dev 주소가 닫히고 DB 연결이 바뀌므로 현재 시험 서버와 동시에 사용할 수 없다. 로컬 테스트는 유지된다. 준비 시점 이후 두 DB의 변경분을 먼저 대조하고, 기존 관리자 세션과 재설정 토큰을 운영 개방 전에 처리해야 한다.

## 실행 전 남은 조건

- 점검/읽기 전용·가입/결제 차단 유지. 실제 검수 없이 PG 환경을 production으로 바꾸지 않는다.
- www/apex route는 최종 전환에서 별도 적용한다. 현재 구성에는 route가 없으므로 이를 배포하는 것만으로 정식 홈페이지가 열리지 않는다.
- 잘못 배포했을 때는 기존 `cloudflare.staging.jsonc`와 검증한 이전 앱 버전/DB 바인딩으로 돌아간다. 실제 데이터가 쓰인 뒤에는 DB 차이 대사 없이 전환하지 않는다.
- 랭크업 원본 문제는 사용자 요청으로 보류한 상태이며 해결된 것이 아니다.

검증: 두 빌드 및18묶음1,630개 통과. Worker명 유지·운영 DB 선택·secret과 일반 변수 충돌 방지·결제 차단 확인. 실제 설정/DB/도메인/키 변경 없음. 앱18ac426/Workerff470704 유지.
