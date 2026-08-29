import { useEffect, useState } from 'react';

export const defaultSiteOperations = {
  settings: { siteName:'메디헬퍼스', supportPhone:'051-342-5463', supportEmail:'hr@medihelpers.co.kr', announcement:'' },
  features: { doctorRecruitment:true, talentSearch:true, resumeRegistration:true, medicalStaffHub:true, paidCareerService:false, adRegistration:true },
  contents: [],
};

let cached = defaultSiteOperations;
let pending;
let fetchedAt = 0;
// 공고를 등록·수정한 뒤 목록으로 이동해도 예전 캐시가 그대로 보이던 문제가 있었다.
// (한 번 받아오면 다시 요청하지 않아, 브라우저를 새로고침해야만 새 공고가 보였다)
// 짧은 TTL을 두고, 등록 성공 시에는 invalidateSiteOperations()로 즉시 캐시를 버린다.
const OPERATIONS_TTL_MS = 15000;

function loadOperations(force = false) {
  const stale = force || !pending || (Date.now() - fetchedAt > OPERATIONS_TTL_MS);
  if (stale) {
    pending = fetch('/api/site-operations', { headers:{ accept:'application/json' }, credentials:'same-origin' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('site operations unavailable')))
      .then((value) => {
        cached = { ...defaultSiteOperations, ...value, settings:{ ...defaultSiteOperations.settings, ...(value.settings || {}) }, features:{ ...defaultSiteOperations.features, ...(value.features || {}) } };
        fetchedAt = Date.now();
        return cached;
      })
      .catch(() => cached);
  }
  return pending;
}

// 공고·이력서 등록처럼 공개 목록이 바뀌는 작업 직후 호출해 다음 조회가 서버를 다시 보게 한다.
export function invalidateSiteOperations() {
  pending = undefined;
  fetchedAt = 0;
  // 다음 화면이 곧바로 최신 목록을 쓰도록 미리 새로 받아둔다(등록 → 목록 이동 사이의 공백 제거).
  try { loadOperations(true); } catch {}
}

export function useSiteOperations() {
  const [operations, setOperations] = useState(cached);
  useEffect(() => {
    let active = true;
    const sync = () => { loadOperations().then((value) => active && setOperations(value)); };
    sync();
    // SPA는 페이지를 오가도 이 훅이 다시 마운트되지 않는다(의존성이 비어 있어 1회만 실행).
    // 그래서 공고를 등록하고 목록으로 이동해도 예전 캐시가 계속 보였다.
    // 경로 변경·탭 복귀 시 다시 확인해서 TTL이 지났거나 무효화됐으면 서버를 새로 조회한다.
    window.addEventListener('popstate', sync);
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      window.removeEventListener('popstate', sync);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return operations;
}

// Keep the dedicated headhunting board separate from paid hospital ads while
// retaining the existing D1 schema and bindings.
export const HEADHUNT_BOARD_CHANNEL = 'headhunt_board';

export function isHeadhuntBoardContent(item) {
  return (item?.contentType === 'doctor_job' || item?.contentType === 'medical_job')
    && item?.payload?.publicationChannel === HEADHUNT_BOARD_CHANNEL;
}

// 기간제 유료 공고: 노출 종료일(payload.exposureEnd, YYYY-MM-DD)이 지나면 목록에서 내린다.
// 종료일이 없는 공고(관리자 무료 게시물 등)는 만료 대상이 아니다.
function isExposureExpired(payload = {}) {
  const end = payload.exposureEnd || payload.exposure?.end;
  if (!end) return false;
  // 종료일 '그날 자정까지' 노출: 종료일 다음 날 0시부터 만료.
  const endDate = new Date(`${String(end).slice(0, 10)}T23:59:59`);
  if (Number.isNaN(endDate.getTime())) return false;
  return endDate.getTime() < Date.now();
}

export function operationalDoctorJobs(contents = []) {
  return contents.filter((item) => item.contentType === 'doctor_job' && !isHeadhuntBoardContent(item) && !isExposureExpired(item.payload)).map((item) => {
    const p = item.payload || {};
    const region = p.region || String(p.primary || '').split(/[ ·]/)[0] || '전국';
    return { id:`admin-${item.id}`, sourceId:item.id, hospital:item.subtitle || '메디헬퍼스 등록병원', title:item.title, location:p.location || p.primary || region, region, type:p.employmentType || '정규직', dept:p.department || '전문의', pay:p.pay || p.secondary || '협의 후 결정', schedule:p.schedule || '근무일정 협의', deadline:p.deadline || '상시채용', updated:'관리자 등록', color:'#1769d4', summary:p.description || '관리자가 등록한 의사 초빙공고입니다.', benefits:p.benefits || ['근무조건 협의'], focus:p.focus || p.department || '전문의 진료', recruitmentReason:p.recruitmentReason || '의료진 충원', workHours:p.workHours || p.schedule || '협의', daysOff:p.daysOff || '협의', facilityType:p.facilityType || '의료기관', scale:p.scale || '병원 확인 필요', access:p.access || p.location || p.primary || '병원 문의', adTier:p.adTier === 'spotlight' ? 'featured' : (p.adTier || undefined), logo:p.logo || undefined, banner:p.banner || undefined, brandImageLayout:p.brandImageLayout || undefined, facility:p.facility || undefined, hospitalPhotos:Array.isArray(p.facilityPhotos) ? p.facilityPhotos : [], posterImages:Array.isArray(p.posterImages) ? p.posterImages : [], brandFit:p.banner ? 'banner' : (p.logo ? 'mark' : undefined) };
  });
}

export function operationalTalent(contents = []) {
  return contents.filter((item) => item.contentType === 'talent_profile').map((item, index) => {
    const p = item.payload || {};
    // 이력서 자동 노출 인재(fromResume)는 payload의 익명 필드를 그대로 사용. 실명은 없음.
    return {
      // 상세(연락처·이력서) 조회 키. 이력서 자동노출 인재는 'resume-<id>' 형태(서버 talent-detail가 이 키로 이력서 조회).
      detailId: item.id || p.code || '',
      // 구직글의 원본 이력서 ID. 목록·상세·마이페이지가 동일한 이력서를 가리킨다.
      linkedResumeId: p.linkedResumeId || '',
      code: p.code || `관리-${String(index + 1).padStart(3, '0')}`,
      name: p.name || '',
      fullName: item.title || p.name || '',
      identityConsent: Boolean(p.identityConsent),
      dept: p.dept || p.department || item.subtitle || '전문의',
      career: p.career || p.secondary || '경력 협의',
      region: p.region || p.primary || '전국',
      preference: p.preference || p.description || '조건 협의',
      available: p.available || '협의',
      verified: p.fromResume ? true : Boolean(p.verified),
      ownerView: Boolean(p.ownerView),
      staffType: p.staffType || 'doctor',
      profession: p.profession || '',
    };
  });
}

export function operationalMedicalJobs(contents = []) {
  return contents.filter((item) => item.contentType === 'medical_job' && !isHeadhuntBoardContent(item) && !isExposureExpired(item.payload)).map((item) => {
    const p = item.payload || {};
    const asList = (value, fallback) => Array.isArray(value)
      ? value.filter(Boolean)
      : String(value || '').split(/\r?\n|,\s*/).map((item) => item.trim()).filter(Boolean).length
        ? String(value || '').split(/\r?\n|,\s*/).map((item) => item.trim()).filter(Boolean)
        : fallback;
    return {
      id:`admin-${item.id}`,
      role:p.role || p.department || '의료인',
      title:item.title,
      hospital:item.subtitle || '메디헬퍼스 등록기관',
      logo:p.logo || undefined,
      banner:p.banner || undefined,
      facility:p.facility || undefined,
      brandFit:p.banner ? 'banner' : (p.logo ? 'mark' : undefined),
      region:p.region || p.primary || '전국',
      type:p.employmentType || '정규직',
      career:p.career || '경력무관',
      pay:p.pay || p.secondary || '협의',
      deadline:p.deadline || '상시채용',
      summary:p.summary || p.description,
      workHours:p.workHours || p.schedule,
      daysOff:p.daysOff,
      responsibilities:asList(p.responsibilities || p.duties, undefined),
      requirements:asList(p.requirements || p.qualifications, undefined),
      benefits:asList(p.benefits, undefined),
      process:asList(p.process, undefined),
      documents:asList(p.documents, undefined),
    };
  });
}
