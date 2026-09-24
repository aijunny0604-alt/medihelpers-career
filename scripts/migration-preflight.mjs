import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { validateMigration } from './lib/migration-preflight.mjs';
try {
  const [file, ...extra] = process.argv.slice(2);
  if (!file || extra.length) throw new Error('usage');
  const raw = await readFile(file);
  const report = validateMigration(JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')));
  console.log(JSON.stringify({ ...report, inputSha256: createHash('sha256').update(raw).digest('hex') }, null, 2));
  if (report.blockers) process.exitCode = 2;
} catch {
  console.error('검증할 UTF-8 JSON 파일 한 개가 필요합니다. 원본 SQL은 실행하지 않으며, 랭크업 스키마 확인 후 정규화해야 합니다.');
  process.exitCode = 1;
}
