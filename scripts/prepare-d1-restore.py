import sqlite3, pathlib, json, re, argparse
if not __debug__: raise SystemExit('Run without Python -O: verification must remain enabled.')
parser=argparse.ArgumentParser(description='Reorder a trusted D1 export for restoration into an EMPTY isolated database. No network access.')
parser.add_argument('source',type=pathlib.Path)
parser.add_argument('output',type=pathlib.Path)
args=parser.parse_args()
if args.output.exists(): raise SystemExit('Output already exists; use a new path.')
# Text-mode newline conversion changes SQL string literals and schema text on Windows.
source=args.source.read_bytes().decode('utf-8-sig')
statements=[]; pending=''
for line in source.splitlines(keepends=True):
 pending+=line
 if sqlite3.complete_statement(pending): statements.append(pending.strip()); pending=''
assert not pending.strip()
tables=[]; data=[]; other=[]
for s in statements:
 if re.match(r'CREATE TABLE\b',s,re.I): tables.append(s)
 elif re.match(r'INSERT INTO\b',s,re.I): data.append(s)
 elif re.match(r'CREATE (UNIQUE )?(INDEX|TRIGGER)\b',s,re.I): other.append(s)
 elif re.fullmatch(r'ANALYZE sqlite_schema;',s,re.I): tables.append(s)
 elif re.fullmatch(r'DELETE FROM sqlite_sequence;',s,re.I): data.append(s)
 elif not re.fullmatch(r'PRAGMA defer_foreign_keys\s*=\s*(TRUE|FALSE|ON|OFF);',s,re.I): raise ValueError('Unexpected statement type: '+s.split()[0])
if not tables: raise SystemExit('No tables found in backup.')
if any(len(s.encode('utf-8'))>100000 for s in statements): raise SystemExit('Oversized SQL statement: restore upload BLOBs through prepared bindings, not raw SQL. No output written.')
inspect=sqlite3.connect(':memory:');inspect.executescript(source)
names=[r[0] for r in inspect.execute("SELECT name FROM sqlite_master WHERE type='table'")]
deps={n:{r[2] for r in inspect.execute('PRAGMA foreign_key_list("'+n.replace('"','""')+'")') if r[2]!=n} for n in names}
ordered=[]
while deps:
 ready=sorted(n for n,d in deps.items() if not (d & deps.keys()))
 assert ready,'Foreign key cycle needs explicit restore plan'
 ordered.extend(ready)
 for n in ready: del deps[n]
def priority(s):
 if s.startswith('DELETE FROM sqlite_sequence'): return len(ordered)+1
 match=re.match(r'INSERT INTO\s+["`]?([A-Za-z0-9_]+)',s,re.I);assert match
 name=match.group(1)
 return len(ordered)+2 if name=='sqlite_sequence' else ordered.index(name)
data.sort(key=priority)
result='PRAGMA defer_foreign_keys=TRUE;\n'+'\n'.join(tables+data+other)+'\nPRAGMA defer_foreign_keys=FALSE;\n'
# Validate exact data/schema equivalence locally without exposing row values.
def load(text):
 db=sqlite3.connect(':memory:');db.executescript(text);assert db.execute('PRAGMA integrity_check').fetchone()==('ok',);assert db.execute('PRAGMA foreign_key_check').fetchall()==[];return db
a=load(source);b=load(result)
names=[r[0] for r in a.execute("SELECT name FROM sqlite_master WHERE type='table'")]
for name in names:
 quoted='"'+name.replace('"','""')+'"'
 assert sorted(a.execute('SELECT * FROM '+quoted).fetchall(),key=repr)==sorted(b.execute('SELECT * FROM '+quoted).fetchall(),key=repr)
assert sorted(a.execute('SELECT type,name,sql FROM sqlite_master').fetchall(),key=repr)==sorted(b.execute('SELECT type,name,sql FROM sqlite_master').fetchall(),key=repr)
with args.output.open('xb') as out: out.write(result.encode('utf-8'))
print(json.dumps({'tables':sum(bool(re.match(r'CREATE TABLE\b',s,re.I)) for s in tables),'dataStatements':len(data),'indexesAndTriggers':len(other),'exactDataAndSchema':True}))
