const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const server = http.createServer((req, res) => {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  // Health check
  if (url.pathname === '/' || url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: '3' }));
    return;
  }

  if (!url.pathname.startsWith('/proxy')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Use /proxy?token=...&path=...' }));
    return;
  }

  const token = url.searchParams.get('token');
  const path  = url.searchParams.get('path');

  if (!token || !path) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Parâmetros obrigatórios: token e path' }));
    return;
  }

  // Reconstrói querystring do ClickUp (parâmetros extras além de token e path)
  const qs = [];
  url.searchParams.forEach((v, k) => {
    if (k !== 'token' && k !== 'path') qs.push(k + '=' + encodeURIComponent(v));
  });

  const clickupPath = '/api/v2' + path + (qs.length ? (path.includes('?') ? '&' : '?') + qs.join('&') : '');

  console.log(`[${new Date().toISOString()}] GET ${clickupPath}`);

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
      setCORS(res); // garante CORS mesmo na resposta proxied
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(body);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Proxy error:', e.message);
    setCORS(res);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  });

  proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ClickUp proxy v3 na porta ${PORT}`);
});
