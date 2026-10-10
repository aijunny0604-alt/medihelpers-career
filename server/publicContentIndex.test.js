import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { adminConsoleSchemaStatements, publicContentIndexStatement } from '../db/schema.js';

test('existing content table gains an idempotent ordered publication index without changing rows', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const sql of adminConsoleSchemaStatements) db.exec(sql);
    db.exec('ALTER TABLE admin_content_records ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0');
    const insert = db.prepare("INSERT INTO admin_content_records(id,content_type,title,status,sort_order,published_at,updated_at) VALUES (?,'doctor_job','fixture',?,?,?,?)");
    for (let i=0;i<2000;i++) insert.run(String(i), i%100===0?'published':'draft', i%7, `2026-09-${String(1+i%28).padStart(2,'0')}`, String(i));
    const sql = "SELECT id,payload_json FROM admin_content_records WHERE status='published' ORDER BY sort_order DESC,published_at DESC,updated_at DESC LIMIT 500";
    const before = db.prepare(sql).all();
    const allRows = db.prepare('SELECT * FROM admin_content_records ORDER BY id').all();
    const planBefore = db.prepare('EXPLAIN QUERY PLAN '+sql).all().map(r=>r.detail).join(' ');
    assert.match(planBefore, /SCAN admin_content_records/);
    db.exec(publicContentIndexStatement); db.exec(publicContentIndexStatement);
    const planAfter = db.prepare('EXPLAIN QUERY PLAN '+sql).all().map(r=>r.detail).join(' ');
    assert.match(planAfter, /SEARCH admin_content_records USING INDEX admin_content_records_public_order_idx/);
    assert.doesNotMatch(planAfter, /TEMP B-TREE/);
    assert.deepEqual(db.prepare(sql).all(), before);
    assert.deepEqual(db.prepare('SELECT * FROM admin_content_records ORDER BY id').all(), allRows);
    assert.equal(before.length,20);
  } finally { db.close(); }
});
