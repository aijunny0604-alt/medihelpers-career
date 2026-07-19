import { useEffect, useState } from 'react';

export const defaultSiteOperations = {
  settings: { siteName:'메디헬퍼스', supportPhone:'051-342-5463', supportEmail:'hr@medihelpers.co.kr', announcement:'' },
  features: { doctorRecruitment:true, talentSearch:true, resumeRegistration:true, medicalStaffHub:true, paidCareerService:false, adRegistration:true },
  contents: [],
};

let cached = defaultSiteOperations;
let pending;

function loadOperations() {
  if (!pending) pending = fetch('/api/site-operations', { headers:{ accept:'application/json' }, credentials:'same-origin' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('site operations unavailable')))
    .then((value) => { cached = { ...defaultSiteOperations, ...value, settings:{ ...defaultSiteOperations.settings, ...(value.settings || {}) }, features:{ ...defaultSiteOperations.features, ...(value.features || {}) } }; return cached; })
    .catch(() => cached);
  return pending;
}

export function useSiteOperations() {
  const [operations, setOperations] = useState(cached);
  useEffect(() => { let active = true; loadOperations().then((value) => active && setOperations(value)); return () => { active = false; }; }, []);
  return operations;
}

export function operationalDoctorJobs(contents = []) {
  return contents.filter((item) => item.contentType === 'doctor_job').map((item) => {
    const p = item.payload || {};
    const region = p.region || String(p.primary || '').split(/[ ·]/)[0] || '전국';
    return { id:`admin-${item.id}`, sourceId:item.id, hospital:item.subtitle || '메디헬퍼스 등록병원', title:item.title, location:p.location || p.primary || region, region, type:p.employmentType || '정규직', dept:p.department || '전문의', pay:p.pay || p.secondary || '협의 후 결정', schedule:p.schedule || '근무일정 협의', deadline:p.deadline || '상시채용', updated:'관리자 등록', color:'#1769d4', summary:p.description || '관리자가 등록한 의사 초빙공고입니다.', benefits:p.benefits || ['근무조건 협의'], focus:p.focus || p.department || '전문의 진료', recruitmentReason:p.recruitmentReason || '의료진 충원', workHours:p.workHours || p.schedule || '협의', daysOff:p.daysOff || '협의', facilityType:p.facilityType || '의료기관', scale:p.scale || '병원 확인 필요', access:p.access || p.location || p.primary || '병원 문의', adTier:p.adTier || undefined };
  });
}

export function operationalTalent(contents = []) {
  return contents.filter((item) => item.contentType === 'talent_profile').map((item, index) => {
    const p = item.payload || {};
    // 이력서 자동 노출 인재(fromResume)는 payload의 익명 필드를 그대로 사용. 실명은 없음.
    return {
      // 상세(연락처·이력서) 조회 키. 이력서 자동노출 인재는 'resume-<id>' 형태(서버 talent-detail가 이 키로 이력서 조회).
      detailId: item.id || p.code || '',
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
      staffType: p.staffType || 'doctor',
      profession: p.profession || '',
    };
  });
}

export function operationalMedicalJobs(contents = []) {
  return contents.filter((item) => item.contentType === 'medical_job').map((item) => {
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
