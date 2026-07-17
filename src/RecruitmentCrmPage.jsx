import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgeCheck, Banknote, BriefcaseBusiness, Building2, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, FileCheck2, Search, ShieldCheck, UserRoundSearch, UsersRound } from 'lucide-react';

const stages = [
  ['new_request','신규 의뢰'], ['condition_review','조건 확인'], ['candidate_search','후보 탐색'], ['candidate_consent','후보 동의'], ['hospital_submitted','병원 제안'], ['interview','면접 예정'], ['negotiation','조건 협상'], ['hired','입사 확정'], ['closed','종료']
];

const demoCases = [
  { id:'CASE-260717-01', hospitalName:'해운대바른척추병원', specialty:'정형외과', positionTitle:'정형외과 전문의', stage:'candidate_search', assignedRecruiter:'김혜원 헤드헌터', estimatedFee:18000000, candidateCount:4, nextAction:'후보 2명 의사 확인', billingStatus:'success_fee' },
  { id:'CASE-260716-02', hospitalName:'서울 온누리검진센터', specialty:'가정의학과', positionTitle:'검진센터 진료원장', stage:'hospital_submitted', assignedRecruiter:'김혜원 헤드헌터', estimatedFee:15000000, candidateCount:3, nextAction:'병원 피드백 확인', billingStatus:'success_fee' },
  { id:'CASE-260712-03', hospitalName:'부산 메디컬병원', specialty:'영상의학과', positionTitle:'MRI 판독 전문의', stage:'interview', assignedRecruiter:'박선영 헤드헌터', estimatedFee:21000000, candidateCount:2, nextAction:'7월 21일 면접', billingStatus:'success_fee' },
  { id:'CASE-260701-04', hospitalName:'인천 가족의원', specialty:'가정의학과', positionTitle:'진료원장', stage:'hired', assignedRecruiter:'김혜원 헤드헌터', estimatedFee:13200000, candidateCount:1, nextAction:'8월 1일 입사·청구서 발행', billingStatus:'invoice_pending' }
];

const formatMoney = (value) => value ? `${Math.round(value / 10000).toLocaleString()}만원` : '협의';

export default function RecruitmentCrmPage({ qa }) {
  const [cases, setCases] = useState(qa?.active ? demoCases : []);
  const [selectedId, setSelectedId] = useState((qa?.active ? demoCases[0] : null)?.id || '');
  const [status, setStatus] = useState(qa?.active ? 'ready' : 'loading');
  const [filter, setFilter] = useState('active');
  useEffect(() => {
    if (qa?.active) return;
    fetch('/api/recruitment-crm', { headers:{ accept:'application/json' } }).then(async (response) => {
      if (!response.ok) throw new Error('unauthorized');
      const data = await response.json();
      setCases(data.cases || []); setSelectedId(data.cases?.[0]?.id || ''); setStatus('ready');
    }).catch(() => setStatus('denied'));
  }, [qa?.active]);
  const visible = useMemo(() => cases.filter((item) => filter === 'all' || (filter === 'active' ? !['hired','closed'].includes(item.stage) : item.stage === filter)), [cases, filter]);
  const selected = cases.find((item) => item.id === selectedId) || visible[0];
  const updateStage = async (next) => {
    if (!selected) return;
    setCases((items) => items.map((item) => item.id === selected.id ? { ...item, stage:next } : item));
    if (!qa?.active) await fetch(`/api/recruitment-crm/${encodeURIComponent(selected.id)}`, { method:'PATCH', headers:{ 'content-type':'application/json' }, body:JSON.stringify({ stage:next, assignedRecruiter:selected.assignedRecruiter || '' }) });
  };
  const goBack = () => window.location.assign('/admin/console');
  if (status === 'denied') return <section className="crm-access-denied"><ShieldCheck /><h1>관리자 권한이 필요합니다</h1><p>채용 CRM은 메디헬퍼스 관리자만 이용할 수 있습니다.</p><a href="/">홈으로 돌아가기</a></section>;
  return <div className="recruitment-crm">
    <section className="crm-hero"><div><button type="button" className="crm-back-button" onClick={goBack}><ArrowLeft /> 관리자 페이지로 돌아가기</button><span><BadgeCheck /> MEDIHELPERS RECRUITMENT CRM</span><h1>상담부터 입사·성공보수까지<br />한 흐름으로 관리합니다</h1><p>병원 의뢰, 후보 동의, 추천, 면접, 조건 협상과 청구 상태가 한 채용 건에 누적됩니다.</p></div><aside><small>현재 진행</small><strong>{cases.filter((item) => !['hired','closed'].includes(item.stage)).length}건</strong><span>입사 확정 {cases.filter((item) => item.stage === 'hired').length}건</span></aside></section>
    <section className="crm-stage-strip">{stages.slice(0,8).map(([key,label], index) => <div key={key}><span>{index + 1}</span><strong>{label}</strong><small>{cases.filter((item) => item.stage === key).length}건</small></div>)}</section>
    <section className="crm-workspace">
      <aside className="crm-case-list"><header><div><small>HEADHUNTING CASES</small><h2>채용案件</h2></div><button>+ 새 의뢰</button></header><div className="crm-filter"><button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>진행 중</button><button className={filter === 'hired' ? 'active' : ''} onClick={() => setFilter('hired')}>입사 확정</button><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>전체</button></div>{visible.map((item) => <button className={`crm-case ${selected?.id === item.id ? 'active' : ''}`} key={item.id} onClick={() => setSelectedId(item.id)}><span>{stages.find(([key]) => key === item.stage)?.[1]}</span><strong>{item.hospitalName}</strong><small>{item.specialty} · {item.assignedRecruiter || '담당자 미지정'}</small><em>{item.nextAction || '다음 일정 입력'} <ChevronRight /></em></button>)}</aside>
      <main className="crm-case-detail">{status === 'loading' ? <div className="crm-loading">채용 데이터를 불러오는 중입니다.</div> : selected ? <>
        <header><div><small>{selected.id}</small><h2>{selected.hospitalName}</h2><p>{selected.positionTitle || selected.specialty}</p></div><div className="crm-owner"><span>담당 헤드헌터</span><strong>{selected.assignedRecruiter || '미지정'}</strong></div></header>
        <div className="crm-stage-control"><span>현재 단계</span><select value={selected.stage} onChange={(event) => updateStage(event.target.value)}>{stages.map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><small>단계 변경은 이력에 기록됩니다.</small></div>
        <div className="crm-summary-grid"><article><Building2 /><span>병원 의뢰</span><strong>{selected.specialty}</strong><small>검증된 채용조건 기준</small></article><article><UsersRound /><span>후보 진행</span><strong>{selected.candidateCount || 0}명</strong><small>동의 전 실명 비공개</small></article><article><CalendarDays /><span>다음 액션</span><strong>{selected.nextAction || '일정 입력 필요'}</strong><small>담당자 알림 연동</small></article><article><Banknote /><span>예상 성공보수</span><strong>{formatMoney(selected.estimatedFee)}</strong><small>{selected.billingStatus === 'invoice_pending' ? '청구서 발행 예정' : '입사 확정 시 청구'}</small></article></div>
        <div className="crm-detail-columns"><section><header><UserRoundSearch /><div><small>CANDIDATE PIPELINE</small><h3>후보 추천·동의</h3></div></header><div className="crm-timeline"><p><Check /> 후보 검색 조건 확정</p><p><Clock3 /> 후보자 의사 확인 중</p><p><ShieldCheck /> 병원 공개 전 동의 기록</p></div><button>후보 추가·동의 관리 <ArrowRight /></button></section><section><header><FileCheck2 /><div><small>INTERVIEW & OFFER</small><h3>면접·조건 협상</h3></div></header><dl><div><dt>면접 일정</dt><dd>{selected.stage === 'interview' ? selected.nextAction : '미정'}</dd></div><div><dt>제안 조건</dt><dd>후보별 비공개 기록</dd></div><div><dt>입사 예정</dt><dd>{selected.stage === 'hired' ? '2026.08.01' : '협의 중'}</dd></div></dl><button>일정·제안조건 입력 <ArrowRight /></button></section></div>
        <section className="crm-audit-note"><ShieldCheck /><div><strong>실명 열람과 정보 제공은 서버에서 통제합니다</strong><p>후보자 동의, 병원 열람, 동의 철회와 단계 변경을 감사기록으로 남기도록 설계했습니다.</p></div></section>
      </> : <div className="crm-empty"><CircleAlert /><strong>등록된 채용 의뢰가 없습니다</strong><p>상담함에서 병원 의뢰를 확인하고 채용 건으로 전환하세요.</p></div>}</main>
    </section>
  </div>;
}
