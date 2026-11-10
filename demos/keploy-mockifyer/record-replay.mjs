/**
 * Repro of the 2026-11-10 Mockifyer guide test (successful cases md-l and md-o):
 * record fetch and axios against a local API, change the live body, then
 * replay and confirm the recording is served.
 *
 * Required settings (all four):
 *   useGlobalFetch / useGlobalAxios
 *   domainPathRulesMode: 'record_all'
 *   MOCKIFYER_RECORD_RESPONSES=true
 *   MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API=false
 */
import { spawn } from 'node:child_process';
import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

function run(cmd, args, env, { allowFail = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => {
      const s = d.toString();
      out += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d) => {
      const s = d.toString();
      out += s;
      process.stderr.write(s);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && !allowFail) {
        reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`));
      } else {
        resolve({ code, out });
      }
    });
  });
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
    s.on('error', reject);
  });
}

async function startServer(port, version) {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', V: String(version) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let ready = '';
  await new Promise((resolve, reject) => {
    const onData = (d) => {
      ready += d.toString();
      if (ready.includes('listening')) resolve();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', (d) => process.stderr.write(d));
    child.on('error', reject);
    setTimeout(() => reject(new Error(`server did not start: ${ready}`)), 5000);
  });
  return child;
}

function stop(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) return resolve();
    child.on('close', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (!child.killed) child.kill('SIGKILL');
    }, 1000);
  });
}

const port = Number(process.env.PORT) || (await freePort());
const mockRoot = join(root, 'mock-data');
if (existsSync(mockRoot)) rmSync(mockRoot, { recursive: true, force: true });
mkdirSync(join(mockRoot, 'fetch'), { recursive: true });
mkdirSync(join(mockRoot, 'axios'), { recursive: true });

const envBase = {
  PORT: String(port),
  MOCKIFYER_RECORD_RESPONSES: 'true',
  MOCKIFYER_RECORD_DEFAULT_ALWAYS_USE_REAL_API: 'false',
};

console.log(`node ${process.version}; port ${port}`);

let server = await startServer(port, '1');
try {
  await run(process.execPath, ['t-fetch.mjs'], {
    ...envBase,
    MOCKIFYER_RECORD: 'true',
    MD: join(mockRoot, 'fetch'),
  });
  await run(process.execPath, ['t-axios.mjs'], {
    ...envBase,
    MOCKIFYER_RECORD: 'true',
    MD: join(mockRoot, 'axios'),
  });
} finally {
  await stop(server);
}

server = await startServer(port, '2');
try {
  const fetchReplay = await run(process.execPath, ['t-fetch.mjs'], {
    ...envBase,
    MOCKIFYER_RECORD: 'false',
    MD: join(mockRoot, 'fetch'),
  });
  const axiosReplay = await run(process.execPath, ['t-axios.mjs'], {
    ...envBase,
    MOCKIFYER_RECORD: 'false',
    MD: join(mockRoot, 'axios'),
  });
  const fetchOk = /RESULT fetch replay got version 1\b/.test(fetchReplay.out);
  const axiosOk = /RESULT axios replay got version 1\b/.test(axiosReplay.out);
  if (!fetchOk || !axiosOk) {
    console.error('FAIL: replay did not serve the recorded body (expected version 1 after live API changed to 2)', {
      fetchOk,
      axiosOk,
    });
    process.exit(1);
  }
  console.log('PASS: fetch and axios recorded at version 1 and replayed it after the live API changed to 2');
} finally {
  await stop(server);
}
