# Cloudflare Workers 이전 가이드

> **왜 옮기나:** OpenAI Sites 이용약관(§2.5/3.3)이 **결제·PCI 데이터 처리를 금지**한다.
> 이니시스 결제를 붙이려면 Cloudflare Workers로 이전해야 한다.
> 다행히 현재 구조가 이미 Cloudflare 방식(Worker + D1)이라 **코드는 거의 그대로** 쓴다.

## 준비 완료된 것 (2026-07-20)

- ✅ `npm run build:cf` — Cloudflare용 빌드 명령 추가
- ✅ **Worker 번들 1.4MB** (정적 파일을 Static Assets로 분리) → 무료 플랜 3MB 제한 통과
  - 이전에는 이미지·영상을 base64로 인라인해 12MB였음
- ✅ `dist-cf/wrangler.toml` 자동 생성 (D1·ASSETS 바인딩 포함)
- ✅ 히어로 영상 압축 2.9MB → 960KB

## 산출물 구조

```
dist-cf/
  server/index.js    ← Worker (1.4MB, export default { fetch })
  public/            ← 정적 파일 (Static Assets로 서빙, 6.8MB)
  drizzle/           ← D1 마이그레이션 SQL
  wrangler.toml      ← 배포 설정
```

---

## 이전 절차

### 1단계 — Cloudflare 계정·CLI 준비
```bash
npm install -g wrangler       # 또는 npx wrangler 사용
wrangler login
```

### 2단계 — D1 데이터베이스 생성
```bash
cd dist-cf
wrangler d1 create medihelpers
```
출력된 `database_id`를 `dist-cf/wrangler.toml`의 `REPLACE_WITH_D1_DATABASE_ID` 자리에 넣는다.

> ⚠️ 빌드할 때마다 `wrangler.toml`이 새로 생성되므로, **확정된 `database_id`는 `scripts/package-sites.mjs`의 wrangler 생성부에 반영**하거나 별도 보관 후 매번 채워 넣는다.

### 3단계 — 스키마 생성
서버 코드가 요청 시 `ensure*Schema`로 테이블을 자동 생성하므로 별도 작업 없이도 동작한다.
다만 운영에서는 마이그레이션으로 미리 만드는 편이 안전하다:
```bash
wrangler d1 execute medihelpers --remote --file=./drizzle/0000_init.sql
# drizzle/ 안의 파일을 순서대로 적용
```

### 4단계 — 기존 데이터 이전 (기존 사이트 운영 중이면)
OpenAI Sites의 D1 데이터를 export 받아야 한다. **공식 export 경로가 확인되지 않았으므로** OpenAI 지원에 요청하거나, 관리자 화면에서 필요한 데이터를 수동 백업한다.
```bash
# export 파일을 받은 뒤
wrangler d1 execute medihelpers --remote --file=./backup.sql
```
> 정식 오픈 전이라 데이터가 적다면 **새로 시작**하는 편이 간단할 수 있다.

### 5단계 — 시크릿 주입 (파일에 넣지 말 것)
```bash
wrangler secret put INICIS_MID
wrangler secret put INICIS_SIGN_KEY
wrangler secret put ACCOUNT_HASH_SECRET
wrangler secret put ADMIN_EMAILS
# 알림을 쓸 경우
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM
wrangler secret put ALERT_EMAIL_TO
wrangler secret put SOLAPI_API_KEY
wrangler secret put SOLAPI_API_SECRET
wrangler secret put SOLAPI_SENDER
wrangler secret put ALERT_SMS_TO
```
공개 가능한 값은 `wrangler.toml`의 `[vars]`에:
```toml
[vars]
SITE_ORIGIN = "https://medihelpers.co.kr"
# PAYMENT_LIVE = "true"   # 실결제 강제(키 없으면 결제를 막음)
```

> ⚠️ **`SITE_ORIGIN`은 결제 정확성에 직결**된다. 이니시스 `returnUrl`과 결제 결과 리다이렉트가 이 값으로 만들어진다. 도메인과 **정확히 일치**해야 한다(apex vs www 주의).

### 6단계 — 배포
```bash
cd dist-cf
wrangler deploy
```

### 7단계 — 도메인 연결
Cloudflare 대시보드 → Workers & Pages → 해당 Worker → Settings → Domains & Routes → **Custom Domain 추가** → `medihelpers.co.kr`

- 도메인이 Cloudflare에 네임서버로 등록돼 있으면 DNS·SSL이 자동 처리된다
- 아니면 도메인 등록처에서 네임서버를 Cloudflare로 변경해야 한다

### 8단계 — 보안 설정 (필수)
OpenAI Sites가 대신 해주던 보호가 사라지므로 직접 켠다:
- **WAF 관리형 룰** 활성화
- **Bot Fight Mode** 활성화
- **Rate limiting**: `/api/auth/*`(로그인 시도), `/api/payment-approve`에 적용

---

## 이전 후 점검 체크리스트

- [ ] 홈·주요 페이지 로드, 히어로 영상 재생
- [ ] 회원가입·로그인·로그아웃
- [ ] 이력서 등록 → 구직 게시판 노출
- [ ] 관리자 로그인 → `/admin/post` 공고 등록 → 초빙 정보란 노출
- [ ] 결제 3종(멤버십·광고·열람권) → 이니시스 결제창 → 성공/취소 배너
- [ ] 열람권 결제 후 상세 실명·연락처 열람
- [ ] 상담 신청 → 관리자 상담함 + 이메일/문자 알림

## 알려진 주의점

| 항목 | 내용 |
|---|---|
| `wrangler.toml` 재생성 | 빌드마다 새로 만들어짐 → `database_id` 재입력 필요 |
| 스키마 자동 생성 | 요청마다 `ensure*Schema` 실행(성능 낭비) → 운영 전 마이그레이션으로 전환 권장 |
| D1 데이터 export | OpenAI Sites에서 내보내는 공식 절차 미확인 |
| 무료 플랜 제한 | Worker 1.4MB로 통과. 정적 파일은 Assets라 제한과 무관 |
