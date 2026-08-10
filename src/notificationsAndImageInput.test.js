import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('모든 이미지 입력 화면은 선택·드래그앤드롭·클립보드 붙여넣기를 함께 지원한다', async () => {
  const [generic, resume, checkout, helper] = await Promise.all([
    read('./ImageUpload.jsx'), read('./ResumePage.jsx'), read('./main.jsx'), read('./imageInput.js')
  ]);
  assert.match(helper, /imageFilesFromTransfer/);
  assert.match(helper, /event\.clipboardData/);
  assert.match(helper, /event\.dataTransfer/);
  assert.match(generic, /dropImageFiles/);
  assert.match(generic, /pasteImageFiles/);
  assert.match(generic, /클릭·드래그·붙여넣기/);
  assert.match(resume, /onDrop=.*dropImageFiles/);
  assert.match(resume, /onPaste=.*pasteImageFiles/);
  assert.match(checkout, /onPaste: \(event\) => pasteImageFiles/);
  assert.match(checkout, /imageFilesFromTransfer\(event\.dataTransfer\)/);
});

test('이력서 작성과 관리 버튼은 제출 선택기 헤더에 함께 배치한다', async () => {
  const picker = await read('./ResumeSubmitPicker.jsx');
  assert.match(picker, /className="resume-picker-actions"[\s\S]*새 이력서 작성[\s\S]*내 이력서 관리/);
  assert.match(picker, /\/resume\?new=1/);
  assert.match(picker, /\/mypage\?tab=resume/);
});

test('병원 직접 지원은 상담·병원 활동·읽지 않은 알림을 한 배치로 저장한다', async () => {
  const [server, schema, migration] = await Promise.all([
    read('../scripts/package-sites.mjs'), read('../db/schema.js'), read('../drizzle/0007_member_notifications.sql')
  ]);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS member_notifications/);
  assert.match(migration, /member_notifications_account_idx/);
  assert.match(server, /env\.DB\.batch\(\[\s*consultationInsert,[\s\S]*'job_application'[\s\S]*INSERT INTO member_notifications/);
  assert.match(server, /notificationsOnly/);
  assert.match(server, /notification_read/);
  assert.match(server, /notifications_read_all/);
});

test('병원과 지원 의료인은 지원 건에서 상대방에게 영구 알림 메시지를 보낸다', async () => {
  const [server, memberCenter, main, schema, migration] = await Promise.all([
    read('../scripts/package-sites.mjs'), read('./MemberCenterPage.jsx'), read('./main.jsx'),
    read('../db/schema.js'), read('../drizzle/0009_inquiry_messages.sql')
  ]);
  assert.match(server, /body\.action === 'inquiry_reply'/);
  assert.match(server, /'inquiry_reply'/);
  assert.match(server, /recipient\.recipientId/);
  assert.match(server, /INSERT INTO inquiry_messages/);
  assert.match(server, /messagesByConsultation/);
  assert.match(server, /const isReadableInquiryMessage/);
  assert.match(server, /if \(!isReadableInquiryMessage\(messageRow\.body\)\) continue/);
  assert.match(server, /alert\.kind !== 'inquiry_reply' \|\| !isReadableInquiryMessage\(alert\.body\)/);
  assert.match(server, /legacy-.*alert\.id/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS inquiry_messages/);
  assert.match(migration, /inquiry_messages_consultation_idx/);
  assert.match(memberCenter, /메시지·알림 보내기/);
  assert.match(memberCenter, /className="inquiry-message-thread"/);
  assert.match(memberCenter, /MESSAGE HISTORY/);
  assert.match(memberCenter, /payload\.message.*setThread/s);
  assert.match(memberCenter, /className="member-nav-badge"/);
  assert.match(memberCenter, /className="member-unread-banner"/);
  assert.match(main, /className="header-notifications"/);
  assert.match(main, /medihelpers:notifications-changed/);
});
