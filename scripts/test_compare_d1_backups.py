import importlib.util
import json
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('snapshot_diff', pathlib.Path(__file__).with_name('compare-d1-backups.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SnapshotTests(unittest.TestCase):
    def compare(self, a, b):
        with tempfile.TemporaryDirectory() as folder:
            left, right = pathlib.Path(folder)/'a.sql', pathlib.Path(folder)/'b.sql'
            left.write_text(a, encoding='utf-8'); right.write_text(b, encoding='utf-8')
            return module.compare(left, right)

    def test_order_is_not_change(self):
        ddl = 'CREATE TABLE t(id INTEGER PRIMARY KEY,v TEXT);'
        r = self.compare(ddl+"INSERT INTO t VALUES(1,'a'),(2,'b');", ddl+"INSERT INTO t VALUES(2,'b'),(1,'a');")
        self.assertTrue(r['identical'])

    def test_insert_update_delete_without_values(self):
        ddl = 'CREATE TABLE t(id INTEGER PRIMARY KEY,v TEXT);'
        r = self.compare(ddl+"INSERT INTO t VALUES(1,'PRIVATE_OLD'),(2,'x');", ddl+"INSERT INTO t VALUES(1,'PRIVATE_NEW'),(3,'y');")
        self.assertEqual([r['tables']['t'][k] for k in ('added','removed','modified')], [1,1,1])
        self.assertNotIn('PRIVATE', json.dumps(r))

    def test_composite_key(self):
        ddl = 'CREATE TABLE t(a TEXT,b INTEGER,v BLOB,PRIMARY KEY(a,b));'
        r = self.compare(ddl+"INSERT INTO t VALUES('a',1,X'01');", ddl+"INSERT INTO t VALUES('a',1,X'02');")
        self.assertEqual(r['tables']['t']['modified'],1)

    def test_duplicate_rows_without_key(self):
        ddl = 'CREATE TABLE t(v TEXT);'
        r = self.compare(ddl+"INSERT INTO t VALUES('a'),('a');", ddl+"INSERT INTO t VALUES('a');")
        self.assertEqual(r['tables']['t']['removed'],1)
        self.assertIsNone(r['tables']['t']['modified'])

    def test_schema_change_is_not_identical(self):
        r = self.compare('CREATE TABLE t(id INTEGER PRIMARY KEY);', 'CREATE TABLE t(id INTEGER PRIMARY KEY,v TEXT);')
        self.assertFalse(r['schemaEqual']); self.assertFalse(r['identical'])

    def test_null_primary_key_rejected(self):
        ddl = 'CREATE TABLE t(id TEXT PRIMARY KEY);INSERT INTO t VALUES(NULL);'
        with self.assertRaisesRegex(ValueError,'AMBIGUOUS_PRIMARY_KEY'):
            self.compare(ddl,ddl)

    def test_external_attach_denied(self):
        with self.assertRaises(Exception):
            self.compare("ATTACH ':memory:' AS external;CREATE TABLE t(id);", 'CREATE TABLE t(id);')


if __name__ == '__main__':
    unittest.main()
