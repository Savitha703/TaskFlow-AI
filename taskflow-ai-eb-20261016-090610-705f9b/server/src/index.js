import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { getServerConfig } from './config.js';

if (process.env.NODE_ENV !== 'production') dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
let config;
try { config = getServerConfig(); }
catch (error) { console.error(error.message); process.exit(1); }
const { uri, port, host, clientOrigins, production } = config;

let server;
let stopping = false;
async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  clearTimeout(forceExit);
  process.exit(exitCode);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  server = createApp({ clientOrigins, serveFrontend: production }).listen(port, host, () => {
    console.log(`TaskFlow API ready at http://${host}:${port}`);
    console.log('MongoDB connected.');
  });
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the other process or change PORT and the Vite API proxy target.` : 'The API server could not start. Check HOST and PORT.');
    void shutdown(1);
  });
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
} catch {
  console.error('Could not connect to MongoDB. Check MONGODB_URI, your database user/password, Atlas IP access list, and network connection. Credentials are not logged.');
  await mongoose.disconnect();
  process.exitCode = 1;
}
