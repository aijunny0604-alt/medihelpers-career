# 2026-10-09 강조 광고 공개 상태 반영과 조회 장애

## 실제 반영

별도 검수 Worker의 기존 D1에서 rankup-job-135/285/296/324만 draft/admin에서 published/public으로 바꿨다. 기존 공개 상세 본문 전체 줄과 제목·급여가 일치하는 것을 다시 확인한 뒤 반영했다. 소유자 연결·로고·원래 광고기간을 유지하고 신규 주문·결제·권리·회원 활성화는 생성하지 않았다. 나머지 이전 공고123건은 관리자 초안이다. 정식 도메인은 랭크업 서버를 유지했다.

`scripts/prepare-verified-ad-publication.py`는 최근1시간 원본검수 증거, 정확한4건, 기존상태/본문/수정시각을 확인한다. 각 UPDATE가 정확히1행을 바꾸지 않으면 제약조건으로 전체 작업을 중단한다. 로컬48테이블 적용·역적용 완전 일치와 마지막 행 편집 충돌 시 전체 취소를 확인했다. 적용 전후 실제 remote export를 예상본과 전수 대조했고 admin_content_records의4건만 달라졌다. 외래키 오류0.

## 실제 조회 차단

익명 공개 API가500을 반환했다. 같은 D1의 테이블 count 조회는 명시적으로 `7500: exceeded D1 free tier daily row read limit`를 반환했다. SELECT 1/백업 export/이번4행 쓰기 성공은 실제 테이블 조회 가능의 증거가 아니었다. 추가 과금·새 DB로 한도 우회·정식 DNS 전환은 하지 않았다. 제공자 응답상 자정UTC(한국시간 오전9시)에 재설정된다. 한도 복구 후 실제 익명 API/화면 재검수가 필요하다.

원격의 실제 적용후 백업을 그대로 로컬 생성 Worker에 연결해 익명 공개 공고4건, migration/ownerMapping/originalFields/sourceRow 미포함, 로고·본문 표시, 청아병원 상세 연결을 확인했다. 로컬 검증은 원격 공개 정상화나 실제 계정 검수의 대체 증거가 아니다.

## 장애 안내 보완

`server/serviceFailure.js`는 D1의 명시적 일일 read/write limit 오류만503으로 분류하고 Retry-After/no-store/다음UTC자정 시각을 제공한다. 사용자 문구는 오전9시 이후 재시도와 결제내역 선확인을 안내하며 내부 SQL/공급자 오류를 노출하지 않는다. 일반DB오류와 순환cause는 기존 처리로 남는다. 전체18묶음1,619개(단위445개), 생성 Worker의 실제 응답5개 검사, 일반/Cloudflare 빌드 및 diff 검사 통과. 서버 안내는7989037/Worker27fa2643-39cf-4ef7-806e-07e2d1afad51로 배포했고 실제API503·SERVICE_DAILY_LIMIT·Retry-After/no-store를 확인했다. 이어서 조회 실패를 공고0건으로 표시하던 목록 화면을 중단 안내로 바꾸고 실패 재조회를15초 억제했다. 이 후속 화면 후보는 아래 배포 기록에서 확인한다.

## 복구와 증거

Git 밖 `C:/Users/ROSSA/medihelpers-audit-20260927/`에 보관:

- before-four-ad-publication.sql: SHA256 658f92dd8b1472efc3d09a7986056923a70c7a32dee180df2503ab91eca3191c
- after-four-ad-publication.sql: SHA256 2850fff113f0036cefb0ae9e5090fa63b49d06c324d81989597e9476db821bdc
- four-ad-publication.sql / four-ad-publication-reverse.sql / four-ad-publication-plan.json
- four-ad-publication-remote-verification.json / four-ad-public-snapshot-verification.json
- four-public-ad-source-review-20261009.json / four-ads-local-published-proof.png
- publication-precutover-tests.log

역적용 SQL도 현재 값과 수정시각을 확인하므로 후속 편집을 덮어쓰지 않는다. 실행 전 새 백업과 충돌 여부 확인이 필요하다. 회원282명은 보호 보류, 운영자 포함283계정이며 기존 PG/랭크업 계약 및 서버는 변경하지 않았다.
