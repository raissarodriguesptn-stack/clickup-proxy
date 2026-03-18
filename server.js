const http = require('http');
const https = require('https');
http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','*');
  res.setHeader('Access-Control-Allow-Methods','*');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  const u=new URL(req.url,'http://x');
  if(u.pathname==='/health'){res.writeHead(200);res.end('{"status":"ok"}');return;}
  const t=u.searchParams.get('token'),p=u.searchParams.get('path');
  if(!t||!p){res.writeHead(400);res.end('{"error":"missing"}');return;}
  const ex=[];
  u.searchParams.forEach((v,k)=>{if(k!=='token'&&k!=='path')ex.push(k+'='+v);});
  const fp='/api/v2'+p+(ex.length?'?'+ex.join('&'):'');
  https.request({hostname:'api.clickup.com',path:fp,method:'GET',headers:{'Authorization':t}},pr=>{
    let b='';
    pr.on('data',c=>b+=c);
    pr.on('end',()=>{
      res.writeHead(pr.statusCode,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
      res.end(b);
    });
  }).on('error',e=>{res.writeHead(500);res.end(JSON.stringify({error:e.message}));}).end();
}).listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('proxy ok',process.env.PORT||3000));
