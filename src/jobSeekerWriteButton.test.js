import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('job seeker write action sits with the search toolbar instead of the centered hero heading', async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL('./main.jsx', import.meta.url), 'utf8'),
    readFile(new URL('./styles.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /className="headhunt-board-toolbar-actions"[\s\S]*className="headhunt-board-search"[\s\S]*className="button primary headhunt-board-write"/);
  assert.match(styles, /\.headhunt-board-toolbar-actions\{[^}]*display:flex/);
  assert.match(styles, /\.headhunt-board-write\{[^}]*margin:0/);
  assert.match(styles, /@media\(max-width:560px\)[^{]*\{[^}]*\.headhunt-board-toolbar-actions\{grid-template-columns:1fr\}/);
  assert.match(styles, /\.headhunt-board-write\{order:-1;width:100%\}/);
});
