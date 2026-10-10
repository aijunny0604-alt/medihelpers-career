import unittest, tempfile, pathlib, subprocess, sys, sqlite3
SCRIPT=pathlib.Path(__file__).with_name('prepare-d1-restore.py')
class RestorePreparation(unittest.TestCase):
 def run_case(self, sql, existing=False):
  with tempfile.TemporaryDirectory() as tmp:
   source=pathlib.Path(tmp)/'source.sql';out=pathlib.Path(tmp)/'out.sql';source.write_text(sql,encoding='utf-8')
   if existing: out.write_text('KEEP',encoding='utf-8')
   run=subprocess.run([sys.executable,str(SCRIPT),str(source),str(out)],capture_output=True,text=True)
   return run.returncode,out.read_text(encoding='utf-8') if out.exists() else None
 def test_child_before_parent_and_quoted_text(self):
  sql="CREATE TABLE child(id INTEGER PRIMARY KEY,p INTEGER REFERENCES parent(id),text TEXT);\nINSERT INTO child VALUES(2,1,'semi; and ''quote''');\nCREATE TABLE parent(id INTEGER PRIMARY KEY);\nINSERT INTO parent VALUES(1);\n"
  code,out=self.run_case(sql);self.assertEqual(code,0);self.assertLess(out.index('INSERT INTO parent'),out.index('INSERT INTO child'))
  db=sqlite3.connect(':memory:');db.execute('PRAGMA foreign_keys=ON');db.executescript(out);self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(),[])
 def test_cycle_fails_without_output(self):
  self.assertNotEqual(self.run_case('CREATE TABLE a(id INTEGER PRIMARY KEY,b INTEGER REFERENCES b(id));\nCREATE TABLE b(id INTEGER PRIMARY KEY,a INTEGER REFERENCES a(id));\n')[0],0)
 def test_missing_parent_fails_without_output(self):
  code,out=self.run_case('CREATE TABLE p(id INTEGER PRIMARY KEY);\nCREATE TABLE c(p INTEGER REFERENCES p(id));\nINSERT INTO c VALUES(99);\n');self.assertNotEqual(code,0);self.assertIsNone(out)
 def test_oversized_blob_is_not_emitted(self):
  code,out=self.run_case("CREATE TABLE t(b BLOB);\nINSERT INTO t VALUES(X'"+'ab'*60000+"');\n");self.assertNotEqual(code,0);self.assertIsNone(out)
 def test_existing_output_preserved(self):
  code,out=self.run_case('CREATE TABLE t(id INTEGER);\n',True);self.assertNotEqual(code,0);self.assertEqual(out,'KEEP')
 def test_physical_file_preserves_mixed_newlines_in_schema_and_values(self):
  sql="CREATE TABLE t(\r\nid INTEGER PRIMARY KEY,\nvalue TEXT);\r\nINSERT INTO t VALUES(1,'line1\r\nline2\nline3');\n"
  with tempfile.TemporaryDirectory() as tmp:
   source=pathlib.Path(tmp)/'source.sql';out=pathlib.Path(tmp)/'out.sql'
   source.write_bytes(b'\xef\xbb\xbf'+sql.encode('utf-8'))
   run=subprocess.run([sys.executable,str(SCRIPT),str(source),str(out)],capture_output=True,text=True)
   self.assertEqual(run.returncode,0,run.stderr)
   restored=out.read_bytes().decode('utf-8')
   before=sqlite3.connect(':memory:');after=sqlite3.connect(':memory:')
   try:
    before.executescript(sql);after.executescript(restored)
    self.assertEqual(before.execute('SELECT * FROM t').fetchall(),after.execute('SELECT * FROM t').fetchall())
    self.assertEqual(before.execute('SELECT type,name,sql FROM sqlite_master').fetchall(),after.execute('SELECT type,name,sql FROM sqlite_master').fetchall())
    self.assertEqual(after.execute('SELECT value FROM t').fetchone()[0],'line1\r\nline2\nline3')
   finally: before.close();after.close()
if __name__=='__main__': unittest.main()
