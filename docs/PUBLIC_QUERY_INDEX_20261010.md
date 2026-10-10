# 2026-10-10 공개 공고 조회 인덱스 실측

검수 DB의 기존 공개 조회는 전체 admin_content_records SCAN과 임시정렬을 사용했다. status, sort_order DESC, published_at DESC, updated_at DESC 복합 인덱스를 추가했다. 기존 DB의 sort_order 컬럼 이행이 끝난 뒤 생성하므로 구 스키마에서도 순서가 맞는다. 초기화 완료만 캐시하며 회원 데이터/권한은 캐시하지 않는다.

2,000개 합성 공고에서 기존결과·정렬·전체행 불변, 중복생성 안전, SEARCH 인덱스 사용·임시정렬 제거를 검사했다. 전체18묶음1,620개(단위446개), 일반/Cloudflare 빌드 및 Worker 문법/diff 통과. 원격 적용 전 백업을 확보했다.

동일 원격 쿼리(status=published, 같은 정렬, LIMIT500, id/payload_json 조회)에서 rows_read는131→4로 약96.9% 감소했고4개 응답의 원문/순서가 같았다. 전체사이트/하루 사용량/트래픽 처리량의 감소율은 이 측정으로 추정하지 않는다. 앞으로 게시물이 늘어나면 결과는 달라진다.

원격 적용후 export를 전과 대조:48개 테이블 모든 행 동일, 삭제된 스키마0, 추가 스키마는 admin_content_records_public_order_idx 하나. 주문·회원·권리·광고본문 변경0. 앱767124359c9cdcb84e062fe4279d1100604e4349를 GitHub/Sites main에 동기화한 후 Cloudflare Workerf089b7de-17b6-43e4-8065-b22214d2d45e로 배포했다. 실제 공개API200·이전광고4건 확인. 정식DNS·PG 설정·가입/결제 차단 설정 유지. 실제 역할별 로그인/실카드 검증은 이번 범위 밖이다.

Git 밖 감사 폴더 증거: before-public-index-20261010.sql, after-public-index-20261010.sql, public-index-before-query-private.json, public-index-after-query-private.json, public-index-verification-20261010.json, public-index-tests-20261010.log. 원본 응답에는 관리자용 migration 자료가 포함되므로 Git/공개문서에 첨부하지 않는다.

문제 시 인덱스만 제거하는 것과 데이터 원복은 구분한다. 이 인덱스는 데이터 내용을 바꾸지 않지만 새 앱 초기화가 재생성하므로 먼저 이전 앱 버전으로 돌아간 뒤 필요하면 인덱스를 제거한다. 이 작업은 랭크업 전체 역이전 검증을 대체하지 않는다.
