import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, BriefcaseBusiness, Building2, CalendarDays, Check,
  CheckCircle2, ClipboardCheck, Clock3, FileText, HeartPulse, LockKeyhole,
  MapPin, Search, ShieldCheck, Stethoscope, UsersRound
} from 'lucide-react';
import { withBase } from './basePath.js';
import { operationalMedicalJobs } from './siteOperations.js';

const categories = ['전체 직군', '간호직', '보건관련직', '의료기사직', '약무직', '의사직', '제약·기타직'];

// 세부 직종(공고 role)을 참고 대분류 카테고리로 매핑한다. 치과 직군은 취급하지 않아 제외한다.
const roleGroupMap = {
  '간호사': '간호직',
  '간호조무사': '간호직',
  '방사선사': '의료기사직',
  '임상병리사': '의료기사직',
  '물리·작업치료사': '의료기사직',
  '물리치료사': '의료기사직',
  '작업치료사': '의료기사직',
  '병원 행정직': '보건관련직',
  '원무행정': '보건관련직',
  '약사': '약무직',
  '약무직': '약무직',
  '의사': '의사직',
  '제약': '제약·기타직',
};

// 매핑에 없는 직종은 '제약·기타직'으로 모은다(치과위생사 등 미취급 직군 제외 후).
function roleGroup(role = '') {
  if (roleGroupMap[role]) return roleGroupMap[role];
  if (categories.includes(role)) return role;
  return '제약·기타직';
}

export const sampleJobs = [
  { id:'ms-01', role:'간호사', title:'외래·검진센터 간호사', hospital:'서울 온누리검진센터', region:'서울 강남', type:'정규직', career:'경력 2년↑', pay:'연 4,200만원~', deadline:'D-5', verifiedByHeadhunter:true, summary:'건강검진과 외래 진료가 원활하게 진행되도록 환자 안내부터 검사 전후 간호까지 함께합니다.', workHours:'평일 08:00~17:00 · 토요일 격주 오전', daysOff:'일요일·공휴일 휴무', responsibilities:['외래 환자 문진 및 진료 보조','건강검진 수검자 안내와 검사 전후 간호','의약품·비품 및 감염관리'], requirements:['간호사 면허 소지자','임상 경력 2년 이상','검진센터 또는 외래 경력자 우대'], benefits:['중식 제공','연차·경조휴가','직원 건강검진 지원'] },
  { id:'ms-02', role:'방사선사', title:'MRI·CT 방사선사', hospital:'수원 중앙영상의학센터', region:'경기 수원', type:'주 5일', career:'경력 3년↑', pay:'연 4,500만원~', deadline:'D-8', summary:'MRI·CT 촬영 품질과 환자 안전을 함께 관리할 경력 방사선사를 찾습니다.', workHours:'평일 08:30~17:30 · 주 5일', daysOff:'주말·공휴일 휴무', responsibilities:['MRI·CT 검사 및 영상 품질 관리','검사 전 환자 확인과 안전 안내','장비 일상점검 및 검사실 운영'], requirements:['방사선사 면허 소지자','MRI 또는 CT 경력 3년 이상','환자 응대와 협업이 원활한 분'], benefits:['성과 인센티브','보수교육비 지원','직원·가족 검진 할인'] },
  { id:'ms-03', role:'임상병리사', title:'진단검사실 임상병리사', hospital:'부산 메디컬병원', region:'부산 해운대', type:'정규직', career:'신입·경력', pay:'경력별 협의', deadline:'D-12', summary:'진단검사의 정확성과 신속한 결과 보고를 책임질 임상병리사를 채용합니다.', workHours:'주 40시간 · 근무표에 따른 교대', daysOff:'월 8회 이상 · 연차 별도', responsibilities:['검체 접수·전처리 및 진단검사','검사 장비 정도관리와 시약 관리','결과 검토 및 이상치 보고'], requirements:['임상병리사 면허 소지자','신입 지원 가능','종합병원 검사실 경력자 우대'], benefits:['기숙사 협의','보수교육 지원','구내식당 운영'] },
  { id:'ms-04', role:'병원 행정직', title:'원무·보험청구 경력직', hospital:'인천 가족의원', region:'인천 남동', type:'주 5일', career:'경력 2년↑', pay:'연 3,600만원~', deadline:'D-3', summary:'접수·수납과 보험청구를 정확하게 관리하고 환자 경험을 함께 개선합니다.', workHours:'평일 09:00~18:00 · 토요일 격주 오전', daysOff:'일요일·공휴일 휴무', responsibilities:['외래 접수·수납 및 제증명 발급','건강보험·자동차보험 청구','미수금과 월별 청구 내역 관리'], requirements:['병의원 원무 경력 2년 이상','보험청구 실무 가능자','관련 자격 보유자 우대'], benefits:['명절 상여','중식 제공','장기근속 포상'] },
  { id:'ms-05', role:'간호조무사', title:'소아청소년과 외래 간호조무사', hospital:'송도 아이봄소아과', region:'인천 연수', type:'정규직', career:'경력 무관', pay:'월 280만원~', deadline:'D-7', summary:'아이와 보호자가 편안하게 진료받을 수 있도록 외래 진료와 예방접종을 지원합니다.', workHours:'평일 09:00~18:30 · 토요일 09:00~14:00', daysOff:'주중 반차 · 일요일 휴무', responsibilities:['외래 진료 및 예방접종 보조','환자 안내와 진료실 정리','의료소모품 재고 관리'], requirements:['간호조무사 자격 소지자','신입 지원 가능','소아과 경력자 우대'], benefits:['중식 제공','유니폼 지급','근속수당'] },
  { id:'ms-06', role:'물리·작업치료사', title:'도수·운동치료 물리치료사', hospital:'분당 바른재활의학과', region:'경기 성남', type:'주 5일', career:'경력 1년↑', pay:'연 4,000만원~', deadline:'D-10', verifiedByHeadhunter:true, summary:'근골격계 환자의 회복을 위해 평가부터 도수·운동치료까지 체계적으로 담당합니다.', workHours:'평일 09:00~19:00 · 주 5일', daysOff:'일요일 휴무 · 평일 1일 휴무', responsibilities:['근골격계 환자 기능 평가','도수·운동치료 계획 수립과 시행','치료 기록 및 경과 공유'], requirements:['물리치료사 면허 소지자','관련 경력 1년 이상','도수치료 교육 이수자 우대'], benefits:['치료 인센티브','교육비 지원','직원 진료 할인'] },
  { id:'ms-07', role:'치과위생사', title:'진료실 치과위생사', hospital:'마곡 서울미소치과', region:'서울 강서', type:'정규직', career:'신입·경력', pay:'월 310만원~', deadline:'D-14', summary:'진료 준비와 예방관리, 환자 안내를 담당할 치과위생사를 모집합니다.', workHours:'주 5일 · 야간진료 주 1회', daysOff:'일요일 휴무 · 주중 1일 휴무', responsibilities:['치과 진료 및 수술 보조','스케일링과 예방관리','환자 상담 및 기구 관리'], requirements:['치과위생사 면허 소지자','신입 지원 가능','밝고 친절한 환자 응대 가능자'], benefits:['기숙사 협의','간식·식사 제공','세미나비 지원'] },
  { id:'ms-08', role:'간호사', title:'병동 간호사 3교대', hospital:'대전 우리종합병원', region:'대전 서구', type:'3교대', career:'경력 무관', pay:'연 4,600만원~', deadline:'상시채용', summary:'입원 환자의 안전한 치료와 회복을 지원할 병동 간호사를 상시 채용합니다.', workHours:'3교대 · 병동 근무표 적용', daysOff:'월 8회 이상 · 연차 별도', responsibilities:['입원 환자 간호와 투약','의무기록 및 인수인계','응급상황 대응과 감염관리'], requirements:['간호사 면허 소지자','신입·경력 지원 가능','교대근무 가능자'], benefits:['기숙사 제공','나이트 수당','보수교육비 지원'] },
  { id:'ms-09', role:'병원 행정직', title:'건강검진센터 예약·상담 코디네이터', hospital:'청주 메디플러스검진센터', region:'충북 청주', type:'정규직', career:'신입·경력', pay:'연 3,300만원~', deadline:'D-6', summary:'검진 예약부터 결과 안내까지 고객의 검진 여정을 세심하게 관리합니다.', workHours:'평일 08:00~17:00 · 토요일 격주 오전', daysOff:'일요일·공휴일 휴무', responsibilities:['개인·기업 검진 예약 관리','검진 프로그램과 주의사항 안내','고객 문의 및 결과 상담 일정 조율'], requirements:['학력·경력 무관','고객 응대와 전산 입력 가능자','검진센터 경력자 우대'], benefits:['성과급','중식 제공','직원 검진 지원'] },
  { id:'ms-10', role:'임상병리사', title:'채혈·검체관리 임상병리사', hospital:'광주 더나은내과', region:'광주 서구', type:'주 5일', career:'경력 1년↑', pay:'월 300만원~', deadline:'D-9', summary:'외래 환자 채혈과 검체 품질관리를 안정적으로 담당할 임상병리사를 찾습니다.', workHours:'평일 08:30~17:30 · 토요일 격주 오전', daysOff:'일요일·공휴일 휴무', responsibilities:['외래 채혈과 검체 접수','검체 보관·운송 및 품질관리','검사실 소모품 관리'], requirements:['임상병리사 면허 소지자','채혈 경력 1년 이상','내과 검사실 경력자 우대'], benefits:['중식 제공','연차 자유 사용','명절 상여'] },
  { id:'ms-11', role:'물리·작업치료사', title:'성인 작업치료사', hospital:'일산 새봄재활병원', region:'경기 고양', type:'정규직', career:'신입 가능', pay:'연 3,700만원~', deadline:'D-11', summary:'성인 중추신경계 환자의 일상 복귀를 돕는 작업치료사를 모집합니다.', workHours:'평일 08:30~17:30 · 주 5일', daysOff:'주말·공휴일 휴무', responsibilities:['성인 작업수행 평가와 치료','일상생활동작 훈련','보호자 교육과 치료 기록'], requirements:['작업치료사 면허 소지자','신입 지원 가능','성인 재활 관심자'], benefits:['교육비 지원','기숙사 협의','직원 식당'] },
  { id:'ms-12', role:'간호조무사', title:'피부과 시술 보조 간호조무사', hospital:'해운대 더클린의원', region:'부산 해운대', type:'주 5일', career:'경력 1년↑', pay:'월 290만원~', deadline:'D-4', summary:'피부 시술 준비와 환자 안내를 꼼꼼하게 담당할 간호조무사를 채용합니다.', workHours:'주 5일 · 평일 10:00~19:00', daysOff:'일요일 휴무 · 주중 1일 휴무', responsibilities:['피부 시술 준비와 보조','환자 안내 및 사후관리 설명','시술실 소독과 물품 관리'], requirements:['간호조무사 자격 소지자','피부과 경력 1년 이상','고객 응대가 원활한 분'], benefits:['시술 인센티브','유니폼 지급','직원 시술 할인'] },
];

const defaultBenefits = ['4대보험 및 퇴직금', '연차·경조휴가', '직원 교육 지원'];

function go(path) {
  window.history.pushState({}, '', withBase(path));
  window.dispatchEvent(new PopStateEvent('popstate'));
  // 목록에서 상세로 이동할 때 이전 스크롤 위치가 남아 상세가 중간부터 보이던 문제 방지.
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function normalizeJob(job) {
  return {
    ...job,
    summary: `${job.hospital}에서 ${job.title} 포지션을 모집합니다. 상세 조건을 확인하고 지원 여부를 결정하세요.`,
    workHours: job.type || '근무시간 협의',
    daysOff: '기관 근무표에 따라 협의',
    responsibilities: ['해당 직무의 주요 실무 수행', '환자·보호자 응대 및 유관 부서 협업', '업무 기록과 품질 기준 준수'],
    requirements: [`${job.role} 관련 면허·자격 보유자`, job.career || '경력 무관', '원활한 의사소통과 협업이 가능한 분'],
    benefits: defaultBenefits,
    process: ['온라인 지원·문의', '서류 확인', '기관 면접', '조건 협의 및 최종 합격'],
    documents: ['이력서', '면허·자격 확인 서류(면접 이후 요청)'],
    ...(job.summary ? { summary:job.summary } : {}),
    ...(job.workHours ? { workHours:job.workHours } : {}),
    ...(job.daysOff ? { daysOff:job.daysOff } : {}),
    ...(job.responsibilities?.length ? { responsibilities:job.responsibilities } : {}),
    ...(job.requirements?.length ? { requirements:job.requirements } : {}),
    ...(job.benefits?.length ? { benefits:job.benefits } : {}),
    ...(job.process?.length ? { process:job.process } : {}),
    ...(job.documents?.length ? { documents:job.documents } : {}),
  };
}

export function getMedicalStaffJobs(operations) {
  return [...operationalMedicalJobs(operations?.contents || []), ...sampleJobs].map(normalizeJob);
}

export default function MedicalStaffPage({ operations, medicalTalent = [] }) {
  // 치과 관련 직군(치과위생사 등)은 취급하지 않으므로 목록에서 제외한다.
  const liveJobs = useMemo(
    () => getMedicalStaffJobs(operations).filter((job) => !/치과/.test(job.role || '')),
    [operations?.contents]
  );
  const liveCategories = categories;
  const [category, setCategory] = useState('전체 직군');
  const [keyword, setKeyword] = useState('');
  const visible = useMemo(() => liveJobs.filter((job) => (category === '전체 직군' || roleGroup(job.role) === category) && (!keyword || `${job.title} ${job.hospital} ${job.region}`.includes(keyword))), [liveJobs, category, keyword]);
  const openJob = (job) => go(`/medical-staff/jobs/${encodeURIComponent(job.id)}`);

  return <div className="medical-staff-hub">
    <section className="medical-staff-hero">
      <div><span><UsersRound /> MEDICAL STAFF JOBS</span><h1>간호·의료기사·약무<br /><em>의료인 채용 공고</em></h1><p>병원이 등록한 간호·보건·의료기사·약무 <b>일자리 공고</b>를 확인하고 지원하세요. 구직 인재의 이력서를 찾는 병원은 <a href={withBase('/talent')}>인재정보</a>를 이용하세요.</p><div className="medical-staff-actions"><button onClick={() => go('/resume?staff=1')}><FileText /> 의료인 이력서 등록 <ArrowRight /></button><button className="secondary" onClick={() => go('/advertise/apply?staff=1')}><Building2 /> 병원 · 공고 등록</button></div></div>
      <aside><small>구직 의료인</small><strong>공고를 보고<br />바로 지원하세요</strong><ul><li><Check /> 직군·지역·조건별 공고</li><li><Check /> 로그인 후 지원·문의</li><li><Check /> 연락처는 동의 후 전달</li></ul></aside>
    </section>
    <section className="medical-staff-search" aria-label="의료인 채용정보 검색">
      <div className="medical-staff-search-title"><span><Search /></span><div><small>MEDICAL STAFF SEARCH</small><h2>직군과 지역으로 채용정보를 찾으세요</h2></div></div>
      <div className="medical-staff-category-row">{liveCategories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="기관명, 직무, 지역 검색" /></label>
    </section>
    <section className="section medical-staff-results">
      <header><div><small>검색 결과 {visible.length}건</small><h2>의료인 채용정보</h2><p>목록에서 핵심 조건을 비교하고, 상세 페이지에서 업무와 지원 절차를 확인하세요.</p></div><span><ShieldCheck /> 등록 기관과 공고를 순차 검수합니다</span></header>
      {!!visible.length && <div className="medical-staff-list-head" aria-hidden="true"><span>직군</span><span>채용공고</span><span>지원조건</span><span>급여</span><span>마감</span><span /></div>}
      <div className="medical-staff-job-list">{visible.map((job) => <article
        key={job.id}
        role="link"
        tabIndex="0"
        aria-label={`${job.hospital} ${job.title} 상세 보기`}
        onClick={() => openJob(job)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openJob(job); } }}
      >
        <span className="medical-staff-role">{job.role}</span>
        <div className="medical-staff-job-main"><div className="ms-job-top-row"><small>{job.hospital}</small>{job.verifiedByHeadhunter && <span className="tag tag-verified"><ShieldCheck /> 헤드헌터 인증</span>}</div><h3>{job.title}</h3><p><MapPin /> {job.region} <i /> <BriefcaseBusiness /> {job.type}</p></div>
        <span className="medical-staff-career">{job.career}</span>
        <strong>{job.pay}</strong>
        <span className="medical-staff-deadline"><CalendarDays /> {job.deadline}</span>
        <span className="medical-staff-row-action">상세 보기 <ArrowRight /></span>
      </article>)}</div>
      {!visible.length && <div className="medical-staff-empty"><Stethoscope /><strong>조건에 맞는 공고가 없습니다</strong><p>검색 조건을 바꾸거나 채용 알림을 신청해 보세요.</p></div>}
    </section>
    {medicalTalent.length > 0 && <section className="section medical-staff-seeking-cta">
      <div className="medical-seeking-banner">
        <div><span className="section-kicker">MEDICAL STAFF SEEKING</span><h2>구직 중인 간호·의료인 {medicalTalent.length}명</h2><p>이력서를 등록한 간호·보건·의료기사·약무 인재는 인재정보에서 의사와 함께 확인합니다. 연락처·상세는 열람권으로 열람합니다.</p></div>
        <button type="button" className="button primary" onClick={() => go('/talent')}>인재정보에서 의료인 보기 <ArrowRight /></button>
      </div>
    </section>}
  </div>;
}

function DetailList({ title, icon, items }) {
  return <section className="medical-staff-detail-card">
    <header>{icon}<h2>{title}</h2></header>
    <ul>{items.map((item) => <li key={item}><CheckCircle2 /> <span>{item}</span></li>)}</ul>
  </section>;
}

export function MedicalStaffDetailPage({ operations, jobId, qa }) {
  const jobs = useMemo(() => getMedicalStaffJobs(operations), [operations?.contents]);
  const job = jobs.find((item) => String(item.id) === String(jobId));
  const [signedIn, setSignedIn] = useState(Boolean(qa?.active && qa.info.capabilities.signedIn));
  const [accountRole, setAccountRole] = useState('');
  const [roleReady, setRoleReady] = useState(Boolean(qa?.active)); // 실제 계정 role 확정 여부(깜빡임 방지)

  useEffect(() => {
    if (!job) return undefined;
    const previous = document.title;
    document.title = `${job.title} | 메디헬퍼스`;
    return () => { document.title = previous; };
  }, [job]);

  useEffect(() => {
    if (qa?.active) {
      setSignedIn(Boolean(qa.info.capabilities.signedIn));
      setAccountRole(qa.info.capabilities.hospital ? 'hospital' : qa.info.capabilities.doctor ? 'doctor' : '');
      setRoleReady(true);
      return undefined;
    }
    let active = true;
    setRoleReady(false);
    fetch('/api/account', { credentials:'same-origin', headers:{ accept:'application/json' } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('account')))
      .then((result) => { if (active) { setSignedIn(Boolean(result.signedIn)); setAccountRole(result.account?.role || ''); setRoleReady(true); } })
      .catch(() => { if (active) { setSignedIn(false); setAccountRole(''); setRoleReady(true); } });
    return () => { active = false; };
  }, [qa?.active, qa?.state]);

  if (!job) return <div className="medical-staff-detail-page"><section className="medical-staff-detail-missing"><Stethoscope /><h1>공고를 찾을 수 없습니다</h1><p>마감되었거나 주소가 변경된 공고입니다.</p><button onClick={() => go('/medical-staff')}><ArrowLeft /> 의료인 채용 목록</button></section></div>;

  const applyPath = `/request/job-seeker?staff=1&job=${encodeURIComponent(job.id)}`;
  const loginPath = `/signup/doctor?next=${encodeURIComponent(applyPath)}`;
  const actionPath = signedIn ? applyPath : loginPath;
  // 병원 회원은 지원 주체가 아니라 채용 주체 → '지원하기' 대신 인재 채용 경로로 안내.
  const isHospital = accountRole === 'hospital';
  const process = job.process?.length ? job.process : ['온라인 지원·문의', '서류 확인', '기관 면접', '최종 합격'];
  const documents = job.documents?.length ? job.documents : ['이력서', '자격 확인 서류'];

  return <div className="medical-staff-detail-page">
    <div className="medical-staff-detail-shell">
      <button className="medical-staff-back" onClick={() => go('/medical-staff')}><ArrowLeft /> 의료인 채용 목록</button>
      <section className="medical-staff-detail-hero">
        <div>
          <div className="medical-staff-detail-tags"><span className="medical-staff-detail-role">{job.role}</span>{job.verifiedByHeadhunter && <span className="tag tag-verified"><ShieldCheck /> 헤드헌터 인증</span>}</div>
          <p>{job.hospital}</p>
          <h1>{job.title}</h1>
          <div className="medical-staff-detail-meta"><span><MapPin /> {job.region}</span><span><BriefcaseBusiness /> {job.type}</span><span><CalendarDays /> {job.deadline}</span></div>
        </div>
        <aside><small>채용 조건</small><strong>{job.pay}</strong><span>{job.career}</span></aside>
      </section>

      <div className="medical-staff-detail-layout">
        <main>
          <section className="medical-staff-detail-intro">
            <small>POSITION SUMMARY</small>
            <h2>포지션 안내</h2>
            <p>{job.summary}</p>
          </section>
          <div className="medical-staff-detail-grid">
            <DetailList title="담당업무" icon={<ClipboardCheck />} items={job.responsibilities} />
            <DetailList title="자격요건" icon={<ShieldCheck />} items={job.requirements} />
          </div>
          <section className="medical-staff-detail-card medical-staff-work-conditions">
            <header><Clock3 /><h2>근무조건</h2></header>
            <dl>
              <div><dt>고용형태</dt><dd>{job.type}</dd></div>
              <div><dt>근무시간</dt><dd>{job.workHours}</dd></div>
              <div><dt>휴무·휴가</dt><dd>{job.daysOff}</dd></div>
              <div><dt>근무지역</dt><dd>{job.region}</dd></div>
              <div><dt>급여</dt><dd>{job.pay}</dd></div>
              <div><dt>지원경력</dt><dd>{job.career}</dd></div>
            </dl>
          </section>
          <DetailList title="복리후생" icon={<HeartPulse />} items={job.benefits} />
          <section className="medical-staff-detail-card">
            <header><FileText /><h2>전형절차·제출서류</h2></header>
            <ol className="medical-staff-process">{process.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></li>)}</ol>
            <div className="medical-staff-documents"><strong>제출서류</strong><p>{documents.join(' · ')}</p><small>면허·자격 원본은 공개 지원 단계에서 수집하지 않으며, 기관 확인이 필요한 시점에 별도로 안내합니다.</small></div>
          </section>
        </main>

        <aside className="medical-staff-apply-panel">
          {!roleReady ? <>
            <small>지원·문의</small>
            <h2>이 공고에 관심이 있으신가요?</h2>
            <p>계정 상태를 확인하고 있습니다…</p>
            <button className="primary" disabled>확인 중… <ArrowRight /></button>
          </> : isHospital ? <>
            <small>병원 회원 안내</small>
            <h2>이 공고는 지원용 공고입니다</h2>
            <p>병원 회원은 다른 기관의 공고에 지원할 수 없습니다. 우리 병원 채용이 필요하면 메디헬퍼스 헤드헌터에게 의뢰해 주세요.</p>
            <button className="primary" onClick={() => go('/request/hiring')}>채용 의뢰하기 <ArrowRight /></button>
            <div><LockKeyhole /><span><strong>지원은 의사·의료인 회원 전용</strong><small>공고 지원은 구직 회원만 가능하며, 병원은 채용 측 기능을 이용합니다.</small></span></div>
          </> : <>
            <small>지원·상담</small>
            <h2>이 공고에 지원하시겠어요?</h2>
            <p>병원에 이력서를 접수하거나, 조건이 애매하면 메디헬퍼스 헤드헌터에게 먼저 상담받을 수 있습니다.</p>
            <button className="primary" onClick={() => go(actionPath)}>{signedIn ? '이 병원에 이력서 접수' : '로그인 후 이력서 접수'} <ArrowRight /></button>
            <button className="secondary" onClick={() => go('/headhunting?role=doctor')}>헤드헌터에게 상담받기</button>
            <div><LockKeyhole /><span><strong>연락처는 공개하지 않습니다</strong><small>이력서와 연락처는 로그인·동의 후 채용 절차에 필요한 범위에서만 병원에 전달됩니다.</small></span></div>
          </>}
        </aside>
      </div>
    </div>
    <div className="medical-staff-mobile-cta"><div><small>{job.hospital}</small><strong>{job.pay}</strong></div>{!roleReady ? <button disabled>확인 중…</button> : isHospital ? <button onClick={() => go('/request/hiring')}>채용 의뢰하기 <ArrowRight /></button> : <button onClick={() => go(actionPath)}>{signedIn ? '이력서 접수' : '로그인 후 접수'} <ArrowRight /></button>}</div>
  </div>;
}
