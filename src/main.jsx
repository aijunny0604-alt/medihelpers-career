import React, { useEffect, useState } from 'react';
import {
  ArrowRight, BriefcaseBusiness, Building2, Check, ChevronDown, CircleCheck,
  Clock3, Heart, MapPin, Menu, Search, ShieldCheck, Sparkles, Stethoscope,
  UserRoundSearch, UsersRound, X
} from 'lucide-react';

const jobs = [
  { hospital: '삼천포제일병원', title: '각 과 전문의 의료진 초빙', location: '경남 전지역', type: '정규직', dept: '전문의', pay: '협의 후 결정', badge: '집중채용', color: '#2367e8' },
  { hospital: '청주첨단한방병원', title: '정형외과·통증의학과 원장님', location: '충북 청주시', type: '정규직', dept: '정형외과', pay: '월 1,400만원~', badge: '신규', color: '#12a67a' },
  { hospital: '아이사랑병원', title: '달빛어린이병원 담당 원장님', location: '부산 연제구', type: '주 5일', dept: '소아청소년과', pay: '월 1,400만원+', badge: '추천', color: '#7d57e8' },
  { hospital: '속초우리요양병원', title: '진료과별 전문의 선생님', location: '강원 속초시', type: '정규직', dept: '전문의', pay: '협의 후 결정', badge: '상시채용', color: '#e57a35' },
  { hospital: '청아병원', title: '소화기내과 전문의 초빙', location: '경남 창원시', type: '정규직', dept: '내과', pay: '협의 후 결정', badge: 'HOT', color: '#e24e62' },
  { hospital: '서울웰니스의원', title: '건강검진센터 진료의', location: '서울 강남구', type: '주 4.5일', dept: '가정의학과', pay: '월 1,200만원~', badge: '워라밸', color: '#1689a7' },
];

const departments = ['전체 진료과', '내과', '정형외과', '소아청소년과', '가정의학과', '영상의학과'];
const regions = ['전국', '서울', '경기', '부산', '경남', '충북', '강원'];

export function App() {
  const [saved, setSaved] = useState([]);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [dept, setDept] = useState('전체 진료과');
  const [region, setRegion] = useState('전국');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const scrollToJobs = () => document.querySelector('#jobs')?.scrollIntoView({ behavior: 'smooth' });
  const search = () => {
    scrollToJobs();
    setToast(keyword || dept !== '전체 진료과' || region !== '전국' ? '선택한 조건의 채용공고를 확인해보세요.' : '최신 채용공고를 불러왔습니다.');
  };
  const toggleSaved = (index) => setSaved((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]);

  return (
    <div className="app">
      <header>
        <div className="nav-wrap">
          <a className="brand" href="#top" aria-label="메디헬퍼스 홈">
            <img className="brand-logo" src="/medihelpers-logo.svg" alt="메디헬퍼스" />
          </a>
          <nav className={menu ? 'open' : ''}>
            <a href="#jobs" onClick={() => setMenu(false)}>채용정보</a>
            <a href="#headhunt" onClick={() => setMenu(false)}>인재정보</a>
            <a href="#headhunt" onClick={() => setMenu(false)}>헤드헌팅</a>
            <a href="#process" onClick={() => setMenu(false)}>서비스 소개</a>
          </nav>
          <div className="nav-actions">
            <button className="text-btn" onClick={() => setToast('로그인 기능은 준비 중입니다.')}>로그인</button>
            <button className="primary small" onClick={() => { scrollToJobs(); setToast('원하는 포지션을 찾아보세요.'); }}>시작하기 <ArrowRight size={16}/></button>
          </div>
          <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="메뉴">{menu ? <X/> : <Menu/>}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-glow glow-one"></div><div className="hero-glow glow-two"></div>
          <div className="hero-content">
            <div className="eyebrow"><Sparkles size={15}/> 의료 커리어의 좋은 연결</div>
            <h1>더 나은 진료의 시작,<br/><em>좋은 동료</em>를 만나는 일</h1>
            <p>의료인을 이해하는 전문 헤드헌터가<br className="mobile-break"/> 당신의 다음 커리어를 함께 찾습니다.</p>
            <div className="search-panel">
              <div className="search-field">
                <Stethoscope size={20}/>
                <select value={dept} onChange={(e) => setDept(e.target.value)} aria-label="진료과 선택">
                  {departments.map((item) => <option key={item}>{item}</option>)}
                </select><ChevronDown size={17}/>
              </div>
              <div className="search-field">
                <MapPin size={20}/>
                <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="지역 선택">
                  {regions.map((item) => <option key={item}>{item}</option>)}
                </select><ChevronDown size={17}/>
              </div>
              <div className="search-field keyword"><Search size={20}/><input value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="병원명 또는 키워드"/></div>
              <button className="primary search-btn" onClick={search}>검색하기</button>
            </div>
            <div className="quick-links"><span>빠른 검색</span><button onClick={() => {setDept('내과'); search();}}>내과</button><button onClick={() => {setDept('정형외과'); search();}}>정형외과</button><button onClick={() => {setRegion('서울'); search();}}>서울</button><button onClick={() => {setRegion('부산'); search();}}>부산</button></div>
          </div>
          <div className="hero-visual">
            <div className="image-shell">
              <div className="hero-photo" role="img" aria-label="밝은 병원 복도의 의료진"></div>
              <div className="match-card">
                <div className="match-icon"><CircleCheck size={22}/></div>
                <div><strong>새로운 매칭 도착</strong><span>선생님과 92% 일치해요</span></div>
              </div>
              <div className="people-card"><div className="avatars"><span>김</span><span>박</span><span>이</span></div><div><strong>1,280+</strong><span>의료인 커리어 연결</span></div></div>
            </div>
          </div>
        </section>

        <section className="trust-row">
          <div><strong>9년+</strong><span>의료 채용 전문성</span></div><i></i>
          <div><strong>1,280+</strong><span>누적 커리어 연결</span></div><i></i>
          <div><strong>340+</strong><span>파트너 의료기관</span></div><i></i>
          <div><strong>4.9 / 5</strong><span>이용자 만족도</span></div>
        </section>

        <section className="jobs-section" id="jobs">
          <div className="section-head"><div><span className="section-kicker">CURATED POSITIONS</span><h2>지금 주목할 채용</h2><p>전문 헤드헌터가 직접 확인한 포지션을 만나보세요.</p></div><button className="outline" onClick={() => setToast('전체 채용공고 목록을 준비하고 있습니다.')}>전체 채용 보기 <ArrowRight size={17}/></button></div>
          <div className="job-grid">
            {jobs.map((job, i) => <article className="job-card" key={job.title}>
              <div className="job-top"><span className="tag" style={{color: job.color, background: job.color+'12'}}>{job.badge}</span><button className={saved.includes(i) ? 'heart saved' : 'heart'} onClick={() => toggleSaved(i)} aria-label="관심 공고 저장"><Heart size={20} fill={saved.includes(i) ? 'currentColor' : 'none'}/></button></div>
              <div className="hospital"><span className="hospital-logo" style={{background: job.color}}>{job.hospital[0]}</span><span>{job.hospital}</span></div>
              <h3>{job.title}</h3>
              <div className="meta"><span><MapPin size={15}/>{job.location}</span><span><Clock3 size={15}/>{job.type}</span></div>
              <div className="job-bottom"><span>{job.dept}</span><strong>{job.pay}</strong></div>
            </article>)}
          </div>
        </section>

        <section className="split-section" id="headhunt">
          <div className="split-card doctor-card">
            <div className="split-icon"><BriefcaseBusiness/></div><span className="mini-label">의료인이라면</span>
            <h2>내 커리어에 맞는<br/>포지션을 제안받으세요</h2><p>간단한 프로필 등록만으로 비공개 포지션까지<br/>맞춤 제안을 받을 수 있습니다.</p>
            <ul><li><Check/>이력서 비공개 설정</li><li><Check/>전담 헤드헌터 1:1 상담</li><li><Check/>연봉·근무조건 협상 지원</li></ul>
            <button className="dark-btn" onClick={() => setToast('의료인 프로필 등록을 시작합니다.')}>프로필 등록하기 <ArrowRight size={17}/></button>
          </div>
          <div className="split-card hospital-card">
            <div className="split-icon"><UserRoundSearch/></div><span className="mini-label">의료기관이라면</span>
            <h2>검증된 의료 인재를<br/>빠르게 만나보세요</h2><p>채용 조건을 알려주시면 전문 컨설턴트가<br/>가장 적합한 후보자를 추천합니다.</p>
            <ul><li><Check/>전문과목별 인재풀</li><li><Check/>경력·자격 사전 검증</li><li><Check/>채용 완료까지 밀착 관리</li></ul>
            <button className="blue-btn" onClick={() => setToast('헤드헌팅 의뢰서가 곧 열립니다.')}>인재 추천 의뢰하기 <ArrowRight size={17}/></button>
          </div>
        </section>

        <section className="process-section" id="process">
          <div className="process-intro"><span className="section-kicker">HOW IT WORKS</span><h2>복잡한 이직과 채용,<br/>메디헬퍼스가 쉽게 만듭니다</h2><p>의료 현장을 잘 아는 전담 헤드헌터가<br/>첫 상담부터 입사까지 함께합니다.</p><div className="shield"><ShieldCheck/><span><strong>안심할 수 있는 개인정보 보호</strong><small>모든 프로필은 동의 없이 공개되지 않습니다.</small></span></div></div>
          <div className="steps">
            {[['01','조건을 알려주세요','희망 지역, 진료과, 근무 조건을 간단히 입력합니다.',<Search/>],['02','딱 맞는 연결','전문 컨설턴트가 검증된 병원과 인재를 연결합니다.',<UsersRound/>],['03','새로운 시작','면접과 조건 협상을 거쳐 만족스러운 시작을 함께합니다.',<Building2/>]].map(([n,t,d,icon]) => <div className="step" key={n}><div className="step-num">{n}</div><div className="step-icon">{icon}</div><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </section>

        <section className="cta">
          <div><span>좋은 연결을 찾고 계신가요?</span><h2>당신의 다음 커리어,<br/>메디헬퍼스와 시작하세요.</h2></div>
          <div className="cta-buttons"><button className="white-btn" onClick={() => {scrollToJobs(); setToast('채용공고로 이동했습니다.');}}>채용정보 보기</button><button className="glass-btn" onClick={() => setToast('1:1 무료 상담을 준비하고 있습니다.')}>무료 상담 신청 <ArrowRight size={17}/></button></div>
        </section>
      </main>

      <footer><div className="footer-main"><div><a className="brand footer-brand" href="#top"><img className="brand-logo" src="/medihelpers-logo.svg" alt="메디헬퍼스" /></a><p>의료기관과 의료인의 더 좋은 내일을 연결합니다.</p></div><div className="footer-links"><div><strong>서비스</strong><a href="#jobs">채용정보</a><a href="#headhunt">인재정보</a><a href="#headhunt">헤드헌팅 의뢰</a></div><div><strong>고객지원</strong><a href="#process">서비스 소개</a><a href="#top">공지사항</a><a href="mailto:hr@medihelpers.co.kr">문의하기</a></div><div><strong>메디헬퍼스</strong><a href="#top">회사소개</a><a href="#top">이용약관</a><a href="#top">개인정보처리방침</a></div></div></div><div className="footer-bottom"><span>© 2026 MEDIHELPERS. All rights reserved.</span><span>부산광역시 북구 만덕대로 116번길 28 · 051-342-5463 · hr@medihelpers.co.kr</span></div></footer>
      {toast && <div className="toast"><CircleCheck size={19}/>{toast}</div>}
    </div>
  );
}
