import hashlib, importlib.util, pathlib, sqlite3, tempfile, unittest, subprocess, sys
spec=importlib.util.spec_from_file_location('backup_verify',pathlib.Path(__file__).with_name('verify-d1-backup.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class BackupValidation(unittest.TestCase):
 def check_sql(self,sql):
  with tempfile.TemporaryDirectory() as tmp:
   source=pathlib.Path(tmp)/'backup.sql';source.write_text(sql,encoding='utf-8');return module.verify(source)
 def fixture(self,mode='valid'):
  db=sqlite3.connect(':memory:');db.executescript('CREATE TABLE upload_objects(object_key TEXT PRIMARY KEY,size INTEGER,sha256 TEXT,metadata_json TEXT); CREATE TABLE upload_chunks(object_key TEXT REFERENCES upload_objects(object_key),chunk_index INTEGER,body BLOB);')
  body=b'x'*(1048576+1);db.execute('INSERT INTO upload_objects VALUES(?,?,?,?)',('profiles/example/a.png',len(body),hashlib.sha256(body).hexdigest(),'{}'))
  db.execute('INSERT INTO upload_chunks VALUES(?,?,?)',('profiles/example/a.png',0,body[:1048576]))
  if mode!='missing': db.execute('INSERT INTO upload_chunks VALUES(?,?,?)',('profiles/example/a.png',1,b'z' if mode=='corrupt' else body[1048576:]))
  if mode=='orphan': db.execute('INSERT INTO upload_chunks VALUES(?,?,?)',('profiles/example/b.png',0,b'x'))
  if mode=='invalid_metadata': db.execute("UPDATE upload_objects SET metadata_json='[]'")
  if mode=='extra': db.execute('INSERT INTO upload_chunks VALUES(?,?,?)',('profiles/example/a.png',2,b'x'))
  return '\n'.join(db.iterdump())
 def test_multichunk_export(self):
  result=self.check_sql(self.fixture());self.assertEqual(result['fileCount'],1);self.assertEqual(result['fileBytes'],1048577)
 def test_missing_chunk(self):
  with self.assertRaises(ValueError): self.check_sql(self.fixture('missing'))
 def test_changed_bytes(self):
  with self.assertRaises(ValueError): self.check_sql(self.fixture('corrupt'))
 def test_orphan_foreign_key(self):
  with self.assertRaises(ValueError): self.check_sql(self.fixture('orphan'))
 def test_metadata_type(self):
  with self.assertRaises(ValueError): self.check_sql(self.fixture('invalid_metadata'))
 def test_extra_chunk(self):
  with self.assertRaises(ValueError): self.check_sql(self.fixture('extra'))
 def test_empty_schema(self):
  with self.assertRaises(ValueError): self.check_sql('SELECT 1;')
 def test_incomplete_upload_schema(self):
  with self.assertRaises(ValueError): self.check_sql('CREATE TABLE upload_objects(id TEXT);')
 def test_external_database_denied(self):
  with self.assertRaises(sqlite3.DatabaseError): self.check_sql("ATTACH DATABASE ':memory:' AS external;")
 def test_writable_schema_denied(self):
  with self.assertRaises(sqlite3.DatabaseError): self.check_sql('PRAGMA writable_schema=ON;')
 def test_cli_keeps_existing_manifest(self):
  with tempfile.TemporaryDirectory() as tmp:
   source=pathlib.Path(tmp)/'backup.sql';target=pathlib.Path(tmp)/'manifest.json';source.write_text('CREATE TABLE t(id INTEGER);');target.write_text('KEEP')
   result=subprocess.run([sys.executable,spec.origin,str(source),str(target)],capture_output=True);self.assertNotEqual(result.returncode,0);self.assertEqual(target.read_text(),'KEEP')
 def test_failed_cli_does_not_emit_success_manifest(self):
  with tempfile.TemporaryDirectory() as tmp:
   source=pathlib.Path(tmp)/'backup.sql';target=pathlib.Path(tmp)/'manifest.json';source.write_text('not a backup')
   result=subprocess.run([sys.executable,spec.origin,str(source),str(target)],capture_output=True);self.assertNotEqual(result.returncode,0);self.assertFalse(target.exists())
if __name__=='__main__': unittest.main()
