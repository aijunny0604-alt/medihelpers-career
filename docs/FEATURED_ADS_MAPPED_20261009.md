# 2026-10-09 기존 강조 광고4건 매핑 완료

검수 D1의 rankup-job-285/135/324/296에 기존 로고·병원명·featured 등급·원본 서비스명·노출 종료일을 반영했다. status=draft, visibility=admin을 유지하며 공고 공개나 결제/이용권 생성은 하지 않았다.

- JK워드미: 기존 프리미엄로고, 2026-07-17~2027-01-17. 기존 서버의 한국 날짜 기준 종료 판정과 호환되는 exposure/end 값을 설정했다.
- 청아/속초우리/삼천포제일: 해당 기존 서비스의 무기한 설정 보존. 새30일 상품으로 치환하거나 재청구하지 않았다.
- 기존 premium 슬롯의 이미지가 세로/정방형 로고이므로 full-banner 방식에서 잘리는 문제가 로컬 화면에 나타났다. 청아·속초우리2건을 contain 기반 logo 표시로 수정했고, 이후 화면에서 잘림 해소를 확인했다.
- 로고4개 실제 staging HTTP200·SHA256 원본 일치.

## 검사 및 변경 범위

신규 매핑 검사5개 포함 단위441개 통과, build/diff 통과. 48테이블 로컬 적용·역적용 완전 일치 및 마지막 공고 충돌 시 앞선 변경까지 취소하는 가드 확인. 원격 적용 후 export를 예상 결과와 모든 열/행 전수 대조하여 일치했다. 변경 테이블은 admin_content_records 하나, 대상 공고4개다. 회원·결제 변경0. 로고 보정2건 후에도48테이블 예상본 일치를 다시 확인했다.

소스 도구: scripts/prepare-featured-legacy-ads.mjs, src/legacyAdServiceMapping.js. 원본 데이터/SQL/스냅샷은 Git 밖 감사 폴더에만 보관. 이전 준비 SQL은 로고 보정 전이므로 최종 상태 복원에는 보정 SQL 또는 최신 export를 함께 사용해야 한다. 이미 적용된 DB에서 준비 도구는 기존 adTier/exposure 편집 충돌로 중단하도록 설계했다.

증거: before-featured-map-20261009.sql, featured-map-plan-private.json, featured-map-asset-verification.json, featured-map-apply.sql, featured-map-logo-correction.sql, after-featured-logo-20261009.sql, featured-map-final-verification.json, featured-map-preview-20261009.png.

화면 증거는 최신 원격 백업의 로컬 메모리 복사본에서4건만 공개한 미리보기다. 로컬 합성 관리자 세션이며 실제 운영 로그인 검증이 아니다. 원격 공고 공개0, 앱Worker52e5f83c 유지, 도메인/PG 설정 변경 없음. 실제 공개와 회원 활성화는 다음 검수 범위다.
