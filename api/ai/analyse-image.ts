import { requireUser } from '../lib/auth'
import { isGeminiConfigured, isSupabaseConfigured } from '../lib/env'
import { analyseComplaintImage } from '../lib/gemini'
import { assertMethod, clientKey, HttpError, readBody, wrap } from '../lib/http'
import { decodeImage } from '../lib/images'
import { assertRateLimit } from '../lib/rateLimit'
import { analyseSchema, parseBody } from '../lib/schemas'

export default wrap('analyse-image', async (req, res) => {
  assertMethod(req, ['POST'])
  if (!isGeminiConfigured()) {
    throw new HttpError(503, 'Gemini API key is not configured. Enter complaint details manually.', {
      code: 'AI_UNAVAILABLE',
    })
  }
  const limitKey = isSupabaseConfigured() ? (await requireUser(req)).id : clientKey(req)
  assertRateLimit(`ai:${limitKey}`, 10, 10 * 60 * 1000)
  const body = parseBody(analyseSchema, readBody(req))
  const image = decodeImage(body.imageBase64, body.mimeType)
  const analysis = await analyseComplaintImage(image.toString('base64'), body.mimeType)
  res.json({ ...analysis, persisted: false })
})
