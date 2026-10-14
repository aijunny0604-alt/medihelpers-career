"""Compare two trusted D1 SQL exports offline; report counts, never row values.

This is an inventory for reconciliation, not a Rankup importer or restore tool.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import sqlite3


def load_snapshot(path):
    raw = Path(path).read_bytes()
    db = sqlite3.connect(':memory:')
    # A SQL export must not attach/open other databases while being inspected.
    def authorize(action, arg1, arg2, database, trigger):
        if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH):
            return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK
    db.set_authorizer(authorize)
    try:
        db.executescript(raw.decode('utf-8-sig'))
        if db.execute('PRAGMA integrity_check').fetchone() != ('ok',):
            raise ValueError('Snapshot integrity check failed')
        if db.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Snapshot contains foreign key violations')
        return db, hashlib.sha256(raw).hexdigest()
    except Exception:
        db.close()
        raise


def compare(before, after):
    def schema(db):
        return {(r[0], r[1]): r[2] for r in db.execute(
            "SELECT type,name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'")}
    old_schema, new_schema = schema(before), schema(after)
    schema_changes = [{'type': k[0], 'name': k[1]} for k in sorted(old_schema.keys() | new_schema.keys())
                      if old_schema.get(k) != new_schema.get(k)]
    names = sorted({k[1] for k in old_schema.keys() | new_schema.keys() if k[0] == 'table'})
    tables = []
    for name in names:
        quoted = '"' + name.replace('"', '""') + '"'
        old_exists, new_exists = ('table', name) in old_schema, ('table', name) in new_schema
        a = before.execute('SELECT * FROM ' + quoted).fetchall() if old_exists else []
        b = after.execute('SELECT * FROM ' + quoted).fetchall() if new_exists else []
        info_a = before.execute('PRAGMA table_info(' + quoted + ')').fetchall() if old_exists else []
        info_b = after.execute('PRAGMA table_info(' + quoted + ')').fetchall() if new_exists else []
        compatible = old_exists and new_exists and info_a == info_b
        pk = [r[0] for r in sorted(info_a, key=lambda r: r[5]) if r[5]] if compatible else []
        keys_a = [tuple(r[i] for i in pk) for r in a]
        keys_b = [tuple(r[i] for i in pk) for r in b]
        unique = (pk and len(set(keys_a)) == len(a) and len(set(keys_b)) == len(b)
                  and all(all(v is not None for v in key) for key in keys_a + keys_b))
        if unique:
            am, bm = dict(zip(keys_a, a)), dict(zip(keys_b, b))
            updated = [k for k in am.keys() & bm.keys() if am[k] != bm[k]]
            fields = sorted({info_a[i][1] for k in updated for i in range(len(info_a)) if am[k][i] != bm[k][i]})
            row = {'table': name, 'mode': 'primary-key', 'inserted': len(bm.keys() - am.keys()),
                   'deleted': len(am.keys() - bm.keys()), 'updated': len(updated), 'changedColumns': fields}
        else:
            ac, bc = Counter(a), Counter(b)
            row = {'table': name, 'mode': 'row-multiset', 'inserted': sum((bc-ac).values()),
                   'deleted': sum((ac-bc).values()), 'updated': None,
                   'note': 'Updates cannot be distinguished from delete+insert without a compatible unique non-null primary key.'}
        row.update(beforeRows=len(a), afterRows=len(b))
        tables.append(row)
    changed = [r for r in tables if r['inserted'] or r['deleted'] or r['updated']]
    return {'scope': 'Offline export comparison only; no remote writes or Rankup reverse import.',
            'schemaChanges': schema_changes, 'tablesCompared': len(tables), 'changedTables': changed,
            'requiresReconciliation': bool(schema_changes or changed),
            'rollbackApproved': False, 'rowValuesIncluded': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before')
    parser.add_argument('after')
    args = parser.parse_args()
    first, hash_a = load_snapshot(args.before)
    try:
        second, hash_b = load_snapshot(args.after)
        try:
            result = compare(first, second)
            result.update(beforeSHA256=hash_a, afterSHA256=hash_b)
            print(json.dumps(result, ensure_ascii=False, indent=2))
        finally:
            second.close()
    finally:
        first.close()


if __name__ == '__main__':
    main()
