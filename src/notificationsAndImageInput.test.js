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

test('이력서 작성과 선택 관리 버튼은 크게 배치하고 관리는 현재 화면의 모달에서 처리한다', async () => {
  const picker = await read('./ResumeSubmitPicker.jsx');
  const styles = await read('./styles.css');
  assert.match(picker, /className="resume-picker-actions"[\s\S]*새 이력서 작성[\s\S]*이력서 선택·관리/);
  assert.match(picker, /\/resume\?new=1/);
  assert.doesNotMatch(picker, /\/mypage\?tab=resume/);
  assert.match(picker, /role="dialog" aria-modal="true"/);
  assert.match(picker, /페이지를 벗어나지 않고 사용할 이력서를 바로 바꿀 수 있습니다/);
  assert.match(styles, /\.resume-picker-actions a,\.resume-picker-actions button\{min-width:190px;min-height:52px/);
  assert.match(styles, /\.resume-manager-overlay\{position:fixed/);
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

test('병원과 지원 의료인 간 직접 메시지는 차단하고 과거 원장만 보존한다', async () => {
  const [server, memberCenter, main, schema, migration] = await Promise.all([
    read('../scripts/package-sites.mjs'), read('./MemberCenterPage.jsx'), read('./main.jsx'),
    read('../db/schema.js'), read('../drizzle/0009_inquiry_messages.sql')
  ]);
  assert.match(server, /body\.action === 'inquiry_reply'[\s\S]*직접 메시지 기능은 종료되었습니다[\s\S]*410/);
  assert.doesNotMatch(server, /INSERT INTO inquiry_messages/);
  assert.doesNotMatch(server, /messagesByConsultation/);
  assert.match(server, /kind<>'inquiry_reply'/);
  assert.match(server, /event_type NOT IN \('inquiry_reply','inquiry_reply_sent'\)/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS inquiry_messages/);
  assert.match(migration, /inquiry_messages_consultation_idx/);
  assert.doesNotMatch(memberCenter, /메시지·알림 보내기/);
  assert.doesNotMatch(memberCenter, /className="inquiry-message-thread"/);
  assert.doesNotMatch(memberCenter, /MESSAGE HISTORY/);
  assert.doesNotMatch(memberCenter, /action:'inquiry_reply'/);
  assert.match(memberCenter, /className="member-nav-badge"/);
  assert.match(memberCenter, /className="member-unread-banner"/);
  assert.match(main, /className="header-notifications"/);
  assert.match(main, /medihelpers:notifications-changed/);
});
