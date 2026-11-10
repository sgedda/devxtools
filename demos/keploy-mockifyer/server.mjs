import http from 'node:http';

const port = Number(process.env.PORT || 4599);
const host = process.env.HOST || '127.0.0.1';
const v = process.env.V || '1';

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ path: req.url, version: v }));
});

server.listen(port, host, () => {
  console.log(`listening on ${host}:${port} version=${v}`);
});
