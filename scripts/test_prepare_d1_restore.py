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
if __name__=='__main__': unittest.main()
