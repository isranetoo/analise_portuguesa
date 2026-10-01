const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch (error) {
    response.writeHead(400).end('URL malformada');
    return;
  }

  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');

  // Block paths with segments starting with '.'
  if (requested.split('/').some(segment => segment.startsWith('.'))) {
    response.writeHead(404).end('Arquivo não encontrado');
    return;
  }

  const file = path.resolve(root, requested);

  if (!file.startsWith(root + path.sep)) {
    response.writeHead(403).end('Acesso negado');
    return;
  }

  // Only serve files with extensions present in the types map
  const ext = path.extname(file);
  if (!types[ext]) {
    response.writeHead(404).end('Arquivo não encontrado');
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Arquivo não encontrado');
      return;
    }
    response.writeHead(200, {'Content-Type': types[ext]});
    response.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log(`Dashboard disponível em http://localhost:${port}`);
});
