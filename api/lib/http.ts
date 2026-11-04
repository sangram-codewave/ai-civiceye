export class HttpError extends Error {
  status: number
  extra?: Record<string, unknown>

  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

export type Req = {
  method?: string
  headers: Record<string, string | string[] | undefined>
  query: Record<string, string | string[] | undefined>
  body?: unknown
  url?: string
}

export type Res = {
  readonly sent: boolean
  status: (code: number) => Res
  setHeader: (name: string, value: string | number | readonly string[]) => Res
  json: (body: unknown) => void
  end: (body?: string) => void
}

type RawRes = {
  status: (code: number) => unknown
  setHeader: (name: string, value: string) => unknown
  json: (body: unknown) => unknown
  end: (body?: string) => unknown
}

export type ApiHandler = (req: Req, res: Res) => Promise<void> | void

export function header(req: Req, name: string): string | undefined {
  const value = req.headers[name] ?? req.headers[name.toLowerCase()]
  if (Array.isArray(value)) return value[0]
  return typeof value === 'string' ? value : undefined
}

export function qstring(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

export function clientKey(req: Req): string {
  const forwarded = header(req, 'x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || header(req, 'x-real-ip') || 'local'
}

export function readBody(req: Req): unknown {
  if (typeof req.body === 'string') {
    if (!req.body.trim()) return {}
    try {
      return JSON.parse(req.body) as unknown
    } catch {
      throw new HttpError(400, 'Request body must be JSON.')
    }
  }
  return req.body ?? {}
}

export function assertMethod(req: Req, methods: string[]): void {
  const method = (req.method || 'GET').toUpperCase()
  if (!methods.includes(method)) {
    throw new HttpError(405, `Use ${methods.join(' or ')} for this endpoint.`)
  }
}

function applyCors(req: Req, res: Res): void {
  const origin = header(req, 'origin')
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
}

export function wrap(name: string, handler: ApiHandler) {
  return async (req: Req, res: RawRes): Promise<void> => {
    let sent = false
    const safe: Res = {
      get sent() {
        return sent
      },
      status(code) {
        res.status(code)
        return safe
      },
      setHeader(headerName, value) {
        res.setHeader(headerName, String(value))
        return safe
      },
      json(body) {
        if (sent) return
        sent = true
        res.json(body)
      },
      end(body) {
        if (sent) return
        sent = true
        res.end(body)
      },
    }

    applyCors(req, safe)
    if ((req.method || 'GET').toUpperCase() === 'OPTIONS') {
      safe.status(204).end()
      return
    }

    try {
      await handler(req, safe)
    } catch (error) {
      if (sent) {
        console.error(`[api:${name}]`, error)
        return
      }
      if (error instanceof HttpError) {
        if (error.status >= 500) console.error(`[api:${name}]`, error.message)
        safe.status(error.status).json({ error: error.message, ...error.extra })
        return
      }
      console.error(`[api:${name}]`, error)
      safe.status(500).json({ error: 'Unexpected server error.' })
    }
  }
}
