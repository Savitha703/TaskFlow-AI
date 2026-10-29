import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function installServerDependencies({ environment = process.env, run = spawnSync } = {}) {
  // Keep the existing independent frontend/backend installation flow in development.
  if (environment.NODE_ENV !== 'production') return;
  if (!environment.npm_execpath) throw new Error('Run npm install or npm ci from the project root to install production dependencies.');
  console.log('Installing backend production dependencies from server/package-lock.json.');
  const result = run(process.execPath, [environment.npm_execpath, 'ci', '--omit=dev'], {
    cwd: fileURLToPath(new URL('../server/', import.meta.url)),
    stdio: 'inherit', env: environment,
  });
  if (result.error || result.status !== 0) throw new Error('Backend dependency installation failed. Check npm registry access and server/package-lock.json.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { installServerDependencies(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
