import { requireUser } from '../../server/auth'
import { isGeminiConfigured, isSupabaseConfigured } from '../../server/env'
import { analyseComplaintImage } from '../../server/gemini'
import { assertMethod, clientKey, HttpError, readBody, wrap } from '../../server/http'
import { decodeImage } from '../../server/images'
import { assertRateLimit } from '../../server/rateLimit'
import { analyseSchema, parseBody } from '../../server/schemas'

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
