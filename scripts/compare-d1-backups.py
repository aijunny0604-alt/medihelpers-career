"""Compare two local D1 snapshots without exposing row values or changing a remote DB."""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
import pathlib
import sqlite3
import sys

spec = importlib.util.spec_from_file_location('backup_verify', pathlib.Path(__file__).with_name('verify-d1-backup.py'))
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


def quote(name):
    return '"' + name.replace('"', '""') + '"'


def load(source):
    manifest = verifier.verify(source)
    raw = pathlib.Path(source).read_bytes()
    if hashlib.sha256(raw).hexdigest() != manifest['sha256']:
        raise ValueError('SOURCE_CHANGED_DURING_READ')
    db = sqlite3.connect(':memory:')
    def authorize(action, first, second, *_):
        if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH):
            return sqlite3.SQLITE_DENY
        if action == sqlite3.SQLITE_FUNCTION and str(second).lower() in ('load_extension', 'readfile', 'writefile'):
            return sqlite3.SQLITE_DENY
        if action == sqlite3.SQLITE_PRAGMA and str(first).lower() in ('writable_schema', 'temp_store_directory', 'data_store_directory'):
            return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK
    db.set_authorizer(authorize)
    try:
        db.executescript(raw.decode('utf-8-sig'))
        db.execute('PRAGMA query_only=ON')
        return db, manifest
    except Exception:
        db.close()
        raise


def fingerprint(row):
    # Keep SQLite types distinct and hash file bytes without writing them to the report.
    values = [(type(v).__name__, v.hex() if isinstance(v, bytes) else v) for v in row]
    return hashlib.sha256(json.dumps(values, ensure_ascii=True, separators=(',', ':')).encode()).digest()


def compare(before, after):
    old, left = load(before)
    try:
        new, right = load(after)
        try:
            schema = lambda db: db.execute("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name").fetchall()
            schema_equal = schema(old) == schema(new)
            report = {'format': 'medihelpers-snapshot-diff-v1', 'beforeSha256': left['sha256'], 'afterSha256': right['sha256'],
                      'schemaEqual': schema_equal, 'tables': {}, 'remoteWrites': False,
                      'limitations': 'Snapshot endpoints only: intermediate changes, PG state and Rankup reverse import are not verified.'}
            for name in sorted(set(left['tableCounts']) | set(right['tableCounts'])):
                result = {'before': left['tableCounts'].get(name, 0), 'after': right['tableCounts'].get(name, 0)}
                report['tables'][name] = result
                if name not in left['tableCounts'] or name not in right['tableCounts']:
                    result['comparison'] = 'schema-change'
                    continue
                cols = old.execute('PRAGMA table_info(' + quote(name) + ')').fetchall()
                if cols != new.execute('PRAGMA table_info(' + quote(name) + ')').fetchall():
                    result['comparison'] = 'schema-change'
                    continue
                rows_old = old.execute('SELECT * FROM ' + quote(name)).fetchall()
                rows_new = new.execute('SELECT * FROM ' + quote(name)).fetchall()
                pk = [r[0] for r in sorted(cols, key=lambda r: r[5]) if r[5]]
                def index(rows):
                    keyed = {}
                    for row in rows:
                        key = tuple(row[i] for i in pk)
                        if None in key or key in keyed:
                            raise ValueError('AMBIGUOUS_PRIMARY_KEY')
                        keyed[key] = fingerprint(row)
                    return keyed
                if pk:
                    a, b = index(rows_old), index(rows_new)
                    result.update(comparison='primary-key', added=len(b.keys()-a.keys()), removed=len(a.keys()-b.keys()),
                                  modified=sum(a[k] != b[k] for k in a.keys() & b.keys()),
                                  unchanged=sum(a[k] == b[k] for k in a.keys() & b.keys()))
                else:
                    a, b = Counter(map(fingerprint, rows_old)), Counter(map(fingerprint, rows_new))
                    result.update(comparison='multiset-no-primary-key', added=sum((b-a).values()), removed=sum((a-b).values()),
                                  modified=None, unchanged=sum((a & b).values()))
            report['identical'] = schema_equal and all(r.get('added') == 0 and r.get('removed') == 0 and r.get('modified') in (0, None) for r in report['tables'].values())
            return report
        finally:
            new.close()
    finally:
        old.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=pathlib.Path)
    parser.add_argument('after', type=pathlib.Path)
    parser.add_argument('report', type=pathlib.Path)
    args = parser.parse_args()
    if args.report.exists() or args.report.resolve() in (args.before.resolve(), args.after.resolve()):
        raise ValueError('OUTPUT_ALREADY_EXISTS')
    result = compare(args.before, args.after)
    with args.report.open('x', encoding='utf-8') as out:
        json.dump(result, out, ensure_ascii=False, indent=2)
    print(json.dumps({'compared': True, 'schemaEqual': result['schemaEqual'], 'identical': result['identical'], 'tables': len(result['tables'])}))
    return 0 if result['schemaEqual'] else 2


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as exc:
        print('Snapshot comparison failed: ' + (str(exc) if isinstance(exc, ValueError) and str(exc).isupper() else type(exc).__name__), file=sys.stderr)
        sys.exit(1)
