export const QA_PREVIEW_STORAGE_KEY = 'medihelpers_qa_preview_state';

export const QA_STATE_OPTIONS = Object.freeze([
  {
    id: 'guest',
    label: '비로그인 방문자',
    shortLabel: '비로그인',
    description: '공개 공고와 무료 기능만 확인합니다.',
    tone: 'guest',
    capabilities: { signedIn: false, admin: false, hospital: false, doctor: false, membership: false, privateDetails: false },
    metrics: [['접근 권한', '공개 정보'], ['결제 상태', '미구독'], ['관리 기능', '없음']]
  },
  {
    id: 'admin',
    label: '관리자',
    shortLabel: '관리자 QA',
    description: '공고 검수, 회원 상태, 상담 접수를 점검합니다.',
    tone: 'admin',
    capabilities: { signedIn: true, admin: true, hospital: false, doctor: false, membership: false, privateDetails: true },
    metrics: [['검수 대기', '4건'], ['신규 상담', '7건'], ['회원 확인', '3건']]
  },
  {
    id: 'hospital',
    label: '병원 회원',
    shortLabel: '병원 담당자',
    description: '채용공고 등록과 후보 연결 흐름을 점검합니다.',
    tone: 'hospital',
    capabilities: { signedIn: true, admin: false, hospital: true, doctor: false, membership: false, privateDetails: false },
    metrics: [['등록 공고', '2건'], ['후보 상담', '3명'], ['광고 상태', '추천 노출']]
  },
  {
    id: 'doctor',
    label: '의사 일반 회원',
    shortLabel: '의사 회원',
    description: '관심공고와 무료 비교 기능을 점검합니다.',
    tone: 'doctor',
    capabilities: { signedIn: true, admin: false, hospital: false, doctor: true, membership: false, privateDetails: false },
    metrics: [['관심공고', '3건'], ['매칭 리포트', '1건'], ['멤버십', '미구독']]
  },
  {
    id: 'doctor-member',
    label: '의사 멤버십 구독',
    shortLabel: '의사 · 구독 중',
    description: '잠금 해제된 상세조건과 구독 상태를 점검합니다.',
    tone: 'member',
    capabilities: { signedIn: true, admin: false, hospital: false, doctor: true, membership: true, privateDetails: true },
    metrics: [['열람 가능', '전체 공고'], ['이용권', '월 패스'], ['다음 결제', '2026.08.16']]
  }
]);

export function normalizeQaState(value) {
  return QA_STATE_OPTIONS.some((option) => option.id === value) ? value : '';
}

export function getQaStateInfo(value) {
  return QA_STATE_OPTIONS.find((option) => option.id === normalizeQaState(value)) || QA_STATE_OPTIONS[0];
}

export function qaCanViewPrivateDetails(value) {
  return getQaStateInfo(value).capabilities.privateDetails;
}

export function qaHasMembership(value) {
  return getQaStateInfo(value).capabilities.membership;
}
