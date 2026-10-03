"""Validate an offline D1 SQL export, including upload BLOBs; never restore remotely."""
import argparse, hashlib, json, pathlib, sqlite3, sys

def verify(source):
    source=pathlib.Path(source)
    if not 0 < source.stat().st_size <= 512*1024*1024:
        raise ValueError('BACKUP_SIZE_INVALID')
    raw=source.read_bytes()
    db=sqlite3.connect(':memory:')
    def authorize(action, first, second, *_):
        if action in (sqlite3.SQLITE_ATTACH,sqlite3.SQLITE_DETACH): return sqlite3.SQLITE_DENY
        if action==sqlite3.SQLITE_FUNCTION and str(second).lower() in ('load_extension','readfile','writefile'): return sqlite3.SQLITE_DENY
        if action==sqlite3.SQLITE_PRAGMA and str(first).lower() in ('writable_schema','temp_store_directory','data_store_directory'): return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK
    try:
        db.set_authorizer(authorize)
        db.executescript(raw.decode('utf-8-sig'))
        if db.execute('PRAGMA integrity_check').fetchall()!=[('ok',)]: raise ValueError('DATABASE_INTEGRITY_FAILED')
        if db.execute('PRAGMA foreign_key_check').fetchall(): raise ValueError('FOREIGN_KEY_ERRORS')
        tables=[r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")]
        if not tables: raise ValueError('NO_TABLES')
        quote=lambda n:'"'+n.replace('"','""')+'"'
        counts={n:db.execute('SELECT count(*) FROM '+quote(n)).fetchone()[0] for n in tables}
        files=0;total=0
        if ('upload_objects' in tables)!=('upload_chunks' in tables): raise ValueError('UPLOAD_SCHEMA_INCOMPLETE')
        if 'upload_objects' in tables:
            for key,size,expected,metadata in db.execute('SELECT object_key,size,sha256,metadata_json FROM upload_objects'):
                if not isinstance(size,int) or not 1<=size<=10485760: raise ValueError('FILE_SIZE_INVALID')
                parsed=json.loads(metadata)
                if not isinstance(parsed,dict) or len(metadata.encode('utf-8'))>4096: raise ValueError('FILE_METADATA_INVALID')
                digest=hashlib.sha256();offset=0;number=0
                for index,body in db.execute('SELECT chunk_index,body FROM upload_chunks WHERE object_key=? ORDER BY chunk_index',(key,)):
                    if index!=number or not isinstance(body,bytes) or len(body)!=min(1048576,size-offset): raise ValueError('FILE_CHUNKS_INVALID')
                    digest.update(body);offset+=len(body);number+=1
                if offset!=size or digest.hexdigest()!=expected: raise ValueError('FILE_HASH_MISMATCH')
                files+=1;total+=size
            if db.execute('SELECT 1 FROM upload_chunks c LEFT JOIN upload_objects o ON o.object_key=c.object_key WHERE o.object_key IS NULL LIMIT 1').fetchone(): raise ValueError('ORPHAN_CHUNKS')
        return {'format':'medihelpers-backup-verification-v1','sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'integrity':'ok','foreignKeyErrors':0,'tableCounts':counts,'fileCount':files,'fileBytes':total,'fileHashesVerified':True,'remoteWrites':False}
    finally:
        db.close()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=pathlib.Path);parser.add_argument('manifest',type=pathlib.Path)
    args=parser.parse_args()
    if args.manifest.exists() or args.source.resolve()==args.manifest.resolve(): raise ValueError('OUTPUT_ALREADY_EXISTS')
    result=verify(args.source)
    with args.manifest.open('x',encoding='utf-8') as out: json.dump(result,out,ensure_ascii=False,indent=2)
    print(json.dumps({'verified':True,'tables':len(result['tableCounts']),'files':result['fileCount'],'bytes':result['bytes'],'sha256':result['sha256']}))

if __name__=='__main__':
    try: main()
    except Exception as exc:
        # Do not expose SQL values or paths from a failed backup in console logs.
        print('Backup verification failed: '+(str(exc) if isinstance(exc,ValueError) and str(exc).isupper() else type(exc).__name__),file=sys.stderr)
        sys.exit(1)
