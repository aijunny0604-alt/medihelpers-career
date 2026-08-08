import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HEADHUNT_BOARD_CHANNEL,
  isHeadhuntBoardContent,
  operationalDoctorJobs,
  operationalMedicalJobs,
  operationalTalent,
} from './siteOperations.js';

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

test('업로드한 병원 로고·배너·시설 사진 URL이 공개 공고 카드 데이터로 전달된다', () => {
  const withAssets = [
    { id:'a1', contentType:'doctor_job', title:'로고 공고', subtitle:'A병원', payload:{ department:'내과', logo:'/api/uploads/hospitals/x/logo/1.png' } },
    { id:'a2', contentType:'doctor_job', title:'배너 공고', subtitle:'B병원', payload:{ department:'내과', banner:'/api/uploads/hospitals/x/banner/2.png' } },
    { id:'m2', contentType:'medical_job', title:'간호사 로고', subtitle:'C병원', payload:{ role:'간호사', logo:'/api/uploads/hospitals/x/logo/3.png', facility:'/api/uploads/hospitals/x/facility/4.png' } },
  ];
  const [logoJob, bannerJob] = operationalDoctorJobs(withAssets);
  // 로고만 있으면 brandFit=mark, 배너가 있으면 banner
  assert.equal(logoJob.logo, '/api/uploads/hospitals/x/logo/1.png');
  assert.equal(logoJob.brandFit, 'mark');
  assert.equal(bannerJob.banner, '/api/uploads/hospitals/x/banner/2.png');
  assert.equal(bannerJob.brandFit, 'banner');
  const [medical] = operationalMedicalJobs(withAssets);
  assert.equal(medical.logo, '/api/uploads/hospitals/x/logo/3.png');
  assert.equal(medical.facility, '/api/uploads/hospitals/x/facility/4.png');
});

test('자산이 없는 공고는 로고·배너 필드가 undefined 로 남는다(브랜드 표식 없음)', () => {
  const [job] = operationalDoctorJobs([{ id:'p', contentType:'doctor_job', title:'무자산', subtitle:'D병원', payload:{ department:'내과' } }]);
  assert.equal(job.logo, undefined);
  assert.equal(job.banner, undefined);
  assert.equal(job.brandFit, undefined);
});

test('paid recruitment ads and headhunting board content stay separated', () => {
  const paidJob = { id:'paid', contentType:'doctor_job', title:'Paid hospital ad', payload:{} };
  const headhuntDoctor = { id:'hd', contentType:'doctor_job', title:'Doctor headhunt', payload:{ publicationChannel: HEADHUNT_BOARD_CHANNEL } };
  const headhuntMedical = { id:'hm', contentType:'medical_job', title:'Medical headhunt', payload:{ publicationChannel: HEADHUNT_BOARD_CHANNEL } };

  assert.equal(isHeadhuntBoardContent(paidJob), false);
  assert.equal(isHeadhuntBoardContent(headhuntDoctor), true);
  assert.equal(isHeadhuntBoardContent(headhuntMedical), true);
  assert.deepEqual(operationalDoctorJobs([paidJob, headhuntDoctor]).map((item) => item.sourceId), ['paid']);
  assert.equal(operationalMedicalJobs([headhuntMedical]).length, 0);
});
