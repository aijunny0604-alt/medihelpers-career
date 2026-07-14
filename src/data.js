export const jobs = [
  {
    id: 'samcheonpo-specialists', hospital: '삼천포제일병원', title: '각 과 전문의 의료진 초빙',
    location: '경남 사천시', region: '경남', type: '정규직', dept: '전문의', pay: '협의 후 결정',
    badge: '집중채용', color: '#2367e8', schedule: '주 5일', updated: '오늘',
    summary: '지역 거점 종합병원에서 진료과별 전문의를 모십니다. 진료 여건과 근무 일정은 전문 컨설턴트가 개별 조율합니다.',
    benefits: ['기숙사 협의', '학회 지원', '전담 컨설턴트 협상']
  },
  {
    id: 'cheongju-orthopedic', hospital: '청주첨단한방병원', title: '정형외과·통증의학과 원장님',
    location: '충북 청주시', region: '충북', type: '정규직', dept: '정형외과', pay: '월 1,400만원~',
    badge: '신규', color: '#12a67a', schedule: '주 5일', updated: '1일 전',
    summary: '안정적인 외래 중심 진료 환경입니다. 근무일과 성과 조건은 경력에 따라 유연하게 협의합니다.',
    benefits: ['외래 중심', '성과 인센티브', '근무일 협의']
  },
  {
    id: 'isarang-pediatrics', hospital: '아이사랑병원', title: '달빛어린이병원 담당 원장님',
    location: '부산 연제구', region: '부산', type: '주 5일', dept: '소아청소년과', pay: '월 1,400만원+',
    badge: '추천', color: '#7d57e8', schedule: '요일 협의', updated: '2일 전',
    summary: '소아 진료에 집중할 수 있는 팀 기반 환경입니다. 야간 진료 일정과 보상은 상담을 통해 안내합니다.',
    benefits: ['팀 진료', '스케줄 협의', '전담 코디네이터']
  },
  {
    id: 'sokcho-specialists', hospital: '속초우리요양병원', title: '진료과별 전문의 선생님',
    location: '강원 속초시', region: '강원', type: '정규직', dept: '전문의', pay: '협의 후 결정',
    badge: '상시채용', color: '#e57a35', schedule: '주 5일', updated: '3일 전',
    summary: '입원 환자 관리 중심의 안정적인 포지션입니다. 숙소와 주말 일정 등 지역 근무 조건을 조율합니다.',
    benefits: ['숙소 지원 협의', '당직 조건 협의', '장기근속 우대']
  },
  {
    id: 'cheonga-gastro', hospital: '청아병원', title: '소화기내과 전문의 초빙',
    location: '경남 창원시', region: '경남', type: '정규직', dept: '내과', pay: '협의 후 결정',
    badge: 'HOT', color: '#e24e62', schedule: '주 5일', updated: '4일 전',
    summary: '내시경과 외래 진료를 담당할 소화기내과 전문의를 모십니다. 검사량과 인센티브를 투명하게 안내합니다.',
    benefits: ['내시경 인센티브', '학회 지원', '진료지원 인력']
  },
  {
    id: 'seoul-wellness', hospital: '서울웰니스의원', title: '건강검진센터 진료의',
    location: '서울 강남구', region: '서울', type: '주 4.5일', dept: '가정의학과', pay: '월 1,200만원~',
    badge: '워라밸', color: '#1689a7', schedule: '주 4.5일', updated: '5일 전',
    summary: '예약제 건강검진센터에서 문진과 결과 상담을 담당합니다. 야간 진료 없이 일정한 근무가 가능합니다.',
    benefits: ['야간 진료 없음', '예약제', '연차 보장']
  },
  {
    id: 'suwon-radiology', hospital: '수원중앙영상의학센터', title: '영상의학과 판독 전문의',
    location: '경기 수원시', region: '경기', type: '정규직', dept: '영상의학과', pay: '월 1,500만원~',
    badge: '비공개', color: '#3468c0', schedule: '주 5일', updated: '6일 전',
    summary: '검진 영상 판독 중심의 포지션으로 세부 일정은 비공개 상담 후 안내합니다.',
    benefits: ['판독 중심', '장비 최신화', '비공개 협상']
  },
  {
    id: 'incheon-family', hospital: '인천온가족의원', title: '가정의학과 진료원장 초빙',
    location: '인천 남동구', region: '인천', type: '주 4일', dept: '가정의학과', pay: '월 1,100만원~',
    badge: '신규', color: '#8c5bc5', schedule: '주 4일', updated: '7일 전',
    summary: '지역 주민 외래 진료 중심이며 근무 요일을 선택할 수 있습니다.',
    benefits: ['주 4일', '요일 선택', '성과급 협의']
  }
];

export const talent = [
  { code: 'DR-2048', dept: '내과', career: '전문의 8년', region: '서울·경기', preference: '검진센터 / 주 4.5일', available: '1개월 내', verified: true },
  { code: 'DR-1982', dept: '정형외과', career: '전문의 12년', region: '부산·경남', preference: '병원급 / 원장 포지션', available: '협의', verified: true },
  { code: 'DR-2214', dept: '소아청소년과', career: '전문의 6년', region: '전국', preference: '외래 중심 / 주 5일', available: '즉시', verified: true },
  { code: 'DR-1765', dept: '영상의학과', career: '전문의 10년', region: '서울', preference: '판독 중심 / 당직 없음', available: '2개월 내', verified: true },
  { code: 'DR-2301', dept: '가정의학과', career: '전문의 4년', region: '경기·인천', preference: '검진 / 주 4일', available: '즉시', verified: true },
  { code: 'DR-1899', dept: '마취통증의학과', career: '전문의 9년', region: '충청권', preference: '통증클리닉 / 원장', available: '협의', verified: true }
];

export const adPlans = [
  {
    id: 'basic', name: '베이직 공고', price: 59000, unit: '30일', label: '초기 파트너 가격',
    description: '필요한 정보를 빠르게 알리고 지원과 상담을 받아보세요.',
    features: ['채용정보 목록 30일 노출', '진료과·지역 검색 노출', '공고 검수 및 문구 가이드', '지원·상담 연결']
  },
  {
    id: 'featured', name: '추천 공고', price: 149000, unit: '30일', label: '가장 먼저 검토할 상품', featured: true,
    description: '추천 영역과 강조 카드로 더 많은 의료인에게 먼저 도달합니다.',
    features: ['베이직 공고의 모든 기능', '홈 추천 채용 우선 노출', '목록 강조 디자인', '주간 성과 요약', '1회 공고 수정 지원']
  },
  {
    id: 'intensive', name: '집중 채용', price: 299000, unit: '45일', label: '빠른 채용이 필요할 때',
    description: '광고와 전담 컨설턴트의 후보 발굴을 함께 운영합니다.',
    features: ['추천 공고의 모든 기능', '최상단 집중채용 영역', '45일 확장 노출', '전담 컨설턴트 배정', '익명 인재풀 우선 추천']
  }
];

export const navItems = [
  { path: '/jobs', label: '채용정보' },
  { path: '/talent', label: '인재정보' },
  { path: '/headhunting', label: '헤드헌팅' },
  { path: '/advertise', label: '광고센터' },
  { path: '/membership', label: '멤버십' }
];

export const membershipPlans = [
  {
    id: 'doctor-single', audience: 'doctor', name: '공고 1건 열람권', price: 2900, period: '건별',
    description: '궁금한 프리미엄 공고 하나만 확인합니다.',
    features: ['상세 급여·근무시간', '비공개 병원 정보', '전담 헤드헌터 질문 1회']
  },
  {
    id: 'doctor-pass', audience: 'doctor', name: 'Doctor Pass', price: 12900, period: '월', featured: true,
    description: '적극적으로 이직을 준비하는 의료인을 위한 패스입니다.',
    features: ['프리미엄 공고 무제한 열람', '비공개 포지션 우선 공개', '급여·근무조건 인사이트', '1:1 커리어 상담']
  },
  {
    id: 'hospital-single', audience: 'hospital', name: '인재 소개 요청권', price: 39000, period: '건별',
    description: '관심 있는 익명 인재 한 명의 소개를 요청합니다.',
    features: ['후보 적합성 확인', '본인 동의 후 상세정보', '1회 인터뷰 연결 지원']
  },
  {
    id: 'hospital-pass', audience: 'hospital', name: 'Hospital Recruit Pass', price: 99000, period: '월', featured: true,
    description: '상시 채용 병원을 위한 인재 탐색 멤버십입니다.',
    features: ['검증된 익명 인재풀 열람', '월 5회 소개 요청', '신규 인재 알림', '채용 컨설턴트 지원']
  }
];
