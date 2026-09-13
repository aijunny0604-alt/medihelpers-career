import React from 'react';
import { withBase } from './basePath.js';
import { submittedResumeFields, submittedResumePhoto } from './submittedResume.js';

export default function SubmittedResume({ snapshot, contact }) {
  const fields = submittedResumeFields(snapshot, contact);
  const photo = submittedResumePhoto(snapshot);
  if (!fields.length) return null;
  return <section className="inquiry-detail-section" aria-label="제출된 이력서와 연락처">
    <small>SUBMITTED RESUME</small><h3>제출된 이력서와 연락처</h3>
    <p>지원 당시 제출된 내용입니다. 이후 개인 이력서를 수정해도 이 제출본은 유지됩니다.</p>
    {photo && <img src={withBase(photo)} alt="제출 이력서 프로필 사진" style={{width:112,height:144,objectFit:'cover',borderRadius:12,margin:'20px 0'}} />}
    <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{value}</dd></div>)}</dl>
  </section>;
}
