## 2026년 10월 19일 현재 운영은 랭크업

사용자 요청으로 추가 개발을 중단하고 12:01 KST에 www/apex의 신규 앱 Route 2개를 해제했다. 정식 주소는 기존 랭크업으로 복귀했으며, 신규 Worker는 drain 상태로 DB와 함께 보존한다. 관리자 로그인 후 카드·실시간계좌이체·무통장 3개 복구와 공개 폼 선택 동작을 확인했다. 후속으로 JK 모바일 상세 넘침은 원본 백업 후 관리자 HTML 수정·5개 화면 폭 검수로 해결했다. 쿠키 보안 속성·아이콘 403은 서버 접근 대기이며 기존 회원·실제 거래는 미검증이다. [복구 후 전체 점검](RANKUP_FULL_AUDIT_20261019.md). [후속 수정](RANKUP_REPAIR_20261019.md).

**신규 사이트 재개 요청 전에는 재배포 또는 Route 재연결을 하지 않는다.** 아래 신규 앱 배포·활성/미배포 문구는 당시 이력이며 현재 운영 상태가 아니다. [현재 운영](OPERATIONS_CURRENT.md) · [오늘 작업](WORKLOG_20261019.md) · [복구 결과](RANKUP_RESTORE_20261019.md).

# 배포 운영

기준일: 2026-10-18. [현재 운영 현황](OPERATIONS_CURRENT.md)을 먼저 확인한다. 정식 www/apex는 이미 Cloudflare로 전환됐고 신규 가입·PC/모바일 카드 요청이 열려 있다. 실제 카드 승인·환불 시험 완료와는 구분한다.

## 대상과 소스

| 항목 | 현재 기준 |
| --- | --- |
| 운영 URL | https://www.medihelpers.co.kr/ |
| Worker / DB | `medihelpers-staging` / **medihelpers-production** |
| 운영 빌드 | `npm run build:cf` → `dist-cf/` |
| 운영 설정 | `deploy/cloudflare.live-with-legacy-replies.json` |
| 소스 기준 | GitHub `agent/medihelpers-ui-stability` |
| 소스 미러 | Sites `main`, 동일 커밋만 반영. 정식 런타임으로 재배포하지 않음 |
| 보조 빌드 | `npm run build` → `dist/`, Sites 호환 검증용 |

현재 앱/Worker SHA와 검사 수는 [운영 현황](OPERATIONS_CURRENT.md), [직전 배포](RESUME_INTEGRATION_AUDIT_20261018.md)에 기록한다. 문서 커밋은 앱 배포 버전이 아니다.

## 배포 전

1. GitHub·Sites 원격을 fetch하고 기준 브랜치/현재 작업본/미러가 같은 계보인지 확인한다. 별도 Claude 작업본의 미커밋 변경을 보존한다.
2. 수정 범위에 맞는 회귀·통합 검사와 `npm run build`, `npm run build:cf`, 생성 서버 문법 검사, `git diff --check`를 통과한다. 실패나 EBUSY 뒤의 ‘built in’ 문구만으로 성공 처리하지 않는다.
3. 현재 Worker 버전·바인딩 이름/종류·두 Route·production DB를 기록하고 새 D1 export를 비공개 위치에 저장한다. 로컬 복원 무결성·외래키·해시를 확인한다.
4. 검증된 커밋을 GitHub 기준 브랜치와 Sites main에 같은 SHA로 반영한다. 강제 push로 원격 변경을 없애지 않는다.
5. 운영 설정은 production DB·SITE_ORIGIN·기존 시크릿·PG 환경·메일·회원 보류·권한을 유지한다. 비밀값을 Git·터미널 출력·문서에 넣지 않는다.

현재 서비스의 DB를 새로 만들거나 `.openai/hosting.json`의 R2 이름을 Cloudflare 실제 바인딩으로 추정하지 않는다. 무료 운영은 D1 첨부를 사용하며 R2 자동 백업이 구성됐다고 가정하지 않는다. `dist-cf/wrangler.toml`은 재생성되는 기본 설정이므로 운영에 바로 사용하지 않는다.

## 실제 앱 배포

아래 명령은 모든 사전 검증을 마친 **기능 배포 때만** 실행한다. 문서만 갱신할 때는 실행하지 않는다.

```text
npm run build:cf
wrangler deploy --config deploy/cloudflare.live-with-legacy-replies.json
```

검증한 설정을 정확히 적용하고 기존 secret binding을 보존한다. `--keep-vars`를 기계적으로 추가해 의도한 설정 변경이 무시되게 하지 않는다. 반대로 현재 설정을 읽지 않은 채 과거 JSON을 배포하지 않는다. `SITE_ORIGIN`은 결제 반환 주소와 연관되므로 정식 www를 유지한다.

## 배포 후

- 원격 배포 조회에서 대상 Worker 버전이 100%인지, 운영 바인딩 30개 및 DB·Route가 의도대로 유지됐는지 확인한다.
- 실제 www/apex·주요 페이지, HTML no-store, 최신 JS/CSS 해시, 이전 이미지·공고 링크를 확인한다.
- 익명 보호 API 차단 및 새 운영자 로그인·권한·로그아웃을 확인한다. 회원·권한 변경은 의료인/병원/관리자 새 세션의 역할별 검증을 포함한다. 격리 계정 시험과 실제 운영 시험은 보고서에서 분리한다.
- 결제창 CSP·닫기/복귀 및 오류 경로를 확인하되 모의 승인 결과를 실제 카드 성공으로 기록하지 않는다.
- 버전·검사 범위·실패/한계를 CHANGELOG, STATUS, TEST, 관련 검수 문서에 기록한다.

Sites/Pages의 과거 주소를 현재 운영본으로 검수하지 않는다. 합성 데이터는 격리 환경에서 사용한다. 운영 고객 자료로 시험 주문·이력서를 만들지 않는다.

## 점검·복구

[복구 실행서](ROLLBACK_RUNBOOK.md)를 따른다. 앱 버전 복귀, 신규 주문 중지, 전체 랭크업 복귀를 구분한다. **실결제 개방 전의 drain/open 설정 파일을 현재 운영 복귀 명령으로 바로 사용하지 않는다.** 기존 PG의 환경과 진행 응답을 유지한 상태에서 필요한 제어값만 검토한다.

관련 문서: [운영 현황](OPERATIONS_CURRENT.md), [배포 무결성](DEPLOY_GUARDRAILS.md), [전환 기록](DOMAIN_SWITCH_20261018.md), [복구](ROLLBACK_RUNBOOK.md), [이전 사이트 접근](LEGACY_ORIGIN_ACCESS_20261011.md).
