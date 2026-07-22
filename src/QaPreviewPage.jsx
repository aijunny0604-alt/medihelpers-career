import React from 'react';
import { ArrowRight, Building2, Check, ClipboardCheck, Crown, Eye, LogOut, ShieldCheck, Stethoscope, UserRound, UsersRound } from 'lucide-react';
import { QA_STATE_OPTIONS } from './qaPreview.js';
import { withBase } from './basePath.js';

const quickRoutes = [
  { path: '/jobs', label: '채용정보·상세조건', description: '공고 잠금과 상세 모달 확인', icon: Eye },
  { path: '/medical-staff', label: '의료인 구인구직', description: '의료인 구직 글·열람권 확인', icon: ClipboardCheck },
  { path: '/advertise', label: '광고센터', description: '병원 등록·결제 진입 확인', icon: Building2 },
  { path: '/medical-staff', label: '인재 열람권', description: '병원 열람권 결제·잠금 확인', icon: Crown }
];

const stateIcons = { guest: UserRound, admin: ShieldCheck, hospital: Building2, doctor: Stethoscope, 'doctor-member': Crown };

export default function QaPreviewPage({ qa }) {
  const current = qa.info;
  return <>
    <section className="page-hero qa-hero">
      <div className="page-hero-inner"><span className="eyebrow"><ShieldCheck /> ROLE QA PREVIEW</span><h1>권한별 화면을<br />직접 확인하세요</h1><p>실제 로그인이나 결제 없이 관리자·병원·의사·멤버십 상태의 화면 차이를 안전하게 점검합니다.</p></div>
    </section>
    <section className="section qa-preview-page">
      <div className="qa-simulation-notice"><ShieldCheck /><div><strong>테스트 전용 시뮬레이션</strong><p>실제 계정·관리자 권한·결제·개인정보에는 연결되지 않습니다. 선택한 상태는 이 브라우저에만 저장됩니다.</p></div><button type="button" onClick={qa.exit}><LogOut /> QA 종료</button></div>
      <div className="qa-section-head"><div><small>STEP 01</small><h2>확인할 로그인 상태를 선택하세요</h2><p>선택 후 다른 페이지로 이동해도 테스트 상태가 유지됩니다.</p></div><span className={`qa-current-chip tone-${current.tone}`}>{current.label}</span></div>
      <div className="qa-state-grid">
        {QA_STATE_OPTIONS.map((option) => {
          const Icon = stateIcons[option.id];
          const selected = qa.state === option.id;
          return <button type="button" key={option.id} className={`qa-state-card tone-${option.tone} ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => qa.select(option.id)}>
            <span><Icon /></span><div><strong>{option.label}</strong><p>{option.description}</p></div>{selected && <Check />}
          </button>;
        })}
      </div>
      <div className={`qa-dashboard tone-${current.tone}`}>
        <div className="qa-dashboard-copy"><small>CURRENT TEST SESSION</small><h2>{current.label} 화면</h2><p>{current.description}</p><div className="qa-capabilities">{Object.entries(current.capabilities).filter(([, enabled]) => enabled).map(([key]) => <span key={key}><Check /> {({ signedIn:'로그인',admin:'관리자',hospital:'병원 권한',doctor:'의사 권한',membership:'멤버십 활성',privateDetails:'상세조건 열람' })[key]}</span>)}</div></div>
        <div className="qa-metrics">{current.metrics.map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      </div>
      <div className="qa-section-head routes"><div><small>STEP 02</small><h2>이 상태로 주요 페이지 점검</h2><p>상단의 QA 표시를 통해 현재 권한을 놓치지 않고 확인할 수 있습니다.</p></div></div>
      <div className="qa-route-grid">{quickRoutes.map(({ path,label,description,icon:Icon }) => <a key={path} href={withBase(path)}><Icon /><span><strong>{label}</strong><small>{description}</small></span><ArrowRight /></a>)}</div>
      <div className="qa-checklist"><div><UsersRound /><strong>권한별 공통 점검표</strong></div><ul><li><Check /> 헤더의 로그인·회원 상태</li><li><Check /> 공고 상세조건 잠금 여부</li><li><Check /> 구독 중·결제 버튼 상태</li><li><Check /> 병원 공고 등록 진입</li><li><Check /> 관리자 검수 요약</li><li><Check /> 모바일 줄바꿈과 고정 UI</li></ul></div>
    </section>
  </>;
}
