export function getServerConfig(environment = process.env) {
  const production = environment.NODE_ENV === 'production';
  const uri = environment.MONGODB_URI;
  const port = Number(environment.PORT || (production ? 8080 : 5000));
  const host = environment.HOST || (production ? '0.0.0.0' : '127.0.0.1');
  const clientOrigins = (environment.CLIENT_ORIGIN || (production ? '' : 'http://localhost:5173')).split(',').map(value=>value.trim()).filter(Boolean);
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri) || /[<>]/.test(uri)) throw new Error('Set MONGODB_URI in the server environment (server/.env for local development). See README.md.');
  if (!Number.isInteger(port) || port < 1 || port > 65535 || host.includes('<')) throw new Error('Set PORT to a valid port number and HOST to a valid bind address.');
  if (production && ['localhost','127.0.0.1','::1'].includes(host)) throw new Error('Production HOST must be reachable by the AWS proxy. Use HOST=0.0.0.0.');
  for (const origin of clientOrigins) {
    try { const url=new URL(origin); if (!['http:','https:'].includes(url.protocol) || url.origin !== origin) throw new Error(); }
    catch { throw new Error('CLIENT_ORIGIN must contain comma-separated HTTP/HTTPS origins without paths or trailing slashes.'); }
  }
  return { uri, port, host, clientOrigins, production };
}
