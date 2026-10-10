# 2026-10-10 공개 광고 복구 검수

한국시간13:43 이후 익명 실제 요청으로 /api/site-operations 200, 기존 강조 광고4건(135/285/296/324)을 확인했다. migration/ownerMapping/originalFields/sourceRow가 공개 응답에 없음을 검사했다. /api/account 200은 익명 응답이며 실제 회원 로그인 성공을 뜻하지 않는다. 관리자 API는 익명403으로 차단됐다.

4개 공고 상세를 실제 브라우저에서 확인했다. 청아병원은 목록 카드 클릭, 나머지는 동일 상세 경로로 직접 연결을 확인했다. 전체15개 로고·시설·본문 이미지를 실제HTTP로 받아 배포 원본과 바이트/SHA256을 비교했고 모두 일치했다. 일부 스크롤 아래 lazy 이미지의 미로딩은 깨진 이미지와 구분했다. 속초우리 상세 모바일390px에서 document.scrollWidth380px로 가로 넘침이 없었다.

로딩 중 목록이 잠깐 공고0건으로 표시되는 문제를 발견해 /jobs도 데이터가 준비될 때까지 로딩 안내를 표시하도록 수정했다. 로컬 실제 백업 복사본에3.5초 지연을 넣어 로딩 안내→광고4건 전환을 확인했다. DB나 권한 변경은 없다. 전체18묶음1,619개(단위445개), 일반/Cloudflare 빌드 통과. 운영 회원·관리자 실제 로그인과 실카드 시험은 하지 않았다.

원본 증거는 Git 밖 감사 폴더의 public-ads-http-20261010.json, public-ads-api-20261010-private.json, ad-assets-http-20261010.json, ads-recovered-desktop-20261010.png, ad-mobile-20261010.png, recovery-checks-20261010.log에 보관한다. 원격 쓰기·회원 활성화·결제·정식DNS 변경 없음. 무료한도 복구는 확인했지만 하루 실제 사용량 감소나 부하 한계까지 검증한 것은 아니다.

로딩 수정 배포 결과는 후속 기록을 참조한다.

## 배포 결과

2026-10-10 검수 배포 완료: e0afe4e / Worker babfe610-ce7f-47f5-919b-6a4b96446cee. 최신 자산·HTML200/no-store/noindex·공개API200/광고4건·실제 목록 표시 확인. www DNS121.254.171.115 유지.

GitHub 기준 브랜치와 Sites 소스 main 동일 SHA를 확인한 뒤 Cloudflare 검수에만 배포했다. 자료는 recovery-postdeploy-20261010.json, ads-final-deployed-20261010.png. 변경후 실제 목록4건 표시를 확인했다. 작업본·별도 보존 작업본 모두 기존 사용자 변경 없음. 후속 문서 커밋은 앱 변경이 없다.
