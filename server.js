const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400'
};

const server = http.createServer((req, res) => {
  // Aplica CORS em TODAS as respostas
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  // Preflight OPTIONS — responde imediatamente
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'clickup-proxy' }));
    return;
  }

  // Aceita: /proxy?token=xxx&path=/team/...
  const url = new URL(req.url, 'http://localhost');

  if (!url.pathname.startsWith('/proxy')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Rota não encontrada. Use /proxy?token=...&path=...' }));
    return;
  }

  const token = url.searchParams.get('token');
  const path  = url.searchParams.get('path');

  if (!token || !path) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Parâmetros obrigatórios: token e path' }));
    return;
  }

  // Monta a query string original (sem token e path)
  const extra = [];
  url.searchParams.forEach((v, k) => {
    if (k !== 'token' && k !== 'path') extra.push(k + '=' + encodeURIComponent(v));
  });

  // Reconstrói o path completo incluindo query strings do ClickUp
  let clickupPath = '/api/v2' + path;
  if (extra.length) clickupPath += (path.includes('?') ? '&' : '?') + extra.join('&');

  console.log('Proxying:', clickupPath);

  const options = {
    hostname: 'api.clickup.com',
    path: clickupPath,
    method: 'GET',
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    let body = '';
    proxyRes.on('data', chunk => body += chunk);
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Proxy request error:', e.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  });

  proxyReq.end();
});

server.listen(PORT, () => {
  console.log('✅ Proxy ClickUp rodando na porta', PORT);
});
