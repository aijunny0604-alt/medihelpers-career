import React from 'react';
import { PRIVACY_SCOPES } from './privacyConsent.js';
import { withBase } from './basePath.js';

export default function PrivacyNotice({ scope, recipient }) {
  const notice = PRIVACY_SCOPES[scope];
  return <div className="privacy-form-notice">
    <strong>{notice.title}</strong>
    <dl>
      {recipient && <div><dt>제공받는 곳</dt><dd>{recipient}</dd></div>}
      <div><dt>목적</dt><dd>{notice.purpose}</dd></div>
      <div><dt>항목</dt><dd>{notice.items}</dd></div>
      <div><dt>보유기간</dt><dd><b>{notice.retention}</b></dd></div>
    </dl>
    <p>{notice.refusal}</p>
    {['resume','consultation','application'].includes(scope) && <p>주민등록번호, 환자 정보와 건강정보 등 채용에 불필요한 민감정보는 입력하거나 첨부하지 마세요.</p>}
    <a href={withBase('/privacy')} target="_blank" rel="noreferrer">개인정보처리방침 보기</a>
  </div>;
}
