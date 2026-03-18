const express = require('express');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS total
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '4' });
});

// Proxy
app.get('/proxy', (req, res) => {
  const { token, path: apiPath, ...rest } = req.query;

  if (!token || !apiPath) {
    return res.status(400).json({ error: 'token e path são obrigatórios' });
  }

  const qs = Object.entries(rest).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const fullPath = '/api/v2' + apiPath + (qs ? (apiPath.includes('?') ? '&' : '?') + qs : '');

  console.log(`[${new Date().toISOString()}] GET ${fullPath}`);

  const options = {
    hostname: 'api.clickup.com',
    path: fullPath,
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
      res.status(proxyRes.statusCode).set('Content-Type', 'application/json').send(body);
    });
  });

  proxyReq.on('error', (e) => {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  });

  proxyReq.end();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Proxy v4 rodando na porta ${PORT}`);
});
