export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earth = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2),
  )
}

export function jaccardSimilarity(left: string, right: string): number {
  const a = tokenize(left)
  const b = tokenize(right)
  if (a.size === 0 && b.size === 0) return 0
  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection += 1
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length)
  if (length === 0) return 0
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0
    const b = right[index] ?? 0
    dot += a * b
    leftNorm += a * a
    rightNorm += b * b
  }
  const denom = Math.sqrt(leftNorm) * Math.sqrt(rightNorm)
  return denom === 0 ? 0 : dot / denom
}

export function duplicateScore(input: {
  distanceMeters: number | null
  textScore: number
  ageDays: number
}): number {
  let score: number
  if (input.distanceMeters == null) {
    score = 0.75 * input.textScore + 0.25
  } else if (input.distanceMeters <= 500) {
    const geo = 1 - input.distanceMeters / 500
    score = 0.45 * geo + 0.35 * input.textScore + 0.2
  } else if (input.distanceMeters <= 2000) {
    const geo = 0.35 * (1 - (input.distanceMeters - 500) / 1500)
    score = 0.45 * geo + 0.35 * input.textScore + 0.2
  } else {
    score = 0.55 * input.textScore + 0.1
  }
  if (input.ageDays <= 3) score += 0.05
  return Math.max(0, Math.min(1, score))
}
