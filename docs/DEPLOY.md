# DEPLOY

## Purpose

메디헬퍼스 사이트를 안전하게 배포하는 기준입니다.

## Current State

- 기본 공개본: OpenAI Sites 프로젝트 `medihelpers-career`
- 보조 공개본: GitHub Pages `aijunny0604-alt.github.io/medihelpers-career`
- 소스 저장소: GitHub `aijunny0604-alt/medihelpers-career`
- 현재 운영 소스 브랜치: `agent/medihelpers-ui-stability`
- 현재 Sites 운영 버전: `191` (`f2512b7`, 2026-07-19 배포)

## Current Rules

- 배포 전 `npm run build` 성공을 확인합니다.
- 기존 `.openai/hosting.json`의 프로젝트 연결을 유지합니다.
- 비밀값은 저장소가 아닌 호스팅 환경변수에 저장합니다.
- 공개 배포 전 샘플 데이터와 개인정보를 재검토합니다.
- 검증된 변경과 문서를 운영 소스 브랜치 `agent/medihelpers-ui-stability`에 푸시합니다.
- GitHub Pages 미러의 배포 브랜치는 별도 워크플로 설정을 확인한 뒤 동기화합니다.
- Sites는 GitHub와 동일한 커밋을 소스 저장소에 반영한 뒤 버전을 저장하고 공개 배포합니다.
- 로컬 저장만으로 자동 푸시하지 않으며, 검증되지 않은 변경을 공개하지 않습니다.

## Release Checklist

- 주요 메뉴와 모바일 레이아웃
- 상담·광고 주문 폼의 필수값과 동의
- 전화·이메일 링크
- 결제 관련 표현과 가격
- 개인정보처리방침과 이용약관
- README·CHANGELOG·STATUS의 버전, 커밋, 공개 URL 일치 여부
- GitHub Pages 메인과 주요 하위 URL 직접 접근
- Sites와 GitHub의 배포 대상 커밋 일치 여부

## Related Docs

- `TEST.md`
- `BILLING.md`

