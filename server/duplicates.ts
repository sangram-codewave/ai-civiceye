import { cosineSimilarity, duplicateScore, haversineMeters, jaccardSimilarity } from '../shared/geo'
import { embedText } from './gemini'
import { getAdmin } from './supabase'

export async function detectDuplicates(complaintId: string): Promise<number> {
  const supabase = getAdmin()
  const { data: current, error } = await supabase
    .from('complaints')
    .select('id, category, description, title, latitude, longitude, created_at')
    .eq('id', complaintId)
    .maybeSingle()
  if (error || !current) {
    if (error) console.error('[duplicates]', error.message)
    return 0
  }

  const since = new Date(current.created_at)
  since.setUTCDate(since.getUTCDate() - 30)
  const { data: candidates, error: candidateError } = await supabase
    .from('complaints')
    .select('id, description, title, latitude, longitude, created_at')
    .eq('category', current.category)
    .neq('id', current.id)
    .gte('created_at', since.toISOString())
    .limit(50)
  if (candidateError || !candidates?.length) {
    if (candidateError) console.error('[duplicates]', candidateError.message)
    return 0
  }

  const text = `${current.title}. ${current.description}`
  const ranked = candidates
    .map((candidate) => {
      const distance = haversineMeters(
        Number(current.latitude),
        Number(current.longitude),
        Number(candidate.latitude),
        Number(candidate.longitude),
      )
      const jaccard = jaccardSimilarity(text, `${candidate.title}. ${candidate.description}`)
      const ageDays =
        Math.abs(new Date(current.created_at).getTime() - new Date(candidate.created_at).getTime()) / 86_400_000
      return {
        candidate,
        distance,
        jaccard,
        ageDays,
        preliminary: duplicateScore({ distanceMeters: distance, textScore: jaccard, ageDays }),
      }
    })
    .sort((left, right) => right.preliminary - left.preliminary)
    .slice(0, 8)

  const sourceEmbedding = await embedText(text)
  let flagged = 0
  for (const item of ranked) {
    let textScore = item.jaccard
    if (sourceEmbedding) {
      const other = await embedText(`${item.candidate.title}. ${item.candidate.description}`)
      if (other) textScore = Math.max(textScore, cosineSimilarity(sourceEmbedding, other))
    }
    const score = duplicateScore({ distanceMeters: item.distance, textScore, ageDays: item.ageDays })
    if (score < 0.65) continue
    const { error: insertError } = await supabase.from('duplicate_flags').insert({
      complaint_id: current.id,
      possible_duplicate_id: item.candidate.id,
      similarity_score: Number(score.toFixed(3)),
      review_status: 'pending',
    })
    if (insertError?.code === '23505') continue
    if (insertError) {
      console.error('[duplicates]', insertError.message)
      continue
    }
    flagged += 1
  }
  return flagged
}
