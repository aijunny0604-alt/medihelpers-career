import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
const resume = readFileSync(new URL('./ResumePage.jsx', import.meta.url), 'utf8');
const medicalStaff = readFileSync(new URL('./MedicalStaffPage.jsx', import.meta.url), 'utf8');
const operations = readFileSync(new URL('./siteOperations.js', import.meta.url), 'utf8');
const server = readFileSync(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
const schema = readFileSync(new URL('../db/schema.js', import.meta.url), 'utf8');

test('가입 시 역할별 기본정보를 본인 계정에 저장하고 공용 계정 응답으로 돌려준다', () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS member_registration_profiles/);
  assert.match(server, /INSERT INTO member_registration_profiles/);
  assert.match(server, /registrationProfile:registrationProfile \|\| null/);
  assert.match(server, /hospitalProfile:hospitalProfile \|\| null/);
  assert.doesNotMatch(server.slice(server.indexOf('async function accountApi'), server.indexOf('async function memberCenterApi')), /documentKey/);
});

test('병원 공고 등록은 가입·승인 정보를 폼과 서버 양쪽에서 연결한다', () => {
  const checkout = main.slice(main.indexOf('function Checkout'), main.indexOf('function TalentUnlockCheckout'));
  assert.match(checkout, /defaultValue=\{accountProfile\.hospitalName\}/);
  assert.match(checkout, /defaultValue=\{accountProfile\.representativeName\}/);
  assert.match(checkout, /defaultValue=\{accountProfile\.businessNumber\}/);
  assert.match(checkout, /defaultValue=\{accountProfile\.address\}/);
  assert.match(server, /metadata\.accountProfileLinked = true/);
  assert.match(server, /metadata\.hospital \|\|= hospital\.hospitalName/);
});

test('의료인 이력서는 가입 정보로 빈 칸을 채우고 저장된 이력서를 우선한다', () => {
  assert.match(resume, /export default function ResumePage\(\{ auth \}\)/);
  assert.match(resume, /name: current\.name \|\| accountProfile\.name/);
  assert.match(resume, /profession: current\.profession \|\| accountProfile\.professionType/);
  assert.match(resume, /specialty: current\.specialty \|\| accountProfile\.specialty/);
  assert.match(resume, /desiredRegions: current\.desiredRegions \|\| accountProfile\.region/);
  assert.match(server, /const profession = s\(body\.profession \|\| registrationProfile\?\.professionType/);
});

test('구직글은 별도 복사본 없이 공개 이력서 ID와 연결된다', () => {
  assert.match(medicalStaff, /\/resume\?staff=1&publish=1/);
  assert.match(resume, /publishAsJobSeeker \? 'public'/);
  assert.match(server, /linkedResumeId: r\.id/);
  assert.match(operations, /linkedResumeId: p\.linkedResumeId \|\| ''/);
});
