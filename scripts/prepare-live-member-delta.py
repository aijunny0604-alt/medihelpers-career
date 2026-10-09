"""Offline preparation/rehearsal of one protected member and observed ad records.

Outputs contain private data and must stay outside Git. Never connects to a DB.
"""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import secrets
import sqlite3


def prepare(snapshot, member, ads):
    db = sqlite3.connect(':memory:')
    db.executescript(snapshot)
    assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    db.execute('PRAGMA foreign_keys=ON')
    tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
    def state():
        return {t: sorted(map(repr, db.execute('SELECT * FROM "'+t.replace('"','""')+'"'))) for t in tables}
    original = state()
    assert member['role'] == 'doctor' and member['credentialCaptured'] is False
    legacy = member['list']['legacyId']
    fields = {r[0]: r[1] for r in member['rows'] if len(r) >= 2}
    assert fields['아이디'] == legacy
    email = fields['이메일주소'].strip().lower()
    assert re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email)
    phone = fields.get('휴대전화') or fields.get('전화번호') or ''
    name = re.sub(r'\s*\([^)]*\)\s*$', '', member['list']['cells'][1]).strip()
    joined = member['list']['cells'][2]
    datetime.date.fromisoformat(joined)
    assert not db.execute('SELECT 1 FROM auth_login_aliases WHERE login_id=?', (legacy,)).fetchone()
    digest = hashlib.sha256(('rankup:doctor:'+legacy).encode()).hexdigest()
    aid, principal = 'rankup-'+digest, 'rankup:'+digest
    assert not db.execute('SELECT 1 FROM accounts WHERE id=? OR user_key=?', (aid, digest)).fetchone()
    # Unrecoverable random placeholder; user must set their own password later.
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', secrets.token_bytes(48), salt.encode(), 100000).hex()
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    batch = 'rankup-live-delta-20261009-v1'
    rows = []
    def add(table, **values):
        rows.append((table, values))
    add('accounts', id=aid, user_key=digest, role='doctor', created_at=stamp, updated_at=stamp)
    add('auth_credentials', account_id=aid, email_normalized=principal, password_hash=password_hash, password_salt=salt, password_iterations=100000, created_at=stamp, updated_at=stamp)
    add('auth_login_aliases', login_id=legacy, account_id=aid, source='rankup', created_at=stamp)
    add('account_contact_identities', account_id=aid, email=email, source='rankup', created_at=stamp)
    add('account_admin_profiles', account_id=aid, email=email, full_name=name, status='suspended', verification_status='unverified', joined_from='rankup-protected-import', admin_note='MIGRATION_HOLD: live delta; password reset and source status review required; no paid rights or consent granted.', created_at=stamp, updated_at=stamp)
    add('member_profiles', account_id=aid, display_name=name, phone=phone, updated_at=stamp)
    add('member_preferences', account_id=aid, email_notifications=0, sms_notifications=0, service_notifications=0, marketing_notifications=0, updated_at=stamp)
    add('member_registration_profiles', account_id=aid, profile_json=json.dumps({'migration': {'source': 'rankup', 'legacyId': legacy, 'importedAt': stamp, 'sourceStatus': 'unverified', 'credentialVerified': False, 'requiresPasswordReset': True, 'originalJoinedAt': joined, 'archiveBatch': batch}}, ensure_ascii=False), updated_at=stamp)
    selected = [a for a in ads['records'] if a['sourceId'] in ['285', '135', '324', '296']]
    assert len(selected) == 4 and len({a['sourceId'] for a in selected}) == 4
    for kind, key, value in [('member-delta', legacy, member)] + [('ad-service-observation', a['sourceId'], a) for a in selected]:
        payload = json.dumps({'capturedAt': ads['observedAt'] if kind.startswith('ad') else member['observedAt'], 'data': value, 'publish': False, 'activate': False}, ensure_ascii=False)
        add('legacy_migration_archive', batch_id=batch, record_kind=kind, source_key=key, payload_json=payload, sha256=hashlib.sha256(payload.encode()).hexdigest(), visibility='private', state='pending-review', captured_at=stamp)
    quote = lambda v: str(v) if isinstance(v, int) else "'"+v.replace("'", "''")+"'"
    sql = '\n'.join('INSERT INTO '+t+' ('+','.join(v)+') VALUES ('+','.join(map(quote, v.values()))+');' for t, v in rows)
    db.executescript('BEGIN;\n'+sql+'\nCOMMIT;')
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    assert db.execute('SELECT status FROM account_admin_profiles WHERE account_id=?', (aid,)).fetchone()[0] == 'suspended'
    after = state()
    changed = {t for t in tables if original[t] != after[t]}
    assert changed == {t for t, _ in rows}
    # Replaying plain INSERT must fail, never create a second account.
    try:
        db.executescript('BEGIN;\n'+sql+'\nCOMMIT;')
    except sqlite3.IntegrityError:
        db.rollback()
    else:
        raise AssertionError('Duplicate application did not fail')
    assert state() == after
    # Exact rows only: local reverse rehearsal restores every table.
    reverse = '\n'.join('DELETE FROM '+t+' WHERE '+' AND '.join(k+'='+quote(v) for k,v in vals.items())+';' for t,vals in reversed(rows))
    db.executescript('BEGIN;\n'+reverse+'\nCOMMIT;')
    assert state() == original
    return sql, reverse, {'batch': batch, 'accountId': aid, 'newProtectedMembers': 1, 'newPrivateArchiveRecords': 5, 'changedTables': sorted(changed), 'tableCount': len(tables), 'allTablesRestored': True, 'duplicateBlocked': True, 'activation': False, 'publicAds': 0, 'charges': 0, 'sourceSnapshotSha256': hashlib.sha256(snapshot.encode()).hexdigest()}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('private_directory', type=Path)
    args = parser.parse_args()
    directory = args.private_directory.resolve()
    repo = Path(__file__).resolve().parents[1]
    assert directory != repo and repo not in directory.parents
    read = lambda n: json.loads((directory/n).read_text(encoding='utf-8-sig'))
    sql, reverse, result = prepare((directory/'before-live-delta-20261009.sql').read_text(encoding='utf-8'), read('new-member-delta-20261009-private.json'), read('live-ad-services-20261009-private.json'))
    for filename, content in [('live-delta-apply.sql', sql), ('live-delta-reverse-rehearsal.sql', reverse), ('live-delta-rehearsal.json', json.dumps(result, indent=2))]:
        with (directory/filename).open('x', encoding='utf-8') as handle:
            handle.write(content+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='accountId'}))
