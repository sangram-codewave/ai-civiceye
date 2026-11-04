import { useHealth } from '@/hooks/useCivicData'
import { useAuth } from '@/contexts/AuthContext'

export function ServiceBanner() {
  const { demoMode } = useAuth()
  const health = useHealth()
  const messages: string[] = []
  if (demoMode) {
    messages.push('Demo mode. Sample complaints are shown for preview. Nothing you submit is saved to a database.')
  } else if (health.data && !health.data.services.database) {
    messages.push('The API cannot reach the database. Complaints cannot be saved until the server credentials are set.')
  }
  if (health.data && !health.data.services.ai) {
    messages.push('AI is unavailable until GEMINI_API_KEY is set on the server. You can still enter complaint details manually.')
  }
  if (!messages.length) return null
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
      {messages.join(' ')}
    </div>
  )
}
