import test from 'node:test';
import assert from 'node:assert/strict';
import { operationalDoctorJobs, operationalMedicalJobs, operationalTalent } from './siteOperations.js';

const records = [
  { id:'j1', contentType:'doctor_job', title:'정형외과 전문의 초빙', subtitle:'테스트병원', payload:{ department:'정형외과', region:'부산', pay:'월 1,500만원', deadline:'2026.08.31' } },
  { id:'m1', contentType:'medical_job', title:'MRI 방사선사 채용', subtitle:'영상센터', payload:{ role:'방사선사', region:'경기', career:'3년 이상' } },
  { id:'t1', contentType:'talent_profile', title:'김의사', subtitle:'내과', payload:{ department:'내과', region:'서울', career:'전문의 8년' } },
];

test('관리자 공개 콘텐츠를 실제 목록 데이터 형식으로 변환한다', () => {
  const [job] = operationalDoctorJobs(records);
  const [medical] = operationalMedicalJobs(records);
  const [person] = operationalTalent(records);
  assert.equal(job.id, 'admin-j1');
  assert.equal(job.dept, '정형외과');
  assert.equal(medical.role, '방사선사');
  assert.equal(person.dept, '내과');
});

test('콘텐츠 유형이 다른 레코드는 각 공개 목록에 섞이지 않는다', () => {
  assert.equal(operationalDoctorJobs(records).length, 1);
  assert.equal(operationalMedicalJobs(records).length, 1);
  assert.equal(operationalTalent(records).length, 1);
});
