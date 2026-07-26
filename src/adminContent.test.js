import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adminConsoleSchemaStatements } from '../db/schema.js';

const schema = adminConsoleSchemaStatements.join('\n');

test('관리자 콘텐츠는 공고·의료인 공고·인재·공지 유형을 지원한다', () => {
  assert.match(schema, /admin_content_records/);
  for (const type of ['doctor_job', 'medical_job', 'talent_profile', 'notice']) {
    assert.match(schema, new RegExp(type));
  }
});

test('관리자 콘텐츠 공개 상태와 열람 권한을 DB 제약으로 고정한다', () => {
  for (const status of ['draft', 'published', 'hidden', 'closed']) {
    assert.match(schema, new RegExp(status));
  }
  for (const visibility of ['public', 'doctor', 'hospital', 'admin']) {
    assert.match(schema, new RegExp(visibility));
  }
});

test('관리자 콘텐츠는 작성자·수정자·게시 시각을 추적한다', () => {
  assert.match(schema, /created_by/);
  assert.match(schema, /updated_by/);
  assert.match(schema, /published_at/);
  assert.match(schema, /admin_content_records_type_idx/);
});

test('병원 광고 주문은 관리자 검수용 공고와 같은 트랜잭션으로 연결된다', async () => {
  const source = await readFile(new URL('../scripts/package-sites.mjs', import.meta.url), 'utf8');
  assert.match(source, /function adOrderContentRecord/);
  assert.match(source, /contentRecordId/);
  assert.match(source, /insertAdOrderContentStatement/);
  assert.match(source, /syncAdOrderContentRecords/);
  assert.match(source, /fromHospital:true/);
});

test('관리자 콘텐츠와 공개 초빙 게시판의 관리 버튼은 전용 열에서 한 줄로 표시된다', async () => {
  const source = await readFile(new URL('./main.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  assert.ok(source.includes("headhunt-board-table ${isAdmin ? 'admin-manage' : ''}"));
  assert.match(source, /\{isAdmin && <span>관리<\/span>\}/);
  assert.match(styles, /145px 310px/);
  assert.match(styles, /\.content-actions\{display:grid!important;grid-template-columns:repeat\(3,minmax\(58px,1fr\)\)/);
  assert.match(styles, /\.content-actions button\{[^}]*white-space:nowrap/);
  assert.match(styles, /\.headhunt-board-table\.admin-manage[^}]*150px/);
  assert.match(styles, /grid-template-areas:'title title' 'author date' 'actions actions'/);
});
