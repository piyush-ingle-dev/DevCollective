process.env.NODE_ENV ||= 'production';
process.env.WS_PORT ||= process.env.PORT || '3001';

void import('./server/websocket')
  .then(({ startWebSocketServer }) => {
    const httpServer = startWebSocketServer();

    httpServer.on('request', (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ status: 'ok', service: 'websocket', timestamp: new Date().toISOString() }));
        return;
      }
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
    });

    const shutdown = (signal: string) => {
      console.log(`[ws] ${signal} received, shutting down`);
      httpServer.close((error) => {
        if (error) {
          console.error('[ws] graceful shutdown failed:', error);
          process.exit(1);
        }
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error) => {
    console.error('[ws] failed to start:', error);
    process.exit(1);
  });
