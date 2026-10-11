# 기존 열람 권리 추가 대조

## 후속 반입 완료

2026-10-11 채용정보 열람권5건을 시험 D1 및 별도 운영 D1의 `legacy_migration_archive`에 `employ-reading-right` 종류로 보존했다. 모두 private/pending-review이며, 탈퇴 충돌1건을 명시했다. 보존 자료는1,210→1,215건이다. 회원 활성화·열람권 발급·결제 원장 생성은 하지 않았다.

두 DB를 각각 새로 export하고 계정 별칭4건/탈퇴 충돌1건을 검증한 뒤 반입했다. 각 DB의 예상 변경본(원본+5개 INSERT)과 반입 후 재export를48테이블 전체 스키마·행으로 비교하여 모두 동일했다. 다른 회원·공고·결제·세션 데이터 변경 없음. 최초 시험 DB export는 인증 오류였으나 재시도 성공 후에만 쓰기를 진행했다.

추가 증거는 Git 밖 `rights-stage-before.sql`, `rights-prod-before.sql`, `rights-archive-insert.sql`, `rights-stage-comparison.json`, `rights-prod-comparison.json`, `prepare-rights-archive.py`이다. 기존 전체 DB 백업·실거래·정식 도메인 검증을 완료한 의미는 아니다. 아래는 반입 이전 조사 기록이다.

2026-10-11 로그인된 랭크업 관리자에서 이력서·채용정보 열람서비스 목록을 읽기 전용으로 확인했다.

| 항목 | 결과 |
|---|---|
| 병원 이력서 열람서비스 |3계정에 각각3건 표시. 기존 보존 자료의 아이디·최근결제일과 일치 |
| 개인 채용정보 열람서비스 |5계정에 무기한 표시 |
| 개인 계정 연결 |확보한 운영 D1 스냅샷의 로그인 별칭 기준4계정 연결 |
| 나머지1계정 |탈퇴 신청 목록과 일치. 자동 복원 금지 |
| 기존 보존 범위 |이력서 권리3건은 archive에 존재. 채용정보 열람권 종류는 archive에 없음 |

## 처리

채용정보 열람권5건의 화면 원문과 개인별 연결표를 Git 밖 보호 폴더에 추가했다. 아직 원격 DB에 반입하거나 신규 권리를 발급하지 않았다. 무기한 표시만으로 유료 구매·무제한 사용·정상 회원 상태를 확정하지 않는다. 병원 목록의3건도 실제 잔여 수량이라는 추가 근거는 확보하지 못했다.

초기 구형 candidate 매핑은 현재 계정 ID와 달라 연결에 사용하지 않았다. 실제 스냅샷의 `auth_login_aliases`와 `accounts` 조인으로 대조했다. 탈퇴 계정의 재활성화, 병합, 권리 생성은 하지 않았다.

이번 검증으로 기존 권리 목록에 탈퇴 계정이 남을 수 있음이 확인됐다. 계정 상태와 별도로 권리 목록만 보고 활성화하는 이전은 금지한다.

증거: `C:/Users/ROSSA/medihelpers-audit-20260927/`의 `resume-rights-live-20261011.txt`, `employ-rights-live-20261011.txt`, `employ-reading-rights-private-20261011.json`, `reading-rights-reconciliation-20261011.json`, `reconcile-reading-20261011.mjs`. 개인정보는 Git에 반입하지 않는다.

앱/기존 사이트/DNS/PG 변경 없음. 기존 코드 검사1,630개와 원격 합성 인증30개는 앞선 실행 결과이며 이번에 재실행하지 않았다.
