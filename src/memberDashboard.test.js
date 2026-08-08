import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('마이페이지 활동 요약 위젯은 역할별 상세 화면으로 이동한다', async () => {
  const source = await readFile(new URL('./MemberCenterPage.jsx', import.meta.url), 'utf8');

  assert.match(source, /className="member-metric-card"/);
  assert.match(source, /onClick=\{\(\) => openMetricDetail\(label\)\}/);
  assert.match(source, /aria-label=\{`\$\{label\} \$\{value\} 상세보기`\}/);
  assert.match(source, /추천 후보.*member-recommended-candidates/s);
  assert.match(source, /관심 공고.*member-saved-jobs/s);
  assert.match(source, /추천 후보 상세/);
});
