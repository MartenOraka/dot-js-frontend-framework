// Development server (no dependencies). Run from the repo root:
//   npm run dev        or        node example/server.js
//
// Serves:
//   /framework/...  -> files from ../framework (source, playground, tests)
//   /...            -> files from ./ (the example app)
//   anything else   -> example/index.html, so history-mode routes like
//                      /todo/3 still work after a page reload
//
// TODO(C): add mock API routes under /api/ for the example app if needed.

import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const EXAMPLE_DIR = resolve(here)
const FRAMEWORK_DIR = resolve(here, '../framework')
const PORT = Number(process.env.PORT) || 3000

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

function safeJoin(base, urlPath) {
  const full = normalize(join(base, urlPath))
  return full === base || full.startsWith(base + sep) ? full : null
}

async function tryFile(path) {
  if (!path) return null
  try {
    const info = await stat(path)
    if (info.isDirectory()) return tryFile(join(path, 'index.html'))
    return path
  } catch {
    return null
  }
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)

  let file = urlPath.startsWith('/framework/')
    ? await tryFile(safeJoin(FRAMEWORK_DIR, urlPath.slice('/framework'.length)))
    : await tryFile(safeJoin(EXAMPLE_DIR, urlPath))

  // SPA fallback: unknown paths without a file extension get the app.
  if (!file && !extname(urlPath)) file = join(EXAMPLE_DIR, 'index.html')

  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    return
  }
  const body = await readFile(file)
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  })
  res.end(body)
})

server.listen(PORT, () => {
  console.log(`Example app:    http://localhost:${PORT}/`)
  console.log(`Playground:     http://localhost:${PORT}/framework/playground/`)
  console.log(`Renderer tests: http://localhost:${PORT}/framework/tests/`)
})
