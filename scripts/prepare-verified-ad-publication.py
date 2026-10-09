"""Prepare a guarded staging publication of the four reviewed legacy public ads.

Only uses private input snapshots and evidence. Does not make network requests.
"""
import datetime
import hashlib
import json
from pathlib import Path
import sqlite3
import sys

root = Path(sys.argv[1]).resolve()
repo = Path(__file__).resolve().parents[1]
assert root != repo and repo not in root.parents, 'Private output required'
read = lambda n: json.loads((root/n).read_text(encoding='utf-8-sig'))
evidence = read('four-public-ad-source-review-20261009.json')
assert datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(evidence['observedAt']) < datetime.timedelta(hours=1)
records = {r['id']: r for r in evidence['records']}
ids = {'rankup-job-285', 'rankup-job-135', 'rankup-job-324', 'rankup-job-296'}
assert set(records) == ids
db = sqlite3.connect(':memory:')
snapshot = (root/'before-four-ad-publication.sql').read_text(encoding='utf-8')
db.executescript(snapshot)
assert not db.execute('PRAGMA foreign_key_check').fetchall()
quote = lambda value: 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"
stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
sql, reverse, changed = [], [], []
for ident in sorted(ids):
    proof = records[ident]
    assert proof['status'] == 200 and proof['titlePresent'] and proof['payPresent'] and proof['unmatchedLines'] == 0 and proof['descriptionLines'] > 0
    row = db.execute('SELECT status,visibility,payload_json,published_at,updated_at FROM admin_content_records WHERE id=?', (ident,)).fetchone()
    assert row and row[:2] == ('draft', 'admin')
    payload = json.loads(row[2])
    assert payload['migration']['ownerMapping']['accountId']
    assert payload['adTier'] == 'featured' and payload['logo'].startswith('/legacy-media/')
    assert ident != 'rankup-job-324' or payload['exposureEnd'] == '2027-01-17'
    payload['migration']['publicationReview'] = {'observedAt': evidence['observedAt'], 'publicSourceSha256': proof['sha256'], 'scope': 'staging-public-ad', 'newCharge': False}
    new = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
    guard = "INSERT INTO accounts(id,user_key,role) SELECT NULL,NULL,'doctor' WHERE changes()<>1;"
    sql.append("UPDATE admin_content_records SET status='published',visibility='public',payload_json="+quote(new)+',published_at='+quote(stamp)+',updated_at='+quote(stamp)+' WHERE id='+quote(ident)+" AND status='draft' AND visibility='admin' AND payload_json="+quote(row[2])+' AND updated_at IS '+quote(row[4])+';\n'+guard)
    reverse.append("UPDATE admin_content_records SET status='draft',visibility='admin',payload_json="+quote(row[2])+',published_at='+quote(row[3])+',updated_at='+quote(row[4])+' WHERE id='+quote(ident)+" AND status='published' AND visibility='public' AND payload_json="+quote(new)+' AND updated_at='+quote(stamp)+';\n'+guard)
    changed.append(ident)
tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
state = lambda: {t: sorted(map(repr, db.execute('SELECT * FROM "'+t+'"'))) for t in tables}
before = state()
apply_sql, reverse_sql = '\n'.join(sql), '\n'.join(reversed(reverse))
db.executescript('BEGIN;'+apply_sql+'COMMIT;')
assert db.execute("SELECT count(*) FROM admin_content_records WHERE status='published' AND visibility='public' AND id LIKE 'rankup-job-%'").fetchone()[0] == 4
db.executescript('BEGIN;'+reverse_sql+'COMMIT;')
assert state() == before
db.execute("UPDATE admin_content_records SET updated_at='concurrent edit' WHERE id=?", (changed[-1],))
db.commit()
conflict = state()
try:
    db.executescript('BEGIN;'+apply_sql+'COMMIT;')
except sqlite3.IntegrityError:
    db.rollback()
else:
    raise AssertionError('Stale publication was not blocked')
assert state() == conflict
result = {'records': changed, 'tablesChecked': len(tables), 'rollbackVerified': True, 'conflictAtomicAbortVerified': True, 'sourceSnapshotSha256': hashlib.sha256(snapshot.encode()).hexdigest(), 'remoteWrites': False}
for name, content in [('four-ad-publication.sql', apply_sql), ('four-ad-publication-reverse.sql', reverse_sql), ('four-ad-publication-plan.json', json.dumps(result, indent=2))]:
    with (root/name).open('x', encoding='utf-8') as output:
        output.write(content+'\n')
print(json.dumps(result))
