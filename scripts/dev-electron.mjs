import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const DEV_URL = process.env.TRAWL_DEV_SERVER ?? 'http://localhost:5173';

async function waitForServer(url, timeoutMs = 40_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok || res.status === 404) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

const ready = await waitForServer(DEV_URL);
if (!ready) {
  console.error(`[dev] Vite never answered on ${DEV_URL}`);
  process.exit(1);
}

const electron = require('electron');
const child = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, TRAWL_DEV_SERVER: DEV_URL, NODE_ENV: 'development' },
});
child.on('close', (code) => process.exit(code ?? 0));
