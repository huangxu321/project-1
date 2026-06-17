const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 5173
const STATIC_DIR = __dirname

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0]

  // API 代理到后端
  if (url.startsWith('/api/')) {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: 'localhost:3000' }
    }
    const proxy = http.request(options, (pRes) => {
      res.writeHead(pRes.statusCode, pRes.headers)
      pRes.pipe(res)
    })
    proxy.on('error', () => {
      res.writeHead(502)
      res.end('Backend unavailable')
    })
    req.pipe(proxy)
    return
  }

  // 静态文件服务
  let filePath = path.join(STATIC_DIR, url === '/' ? '/index.html' : url)

  // SPA 回退
  if (!fs.existsSync(filePath)) {
    filePath = path.join(STATIC_DIR, 'index.html')
  }

  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'

  try {
    const content = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' })
    res.end(content)
  } catch (e) {
    res.writeHead(404)
    res.end('Not Found')
  }
})

server.listen(PORT, () => {
  console.log(`Frontend server running at http://localhost:${PORT}`)
})
