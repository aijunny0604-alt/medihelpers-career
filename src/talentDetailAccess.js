// Only static, explicitly labelled examples may use bundled résumé content.
// Real member details always come from the server's entitlement response.
export function demoTalentDetail(person) {
  if (person?.isDemo !== true) return null;
  return {
    specialty: person.dept,
    desiredRegions: person.region,
    detail: {
      introduction: person.introduction || '', skills: person.skills || '',
      licenseName: person.licenseName || '', experienceYears: person.career || '',
      school: person.school || '', major: person.major || '', graduation: person.graduation || '',
      careers: (Array.isArray(person.careers) ? person.careers : []).filter(Boolean).map(({ institution, department, position, start, end, current, duties }) => ({ institution, department, position, start, end, current, duties })),
    },
  };
}

export const pendingTalentAccess = { loading: true, unlocked: false, detail: null };

export async function loadTalentAccess(url, request = fetch, signal) {
  const locked = { loading: false, unlocked: false, detail: null };
  try {
    const response = await request(url, { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }, signal });
    const body = await response.json();
    if (response.status === 404) return { ...locked, unavailable: true };
    if (response.status === 429) return { ...locked, limited: true, message: body?.message || '금일 열람 한도를 초과했습니다. 잠시 후 다시 이용해주세요.' };
    if (response.status === 401 || response.status === 403) return { ...locked, error: true, message: '로그인 상태와 회원 권한을 다시 확인해주세요.' };
    if (!response.ok || !body || typeof body.unlocked !== 'boolean' || (body.unlocked && (!body.detail || typeof body.detail !== 'object'))) throw new Error('INVALID_TALENT_RESPONSE');
    return { ...locked, unlocked: body.unlocked, detail: body.unlocked ? body.detail : null, accessReason: body.accessReason || '', contactProtected: Boolean(body.contactProtected) };
  } catch {
    return { ...locked, error: true, message: '이력서를 불러오지 못했습니다. 다시 시도해주세요. 열람한 인재는 중복 차감되지 않습니다.' };
  }
}
