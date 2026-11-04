import { HttpError } from './http'

const buckets = new Map<string, number[]>()

export function assertRateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now()
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    throw new HttpError(429, 'Too many requests. Please wait a few minutes and try again.')
  }
  recent.push(now)
  buckets.set(key, recent)
}
