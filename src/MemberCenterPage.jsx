import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BadgeCheck, Bell, BriefcaseBusiness, Building2, CalendarDays, Clock3,
  Check, ChevronRight, CircleCheck, CreditCard, FileText, Heart, KeyRound,
  LockKeyhole, Mail, MapPin, MessageCircle, Phone, Receipt, Settings, ShieldCheck, Stethoscope,
  UserRound, X
} from 'lucide-react';
import { withBase } from './basePath.js';
import { WithdrawSection } from './AccountPage.jsx';

const hospitalDemo = {
  profile: { displayName: '김혜원', email: 'hospital@medihelpers.co.kr', phone: '010-2435-5463', organization: '메디헬퍼스 협력병원', jobTitle: '채용 담당자' },
  metrics: [
    ['진행 중 공고', '2건', '마감 예정 1건'], ['새 문의', '4건', '확인 필요'], ['누적 결제', '448,000원', '최근 90일'], ['추천 후보', '3명', '동의 확인 2명']
  ],
  ads: [
    { title: '정형외과 전문의 집중 초빙', plan: '집중 채용', status: '게시 중', period: '2026.07.17 ~ 08.30', views: 284, inquiries: 7 },
    { title: '검진센터 가정의학과 원장 초빙', plan: '추천 공고', status: '검수 중', period: '게시일 확정 전', views: 0, inquiries: 0 }
  ],
  inquiries: [
    { id:'INQ-H-2401', name: '박○○ 의사', subject: '근무시간·토요일 격주 여부 문의', source: '정형외과 집중 초빙', time: '오늘 10:24', status: '답변 대기', message:'공고에 안내된 주 4.5일 근무에서 토요일 근무가 격주인지 확인하고 싶습니다. 평일 진료 종료 시각과 당직 여부도 함께 안내 부탁드립니다.', details:{ 진료과:'정형외과', 희망근무:'주 4.5일', 입사가능:'1개월 내', 문의경로:'채용공고 상세' }, response:'병원 담당자에게 실제 근무표를 확인하고 있습니다. 확인되는 대로 헤드헌터가 답변드리겠습니다.', history:[['오늘 10:24','문의 접수'],['오늘 10:27','담당 헤드헌터 배정']] },
    { id:'INQ-H-2398', name: '메디헬퍼스 헤드헌터', subject: '후보 2명 조건 확인 요청', source: '비공개 추천', time: '어제 16:40', status: '확인 필요', message:'병원에서 요청한 정형외과 경력과 근무조건에 부합하는 후보 2명을 확인했습니다. 급여 범위와 토요일 근무 조정 가능 범위를 회신해주시면 후보자 동의 후 프로필을 전달하겠습니다.', details:{ 후보수:'2명', 확인항목:'급여·근무표', 공개범위:'후보 동의 후', 담당자:'메디헬퍼스 헤드헌터' }, response:'병원 담당자의 조건 확인을 기다리고 있습니다.', history:[['어제 16:40','후보 조건 확인 요청'],['어제 17:05','병원 담당자 알림 발송']] },
    { id:'INQ-H-2381', name: '이○○ 의사', subject: '급여와 입사 가능 시점 상담 신청', source: '정형외과 집중 초빙', time: '07.15', status: '상담 연결', message:'현재 근무지 일정 때문에 9월 이후 입사가 가능합니다. 공고 급여가 Net 기준인지와 퇴직금 별도 여부를 상담받고 싶습니다.', details:{ 진료과:'정형외과', 입사가능:'2026년 9월', 확인항목:'급여 기준·퇴직금', 상담방식:'전화 상담' }, response:'양측 일정 확인 후 7월 18일 오후에 담당 헤드헌터가 연락드릴 예정입니다.', history:[['07.15','상담 신청'],['07.16','병원 조건 확인'],['오늘','상담 연결']] }
  ],
  payments: [
    { id: 'PAY-260717-01', item: '집중 채용 45일', amount: '299,000원', date: '2026.07.17', status: '결제 완료' },
    { id: 'PAY-260603-02', item: '추천 공고 30일', amount: '149,000원', date: '2026.06.03', status: '결제 완료' }
  ],
  activity: [
    ['오늘 10:24', '새 의사 문의가 접수되었습니다.', '정형외과 전문의 집중 초빙'],
    ['어제 16:40', '헤드헌터가 후보 조건 확인을 요청했습니다.', '후보자 동의 확인 후 상세 연결'],
    ['07.17', '집중 채용 공고가 게시되었습니다.', '45일 노출 시작'],
    ['07.16', '공고 결제가 완료되었습니다.', '299,000원 · 카드 결제']
  ]
};

const doctorDemo = {
  profile: { displayName: '김도윤', email: 'doctor@medihelpers.co.kr', phone: '010-0000-0000', organization: '정형외과 전문의', jobTitle: '전문의 8년' },
  metrics: [
    ['이력서 완성도', '82%', '공개 범위 설정 완료'], ['저장 공고', '6건', '신규 2건'], ['상담 진행', '2건', '조건 확인 중'], ['멤버십', '이용 중', '다음 갱신 08.16']
  ],
  ads: [
    { title: '내 이력서', plan: '비공개 이직 프로필', status: '헤드헌터 공개', period: '최근 수정 2026.07.16', views: 3, inquiries: 2 },
    { title: '관심 공고', plan: '저장한 초빙정보', status: '6건 저장', period: '신규 조건 2건', views: 6, inquiries: 1 }
  ],
  inquiries: [
    { id:'INQ-D-1142', name: '메디헬퍼스 헤드헌터', subject: '부산권 정형외과 조건 확인', source: '비공개 이직 상담', time: '오늘 09:10', status: '답변 대기', message:'상담에서 말씀하신 부산권 주 4.5일 조건과 가까운 포지션이 있습니다. 희망 급여 범위와 입사 가능 시점을 확인해주세요.', details:{ 지역:'부산·경남', 근무형태:'주 4.5일', 공개상태:'병원 비공개', 담당자:'전담 헤드헌터' }, response:'회원님의 회신 전에는 병원에 실명과 연락처를 전달하지 않습니다.', history:[['오늘 09:10','포지션 제안'],['오늘 09:12','비공개 알림 발송']] },
    { id:'INQ-D-1136', name: '해운대바른척추병원', subject: '면접 가능 일정 요청', source: '동의 후 병원 연결', time: '어제 14:20', status: '일정 조율', message:'후보자 동의 범위에서 전달받은 경력 내용을 검토했습니다. 다음 주 중 가능한 면접 일정을 2~3개 알려주세요.', details:{ 면접방식:'병원 대면', 예상시간:'약 40분', 확인항목:'진료 경험·근무조건', 연결상태:'후보 동의 완료' }, response:'담당 헤드헌터가 양측 일정을 조율하고 있습니다.', history:[['07.16','병원 연결 동의'],['어제 14:20','면접 일정 요청'],['어제 15:00','일정 조율 시작']] }
  ],
  payments: [
    { id: 'MEM-260716-01', item: '의사 월 패스', amount: '9,900원', date: '2026.07.16', status: '이용 중' },
    { id: 'VIEW-260710-03', item: '공고 1건 열람권', amount: '2,900원', date: '2026.07.10', status: '사용 완료' }
  ],
  activity: [
    ['오늘 09:10', '헤드헌터가 새 포지션을 제안했습니다.', '부산권 정형외과 · 주 4.5일'],
    ['어제 14:20', '병원 연결 동의를 확인했습니다.', '실명과 연락처는 동의 범위 내 전달'],
    ['07.16', '이력서를 수정했습니다.', '희망 지역·입사 가능 시점 변경'],
    ['07.10', '상세조건 열람권을 사용했습니다.', '급여·실제 근무표 확인']
  ]
};

function statusClass(value = '') {
  if (/완료|게시 중|이용 중|연결/.test(value)) return 'good';
  if (/대기|확인|검수|조율/.test(value)) return 'wait';
  return '';
}

function MemberGate() {
  return <section className="member-gate"><span><LockKeyhole /></span><small>MEMBERS ONLY</small><h1>로그인 후 내 활동을<br />한곳에서 관리하세요</h1><p>공고·상담·결제·이력서와 회원정보는 본인 계정에서만 확인할 수 있습니다.</p><div><a className="button primary" href={withBase('/login?next=/mypage')}>로그인 <ArrowRight /></a><a className="button outline" href={withBase('/signup')}>회원가입</a></div></section>;
}

export default function MemberCenterPage({ route, qa }) {
  const requestedTab = new URLSearchParams(route.split('?')[1] || '').get('tab');
  const [tab, setTab] = useState(requestedTab || 'overview');
  const [accountState, setAccountState] = useState({ loading: !qa.active, signedIn: qa.active && qa.info.capabilities.signedIn, role: qa.info.capabilities.hospital ? 'hospital' : qa.info.capabilities.doctor || qa.info.capabilities.membership ? 'doctor' : qa.info.capabilities.admin ? 'admin' : '', identity: {} });
  const [profile, setProfile] = useState(null);
  const [serverData, setServerData] = useState({ consultations: [], activity: [], orders: [], resume: null, recommendedCandidates: [] });
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [saved, setSaved] = useState('');
  const [notifications, setNotifications] = useState({ email: true, sms: true, service: true, marketing: false });
  const [receipt, setReceipt] = useState(null); // 영수증 모달 대상 결제
  const [refundFor, setRefundFor] = useState(null); // 환불 요청 중인 주문번호
  const [refundReason, setRefundReason] = useState('');
  const [refundMsg, setRefundMsg] = useState('');
  const [refundBusy, setRefundBusy] = useState(false);
  const submitRefund = async (orderNumber) => {
    if (!refundReason.trim()) { setRefundMsg('환불 사유를 입력해 주세요.'); return; }
    setRefundBusy(true); setRefundMsg('');
    try {
      const res = await fetch(withBase('/api/member-center'), { method:'POST', credentials:'same-origin', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ action:'refund_request', orderNumber, reason: refundReason.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '환불 요청을 접수하지 못했습니다.');
      setRefundMsg('환불(청약철회) 요청이 접수되었습니다. 담당자 확인 후 처리 결과를 안내드립니다.');
      setRefundFor(null); setRefundReason('');
    } catch (error) {
      setRefundMsg(error.message);
    } finally {
      setRefundBusy(false);
    }
  };

  useEffect(() => {
    if (qa.active) return;
    fetch('/api/member-center', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('account unavailable')))
      .then((data) => {
        setAccountState({ loading: false, signedIn: data.signedIn, role: data.account?.role || '', identity: data.identity || {} });
        if (data.profile) setProfile(data.profile);
        if (data.notifications) setNotifications(data.notifications);
        setServerData({ consultations: data.consultations || [], activity: data.activity || [], orders: data.orders || [], resume: data.resume || null, recommendedCandidates: data.recommendedCandidates || [] });
      })
      .catch(() => setAccountState({ loading: false, signedIn: false, role: '', identity: {} }));
  }, [qa.active]);

  const role = accountState.role === 'admin' ? 'hospital' : accountState.role;
  const demo = role === 'hospital' ? hospitalDemo : doctorDemo;
  const currentProfile = {
    ...demo.profile,
    ...(profile || {}),
    email: accountState.identity.email || profile?.email || demo.profile.email,
    displayName: profile?.displayName || accountState.identity.displayName || demo.profile.displayName
  };
  const roleLabel = role === 'hospital' ? '병원 회원' : '의료인 회원';
  const inquiries = qa.active ? demo.inquiries : serverData.consultations.map((item) => {
    const payload = item.payload || {};
    return {
      id: item.id,
      name: item.requesterName || '메디헬퍼스 상담',
      subject: `${item.specialty || payload.professionalType || '채용'} 상담 신청`,
      source: item.id,
      time: String(item.createdAt || '').slice(0, 10),
      status: ({ new:'답변 대기', contacted:'연락 완료', in_progress:'상담 연결', closed:'종료' })[item.status] || item.status,
      message: payload.message || payload.note || '접수한 상담 내용을 담당 헤드헌터가 확인하고 있습니다.',
      details: {
        접수유형: item.requestType === 'hospital' ? '병원 구인희망' : '의사 구직희망',
        전문과목: item.specialty || payload.specialty || payload.professionalType || '-',
        희망지역: payload.region || payload.address || '-',
        연락희망: payload.contactTime || payload.preferredContactTime || '-'
      },
      response: item.adminNote || '담당 헤드헌터가 내용을 확인 중입니다. 답변이 등록되면 이 화면에서 확인할 수 있습니다.',
      history: [
        [String(item.createdAt || '').slice(0, 16), '상담 접수'],
        ...(item.updatedAt && item.updatedAt !== item.createdAt ? [[String(item.updatedAt).slice(0, 16), '처리 상태 변경']] : [])
      ]
    };
  });
  const activities = qa.active ? demo.activity : serverData.activity.map((item) => [String(item.occurredAt || '').slice(0, 10), item.title, item.detail]);
  // 병원 '내 공고'(이용현황) = 광고 상품 결제 주문. 결제 완료 건은 노출기간(exposure)을 함께 표시.
  const ads = qa.active ? demo.ads : serverData.orders
    .filter((item) => item.productType === 'doctor_ad' || item.productType === 'medical_staff_ad')
    .map((item) => ({
      id: item.orderNumber,
      title: item.productName,
      plan: `${item.productName} · ${Number(item.totalAmount || 0).toLocaleString('ko-KR')}원`,
      status: ({ paid: '노출 중', pending_review: '검수 대기', awaiting_payment: '결제 대기', failed: '결제 실패', cancelled: '취소', refunded: '환불' })[item.status] || item.status,
      period: item.exposure ? `${item.exposure.start} ~ ${item.exposure.end}` : (item.status === 'paid' ? '기간 산정 중' : '결제 후 시작'),
      views: '-',
      inquiries: '-'
    }));
  const payments = qa.active ? demo.payments : serverData.orders.map((item) => {
    const total = Number(item.totalAmount || 0);
    const supply = Number(item.supplyAmount || Math.round(total / 1.1));
    const tax = Number(item.taxAmount || (total - supply));
    return { id:item.orderNumber, item:item.productName, amount:`${total.toLocaleString('ko-KR')}원`, date:String(item.paidAt || item.createdAt || '').slice(0, 10), status:({ paid:'결제 완료', pending:'결제 대기', canceled:'취소', cancelled:'취소', refunded:'환불 완료', partially_refunded:'부분 환불' })[item.status] || item.status, rawStatus:item.status, refundable:['paid','partially_refunded'].includes(item.status), total, supply, tax, method:item.paymentMethod || '카드', customerName:item.customerName || '' };
  });
  const paidTotal = serverData.orders.filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
  const hasMembership = serverData.orders.some((item) => item.status === 'paid' && /멤버십|커리어/.test(item.productName || ''));
  const resumeCompletion = serverData.resume ? `${Number(serverData.resume.completion) || 0}%` : '미등록';
  const activeAds = ads.filter((item) => item.status === '노출 중').length;
  const recommendedCount = (serverData.recommendedCandidates || []).length;
  const metrics = qa.active ? demo.metrics : role === 'hospital'
    ? [['진행 중 공고', `${activeAds}건`, '노출 중 공고'], ['새 문의', `${inquiries.filter((item) => item.status === '답변 대기').length}건`, '확인 필요'], ['누적 결제', `${paidTotal.toLocaleString('ko-KR')}원`, '결제 내역'], ['추천 후보', `${recommendedCount}명`, '동의 후 연결']]
    : [['이력서 완성도', resumeCompletion, serverData.resume ? '등록 완료' : '등록 후 표시'], ['상담 진행', `${inquiries.length}건`, '전체 상담'], ['멤버십', hasMembership ? '이용 중' : '미이용', '이용권 확인'], ['누적 결제', `${paidTotal.toLocaleString('ko-KR')}원`, '결제 내역']];
  const nav = useMemo(() => role === 'hospital' ? [
    ['overview', '홈', Building2], ['ads', '내 공고', BriefcaseBusiness], ['inquiries', '문의·후보', MessageCircle], ['payments', '결제·사용이력', Receipt], ['profile', '회원정보', Settings]
  ] : [
    ['overview', '홈', UserRound], ['resume', '이력서·구직활동', FileText], ['inquiries', '상담·제안', MessageCircle], ['payments', '멤버십·결제', CreditCard], ['profile', '회원정보', Settings]
  ], [role]);

  if (accountState.loading) return <section className="member-loading"><ShieldCheck /><strong>내 회원 정보를 불러오고 있습니다</strong></section>;
  if (!accountState.signedIn || !role) return <MemberGate />;

  const saveProfile = async (event) => {
    event.preventDefault();
    const next = Object.fromEntries(new FormData(event.currentTarget).entries());
    setProfile({ ...currentProfile, ...next });
    setSaved('저장되었습니다.');
    if (!qa.active) {
      try { await fetch('/api/member-center', { method: 'PATCH', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile: next, notifications }) }); } catch { setSaved('화면에 반영했습니다. 서버 저장은 다시 확인해주세요.'); }
    }
    window.setTimeout(() => setSaved(''), 2500);
  };

  return <div className={`member-center role-${role}`}>
    <header className="member-center-hero"><div><small>MY MEDIHELPERS</small><h1>{currentProfile.displayName}님, 반갑습니다</h1><p>{role === 'hospital' ? '공고 반응부터 후보 문의와 결제 내역까지 병원 채용 업무를 한곳에서 관리하세요.' : '이력서와 상담 제안, 관심 공고와 멤버십 이용 내역을 한곳에서 관리하세요.'}</p></div><div className="member-identity"><span>{role === 'hospital' ? <Building2 /> : <Stethoscope />}</span><div><small>현재 로그인</small><strong>{roleLabel}</strong><em><BadgeCheck /> 본인 확인</em></div></div></header>
    <div className="member-center-shell">
      <aside className="member-side"><div className="member-mini-profile"><span>{role === 'hospital' ? <Building2 /> : <UserRound />}</span><div><strong>{currentProfile.organization}</strong><small>{currentProfile.jobTitle}</small></div></div><nav>{nav.map(([id, label, Icon]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon />{label}<ChevronRight /></button>)}</nav><div className="member-side-help"><MessageCircle /><strong>도움이 필요하신가요?</strong><p>담당 헤드헌터에게 바로 문의하세요.</p><a href="tel:0513425463">051-342-5463</a></div></aside>
      <main className="member-workspace">
        {tab === 'overview' && <>
          <div className="member-page-head"><div><small>{role === 'hospital' ? 'HOSPITAL DASHBOARD' : 'DOCTOR DASHBOARD'}</small><h2>내 활동 요약</h2><p>확인이 필요한 항목을 먼저 모았습니다.</p></div><a className="button primary" href={withBase(role === 'hospital' ? '/advertise' : '/jobs')}>{role === 'hospital' ? '새 공고 등록' : '초빙정보 찾기'} <ArrowRight /></a></div>
          <div className="member-metrics">{metrics.map(([label, value, note], index) => <article key={label}><span>{[BriefcaseBusiness, MessageCircle, CreditCard, Heart].map((Icon, i) => i === index ? <Icon key={i} /> : null)}</span><small>{label}</small><strong>{value}</strong><em>{note}</em></article>)}</div>
          <section className="member-panel"><div className="member-panel-head"><div><h3>지금 확인할 항목</h3><p>새로운 문의와 진행 상태를 놓치지 마세요.</p></div><button onClick={() => setTab('inquiries')}>전체 보기 <ArrowRight /></button></div>{inquiries.length ? <div className="member-inquiry-list">{inquiries.slice(0, 3).map((item) => <button type="button" className="member-inquiry-item" key={item.id || item.subject} onClick={() => setSelectedInquiry(item)}><span><MessageCircle /></span><div><small>{item.name} · {item.time}</small><strong>{item.subject}</strong><p>{item.source}</p></div><em className={statusClass(item.status)}>{item.status}</em><ChevronRight /></button>)}</div> : <div className="member-empty"><MessageCircle /><strong>아직 접수된 문의가 없습니다</strong><p>새 문의가 들어오면 이곳에 바로 표시됩니다.</p></div>}</section>
          <section className="member-panel"><div className="member-panel-head"><div><h3>최근 활동</h3><p>계정에서 발생한 주요 사용 기록입니다.</p></div><button onClick={() => setTab(role === 'hospital' ? 'ads' : 'resume')}>관리하기 <ArrowRight /></button></div>{activities.length ? <div className="member-timeline">{activities.slice(0, 3).map(([date, title, detail]) => <div key={`${date}-${title}`}><time>{date}</time><span /><div><strong>{title}</strong><p>{detail}</p></div></div>)}</div> : <div className="member-empty"><CalendarDays /><strong>아직 사용 기록이 없습니다</strong><p>회원정보 수정, 상담, 결제 등의 활동이 기록됩니다.</p></div>}</section>
        </>}

        {(tab === 'ads' || tab === 'resume') && <><div className="member-page-head"><div><small>{role === 'hospital' ? 'MY RECRUITMENT ADS' : 'MY CAREER PROFILE'}</small><h2>{role === 'hospital' ? '내 공고 관리' : '이력서·구직활동'}</h2><p>{role === 'hospital' ? '게시 상태, 기간, 조회와 문의 반응을 확인합니다.' : '이력서 공개 범위와 구직 활동 상태를 관리합니다.'}</p></div><a className="button primary" href={withBase(role === 'hospital' ? '/advertise' : '/resume')}>{role === 'hospital' ? '공고 등록' : '이력서 수정'} <ArrowRight /></a></div>{ads.length ? <div className="member-record-grid">{ads.map((item) => <article key={item.title}><div><span>{role === 'hospital' ? <Building2 /> : <FileText />}</span><em className={statusClass(item.status)}>{item.status}</em></div><small>{item.plan}</small><h3>{item.title}</h3><p><CalendarDays /> {item.period}</p><dl><div><dt>{role === 'hospital' ? '조회' : '병원 확인'}</dt><dd>{item.views}</dd></div><div><dt>{role === 'hospital' ? '문의' : '제안·상담'}</dt><dd>{item.inquiries}</dd></div></dl><button type="button">상세 관리 <ArrowRight /></button></article>)}</div> : <div className="member-empty member-empty-large"><FileText /><strong>{role === 'hospital' ? '등록한 공고가 없습니다' : '등록한 이력서가 없습니다'}</strong><p>{role === 'hospital' ? '첫 공고를 등록하면 게시 상태와 반응을 이곳에서 확인할 수 있습니다.' : '이력서를 등록하면 공개 범위와 상담 현황을 이곳에서 관리할 수 있습니다.'}</p></div>}</>}

        {tab === 'inquiries' && <><div className="member-page-head"><div><small>MESSAGES & MATCHING</small><h2>{role === 'hospital' ? '문의·후보 연결' : '상담·제안 내역'}</h2><p>{role === 'hospital' ? '의사 문의와 헤드헌터의 후보 추천을 확인합니다. 내역을 누르면 원문과 답변을 볼 수 있습니다.' : '헤드헌터 상담과 병원 제안 진행 상태를 확인합니다. 내역을 누르면 상세 내용을 볼 수 있습니다.'}</p></div></div>{inquiries.length ? <section className="member-panel member-table-panel"><div className="member-table-head"><span>보낸 사람</span><span>문의 내용</span><span>접수일</span><span>상태</span></div>{inquiries.map((item) => <button type="button" className="member-inquiry-row" key={`${item.source}-${item.subject}`} onClick={() => setSelectedInquiry(item)}><strong>{item.name}</strong><div><b>{item.subject}</b><small>{item.source}</small></div><time>{item.time}</time><span className="member-inquiry-state"><em className={statusClass(item.status)}>{item.status}</em><ChevronRight /></span></button>)}</section> : <div className="member-empty member-empty-large"><MessageCircle /><strong>아직 상담·문의 내역이 없습니다</strong><p>새로운 상담이나 문의가 접수되면 진행 상태와 함께 표시됩니다.</p></div>}<div className="member-privacy-note"><ShieldCheck /><div><strong>{role === 'hospital' ? '의사 실명과 연락처는 동의 후 공개됩니다' : '내 실명과 연락처는 동의한 병원에만 전달됩니다'}</strong><p>메디헬퍼스 헤드헌터가 연결 범위를 확인한 뒤 필요한 정보만 안전하게 전달합니다.</p></div></div></>}

        {tab === 'payments' && <><div className="member-page-head"><div><small>BILLING & USAGE</small><h2>{role === 'hospital' ? '결제·사용이력' : '멤버십·결제 내역'}</h2><p>상품 이용기간과 결제·사용 상태를 같은 기준으로 확인합니다.</p></div></div>{payments.length ? <section className="member-panel member-payment-list">{payments.map((item) => <div key={item.id} className="member-payment-row"><article><span><Receipt /></span><div><small>{item.id}</small><strong>{item.item}</strong><p>{item.date}</p></div><b>{item.amount}</b><em className={statusClass(item.status)}>{item.status}</em>{!qa.active && item.refundable && <button type="button" className="member-refund-btn" onClick={() => { setRefundFor(refundFor === item.id ? null : item.id); setRefundReason(''); setRefundMsg(''); }}>환불 요청</button>}{!qa.active && <button type="button" onClick={() => setReceipt(item)}>영수증</button>}</article>{refundFor === item.id && <div className="member-refund-form"><p className="member-refund-note">환불(청약철회)을 요청합니다. 이미 제공이 시작된 서비스는 이용분이 공제될 수 있으며, 처리 기준은 <a href={withBase('/refund')} target="_blank" rel="noreferrer">환불 정책</a>을 따릅니다.</p><textarea rows="2" placeholder="환불 사유를 입력해 주세요 (예: 단순 변심, 중복 결제, 서비스 미이용 등)" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} /><div className="member-refund-actions"><button type="button" className="button outline" onClick={() => setRefundFor(null)} disabled={refundBusy}>취소</button><button type="button" className="button primary" onClick={() => submitRefund(item.id)} disabled={refundBusy}>{refundBusy ? '접수 중…' : '환불 요청 접수'}</button></div></div>}</div>)}{refundMsg && <p className="member-refund-msg" role="status">{refundMsg}</p>}</section> : <div className="member-empty member-empty-large"><Receipt /><strong>아직 결제 내역이 없습니다</strong><p>공고 상품·멤버십·열람권 결제가 완료되면 영수증과 이용기간이 표시됩니다.</p></div>}<section className="member-panel"><div className="member-panel-head"><div><h3>전체 사용 기록</h3><p>조회·상담·결제 등 계정 활동을 시간순으로 표시합니다.</p></div></div>{activities.length ? <div className="member-timeline">{activities.map(([date, title, detail]) => <div key={`${date}-${title}`}><time>{date}</time><span /><div><strong>{title}</strong><p>{detail}</p></div></div>)}</div> : <div className="member-empty"><CalendarDays /><strong>기록된 사용 이력이 없습니다</strong><p>계정 활동이 발생하면 시간순으로 안전하게 기록됩니다.</p></div>}</section></>}

        {tab === 'profile' && <><div className="member-page-head"><div><small>ACCOUNT & SECURITY</small><h2>회원정보·알림·보안</h2><p>모든 회원에게 공통으로 필요한 정보를 관리합니다.</p></div>{saved && <span className="member-saved"><CircleCheck /> {saved}</span>}</div><form className="member-profile-form" onSubmit={saveProfile}><section className="member-panel"><div className="member-panel-head"><div><h3>기본 회원정보</h3><p>상담과 중요 안내에 사용할 정보를 입력해주세요.</p></div></div><div className="member-profile-grid"><label><span>이름·담당자명</span><input name="displayName" defaultValue={currentProfile.displayName} /></label><label><span>로그인 이메일</span><input name="email" type="email" defaultValue={currentProfile.email} readOnly /></label><label><span>휴대전화</span><input name="phone" defaultValue={currentProfile.phone} /></label><label><span>{role === 'hospital' ? '병원명' : '전문과목·직군'}</span><input name="organization" defaultValue={currentProfile.organization} /></label><label><span>{role === 'hospital' ? '담당자 직함' : '경력 표시'}</span><input name="jobTitle" defaultValue={currentProfile.jobTitle} /></label></div></section><section className="member-panel"><div className="member-panel-head"><div><h3>알림 설정</h3><p>중요한 진행 상태만 선택해서 받아보세요.</p></div></div><div className="member-toggle-list">{[['email','이메일 알림','상담·결제·계정 보안 안내'],['sms','문자 알림','새 문의와 헤드헌터 연락'],['service','서비스 알림','공고 마감·이력서 상태·멤버십'],['marketing','혜택·이벤트','선택 동의이며 언제든 해제 가능']].map(([key, title, copy]) => <label key={key}><div><strong>{title}</strong><small>{copy}</small></div><input type="checkbox" checked={notifications[key]} onChange={(event) => setNotifications((current) => ({ ...current, [key]: event.target.checked }))} /><span /></label>)}</div></section><section className="member-panel member-security"><div className="member-panel-head"><div><h3>로그인·보안</h3><p>로그인 이메일과 계정 접근 문제를 관리합니다.</p></div></div><div><span><KeyRound /></span><div><strong>로그인 정보</strong><p>{currentProfile.email}</p><small>비밀번호를 잊었거나 이메일 접근이 어렵다면 로그인 도움에서 본인 확인 절차를 진행하세요.</small></div><a className="button outline" href={withBase('/account/recovery')}>아이디·비밀번호 도움</a></div><div><span><ShieldCheck /></span><div><strong>개인정보처리방침·약관</strong><p>수집 항목과 보관 기간, 회원 탈퇴 처리 기준을 확인할 수 있습니다.</p></div><a className="button outline" href={withBase('/privacy')}>처리방침 보기</a></div></section><button className="button primary member-save" type="submit">변경사항 저장</button></form><WithdrawSection /></>}
      </main>
    </div>
    {selectedInquiry && <InquiryDetailModal inquiry={selectedInquiry} role={role} canAdmin={qa.info.capabilities.admin} onClose={() => setSelectedInquiry(null)} />}
    {receipt && <ReceiptModal payment={receipt} buyerName={currentProfile.organization || currentProfile.displayName || receipt.customerName} onClose={() => setReceipt(null)} />}
  </div>;
}

function InquiryDetailModal({ inquiry, role, canAdmin, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  const details = Object.entries(inquiry.details || {}).filter(([, value]) => value);
  const history = inquiry.history || [[inquiry.time, '문의 접수']];

  return <div className="inquiry-detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="inquiry-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="inquiry-detail-title">
      <header>
        <div className="inquiry-detail-heading"><span><MessageCircle /></span><div><small>문의·후보 연결 상세</small><h2 id="inquiry-detail-title">{inquiry.subject}</h2><p>{inquiry.id || inquiry.source}</p></div></div>
        <button type="button" className="inquiry-detail-close" onClick={onClose} aria-label="상세 창 닫기"><X /></button>
      </header>

      <div className="inquiry-detail-summary">
        <div><UserRound /><span><small>보낸 사람</small><strong>{inquiry.name}</strong></span></div>
        <div><FileText /><span><small>관련 항목</small><strong>{inquiry.source}</strong></span></div>
        <div><Clock3 /><span><small>접수일</small><strong>{inquiry.time}</strong></span></div>
        <div><BadgeCheck /><span><small>진행 상태</small><strong>{inquiry.status}</strong></span></div>
      </div>

      <div className="inquiry-detail-body">
        <div className="inquiry-detail-main">
          <section className="inquiry-detail-section">
            <small>ORIGINAL MESSAGE</small>
            <h3>문의 내용</h3>
            <p>{inquiry.message || '접수한 문의 내용을 담당 헤드헌터가 확인하고 있습니다.'}</p>
          </section>

          {details.length > 0 && <section className="inquiry-detail-section">
            <small>REQUEST DETAILS</small>
            <h3>접수 정보</h3>
            <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </section>}

          <section className="inquiry-detail-response">
            <span><ShieldCheck /></span>
            <div><small>HEADHUNTER RESPONSE</small><h3>담당자 답변</h3><p>{inquiry.response || '담당 헤드헌터가 내용을 확인 중입니다.'}</p></div>
          </section>
        </div>

        <aside className="inquiry-detail-aside">
          <h3>처리 이력</h3>
          <div className="inquiry-detail-history">{history.map(([time, label], index) => <div key={`${time}-${label}`}><i className={index === history.length - 1 ? 'active' : ''} /><span><strong>{label}</strong><small>{time}</small></span></div>)}</div>
          <div className="inquiry-detail-contact"><Phone /><div><strong>담당 헤드헌터 문의</strong><a href="tel:0513425463">051-342-5463</a><small>평일 09:00~18:00</small></div></div>
        </aside>
      </div>

      <footer>
        <button type="button" className="button outline" onClick={onClose}>닫기</button>
        {canAdmin ? <a className="button primary" href={withBase('/admin/consultations')}>관리자 상담함에서 답변·상태 관리 <ArrowRight /></a> : <a className="button primary" href="tel:0513425463">담당 헤드헌터에게 문의 <Phone /></a>}
      </footer>
      <p className="inquiry-detail-privacy"><LockKeyhole /> {role === 'hospital' ? '후보자의 실명과 연락처는 동의된 범위에서만 공개됩니다.' : '회원님의 개인정보는 동의한 병원과 담당 헤드헌터에게만 전달됩니다.'}</p>
    </section>
  </div>;
}

// 세금계산서형 영수증. 부가세(공급가액+세액=합계) 표시, 인쇄·PDF·이미지 저장 지원.
const RECEIPT_OPERATOR = {
  name: '메디헬퍼스', representative: '이형석', businessNumber: '873-92-00515',
  address: '부산광역시 북구 만덕대로116번길 28', phone: '051-342-5463', email: 'hr@medihelpers.co.kr',
};
export function ReceiptModal({ payment, buyerName, onClose }) {
  const won = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`;
  const receiptRef = React.useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const buildDocHtml = () => {
    const node = receiptRef.current;
    if (!node) return '';
    return `<!doctype html><html><head><meta charset="utf-8"><title>영수증 ${payment.id}</title>` +
      `<style>body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;margin:0;padding:24px;color:#1a2233}` +
      `.rc{max-width:560px;margin:0 auto;border:1px solid #d6deea;border-radius:10px;padding:28px}` +
      `.rc h1{font-size:20px;margin:0 0 4px}.rc .sub{color:#6a7688;font-size:12px;margin-bottom:18px}` +
      `.rc dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:0 0 16px;font-size:13px}` +
      `.rc dt{color:#6a7688}.rc dd{margin:0;text-align:right;font-weight:600}` +
      `.rc .amt{border-top:2px solid #1a2233;margin-top:8px;padding-top:12px}` +
      `.rc .amt div{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}` +
      `.rc .amt .total{font-size:17px;font-weight:800;border-top:1px solid #d6deea;margin-top:6px;padding-top:10px}` +
      `.rc .biz{margin-top:18px;padding-top:14px;border-top:1px dashed #cdd6e2;font-size:11.5px;color:#6a7688;line-height:1.7}</style>` +
      `</head><body>${node.innerHTML}</body></html>`;
  };
  const printReceipt = () => {
    const w = window.open('', '_blank', 'width=640,height=800');
    if (!w) { alert('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.'); return; }
    w.document.write(buildDocHtml());
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };
  const saveImage = async () => {
    const node = receiptRef.current;
    if (!node) return;
    const w = node.offsetWidth || 560, h = node.offsetHeight || 700;
    const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="font-family:'Malgun Gothic',sans-serif;background:#fff;padding:8px;box-sizing:border-box;width:${w}px">${node.innerHTML}</div>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
    const img = new Image();
    img.onload = () => {
      const scale = 2, canvas = document.createElement('canvas');
      canvas.width = w * scale; canvas.height = h * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png'); a.download = `영수증_${payment.id}.png`; a.click();
    };
    img.onerror = () => alert('이미지 저장에 실패했습니다. 인쇄 → PDF로 저장을 이용해 주세요.');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };
  return <div className="inquiry-detail-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="receipt-modal" role="dialog" aria-modal="true">
      <button className="inquiry-detail-close" onClick={onClose} aria-label="닫기"><X /></button>
      <div className="receipt-doc" ref={receiptRef}>
        <div className="rc">
          <h1>결제 영수증</h1>
          <div className="sub">영수증 번호 {payment.id} · {payment.date}</div>
          <dl>
            <dt>상품명</dt><dd>{payment.item}</dd>
            <dt>구매자</dt><dd>{buyerName || '-'}</dd>
            <dt>결제수단</dt><dd>{payment.method || '카드'}</dd>
            <dt>결제상태</dt><dd>{payment.status}</dd>
          </dl>
          <div className="amt">
            <div><span>공급가액</span><span>{won(payment.supply)}</span></div>
            <div><span>부가세(VAT 10%)</span><span>{won(payment.tax)}</span></div>
            <div className="total"><span>합계(부가세 포함)</span><span>{won(payment.total)}</span></div>
          </div>
          <div className="biz">
            {RECEIPT_OPERATOR.name} · 대표 {RECEIPT_OPERATOR.representative}<br />
            사업자등록번호 {RECEIPT_OPERATOR.businessNumber}<br />
            {RECEIPT_OPERATOR.address}<br />
            {RECEIPT_OPERATOR.phone} · {RECEIPT_OPERATOR.email}
          </div>
        </div>
      </div>
      <div className="receipt-actions">
        <button type="button" className="button outline" onClick={printReceipt}>인쇄 / PDF 저장</button>
        <button type="button" className="button primary" onClick={saveImage}>이미지(PNG) 저장</button>
      </div>
    </div>
  </div>;
}
