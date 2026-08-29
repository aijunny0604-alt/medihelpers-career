import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('헤드헌팅 공고 문의와 병원 유료광고 직접 지원을 서로 다른 대상으로 라우팅한다', async () => {
  const main = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const requestPage = await readFile(new URL('./HeadHunterRequestPage.jsx', import.meta.url), 'utf8');
  const memberCenter = await readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8');
  const server = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');

  assert.match(main, /request\/job-seeker\?headhuntPost=/);
  assert.match(main, /이 공고 헤드헌터에게 문의/);
  assert.match(main, /이 병원에 직접 지원/);
  assert.match(requestPage, /isHeadhuntPostInquiry/);
  assert.match(requestPage, /isDirectApplication/);
  assert.match(requestPage, /헤드헌터 미개입/);
  assert.match(requestPage, /병원 채용담당자에게 전하실 말씀/);
  assert.match(requestPage, /해당 병원의 채용 지원 확인 목적으로만 사용/);
  assert.match(server, /payload\.submissionChannel = payload\.headhuntPostId \? 'headhunt_board' : payload\.jobId \? 'paid_job_direct'/);
  assert.match(server, /payload\.submissionChannel !== 'paid_job_direct'/);
  assert.match(server, /directJobRow\.ownerRole !== 'hospital'/);
  assert.match(server, /실제 수신 병원이 없는 유실 접수를 허용하지 않는다/);
  assert.match(server, /WHERE json_extract\(payload_json,'\$\.jobId'\) IS NULL/);
  assert.match(server, /JOIN admin_content_records c ON c\.id = replace\(json_extract\(cr\.payload_json,'\$\.jobId'\),'admin-',''\)/);
  assert.match(memberCenter, /병원 유료광고 직접 지원/);
  assert.match(memberCenter, /맞춤 헤드헌팅 공고 문의/);
});
