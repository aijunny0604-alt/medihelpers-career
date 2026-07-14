# AGENTS.md

## Purpose

AI 개발 도구가 메디헬퍼스의 사업 방향과 안전 기준을 유지하며 작업하기 위한 지침입니다.

## Current State

현재는 시장 검증용 프론트엔드 MVP입니다. 실제 인증·DB·결제는 문서에 정의되어 있으며 순차 도입합니다.

## Current Rules

- 모든 작업 전 `docs/INDEX.md`와 관련 주제 문서를 먼저 읽습니다.
- 메디헬퍼스의 핵심은 단순 공고 게시판이 아닌 1:1 의료 커리어 컨시어지입니다.
- 타 서비스의 상표, 문구, 화면을 복제하지 않습니다.
- 실제 의사 개인정보와 병원 내부정보를 샘플 데이터에 넣지 않습니다.
- 결제는 승인된 PG와 서버 검증 없이 성공 처리하지 않습니다.
- 개인정보 수집 폼에는 목적, 보유기간, 동의 체크를 포함합니다.
- 변경 후 `npm run build`를 실행합니다.
- 배포 시 `.openai/hosting.json`의 기존 `project_id`를 유지합니다.

## Related Docs

- `docs/DESIGN.md`
- `docs/ARCHITECTURE.md`
- `docs/TEST.md`

