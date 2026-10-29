import { existsSync } from 'node:fs';

// Cross-platform production start: no shell-specific environment assignment.
process.env.NODE_ENV = 'production';
if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
  console.error('Production frontend is missing. Run npm run build before npm start or package:eb.');
  process.exitCode = 1;
} else {
  await import('../server/src/index.js');
}
