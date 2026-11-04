import 'dotenv/config'
import http from 'node:http'
import summary from '../api/ai/generate-summary.js'
import analyse from '../api/ai/analyse-image.js'
import duplicates from '../api/ai/detect-duplicates.js'
import verify from '../api/ai/verify-resolution.js'
import analytics from '../api/analytics/index.js'
import assign from '../api/complaints/[id]/assign.js'
import updateStatus from '../api/complaints/[id]/update-status.js'
import complaintById from '../api/complaints/[id].js'
import complaints from '../api/complaints/index.js'
import geocode from '../api/geocode.js'
import health from '../api/health.js'
import type { Req, Res } from '../server/http.js'

type Handler = (req: Req, res: Res) => Promise<void> | void

const routes: { pattern: RegExp; keys?: string[]; handler: Handler }[] = [
  { pattern: /^\/api\/health$/, handler: health },
  { pattern: /^\/api\/geocode$/, handler: geocode },
  { pattern: /^\/api\/ai\/analyse-image$/, handler: analyse },
  { pattern: /^\/api\/ai\/detect-duplicates$/, handler: duplicates },
  { pattern: /^\/api\/ai\/generate-summary$/, handler: summary },
  { pattern: /^\/api\/ai\/verify-resolution$/, handler: verify },
  { pattern: /^\/api\/analytics$/, handler: analytics },
  { pattern: /^\/api\/complaints\/([^/]+)\/assign$/, keys: ['id'], handler: assign },
  { pattern: /^\/api\/complaints\/([^/]+)\/update-status$/, keys: ['id'], handler: updateStatus },
  { pattern: /^\/api\/complaints\/([^/]+)$/, keys: ['id'], handler: complaintById },
  { pattern: /^\/api\/complaints$/, handler: complaints },
]

function createRes(nodeRes: http.ServerResponse): Res {
  let statusCode = 200
  let sent = false
  const res: Res = {
    get sent() {
      return sent
    },
    status(code) {
      statusCode = code
      return res
    },
    setHeader(name, value) {
      nodeRes.setHeader(name, value)
      return res
    },
    json(body) {
      if (sent) return
      sent = true
      nodeRes.statusCode = statusCode
      nodeRes.setHeader('content-type', 'application/json; charset=utf-8')
      nodeRes.end(JSON.stringify(body))
    },
    end(body) {
      if (sent) return
      sent = true
      nodeRes.statusCode = statusCode
      nodeRes.end(body)
    },
  }
  return res
}

async function readJson(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > 4_500_000) {
      const error = new Error('too-large')
      throw error
    }
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return undefined
  return JSON.parse(raw) as unknown
}

const server = http.createServer(async (nodeReq, nodeRes) => {
  const url = new URL(nodeReq.url || '/', 'http://127.0.0.1')
  const match = routes.find((route) => route.pattern.test(url.pathname))
  if (!match) {
    nodeRes.statusCode = 404
    nodeRes.setHeader('content-type', 'application/json; charset=utf-8')
    nodeRes.end(JSON.stringify({ error: 'Not found.' }))
    return
  }
  const found = match.pattern.exec(url.pathname)
  const query: Record<string, string | string[]> = {}
  for (const [key, value] of url.searchParams) {
    const current = query[key]
    if (current === undefined) query[key] = value
    else if (Array.isArray(current)) current.push(value)
    else query[key] = [current, value]
  }
  match.keys?.forEach((key, index) => {
    const value = found?.[index + 1]
    if (value) query[key] = decodeURIComponent(value)
  })
  let body: unknown
  try {
    body = await readJson(nodeReq)
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'too-large'
    nodeRes.statusCode = tooLarge ? 413 : 400
    nodeRes.setHeader('content-type', 'application/json; charset=utf-8')
    nodeRes.end(
      JSON.stringify({
        error: tooLarge ? 'Request is too large. Use an image under 4 MB.' : 'Request body must be JSON.',
      }),
    )
    return
  }
  const headers: Record<string, string | string[] | undefined> = {}
  for (const [key, value] of Object.entries(nodeReq.headers)) headers[key] = value
  const req: Req = { method: nodeReq.method, headers, query, body, url: nodeReq.url }
  console.log(`${req.method} ${url.pathname}`)
  await match.handler(req, createRes(nodeRes))
})

server.listen(3001, '127.0.0.1', () => {
  console.log('AI CivicEye API listening on http://127.0.0.1:3001')
})
