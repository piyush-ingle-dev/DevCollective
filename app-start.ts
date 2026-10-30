import { Server } from 'node:http';

// Render supplies the HTTP port at runtime. The legacy server currently defaults
// to 3000, so translate that default to Render's assigned PORT in production.
process.env.NODE_ENV ||= 'production';
const renderPort = Number(process.env.PORT || 3000);
const originalListen = Server.prototype.listen;
Server.prototype.listen = function (...args: any[]) {
  if (typeof args[0] === 'number' && args[0] === 3000 && renderPort !== 3000) {
    args[0] = renderPort;
  }
  return originalListen.apply(this, args as any);
};

void import('./server').catch((error) => {
  console.error('[app] failed to start:', error);
  process.exit(1);
});
