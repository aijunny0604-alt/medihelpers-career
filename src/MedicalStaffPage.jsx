import React, { useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, Building2, Check, FileText, MapPin, Search, ShieldCheck, Stethoscope, UsersRound } from 'lucide-react';
import { withBase } from './basePath.js';

const categories = ['전체 직군', '간호사', '간호조무사', '방사선사', '임상병리사', '물리·작업치료사', '치과위생사', '병원 행정직'];
const sampleJobs = [
  { id:'ms-01', role:'간호사', title:'외래·검진센터 간호사', hospital:'서울 온누리검진센터', region:'서울 강남', type:'정규직', pay:'면접 후 결정' },
  { id:'ms-02', role:'방사선사', title:'MRI·CT 방사선사', hospital:'수원 중앙영상의학센터', region:'경기 수원', type:'주 5일', pay:'연 4,500만원~' },
  { id:'ms-03', role:'임상병리사', title:'진단검사실 임상병리사', hospital:'부산 메디컬병원', region:'부산 해운대', type:'정규직', pay:'경력별 협의' },
  { id:'ms-04', role:'병원 행정직', title:'원무·보험청구 경력직', hospital:'인천 가족의원', region:'인천 남동', type:'주 5일', pay:'연 3,600만원~' },
];

function go(path) {
  window.history.pushState({}, '', withBase(path));
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function MedicalStaffPage() {
  const [category, setCategory] = useState('전체 직군');
  const [keyword, setKeyword] = useState('');
  const visible = useMemo(() => sampleJobs.filter((job) => (category === '전체 직군' || job.role === category) && (!keyword || `${job.title} ${job.hospital} ${job.region}`.includes(keyword))), [category, keyword]);
  return <div className="medical-staff-hub">
    <section className="medical-staff-hero">
      <div><span><UsersRound /> MEDICAL STAFF JOBS</span><h1>의료인 채용은 더 넓게,<br /><em>의사 헤드헌팅은 더 깊게.</em></h1><p>메디헬퍼스의 의사 전문성을 유지하면서 병원 운영에 필요한 의료직군 채용을 별도 허브에서 연결합니다.</p><div className="medical-staff-actions"><button onClick={() => go('/advertise/apply?staff=1')}><Building2 /> 의료인 공고 등록 <ArrowRight /></button><button className="secondary" onClick={() => go('/resume?staff=1')}><FileText /> 의료인 이력서 등록</button></div></div>
      <aside><small>병원 채용 담당자</small><strong>한 계정으로<br />의사와 의료인 채용 관리</strong><ul><li><Check /> 직군별 공고 등록</li><li><Check /> 지원자·문의 통합 관리</li><li><Check /> 광고 성과와 이용내역 확인</li></ul></aside>
    </section>
    <section className="medical-staff-search" aria-label="의료인 채용정보 검색">
      <div className="medical-staff-search-title"><span><Search /></span><div><small>MEDICAL STAFF SEARCH</small><h2>직군과 지역으로 채용정보를 찾으세요</h2></div></div>
      <div className="medical-staff-category-row">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <label><Search /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="기관명, 직무, 지역 검색" /></label>
    </section>
    <section className="section medical-staff-results">
      <header><div><small>현재 {visible.length}건</small><h2>의료인 채용정보</h2></div><span><ShieldCheck /> 등록 기관과 공고를 순차 검수합니다</span></header>
      <div className="medical-staff-job-list">{visible.map((job) => <article key={job.id}><span className="medical-staff-role">{job.role}</span><div><small>{job.hospital}</small><h3>{job.title}</h3><p><MapPin /> {job.region} <i /> <BriefcaseBusiness /> {job.type}</p></div><strong>{job.pay}</strong><button onClick={() => go('/headhunting?role=hospital')}>채용 문의 <ArrowRight /></button></article>)}</div>
      {!visible.length && <div className="medical-staff-empty"><Stethoscope /><strong>조건에 맞는 공고가 없습니다</strong><p>검색 조건을 바꾸거나 채용 알림을 신청해 보세요.</p></div>}
    </section>
    <section className="medical-staff-revenue section"><div><small>FOR HOSPITALS</small><h2>필요한 방식만 선택하는 병원 채용 상품</h2><p>의사 채용은 성공보수형 헤드헌팅과 광고를, 의료인 채용은 직군별 공고와 인재검색을 제공합니다.</p></div><div className="medical-staff-revenue-grid"><article><span>01</span><h3>의사 헤드헌팅</h3><p>입사 확정 시 성공보수</p></article><article><span>02</span><h3>의사 초빙광고</h3><p>일반·추천·집중 노출</p></article><article><span>03</span><h3>의료인 채용공고</h3><p>직군별 유료 공고 등록</p></article><article><span>04</span><h3>의료인 인재검색</h3><p>병원 인증 후 이용권 방식</p></article></div></section>
  </div>;
}
