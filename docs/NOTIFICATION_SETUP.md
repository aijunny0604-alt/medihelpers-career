# 상담 알림(메일·문자) 설정 가이드

기준일: 2026-08-14
관련 코드: `scripts/package-sites.mjs` (`sendConsultationEmail`, `sendRecoveryEmail`, `sendSignupEmails`, `sendConsultationSms`)

## 지금 상태

상담/후보연결 요청이 들어오면 서버가 **이미 3곳으로 알리도록 코드가 완성**돼 있다:
1. **관리자 콘솔** — D1 `consultation_requests` 저장 + 병원 요청은 CRM 케이스 자동 생성 (항상 작동)
2. **이메일** — Resend API (환경변수 있으면 발송)
3. **문자(SMS)** — Solapi API (환경변수 있으면 발송)

이메일·문자는 현재 **환경변수 미설정이라 `not_configured` 상태**. 아래 키만 등록하면 즉시 아빠 메일·휴대폰으로 알림이 간다. **코드 수정 불필요.**

같은 `RESEND_API_KEY`와 `RESEND_FROM`은 회원 아이디 찾기 안내, 30분 비밀번호 재설정 링크, 회원가입 축하 메일에도 사용합니다. 계정 복구와 가입 축하 메일은 회원이 등록한 이메일로 직접 전송하고, 신규 가입 관리자 안내는 `ALERT_EMAIL_TO`로 보냅니다. 2026-08-14 운영 Sites 확인 기준 `RESEND_API_KEY`와 `RESEND_FROM`이 아직 등록되지 않았습니다.

## 가장 간단한 실제 메일 활성화 순서

1. [Resend](https://resend.com)에 가입하고 **Domains**에서 `medihelpers.co.kr`을 추가합니다.
2. Resend가 보여주는 DKIM·SPF·MX DNS 레코드를 현재 도메인 DNS 관리 화면에 그대로 등록합니다. Resend의 도메인 상태가 `Verified`가 될 때까지 기다립니다.
3. Resend **API Keys**에서 `Sending access` 권한의 키를 하나 생성합니다. 가능하면 `medihelpers.co.kr` 도메인으로 범위를 제한합니다. 키 원문은 생성 직후 한 번만 표시되므로 안전한 곳에 보관합니다.
4. OpenAI Sites 운영 환경변수에 아래 값을 추가합니다. 기존 `ALERT_EMAIL_TO`는 대표자·관리자 수신 주소로 그대로 유지합니다.

   - `RESEND_API_KEY` = `re_...` 형식의 키, **Secret**으로 저장
   - `RESEND_FROM` = `메디헬퍼스 <no-reply@medihelpers.co.kr>`
   - `ALERT_EMAIL_TO` = 신규 가입 안내를 받을 대표자 이메일. 여러 주소는 쉼표로 구분

5. 같은 소스 버전을 다시 배포해 새 환경변수 리비전을 적용합니다.
6. 본인이 받을 수 있는 이메일로 테스트 회원가입을 1건 진행해 다음 두 통을 확인합니다.

   - 가입자: `[메디헬퍼스] 회원가입을 축하드립니다`
   - 대표자·관리자: `[메디헬퍼스] 신규 의료인 회원 가입 안내` 또는 `신규 병원 회원 가입 안내`

`onboarding@resend.dev`는 Resend 계정 소유자 주소로만 보낼 수 있는 제한된 테스트 발신자입니다. 실제 회원과 대표자에게 보내려면 반드시 우리 도메인을 인증하고 `@medihelpers.co.kr` 발신 주소를 사용합니다.

### 회원가입 메일 수신 규칙

- 가입자 축하 메일: 회원가입 때 입력한 이메일 주소
- 대표자·관리자 가입 알림: `ALERT_EMAIL_TO`에 쉼표로 구분해 등록한 주소
- 관리자 안내 항목: 회원 유형, 가입자명, 가입 이메일, 병원명 또는 전문분야, 가입 시각
- 제외 항목: 비밀번호, 비밀번호 해시, 세션·인증 토큰
- 발송 시점: 회원가입 DB 저장과 로그인 세션 생성 후 백그라운드 실행. 메일 실패는 회원가입 성공에 영향을 주지 않음

## 설정할 환경변수 (호스팅 환경변수에만 저장, git 커밋 금지)

### 📧 이메일 알림 (Resend)
| 변수 | 값 | 설명 |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | resend.com 가입 후 API Keys에서 발급 |
| `RESEND_FROM` | `메디헬퍼스 <no-reply@medihelpers.co.kr>` | 발신 주소. 실제 회원에게 보내려면 Resend에서 도메인 인증 필요 |
| `ALERT_EMAIL_TO` | 아빠 이메일 | 알림 받을 주소 |

**절차**: resend.com 가입 → medihelpers.co.kr 도메인 인증 → Sending access API Key 발급 → 위 3개 등록 → 재배포.
무료 플랜 월 3,000건까지 발송 가능(상담 알림엔 충분).

### 📱 문자 알림 (Solapi = 구 쿨SMS)
| 변수 | 값 | 설명 |
|---|---|---|
| `SOLAPI_API_KEY` | API Key | solapi.com 가입 후 발급 |
| `SOLAPI_API_SECRET` | API Secret | 〃 |
| `SOLAPI_SENDER` | 발신번호 | Solapi에 **사전 등록·인증된 발신번호**만 가능(통신사 규정) |
| `ALERT_SMS_TO` | 아빠 휴대폰 | 알림 받을 번호 |

**절차**: solapi.com 가입 → 발신번호 등록·인증(본인 명의 번호 인증 필요) → API Key/Secret 발급 → 위 4개 등록. 건당 과금(SMS ~20원).

## 환경변수 등록 위치

서버 런타임이 OpenAI Sites Worker다. `.openai/hosting.json`의 `project_id`를 유지한 채, **호스팅 대시보드의 환경변수(Secrets)**에 등록한다. `.env`·저장소에 넣지 않는다(DEPLOY.md 17행 원칙).

> 정확한 등록 UI 경로는 배포 시점 호스팅 콘솔에서 확인. (로컬 `.env`는 클라이언트 VITE_* 용이며 서버 시크릿과 분리)

## 동작 확인

설정 후 상담을 1건 넣으면:
- 응답 JSON의 `notifications.email` / `notifications.sms`가 `sent`면 성공.
- `not_configured` = 키 누락, `failed` = 키·발신번호·도메인 인증 오류.
- 관리자 상담함(`/admin/consultations`)에서 각 상담의 알림 상태 배지로도 확인 가능.

## 주의

- 발신번호 미인증 상태로 SMS 보내면 실패(통신사 규정). Solapi에서 발신번호 인증이 선행.
- 이메일 도메인 미인증 시 스팸 처리될 수 있음 → Resend 도메인 인증 권장.
- 키는 전부 서버 시크릿. 절대 프론트 코드·git·화면 공유에 노출 금지.
