import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('delta', Path(__file__).with_name('rollback-delta-report.py'))
delta = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delta)


class DeltaTests(unittest.TestCase):
    def db(self, sql):
        db = sqlite3.connect(':memory:')
        db.executescript(sql)
        self.addCleanup(db.close)
        return db

    def test_insert_update_delete_without_private_values(self):
        a = self.db("CREATE TABLE members(id TEXT PRIMARY KEY,email TEXT); INSERT INTO members VALUES('a','secret@example.invalid'),('b','delete@example.invalid');")
        b = self.db("CREATE TABLE members(id TEXT PRIMARY KEY,email TEXT); INSERT INTO members VALUES('a','changed@example.invalid'),('c','new@example.invalid');")
        r = delta.compare(a, b)
        self.assertTrue(r['requiresReconciliation'])
        self.assertFalse(r['rollbackApproved'])
        row = r['changedTables'][0]
        self.assertEqual([row[k] for k in ['inserted','updated','deleted']], [1,1,1])
        self.assertEqual(row['changedColumns'], ['email'])
        self.assertNotIn('@', json.dumps(r))

    def test_composite_key_and_blob(self):
        a = self.db("CREATE TABLE chunks(id TEXT, part INTEGER, data BLOB, PRIMARY KEY(id,part)); INSERT INTO chunks VALUES('a',0,X'00'),('a',1,X'01');")
        b = self.db("CREATE TABLE chunks(id TEXT, part INTEGER, data BLOB, PRIMARY KEY(id,part)); INSERT INTO chunks VALUES('a',0,X'00'),('a',1,X'02');")
        self.assertEqual(delta.compare(a,b)['changedTables'][0]['updated'], 1)

    def test_duplicate_rows_without_key(self):
        a = self.db('CREATE TABLE events(n INTEGER); INSERT INTO events VALUES(1),(1);')
        b = self.db('CREATE TABLE events(n INTEGER); INSERT INTO events VALUES(1);')
        row = delta.compare(a,b)['changedTables'][0]
        self.assertEqual(row['mode'],'row-multiset')
        self.assertEqual(row['deleted'],1)
        self.assertIsNone(row['updated'])

    def test_schema_only_changes_require_reconciliation(self):
        a = self.db('CREATE TABLE t(id INTEGER PRIMARY KEY);')
        b = self.db('CREATE TABLE t(id INTEGER PRIMARY KEY); CREATE INDEX extra ON t(id); CREATE TABLE empty(n TEXT);')
        r = delta.compare(a,b)
        self.assertTrue(r['requiresReconciliation'])
        self.assertEqual(len(r['schemaChanges']),2)

    def test_identical_snapshot_does_not_approve_rollback(self):
        a = self.db('CREATE TABLE t(id INTEGER PRIMARY KEY); INSERT INTO t VALUES(1);')
        r = delta.compare(a,a)
        self.assertFalse(r['requiresReconciliation'])
        self.assertFalse(r['rollbackApproved'])

    def test_export_cannot_attach_another_database(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder)/'export.sql'
            p.write_text("ATTACH DATABASE ':memory:' AS another;")
            with self.assertRaises(sqlite3.DatabaseError):
                delta.load_snapshot(p)

    def test_foreign_key_violation_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            p = Path(folder)/'export.sql'
            p.write_text('CREATE TABLE p(id INTEGER PRIMARY KEY); CREATE TABLE c(pid INTEGER REFERENCES p(id)); INSERT INTO c VALUES(1);')
            with self.assertRaises(ValueError):
                delta.load_snapshot(p)


if __name__ == '__main__':
    unittest.main()
