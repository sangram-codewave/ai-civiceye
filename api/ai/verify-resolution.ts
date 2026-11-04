import { requireAdmin } from '../../server/auth.js'
import { isGeminiConfigured } from '../../server/env.js'
import { compareRepairImages } from '../../server/gemini.js'
import { assertMethod, HttpError, readBody, wrap } from '../../server/http.js'
import { decodeImage, fetchStoredImage, uploadComplaintImage } from '../../server/images.js'
import { raiseDbError } from '../../server/mappers.js'
import { assertRateLimit } from '../../server/rateLimit.js'
import { parseBody, verifySchema } from '../../server/schemas.js'
import { getAdmin } from '../../server/supabase.js'

export default wrap('verify-resolution', async (req, res) => {
  assertMethod(req, ['POST'])
  const admin = await requireAdmin(req)
  assertRateLimit(`ai:${admin.id}`, 10, 10 * 60 * 1000)
  const body = parseBody(verifySchema, readBody(req))
  const supabase = getAdmin()
  const { data: complaint, error } = await supabase
    .from('complaints')
    .select('id, image_url, status')
    .eq('id', body.complaintId)
    .maybeSingle()
  if (error) raiseDbError(error, 'The complaint could not be loaded.')
  if (!complaint) throw new HttpError(404, 'Complaint not found.')
  const image = decodeImage(body.imageBase64, body.mimeType)
  const resolutionUrl = await uploadComplaintImage(admin.id, image, body.mimeType)
  const { error: updateError } = await supabase
    .from('complaints')
    .update({ resolution_image_url: resolutionUrl })
    .eq('id', body.complaintId)
  if (updateError) raiseDbError(updateError, 'The repair photo could not be saved.')

  if (!isGeminiConfigured()) {
    throw new HttpError(503, 'The repair photo was saved. Gemini API key is not configured, so the photos were not compared.', {
      code: 'AI_UNAVAILABLE',
      resolution_image_url: resolutionUrl,
    })
  }
  if (!complaint.image_url) {
    throw new HttpError(400, 'There is no original photo to compare. The repair photo was saved.', {
      resolution_image_url: resolutionUrl,
    })
  }

  const before = await fetchStoredImage(complaint.image_url)
  let result
  try {
    result = await compareRepairImages(before, { base64: image.toString('base64'), mimeType: body.mimeType })
  } catch (error) {
    if (error instanceof HttpError) {
      throw new HttpError(error.status, `The repair photo was saved. ${error.message}`, {
        ...error.extra,
        resolution_image_url: resolutionUrl,
      })
    }
    throw error
  }
  const { error: insertError } = await supabase.from('resolution_verifications').insert({
    complaint_id: complaint.id,
    before_image_url: complaint.image_url,
    after_image_url: resolutionUrl,
    ai_result: result,
    human_verified: false,
  })
  if (insertError) raiseDbError(insertError, 'The verification could not be saved.')
  res.json({
    ...result,
    resolution_image_url: resolutionUrl,
    status: complaint.status,
    status_unchanged: true,
  })
})
