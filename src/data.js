export const jobs = [
  {
    id: 'samcheonpo-specialists', hospital: '삼천포제일병원', title: '각 과 전문의 의료진 초빙',
    location: '경남 사천시', region: '경남', type: '정규직', dept: '전문의', pay: '협의 후 결정',
    badge: '집중채용', adTier: 'spotlight', color: '#2367e8', logo: '/samcheonpo-jeil-horizontal-logo-v2.png', brandFit: 'banner', logoDesignSample: true, logoText: '삼제', schedule: '주 5일', updated: '오늘', deadline: '2026.08.31', recruitmentReason: '진료과 확충', workHours: '평일 08:30~18:00 · 토요일 협의', daysOff: '일요일·공휴일 휴무',
    facilityType: '종합병원', focus: '지역 거점 진료·전문의 진료', scale: '병원급 의료기관', access: '주차·숙소 조건 협의 가능',
    summary: '지역 거점 종합병원에서 진료과별 전문의를 모십니다. 진료 여건과 근무 일정은 전문 컨설턴트가 개별 조율합니다.',
    benefits: ['기숙사 협의', '학회 지원', '전담 컨설턴트 협상']
  },
  {
    id: 'cheongju-orthopedic', hospital: '청주첨단한방병원', title: '정형외과·통증의학과 원장님',
    location: '충북 청주시', region: '충북', type: '정규직', dept: '정형외과', pay: '월 1,400만원~',
    badge: '신규', color: '#12a67a', logoText: '청첨', schedule: '주 5일', updated: '1일 전', deadline: '2026.08.20', recruitmentReason: '외래 진료 확대', workHours: '평일 09:00~18:00', daysOff: '일요일·공휴일 휴무',
    facilityType: '한방병원', focus: '외래·통증 진료', scale: '병원급 의료기관', access: '근무지 교통·주차 안내 제공',
    summary: '안정적인 외래 중심 진료 환경입니다. 근무일과 성과 조건은 경력에 따라 유연하게 협의합니다.',
    benefits: ['외래 중심', '성과 인센티브', '근무일 협의']
  },
  {
    id: 'isarang-pediatrics', hospital: '아이사랑병원', title: '달빛어린이병원 담당 원장님',
    location: '부산 연제구', region: '부산', type: '주 5일', dept: '소아청소년과', pay: '월 1,400만원+',
    badge: '추천', adTier: 'featured', color: '#7d57e8', logo: '/isarang-children-brand-mark.png', cardBanner: '/isarang-children-recruitment-banner-v2.png', logoDesignSample: true, logoText: '아이', schedule: '요일 협의', updated: '2일 전', deadline: '2026.08.25', recruitmentReason: '달빛진료 운영 확대', workHours: '요일·시간 협의', daysOff: '근무표에 따라 협의',
    facilityType: '병원', focus: '소아청소년 진료', scale: '팀 기반 진료기관', access: '대중교통·주차 안내 제공',
    summary: '소아 진료에 집중할 수 있는 팀 기반 환경입니다. 야간 진료 일정과 보상은 상담을 통해 안내합니다.',
    benefits: ['팀 진료', '스케줄 협의', '전담 코디네이터']
  },
  {
    id: 'sokcho-specialists', hospital: '속초우리요양병원', title: '진료과별 전문의 선생님',
    location: '강원 속초시', region: '강원', type: '정규직', dept: '전문의', pay: '협의 후 결정',
    badge: '상시채용', color: '#e57a35', logoText: '속우', schedule: '주 5일', updated: '3일 전', deadline: '2026.09.15', recruitmentReason: '진료 인력 충원', workHours: '주 5일 · 당직 협의', daysOff: '주말 일정 협의',
    facilityType: '요양병원', focus: '입원 환자 관리', scale: '병원급 의료기관', access: '숙소·지역 근무 조건 협의',
    summary: '입원 환자 관리 중심의 안정적인 포지션입니다. 숙소와 주말 일정 등 지역 근무 조건을 조율합니다.',
    benefits: ['숙소 지원 협의', '당직 조건 협의', '장기근속 우대']
  },
  {
    id: 'cheonga-gastro', hospital: '청아병원', title: '소화기내과 전문의 초빙',
    location: '경남 창원시', region: '경남', type: '정규직', dept: '내과', pay: '협의 후 결정',
    badge: 'HOT', color: '#e24e62', logoText: '청아', schedule: '주 5일', updated: '4일 전', deadline: '2026.08.18', recruitmentReason: '소화기센터 확충', workHours: '평일 08:30~17:30 · 토 격주', daysOff: '일요일·공휴일 휴무',
    facilityType: '병원', focus: '내과·내시경·외래 진료', scale: '병원급 의료기관', access: '경남 창원 생활권',
    summary: '내시경과 외래 진료를 담당할 소화기내과 전문의를 모십니다. 검사량과 인센티브를 투명하게 안내합니다.',
    benefits: ['내시경 인센티브', '학회 지원', '진료지원 인력']
  },
  {
    id: 'seoul-wellness', hospital: '서울웰니스의원', title: '건강검진센터 진료의',
    location: '서울 강남구', region: '서울', type: '주 4.5일', dept: '가정의학과', pay: '월 1,200만원~',
    badge: '워라밸', color: '#1689a7', logoText: '서울', schedule: '주 4.5일', updated: '5일 전', deadline: '2026.08.12', recruitmentReason: '검진 예약 증가', workHours: '평일 07:30~16:30 · 주 4.5일', daysOff: '일요일·공휴일 휴무',
    facilityType: '의원', focus: '건강검진·결과 상담', scale: '예약제 검진기관', access: '서울 강남 생활권',
    summary: '예약제 건강검진센터에서 문진과 결과 상담을 담당합니다. 야간 진료 없이 일정한 근무가 가능합니다.',
    benefits: ['야간 진료 없음', '예약제', '연차 보장']
  },
  {
    id: 'suwon-radiology', hospital: '수원중앙영상의학센터', title: '영상의학과 판독 전문의',
    location: '경기 수원시', region: '경기', type: '정규직', dept: '영상의학과', pay: '월 1,500만원~',
    badge: '비공개', color: '#3468c0', logoText: '수중', schedule: '주 5일', updated: '6일 전', deadline: '2026.08.28', recruitmentReason: '판독 인력 증원', workHours: '평일 09:00~18:00', daysOff: '주말·공휴일 휴무',
    facilityType: '영상의학센터', focus: '검진 영상 판독', scale: '전문 진료기관', access: '경기 수원 생활권',
    summary: '검진 영상 판독 중심의 포지션으로 세부 일정은 비공개 상담 후 안내합니다.',
    benefits: ['판독 중심', '장비 최신화', '비공개 협상']
  },
  {
    id: 'incheon-family', hospital: '인천온가족의원', title: '가정의학과 진료원장 초빙',
    location: '인천 남동구', region: '인천', type: '주 4일', dept: '가정의학과', pay: '월 1,100만원~',
    badge: '신규', color: '#8c5bc5', logoText: '인온', schedule: '주 4일', updated: '7일 전', deadline: '2026.08.22', recruitmentReason: '지역 외래 확대', workHours: '주 4일 · 요일 선택', daysOff: '근무요일 외 휴무',
    facilityType: '의원', focus: '지역 주민 외래 진료', scale: '지역 밀착형 의료기관', access: '인천 남동구 생활권',
    summary: '지역 주민 외래 진료 중심이며 근무 요일을 선택할 수 있습니다.',
    benefits: ['주 4일', '요일 선택', '성과급 협의']
  },
  {
    id: 'demo-haeundae-spine', hospital: '해운대바른척추병원', title: '정형외과 전문의 집중 초빙',
    location: '부산 해운대구', region: '부산', type: '정규직', dept: '정형외과', pay: '월 1,500만원~',
    badge: '집중채용', adTier: 'spotlight', isDemo: true, color: '#1769d4', logoText: '해바', schedule: '주 4.5일', updated: '가상 예시', deadline: '2026.08.30', recruitmentReason: '척추센터 확장', workHours: '평일 08:30~18:00 · 토 격주', daysOff: '일요일·공휴일 휴무',
    facilityType: '병원', focus: '척추·관절 외래 진료', scale: '전문병원 예시', access: '해운대 생활권·주차 지원',
    // ⚠️ 병원 식별정보(사업자번호·대표명·전체주소·설비 등)는 정적 데이터에 넣지 않는다.
    // 이 값들은 인증·권한 검증이 붙은 서버 상세 API(GET /api/jobs/:id)를 통해서만 내려야 한다.
    // 상세 화면은 값이 없으면 "병원 확인 필요"로 안전하게 표시된다. 자세한 내용은 docs/SECURITY_DATA_EXPOSURE_PLAN.md 참고.
    specialties: '정형외과·신경외과·마취통증의학과',
    hospitalPhotos: [
      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=82',
      'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=900&q=82',
      'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=900&q=82',
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=82'
    ],
    summary: '자동 순환과 광고 노출 균형을 확인하기 위한 가상 집중채용 공고입니다.',
    benefits: ['주 4.5일', '학회 지원', '전담 채용 매니저']
  },
  {
    id: 'demo-songdo-checkup', hospital: '송도프라임검진센터', title: '검진 내과 전문의 집중채용',
    location: '인천 연수구', region: '인천', type: '정규직', dept: '내과', pay: '월 1,350만원~',
    badge: '집중채용', adTier: 'spotlight', isDemo: true, color: '#087fa6', logoText: '송프', schedule: '주 5일', updated: '가상 예시', deadline: '2026.09.05', recruitmentReason: '검진 수요 증가', workHours: '평일 07:30~16:30', daysOff: '주말·공휴일 휴무',
    facilityType: '검진센터', focus: '건강검진·결과 상담', scale: '예약제 센터 예시', access: '송도 생활권·대중교통',
    summary: '자동 순환과 광고 노출 균형을 확인하기 위한 가상 집중채용 공고입니다.',
    benefits: ['야간 진료 없음', '예약제', '검진 인센티브']
  },
  {
    id: 'demo-seoul-women', hospital: '서울온여성의원', title: '여성검진 진료원장 집중채용',
    location: '서울 서초구', region: '서울', type: '주 4일', dept: '가정의학과', pay: '월 1,250만원~',
    badge: '집중채용', adTier: 'spotlight', isDemo: true, color: '#bd4a82', logoText: '서울', schedule: '주 4일', updated: '가상 예시', deadline: '2026.08.27', recruitmentReason: '여성검진 확대', workHours: '주 4일 · 예약진료', daysOff: '근무요일 외 휴무',
    facilityType: '의원', focus: '여성검진·외래 상담', scale: '전문 클리닉 예시', access: '서울 서초 생활권',
    summary: '자동 순환과 광고 노출 균형을 확인하기 위한 가상 집중채용 공고입니다.',
    benefits: ['주 4일', '예약 진료', '근무요일 협의']
  },
  {
    id: 'demo-gimhae-internal', hospital: '김해좋은내과병원', title: '소화기내과 전문의 추천채용',
    location: '경남 김해시', region: '경남', type: '정규직', dept: '내과', pay: '협의 후 결정',
    badge: '추천', adTier: 'featured', isDemo: true, color: '#6f56d9', logoText: '김좋', schedule: '주 5일', updated: '가상 예시', deadline: '2026.09.10', recruitmentReason: '내시경센터 충원', workHours: '평일 08:30~17:30', daysOff: '일요일·공휴일 휴무',
    facilityType: '병원', focus: '내시경·외래 진료', scale: '지역 병원 예시', access: '김해 생활권·주차 가능',
    summary: '추천 광고의 자동 순환과 진료과·지역 균형을 확인하기 위한 가상 공고입니다.',
    benefits: ['내시경 인센티브', '학회 지원', '진료지원 인력']
  },
  {
    id: 'demo-suwon-pain', hospital: '수원더편한통증의학과', title: '마취통증의학과 원장님 추천',
    location: '경기 수원시', region: '경기', type: '정규직', dept: '마취통증의학과', pay: '월 1,400만원~',
    badge: '추천', adTier: 'featured', isDemo: true, color: '#8055c7', logoText: '더편', schedule: '주 4.5일', updated: '가상 예시', deadline: '2026.08.24', recruitmentReason: '시술 환자 증가', workHours: '주 4.5일 · 토요일 협의', daysOff: '일요일·공휴일 휴무',
    facilityType: '의원', focus: '통증 시술·외래 진료', scale: '전문 클리닉 예시', access: '수원역 생활권',
    summary: '추천 광고의 자동 순환과 진료과·지역 균형을 확인하기 위한 가상 공고입니다.',
    benefits: ['주 4.5일', '성과 인센티브', '시술실 지원']
  },
  {
    id: 'demo-gangneung-family', hospital: '강릉바다웰니스센터', title: '가정의학과 검진의 추천채용',
    location: '강원 강릉시', region: '강원', type: '주 4일', dept: '가정의학과', pay: '월 1,150만원~',
    badge: '추천', adTier: 'featured', isDemo: true, color: '#5b63cf', logoText: '바다', schedule: '주 4일', updated: '가상 예시', deadline: '2026.09.12', recruitmentReason: '검진팀 증원', workHours: '주 4일 · 평일 근무', daysOff: '주말·공휴일 휴무',
    facilityType: '검진센터', focus: '검진·문진·결과 상담', scale: '웰니스센터 예시', access: '강릉 생활권·숙소 협의',
    summary: '추천 광고의 자동 순환과 진료과·지역 균형을 확인하기 위한 가상 공고입니다.',
    benefits: ['주 4일', '숙소 협의', '야간 진료 없음']
  }
];

export const talent = [
  { code: 'MH-D-2490', name: '김○○', identityConsent: false, dept: '소화기내과', career: '전문의 9년', region: '부산·경남', preference: '내시경 중심 / 주 5일 · 당직 협의', available: '1개월 내', verified: true, sample: true, fromResume: true, title: '소화기내과 전문의 · 부산경남 이직 희망', introduction: '대학병원과 종합병원에서 소화기내과 전문의로 9년간 근무하며 위·대장 내시경 및 용종절제술 다수를 시행했습니다. 검진센터 및 병원급 소화기 클리닉에서 내시경 진료를 중심으로 안정적으로 근무할 수 있는 자리를 찾고 있습니다. 부산·경남 지역을 우선하나 조건에 따라 협의 가능합니다.', skills: '위·대장 내시경, 용종절제술(EMR), 복부 초음파, 검진 결과 상담, EMR 능숙' },
  { code: 'MH-D-2048', name: '김○○', identityConsent: false, dept: '내과', career: '전문의 8년', region: '서울·경기', preference: '검진센터 / 주 4.5일', available: '1개월 내', verified: true },
  { code: 'MH-D-1982', name: '박○○', identityConsent: false, dept: '정형외과', career: '전문의 12년', region: '부산·경남', preference: '병원급 / 원장 포지션', available: '협의', verified: true },
  { code: 'MH-D-2214', name: '이○○', identityConsent: false, dept: '소아청소년과', career: '전문의 6년', region: '전국', preference: '외래 중심 / 주 5일', available: '즉시', verified: true },
  { code: 'MH-D-1765', name: '최○○', identityConsent: false, dept: '영상의학과', career: '전문의 10년', region: '서울', preference: '판독 중심 / 당직 없음', available: '2개월 내', verified: true },
  { code: 'MH-D-2301', name: '정○○', identityConsent: false, dept: '가정의학과', career: '전문의 4년', region: '경기·인천', preference: '검진 / 주 4일', available: '즉시', verified: true },
  { code: 'MH-D-1899', name: '한○○', identityConsent: false, dept: '마취통증의학과', career: '전문의 9년', region: '충청권', preference: '통증클리닉 / 원장', available: '협의', verified: true },
  { code: 'MH-D-2356', name: '윤○○', identityConsent: false, dept: '피부과', career: '전문의 7년', region: '서울·경기', preference: '비급여 진료 / 주 4일', available: '1개월 내', verified: true },
  { code: 'MH-D-2147', name: '조○○', identityConsent: false, dept: '신경외과', career: '전문의 11년', region: '대구·경북', preference: '척추센터 / 외래 중심', available: '협의', verified: true },
  { code: 'MH-D-2421', name: '오○○', identityConsent: false, dept: '정신건강의학과', career: '전문의 5년', region: '서울', preference: '예약제 / 당직 없음', available: '2개월 내', verified: true },
  { code: 'MH-D-2073', name: '신○○', identityConsent: false, dept: '산부인과', career: '전문의 8년', region: '부산·울산', preference: '여성검진 / 주 4.5일', available: '즉시', verified: true },
  { code: 'MH-D-2288', name: '임○○', identityConsent: false, dept: '재활의학과', career: '전문의 6년', region: '경기·충청', preference: '재활병원 / 당직 협의', available: '1개월 내', verified: true },
  { code: 'MH-D-1934', name: '서○○', identityConsent: false, dept: '응급의학과', career: '전문의 13년', region: '전국', preference: '교대근무 / 일정 협의', available: '협의', verified: true },
  { code: 'MH-N-3021', name: '강○○', identityConsent: false, staffType: 'medical', profession: '간호사', dept: '병동 간호', career: '경력 6년', region: '서울·경기', preference: '상급종합 / 3교대 협의', available: '1개월 내', verified: true },
  { code: 'MH-R-3088', name: '문○○', identityConsent: false, staffType: 'medical', profession: '방사선사', dept: '영상의학', career: '경력 4년', region: '부산·경남', preference: 'CT·MRI / 주 5일', available: '즉시', verified: true },
  { code: 'MH-P-3142', name: '양○○', identityConsent: false, staffType: 'medical', profession: '물리치료사', dept: '재활치료', career: '경력 8년', region: '경기·인천', preference: '재활병원 / 당직 없음', available: '협의', verified: true }
];

export const adPlans = [
  {
    id: 'basic', name: '베이직 공고', price: 59000, unit: '30일', label: '초기 파트너 가격',
    description: '필요한 정보를 빠르게 알리고 지원과 상담을 받아보세요.',
    features: ['채용정보 목록 30일 노출', '진료과·지역 검색 노출', '공고 검수 및 문구 가이드', '지원·상담 연결']
  },
  {
    id: 'featured', name: '추천 공고', price: 149000, unit: '30일', label: '가장 먼저 검토할 상품', featured: true,
    description: '추천 영역과 강조 카드로 더 많은 의사에게 먼저 도달합니다.',
    features: ['베이직 공고의 모든 기능', '병원 브랜드 이미지 강조 노출', '홈 추천 채용 우선 노출', '목록 강조 디자인', '주간 성과 요약', '1회 공고 수정 지원']
  },
  {
    id: 'intensive', name: '집중 채용', price: 299000, unit: '45일', label: '빠른 채용이 필요할 때',
    description: '광고와 전담 컨설턴트의 후보 발굴을 함께 운영합니다.',
    features: ['추천 공고의 모든 기능', '대형 병원 브랜드 영역', '최상단 집중채용 영역', '45일 확장 노출', '전담 컨설턴트 배정', '익명 인재풀 우선 추천']
  }
];

// 상단 메뉴: 왼→오른쪽으로 '일자리 찾기(구직) → 인재 찾기(병원) → 헤드헌팅 서비스' 흐름으로 정돈.
// group은 드롭다운/구분선 등 향후 그룹 표기에 사용(현재는 순서 정렬 기준).
export const navItems = [
  // 구직자(의사·의료인)용 — 일자리·이력서
  { path: '/jobs', label: '의사 채용', group: 'seeker' },
  { path: '/medical-staff', label: '의료인 채용', group: 'seeker' },
  { path: '/resume', label: '이력서 등록', group: 'seeker' },
  // 병원(채용)용 — 인재·공고
  { path: '/talent', label: '인재정보', group: 'hospital' },
  { path: '/advertise', label: '광고센터', group: 'hospital' },
  // 헤드헌팅 서비스
  { path: '/headhunting', label: '맞춤 헤드헌팅', group: 'service' },
  { path: '/matching-report', label: '매칭 리포트', group: 'service' }
];

export const membershipPlans = [
  {
    id: 'doctor-single', audience: 'doctor', name: '커리어 체크', price: 19000, period: '1회',
    description: '지원 전 계약과 보수 조건을 헤드헌터와 함께 빠르게 점검합니다.',
    features: ['연봉·Net/세전 기준 정리', '계약서 주요 조항 체크', '근무표·당직 조건 비교', '30분 비공개 커리어 상담']
  },
  {
    id: 'doctor-pass', audience: 'doctor', name: '커리어 컨시어지', price: 39000, period: '월', featured: true,
    description: '정보 열람료가 아니라 이직 준비에 드는 시간과 판단을 줄이는 선택 서비스입니다.',
    features: ['맞춤 포지션 즉시 알림', '우선 상담 일정 예약', '조건 비교·연봉 분석 리포트', '분기별 커리어 점검']
  }
];

// 인재 이력서 열람권(병원 결제 → 후보 연락처·이력서 상세 공개). 서버 카탈로그와 id·금액 일치.
export const talentUnlockPlans = [
  {
    id: 'talent-unlock-single', audience: 'hospital', name: '인재 열람권 (1명)', price: 5000, period: '30일', unlockCount: 1,
    description: '구직 공개에 동의한 인재 1명의 연락처와 이력서 상세를 30일간 열람합니다.',
    features: ['후보 성명·연락처·이메일 확인', '근무기관 이력·자기소개 열람', '결제 즉시 열람 권한 부여', '열람 기록 안전 보관']
  },
  {
    id: 'talent-unlock-pack', audience: 'hospital', name: '인재 열람권 (5명 팩)', price: 20000, period: '30일', unlockCount: 5, featured: true,
    description: '여러 후보를 검토할 때 더 경제적인 5명 열람권입니다(1명당 4,000원).',
    features: ['인재 5명 열람 (건당 20% 절약)', '후보 성명·연락처·이메일 확인', '근무기관 이력·자기소개 열람', '30일 내 자유롭게 사용']
  }
];
