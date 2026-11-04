import { getServerEnv } from './env.js'
import { HttpError } from './http.js'
import { getAdmin } from './supabase.js'

const MAX_BYTES = 4 * 1024 * 1024

export function decodeImage(base64: string, mimeType: string): Buffer {
  if (mimeType !== 'image/jpeg' && mimeType !== 'image/png' && mimeType !== 'image/webp') {
    throw new HttpError(400, 'Upload a JPEG, PNG, or WebP image.')
  }
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) {
    throw new HttpError(400, 'The image data is not valid.')
  }
  const buffer = Buffer.from(cleaned, 'base64')
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    throw new HttpError(400, 'Images must be under 4 MB.')
  }
  const matches =
    (mimeType === 'image/jpeg' && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (mimeType === 'image/png' && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ||
    (mimeType === 'image/webp' && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
  if (!matches) throw new HttpError(400, 'The file contents do not match the image type.')
  return buffer
}

export async function uploadComplaintImage(userId: string, buffer: Buffer, mimeType: string): Promise<string> {
  const supabase = getAdmin()
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const path = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from('complaint-images').upload(path, new Uint8Array(buffer), {
    contentType: mimeType,
    upsert: false,
  })
  if (error) {
    console.error('[storage]', error.message)
    throw new HttpError(502, 'The image could not be stored. Confirm the complaint-images bucket exists.')
  }
  return supabase.storage.from('complaint-images').getPublicUrl(path).data.publicUrl
}

export function assertStorageUrl(url: string): void {
  const base = getServerEnv().supabaseUrl.replace(/\/$/, '')
  const expected = `${base}/storage/v1/object/public/complaint-images/`
  if (!base || !url.startsWith(expected)) {
    throw new HttpError(400, 'Verification can only use images stored for this complaint.')
  }
}

export async function fetchStoredImage(url: string): Promise<{ base64: string; mimeType: string }> {
  assertStorageUrl(url)
  const response = await fetch(url)
  if (!response.ok) throw new HttpError(400, 'A stored complaint image could not be loaded.')
  const mimeType = response.headers.get('content-type')?.split(';')[0] || 'image/jpeg'
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new HttpError(400, 'A stored image is too large to verify.')
  }
  return { base64: bytes.toString('base64'), mimeType }
}
