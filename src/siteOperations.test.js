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

const isoDay = (offsetDays) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

test('노출 종료일(exposureEnd)이 지난 기간제 공고는 목록에서 자동으로 제외된다', () => {
  const timed = [
    { id:'live', contentType:'doctor_job', title:'노출 중', subtitle:'A병원', payload:{ exposureEnd: isoDay(3) } },
    { id:'expired', contentType:'doctor_job', title:'만료됨', subtitle:'B병원', payload:{ exposureEnd: isoDay(-1) } },
    { id:'forever', contentType:'doctor_job', title:'무기한', subtitle:'C병원', payload:{} },
    { id:'medlive', contentType:'medical_job', title:'간호사', subtitle:'D병원', payload:{ role:'간호사', exposureEnd: isoDay(5) } },
    { id:'medexp', contentType:'medical_job', title:'만료 간호사', subtitle:'E병원', payload:{ role:'간호사', exposureEnd: isoDay(-2) } },
  ];
  const doctorIds = operationalDoctorJobs(timed).map((j) => j.sourceId);
  assert.deepEqual(doctorIds.sort(), ['forever', 'live']);
  const medicalTitles = operationalMedicalJobs(timed).map((j) => j.title);
  assert.deepEqual(medicalTitles, ['간호사']);
});

test('노출 종료일 당일에는 아직 노출된다(그날 자정까지)', () => {
  const today = [{ id:'today', contentType:'doctor_job', title:'오늘까지', subtitle:'F병원', payload:{ exposureEnd: isoDay(0) } }];
  assert.equal(operationalDoctorJobs(today).length, 1);
});
