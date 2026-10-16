import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './lib/http.js';
import mcp from './lib/mcp.js';
import proxy from './api/proxy.js';

const root = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));
  app.use('/api/v1', api);
  app.all('/api/mcp', mcp);
  app.all('/api/proxy', proxy);
  app.get('/proxy', proxy);
  app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));
  app.use(express.static(path.join(root, 'public')));
  app.use((error, req, res, next) => {
    console.error('HTTP request failed:', error.message);
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({ error: { code: 'HTTP_ERROR', message: error.status === 400 ? 'JSON invalido.' : 'Erro ao processar a requisicao.' } });
  });
  return app;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, '127.0.0.1', () => console.log(`BC Aberto: http://127.0.0.1:${port}`));
}
