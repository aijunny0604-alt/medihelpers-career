"""Regression: schema probes must validate names without scanning user rows."""
import pathlib, re, sqlite3, unittest

class SchemaProbeCost(unittest.TestCase):
    def test_all_probes_do_not_read_cartesian_products(self):
        source = (pathlib.Path(__file__).parents[1] / 'scripts/package-sites.mjs').read_text(encoding='utf-8')
        probes = re.findall(r"ensureSchemaGroup\(env, '[^']+', '(SELECT 1 FROM [^']+)'", source)
        self.assertEqual(len(probes), 6)
        for query in probes:
            with self.subTest(query=query):
                tables = query.split(' FROM ')[1].split(' LIMIT ')[0].split(', ')
                db = sqlite3.connect(':memory:')
                for table in tables:
                    db.execute(f'CREATE TABLE {table} (id INTEGER)')
                    db.executemany(f'INSERT INTO {table} VALUES (?)', [(i,) for i in range(100)])
                # An empty last table used to make LIMIT 1 scan all earlier combinations.
                db.execute(f'DELETE FROM {tables[-1]}')
                steps = [0]
                def progress():
                    steps[0] += 1
                    return int(steps[0] > 1000)
                db.set_progress_handler(progress, 1)
                self.assertEqual(db.execute(query).fetchall(), [])
                self.assertLess(steps[0], 50)
                db.set_progress_handler(None, 0)
                db.execute(f'DROP TABLE {tables[-1]}')
                with self.assertRaisesRegex(sqlite3.OperationalError, 'no such table'):
                    db.execute(query)
                db.close()

if __name__ == '__main__':
    unittest.main()
