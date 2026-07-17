import React, { useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, Check, FileText, MapPin, Search, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import { withBase } from './basePath.js';
import { operationalMedicalJobs } from './siteOperations.js';

const categories = ['전체 직군', '간호사', '간호조무사', '방사선사', '임상병리사', '물리·작업치료사', '치과위생사', '병원 행정직'];
export const sampleJobs = [
  { id:'ms-01', role:'간호사', title:'외래·검진센터 간호사', hospital:'서울 온누리검진센터', region:'서울 강남', type:'정규직', career:'경력 2년↑', pay:'연 4,200만원~', deadline:'D-5' },
  { id:'ms-02', role:'방사선사', title:'MRI·CT 방사선사', hospital:'수원 중앙영상의학센터', region:'경기 수원', type:'주 5일', career:'경력 3년↑', pay:'연 4,500만원~', deadline:'D-8' },
  { id:'ms-03', role:'임상병리사', title:'진단검사실 임상병리사', hospital:'부산 메디컬병원', region:'부산 해운대', type:'정규직', career:'신입·경력', pay:'경력별 협의', deadline:'D-12' },
  { id:'ms-04', role:'병원 행정직', title:'원무·보험청구 경력직', hospital:'인천 가족의원', region:'인천 남동', type:'주 5일', career:'경력 2년↑', pay:'연 3,600만원~', deadline:'D-3' },
  { id:'ms-05', role:'간호조무사', title:'소아청소년과 외래 간호조무사', hospital:'송도 아이봄소아과', region:'인천 연수', type:'정규직', career:'경력 무관', pay:'월 280만원~', deadline:'D-7' },
  { id:'ms-06', role:'물리·작업치료사', title:'도수·운동치료 물리치료사', hospital:'분당 바른재활의학과', region:'경기 성남', type:'주 5일', career:'경력 1년↑', pay:'연 4,000만원~', deadline:'D-10' },
  { id:'ms-07', role:'치과위생사', title:'진료실 치과위생사', hospital:'마곡 서울미소치과', region:'서울 강서', type:'정규직', career:'신입·경력', pay:'월 310만원~', deadline:'D-14' },
  { id:'ms-08', role:'간호사', title:'병동 간호사 3교대', hospital:'대전 우리종합병원', region:'대전 서구', type:'3교대', career:'경력 무관', pay:'연 4,600만원~', deadline:'상시채용' },
  { id:'ms-09', role:'병원 행정직', title:'건강검진센터 예약·상담 코디네이터', hospital:'청주 메디플러스검진센터', region:'충북 청주', type:'정규직', career:'신입·경력', pay:'연 3,300만원~', deadline:'D-6' },
  { id:'ms-10', role:'임상병리사', title:'채혈·검체관리 임상병리사', hospital:'광주 더나은내과', region:'광주 서구', type:'주 5일', career:'경력 1년↑', pay:'월 300만원~', deadline:'D-9' },
  { id:'ms-11', role:'물리·작업치료사', title:'성인 작업치료사', hospital:'일산 새봄재활병원', region:'경기 고양', type:'정규직', career:'신입 가능', pay:'연 3,700만원~', deadline:'D-11' },
  { id:'ms-12', role:'간호조무사', title:'피부과 시술 보조 간호조무사', hospital:'해운대 더클린의원', region:'부산 해운대', type:'주 5일', career:'경력 1년↑', pay:'월 290만원~', deadline:'D-4' },
];

function go(path) {
  window.history.pushState({}, '', withBase(path));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function MedicalStaffPage({ operations }) {
  const liveJobs = useMemo(() => [...operationalMedicalJobs(operations?.contents || []), ...sampleJobs], [operations?.contents]);
  const liveCategories = useMemo(() => ['전체 직군', ...new Set([...categories.slice(1), ...liveJobs.map((job) => job.role)])], [liveJobs]);
  const [category, setCategory] = useState('전체 직군');
  const [keyword, setKeyword] = useState('');
  const visible = useMemo(() => liveJobs.filter((job) => (category === '전체 직군' || job.role === category) && (!keyword || `${job.title} ${job.hospital} ${job.region}`.includes(keyword))), [liveJobs, category, keyword]);
  return <div className="medical-staff-hub">
    <section className="medical-staff-hero">
      <div><span><UsersRound /> MEDICAL STAFF JOBS</span><h1>의료인 채용은 더 넓게,<br /><em>의사 헤드헌팅은 더 깊게.</em></h1><p>메디헬퍼스의 의사 전문성을 유지하면서 병원 운영에 필요한 의료직군 채용을 별도 허브에서 연결합니다.</p><div className="medical-staff-actions"><button onClick={() => go('/advertise/apply?staff=1')}><Building2 /> 의료인 공고 등록 <ArrowRight /></button><button className="secondary" onClick={() => go('/resume?staff=1')}><FileText /> 의료인 이력서 등록</button></div></div>
      <aside><small>병원 채용 담당자</small><strong>한 계정으로<br />의사와 의료인 채용 관리</strong><ul><li><Check /> 직군별 공고 등록</li><li><Check /> 지원자·문의 통합 관리</li><li><Check /> 광고 성과와 이용내역 확인</li></ul></aside>
    </section>
    <section className="medical-staff-search" aria-label="의료인 채용정보 검색">
      <div className="medical-staff-search-title"><span><Search /></span><div><small>MEDICAL STAFF SEARCH</small><h2>직군과 지역으로 채용정보를 찾으세요</h2></div></div>
      <div className="medical-staff-category-row">{liveCategories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="기관명, 직무, 지역 검색" /></label>
    </section>
    <section className="section medical-staff-results">
      <header><div><small>검색 결과 {visible.length}건</small><h2>의료인 채용정보</h2><p>근무조건과 보수를 같은 기준으로 비교하고 지원할 공고를 선택하세요.</p></div><span><ShieldCheck /> 등록 기관과 공고를 순차 검수합니다</span></header>
      {!!visible.length && <div className="medical-staff-list-head" aria-hidden="true"><span>직군</span><span>채용공고</span><span>지원조건</span><span>급여</span><span>마감</span><span /></div>}
      <div className="medical-staff-job-list">{visible.map((job) => <article key={job.id}>
        <span className="medical-staff-role">{job.role}</span>
        <div className="medical-staff-job-main"><small>{job.hospital}</small><h3>{job.title}</h3><p><MapPin /> {job.region} <i /> <BriefcaseBusiness /> {job.type}</p></div>
        <span className="medical-staff-career">{job.career}</span>
        <strong>{job.pay}</strong>
        <span className="medical-staff-deadline"><CalendarDays /> {job.deadline}</span>
        <button onClick={() => go(`/request/job-seeker?staff=1&job=${job.id}`)}>지원 문의 <ArrowRight /></button>
      </article>)}</div>
      {!visible.length && <div className="medical-staff-empty"><Stethoscope /><strong>조건에 맞는 공고가 없습니다</strong><p>검색 조건을 바꾸거나 채용 알림을 신청해 보세요.</p></div>}
    </section>
  </div>;
}
