// Render only the immutable submission returned by the authorized member API.
export function submittedResumeFields(snapshot = {}, contact = {}) {
  const detail = snapshot?.detail || {};
  return [
    ['지원 연락처', contact.phone], ['지원 이메일', contact.email],
    ['이력서 제목', snapshot.title], ['이름', snapshot.name || contact.name],
    ['직군', snapshot.profession], ['전문분야', snapshot.specialty],
    ['이력서 전화번호', snapshot.phone], ['이력서 이메일', snapshot.email],
    ['희망 지역', snapshot.desiredRegions], ['현재 지역', detail.region],
    ['희망 보수', detail.salary], ['경력·자기소개', detail.introduction],
  ].filter(([, value]) => typeof value === 'string' && value.trim()).map(([label, value]) => [label, value.trim()]);
}

export function submittedResumePhoto(snapshot = {}) {
  const url = snapshot?.detail?.photoUrl;
  return typeof url === 'string' && /^\/api\/uploads\/profiles\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|gif)$/.test(url) ? url : '';
}
