import { withBase } from './basePath.js';

const unknownResult = message => Object.assign(new Error(message), { code: 'SUBMISSION_RESULT_UNKNOWN' });

// 쓰기 요청은 응답을 잃어도 서버에서 처리됐을 수 있으므로 자동 재전송하지 않는다.
async function requestWorkflow(path, body, validate, unknownMessage, { timeoutMs = 30000, fetchImpl = fetch } = {}, method = 'POST') {
  const controller = new AbortController();
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(unknownResult(unknownMessage));
      controller.abort();
    }, timeoutMs);
  });
  const request = (async () => {
    let response, result;
    try {
      response = await fetchImpl(withBase(path), {
        method, credentials: 'same-origin', signal: controller.signal,
        headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      result = await response.json();
    } catch { throw unknownResult(unknownMessage); }
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw unknownResult(unknownMessage);
    if (!response.ok) throw new Error(typeof result.error === 'string' && result.error ? result.error : '요청을 처리하지 못했습니다. 입력 내용을 확인해주세요.');
    if (!validate(result)) throw unknownResult(unknownMessage);
    return result;
  })();
  try { return await Promise.race([request, deadline]); }
  finally { clearTimeout(timer); }
}

export function requestAccountRecovery(body, options) {
  const resetting = body.action === 'reset_password';
  const message = resetting
    ? '비밀번호 변경 결과를 확인하지 못했습니다. 로그인 화면에서 새 비밀번호로 변경 여부를 확인해주세요. 입력 내용은 유지됩니다.'
    : '이메일 안내 요청의 처리 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 메일함과 스팸함을 먼저 확인한 뒤 다시 요청해주세요.';
  return requestWorkflow('/api/account-recovery', body,
    result => resetting ? result.reset === true : result.accepted === true,
    message, options);
}

export function requestMemberRefund(orderNumber, reason, options) {
  return requestWorkflow('/api/member-center', { action: 'refund_request', orderNumber, reason },
    result => result.requested === true && typeof result.refundId === 'string' &&
      /^[A-Za-z0-9_-]{1,128}$/.test(result.refundId) && result.orderNumber === orderNumber,
    '환불 요청의 접수 결과를 확인하지 못했습니다. 입력한 사유는 유지됩니다. 중복 요청 전에 결제 내역을 새로고침해 접수 여부를 확인해주세요.', options);
}

export { loadMemberPaymentDetails } from './memberReadApi.js';

const validRecordId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const objectValue = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function saveMemberPreferences(body, options) {
  return requestWorkflow('/api/member-center', body,
    result => result.saved === true && objectValue(result.profile) &&
      ['displayName','phone','organization','jobTitle'].every(key => typeof result.profile[key] === 'string') &&
      objectValue(result.notifications) && ['email','sms','service','marketing'].every(key => typeof result.notifications[key] === 'boolean'),
    '회원정보·알림 설정의 저장 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 다시 저장하기 전에 새로고침으로 반영 여부를 확인해주세요.', options, 'PATCH');
}

export function markMemberNotificationsRead(notificationId, all = false, options) {
  return requestWorkflow('/api/member-center', all ? { action:'notifications_read_all' } : { action:'notification_read', notificationId },
    result => result.updated === true,
    '알림 읽음 상태의 저장 결과를 확인하지 못했습니다. 알림을 새로고침한 뒤 다시 확인해주세요.', options);
}

export function setMemberPostVisibility(id, status, privacyVersion, options) {
  return requestWorkflow(`/api/job-seeker-posts/${encodeURIComponent(id)}`,
    { action:'set_visibility', status, privacyVersion, publicationAcknowledged:true },
    result => result.saved === true && result.post?.id === id && result.post?.status === status,
    '구직글 공개 상태의 변경 결과를 확인하지 못했습니다. 기존 목록은 유지됩니다. 새로고침으로 반영 여부를 확인해주세요.', options, 'PATCH');
}

export function deleteMemberPost(id, options) {
  return requestWorkflow(`/api/job-seeker-posts/${encodeURIComponent(id)}`, undefined,
    result => result.deleted === true && result.id === id,
    '구직글 삭제 결과를 확인하지 못했습니다. 기존 목록은 유지됩니다. 새로고침으로 삭제 여부를 확인해주세요.', options, 'DELETE');
}

export function createApplicationResume(body, options) {
  return requestWorkflow('/api/resumes', body,
    result => result.saved === true && validRecordId(result.id),
    '지원용 이력서 저장 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 중복 등록 전에 내 이력서에서 저장 여부를 확인해주세요.', options);
}

export function submitMemberConsultation(body, options) {
  return requestWorkflow('/api/consultations', body,
    result => result.saved === true && validRecordId(result.id),
    '상담·지원 접수 결과를 확인하지 못했습니다. 입력 내용은 유지됩니다. 중복 접수 전에 마이페이지 상담 내역을 확인해주세요.', options);
}
