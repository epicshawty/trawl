import { build } from 'esbuild';
import { rmSync } from 'node:fs';

rmSync('dist/main', { recursive: true, force: true });
rmSync('dist/preload', { recursive: true, force: true });

const common = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: ['electron'],
  logLevel: 'info',
};

await build({ ...common, entryPoints: ['src/main/index.ts'], outfile: 'dist/main/index.cjs' });
await build({ ...common, entryPoints: ['src/preload/index.ts'], outfile: 'dist/preload/index.cjs' });
