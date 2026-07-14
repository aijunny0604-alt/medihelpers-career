# DEPLOY

## Purpose

메디헬퍼스 사이트를 안전하게 배포하는 기준입니다.

## Current State

OpenAI Sites 프로젝트 `medihelpers-career`에 배포됩니다.

## Current Rules

- 배포 전 `npm run build` 성공을 확인합니다.
- 기존 `.openai/hosting.json`의 프로젝트 연결을 유지합니다.
- 비밀값은 저장소가 아닌 호스팅 환경변수에 저장합니다.
- 공개 배포 전 샘플 데이터와 개인정보를 재검토합니다.

## Release Checklist

- 주요 메뉴와 모바일 레이아웃
- 상담·광고 주문 폼의 필수값과 동의
- 전화·이메일 링크
- 결제 관련 표현과 가격
- 개인정보처리방침과 이용약관

## Related Docs

- `TEST.md`
- `BILLING.md`

