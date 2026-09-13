import test from 'node:test';
import assert from 'node:assert/strict';
import { submittedResumeFields, submittedResumePhoto } from './submittedResume.js';

test('지원서 연락처와 제출 이력서 전체 내용을 빠짐없이 보존한다', () => {
  const snapshot = { title:'제출본', name:'합성 의료인', phone:'01000000000', email:'resume@example.invalid', profession:'의사', specialty:'내과', desiredRegions:'서울', detail:{region:'부산',salary:'협의',introduction:'경력 첫 줄\n둘째 줄',photoUrl:'/api/uploads/profiles/account/resume-photo/a.png'} };
  const rows = Object.fromEntries(submittedResumeFields(snapshot, {phone:'01011111111',email:'apply@example.invalid'}));
  assert.equal(Object.keys(rows).length,12);
  assert.equal(rows['지원 연락처'],'01011111111');
  assert.equal(rows['이력서 전화번호'],'01000000000');
  assert.equal(rows['경력·자기소개'],'경력 첫 줄\n둘째 줄');
  assert.equal(submittedResumePhoto(snapshot),snapshot.detail.photoUrl);
});

test('제출 사진은 권한 검사되는 같은 출처 경로만 사용한다', () => {
  for (const photoUrl of ['https://example.invalid/tracking.png','javascript:alert(1)','/api/uploads/profiles/../private.png']) assert.equal(submittedResumePhoto({detail:{photoUrl}}),'');
  assert.deepEqual(submittedResumeFields({detail:{introduction:{unknown:true}}}),[]);
});
