import { requireUser } from './lib/auth'
import { assertMethod, HttpError, qstring, wrap } from './lib/http'
import { assertRateLimit } from './lib/rateLimit'

export default wrap('geocode', async (req, res) => {
  assertMethod(req, ['GET'])
  const user = await requireUser(req)
  assertRateLimit(`geocode:${user.id}`, 5, 60_000)
  const latitude = Number(qstring(req.query.lat))
  const longitude = Number(qstring(req.query.lng))
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new HttpError(400, 'Latitude and longitude are required.')
  }
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'AI-CivicEye/1.0 (municipal complaint demo)',
    },
  })
  if (!response.ok) {
    throw new HttpError(502, 'Address lookup is unavailable. You can type the address.')
  }
  const body = (await response.json()) as { display_name?: string }
  res.json({ address: body.display_name || '' })
})
