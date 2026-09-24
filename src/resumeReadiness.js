export function resumePublicationMissing(resume = {}) {
  const detail = resume.detail || {};
  const missing = [];
  if (!String(resume.profession || '').trim()) missing.push('의료 직군');
  if (!String(resume.specialty || '').trim()) missing.push('전문분야·주요 업무');
  if (!String(resume.desiredRegions || '').trim()) missing.push('희망 근무지역');
  if (!String(detail.introduction || '').trim() || String(detail.introduction).trim().length < 30) missing.push('경력·자기소개 30자 이상 (신입은 신입 여부와 역량)');
  return missing;
}
