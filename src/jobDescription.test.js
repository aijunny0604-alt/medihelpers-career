import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJobDescription, jobTextSegments } from './jobDescription.js';
import { operationalDoctorJobs, operationalMedicalJobs } from './siteOperations.js';

const sample = '시험 공고\n\nhttp://www.jk-withme.com/\n\t병원명\t\t시험 병원\t\t대표자\t\t시험 대표\n사원수\t30명\n\n전경 사진\n내부\n내부\n모집직종\t의사직＞전문의사\n근무지역\t인천 연수구\n담당업무\t\n모집인원\t명\n근무형태\t정규직\n급여사항\t2200~2400만원\n자격요건\n성별\t무관\t나이\t무관\n학력\t무관\t경력\t무관\n\n\n접수기간\t채용시까지\n접수방법\t이메일, 온라인접수\n담당자\t시험 담당자\n연락처\t010-0000-0000\n이메일\thr@example.invalid\n홈페이지\thttp://www.jk-withme.com/\n병원주소\t[21998] 인천 연수구 시험 주소';

test('기존 공고 표의 네 영역과 한 줄의 복수 항목을 유지한다', () => {
  const parsed = parseJobDescription(sample, {title:'시험 공고'});
  assert.equal(parsed.structured, true);
  assert.deepEqual(parsed.blocks.map(b=>b.title), ['병원·기관 정보','모집·근무조건','자격요건','접수·문의']);
  assert.equal(parsed.facts['대표자'], '시험 대표');
  assert.deepEqual(parsed.blocks[2].rows.map(r=>r.label), ['성별','나이','학력','경력']);
  assert.equal(parsed.blocks[1].rows.find(r=>r.label==='담당업무').value, '공고에 미기재');
  assert.equal(parsed.blocks[1].rows.find(r=>r.label==='모집인원').value, '공고에 미기재');
  assert.equal(parsed.facts['급여사항'], '2200~2400만원');
});

test('빈 줄과 사진 캡션만 정리하고 자유 본문과 급여 차이를 삭제하지 않는다', () => {
  const source = sample.replace('접수기간', '추가 안내\n\n- 급여는 NET 2300만원입니다.\n- 연차는 별도 안내합니다.\n\n접수기간');
  const parsed = parseJobDescription(source);
  const text = parsed.blocks.filter(b=>b.type==='paragraph').map(b=>b.text).join('\n');
  assert.match(text, /NET 2300만원/);
  assert.match(text, /연차는 별도/);
  assert.equal(parsed.facts['급여사항'], '2200~2400만원');
  assert.doesNotMatch(text, /전경 사진|내부|\n{3}/);
  assert.equal(parseJobDescription('내부\n\n\n일반 안내').blocks[0].text, '내부');
});

test('일반 공고는 문단과 줄바꿈을 보존하고 미지의 문구를 버리지 않는다', () => {
  const text = '소개 문단\n둘째 줄\r\n\r\n\r\n■ 담당 안내\n진료 외 상담도 진행합니다.';
  const parsed = parseJobDescription(text);
  assert.equal(parsed.structured, false);
  assert.deepEqual(parsed.blocks.map(b=>b.text), ['소개 문단\n둘째 줄','■ 담당 안내\n진료 외 상담도 진행합니다.']);
});

test('공백으로 붙여넣은 자격 항목과 콜론을 구분한다', () => {
  const p=parseJobDescription('모집직종: 의사\n성별 무관 나이 무관\n학력 무관 경력 무관');
  assert.equal(p.facts['성별'],'무관'); assert.equal(p.facts['나이'],'무관');
  assert.equal(p.facts['학력'],'무관'); assert.equal(p.facts['경력'],'무관');
});

test('홈페이지·이메일·전화번호를 안전한 링크로 바꾼다', () => {
  const parts=jobTextSegments('http://www.jk-withme.com/ hr@example.invalid 010-0000-0000 02-123-4567 1588-0000');
  assert.deepEqual(parts.filter(p=>p.href).map(p=>p.href),['http://www.jk-withme.com/','mailto:hr@example.invalid','tel:01000000000','tel:021234567','tel:15880000']);
  assert.equal(jobTextSegments('hospital.example/path',{website:true})[0].href,'https://hospital.example/path');
  assert.equal(jobTextSegments('www.hospital.example')[0].href,'https://www.hospital.example/');
  assert.equal(jobTextSegments('070-0000-0000',{phone:false}).some(p=>p.href),false);
});

test('URL 뒤 구두점은 링크 밖에 두고 URL 내부 괄호와 쿼리는 보존한다', () => {
  const text='참조 (https://example.com/a(b)?x=1&y=2). 다음 https://example.com/jobs,';
  const parts=jobTextSegments(text);
  assert.equal(parts.map(p=>p.text).join(''),text);
  assert.deepEqual(parts.filter(p=>p.href).map(p=>p.href),['https://example.com/a(b)?x=1&y=2','https://example.com/jobs']);
});

test('위험한 스킴·자격증명 URL·HTML·날짜·사업자번호를 실행 링크로 만들지 않는다', () => {
  for(const value of ['javascript:alert(1)','data:text/html,test','file:///C:/test','https://user:pass@example.com','2026-10-19','123-45-67890','<script>alert(1)</script>']) {
    const parts=jobTextSegments(value,{website:true});
    assert.equal(parts.some(p=>p.href),false,value);
    assert.equal(parts.map(p=>p.text).join(''),value);
  }
});

test('기존 공고의 누락된 기관 정보는 본문에서 보완하고 원본 값이 우선한다', () => {
  const record={id:'fixture',contentType:'doctor_job',title:'시험 공고',payload:{description:sample}};
  const [job]=operationalDoctorJobs([record]);
  assert.equal(job.website,'http://www.jk-withme.com/');
  assert.equal(job.staffCount,'30명'); assert.equal(job.deadline,'채용시까지');
  assert.match(job.fullAddress,/21998/);
  assert.equal(job.summary,sample);
  const [explicit]=operationalDoctorJobs([{...record,payload:{...record.payload,website:'https://other.example',staffCount:'31명'}}]);
  assert.equal(explicit.website,'https://other.example'); assert.equal(explicit.staffCount,'31명');
  const [locked]=operationalDoctorJobs([{...record,payload:{...record.payload,locked:true}}]);
  assert.equal(locked.website,''); assert.equal(locked.fullAddress,'');
  assert.equal(operationalMedicalJobs([{...record,contentType:'medical_job'}])[0].deadline,'채용시까지');
});
