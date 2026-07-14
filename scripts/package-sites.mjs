import { cp, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('dist/.openai', { recursive: true });
await cp('.openai/hosting.json', 'dist/.openai/hosting.json');
await build({
  entryPoints: ['dist/server/entry.js'],
  outfile: 'dist/server/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'bundle',
  external: ['node:*'],
});