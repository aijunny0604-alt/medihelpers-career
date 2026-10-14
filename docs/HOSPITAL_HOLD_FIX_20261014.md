# 병원회원 이전 보류 기록 보존 수정

## 확인한 문제

시험/운영 전환용 DB의48테이블을 비교했으며 세션1건의 만료일 외에는 같았다. 원격 읽기 검사에서 유효 로그인 세션0, 사용 가능한 발송된 재설정 토큰0을 확인했다. 그러나 MIGRATION_HOLD 표식은 개인회원131명만 있었고 병원151명은 suspended/verified/빈 메모였다.

원인은 ensureHospitalVerificationSchema의 기존 즉시가입 정책 보정 UPDATE였다. 병원 계정의 verification_status를 verified로 바꾸면서 admin_note를 빈 문자열로 덮었다. 계정 status는 suspended 그대로여서 권한이 활성화된 것은 아니지만, 이전 중 안내 대신 일반 이용 정지 안내가 나오고 운영 메모가 사라질 수 있었다.

## 수정

기존 아이디 연결(source=rankup) 또는 MIGRATION_HOLD 메모가 있는 계정은 자동 인증/서류 승인 보정 대상에서 제외한다. 일반 신규 병원계정의 즉시가입 정책은 유지하되 운영 메모를 지우지 않는다. 이 변경만으로 이미 지워진 메모가 복원되지는 않는다. 실제 기존 메모 복원은 최초 반입 백업과 대조한 별도 수정이 필요하다.

## 검증

생성 Worker의 실제 인증 초기화를 호출하는 회귀검사7개를 추가했다. 이전 병원의 suspended/unverified/보류 메모 보존, 일반 병원의 기존 suspended 유지·정책상 verified 전환·운영 메모 보존을 확인했다. 최초 시험 fixture에서 자격증명 없이 alias를 넣어 외래키 오류가 났으며 fixture를 고친 뒤 검증했다. 이를 제품 코드 실패 재현으로 집계하지 않는다.

두 빌드와 전체19묶음1,804검사 통과. 별도 임시 Cloudflare D1에서 의료인/병원/관리자 각각 새 세션으로 비밀번호 로그인·권한·로그아웃 검증30개 통과했다. 임시 preview 종료 및 DB 삭제 완료. 실제 고객 비밀번호/상태 변경은 없다. 현재 이 수정은 배포 전이며 정식 도메인 전환과 실결제 검수 완료를 뜻하지 않는다.

## 검수 배포 및 메모 복원 완료

앱 소스852274589559df161fb1fdc5ba2786b02af86b3a를 동일 staging 설정으로 배포했다. Worker 버전은 f4080523-f0ce-4b70-aef5-55d9980dba3d다. 홈페이지/로그인/계정복구/account200, 익명 admin403 및 member-center/resumes401의7개 실제 HTTP검사가 통과했고 모두 no-store다. 배포 후 문서는 Git에 기록되며 공개 문서 URL 제공을 확인한 것은 아니다.

메모 복원 전 두 DB의 최신 전체 백업을 다시 받았다. 최초 보호 반입 백업(staging-after-protected-members.sql)에서 병원151명의 원래 MIGRATION_HOLD 메모를 확인했다. 동일 계정이며 suspended/verified/빈 메모/system-auto인151건만 조건부 UPDATE했다. 원래 메모가 모두 같은 값임을 확인했으며, 반복 적용은0건이 되도록 조건을 유지했다. 관리자 작성 메모나 다른 계정에는 적용하지 않았다.

복원 후 두 DB를 다시 export해 각각48테이블 전체 행이 예상본과 일치함을 확인했다. 변경 대상은 account_admin_profiles의 메모·수정자·수정시각151건뿐이다. status/verification_status/비밀번호/권리/결제는 변경하지 않았다. 보류 표식은 각 DB282건으로 복원됐다. verified 값은 원본 회원 검증 증거가 아니므로 임의 활성화 근거로 사용하지 않는다.

증거(비공개): hospital-hold-fix-audit-retry-20261014.log, auth-proof-results-20261014.json, auth-proof-cleanup-20261014.log, hospital-hold-deploy-20261014.log, hospital-hold-deployed-http-20261014.json, hold-repair-compare-20261014.json 및 전후 SQL 백업. 실제 고객 로그인 및 정식 도메인 전환은 미완료다.
