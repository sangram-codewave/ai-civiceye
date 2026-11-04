import { requireUser } from '../../server/auth.js'
import { isGeminiConfigured, isSupabaseConfigured } from '../../server/env.js'
import { analyseComplaintImage } from '../../server/gemini.js'
import { assertMethod, clientKey, HttpError, readBody, wrap } from '../../server/http.js'
import { decodeImage } from '../../server/images.js'
import { assertRateLimit } from '../../server/rateLimit.js'
import { analyseSchema, parseBody } from '../../server/schemas.js'

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
