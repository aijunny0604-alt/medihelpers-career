# 메디헬퍼스 채용·인재정보 플랫폼

메디헬퍼스는 의사 헤드헌팅을 중심으로 병원의 채용 의뢰, 의사의 비공개 이직 상담, 의사 초빙공고, 익명 인재정보와 의료인 채용정보를 연결하는 플랫폼입니다.

## 공개 사이트

- [OpenAI Sites 운영본](https://medihelpers-career.junnyai.chatgpt.site)
- [GitHub 저장소](https://github.com/aijunny0604-alt/medihelpers-career)
- [GitHub Pages 미러](https://aijunny0604-alt.github.io/medihelpers-career/)
- 문서 기준일: 2026-07-19

## 현재 구현

### 사용자 화면

- 홈과 채용정보에서 동일한 공고 카드·정렬 기준 사용
- 진료과·지역·초빙유형·근무조건 검색과 관심공고 저장
- 의사 초빙공고 상세, 병원 정보·사진·모집기간·구조화된 근무조건
- 일반 회원용 비공개 이직상담·간편 이력서, 병원 회원용 채용의뢰·공고 신청
- 메디헬퍼스 자체 이메일·비밀번호 로그인과 D1 보안 세션(OpenAI 계정 로그인 미사용)
- 익명 인재정보와 후보자 동의 기반 상세 공개 안내
- 의료인 채용정보 서브 허브
- 역할별 마이페이지, 상담·결제 요청·활동 내역

### 운영 화면

- 관리자 콘솔 `/admin`
- 상담함 `/admin/consultations`
- 헤드헌팅 CRM `/admin/recruitment-crm`
- 회원, 상담, 콘텐츠, 카테고리, 기능 플래그, 주문·환불 요청, 감사 로그 관리
- D1 상담 저장과 Resend 이메일·Solapi 문자 알림 연동 지점

## 중요한 운영 경계

- 회원가입은 약관 법무 승인과 운영 환경값이 모두 준비된 경우에만 서버 계정을 생성하며, 비밀번호 원문은 저장하지 않고 PBKDF2-SHA-256 해시로 보호합니다.
- 현재 결제는 주문·검토·수동 상태관리까지 구현되어 있습니다. 실제 카드 승인, 취소, 환불, 영수증 자동 발행은 PG 연동 전이므로 운영 결제로 간주하면 안 됩니다.
- 관리자에서 작성한 공개 콘텐츠는 운영 API를 통해 화면 데이터에 합쳐집니다. 기존 샘플 공고·인재 데이터는 아직 소스 정적 데이터이므로 관리자 DB가 전체 목록의 단일 원장은 아닙니다.
- 후보자의 실명·연락처·근무기관 이력은 병원별 동의와 서버 권한 검증 후에만 제공해야 합니다.

## 실행과 검증

```bash
npm install
npm test
npm run build
```

## 문서

- [문서 인덱스](docs/INDEX.md)
- [현재 구현 상태](docs/STATUS.md)
- [시스템 구조](docs/ARCHITECTURE.md)
- [권한·회원 설계](docs/AUTH.md)
- [결제·상품 설계](docs/BILLING.md)
- [API](docs/API.md)
- [DB](docs/DB.md)
- [테스트 기준](docs/TEST.md)
- [로드맵](docs/ROADMAP.md)
- [변경 기록](CHANGELOG.md)
