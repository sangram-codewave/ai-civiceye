import { Camera, MapPinned, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CATEGORY_VALUES, categoryLabel } from '@shared/constants'
import { summarize } from '@shared/analytics'
import { demoComplaints } from '@shared/demoData'
import { CategoryIcon } from '@/components/ComplaintBadges'
import { Button } from '@/components/ui/button'
import { useHealth } from '@/hooks/useCivicData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const steps = [
  { icon: Camera, title: 'Photograph the problem', body: 'A citizen uploads a photo, drops a pin, and adds a short note.' },
  { icon: Sparkles, title: 'AI reads the scene', body: 'Gemini suggests a category, severity, department, and a plain-language description.' },
  { icon: MapPinned, title: 'The city sees the queue', body: 'Complaints land on a map and a filterable municipal desk, with duplicates flagged for review.' },
  { icon: ShieldCheck, title: 'A person closes the case', body: 'An officer upload of the repair can be compared, but only a person marks it resolved.' },
]

export function LandingPage() {
  useDocumentTitle('AI CivicEye')
  const health = useHealth()
  const sample = summarize(demoComplaints)
  const live = health.data?.totals
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Municipal complaint desk</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-navy sm:text-5xl">
            See a civic problem once. Route it to the right team.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            AI CivicEye helps cities take in photos of potholes, garbage, drainage, streetlights, and leaks, then keep a clear record from report to repair.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/login">Report an issue</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Create a citizen account</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example triage</p>
          <div className="mt-4 rounded-2xl bg-navy p-5 text-white">
            <p className="text-sm text-slate-300">CE-2026-00001 · Whitefield circle</p>
            <p className="mt-2 text-xl font-bold">Deep pothole near the junction</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-white/10 px-2 py-3">
                <p className="text-slate-300">Category</p>
                <p className="mt-1 font-semibold">Pothole</p>
              </div>
              <div className="rounded-xl bg-white/10 px-2 py-3">
                <p className="text-slate-300">Severity</p>
                <p className="mt-1 font-semibold text-red-200">Critical</p>
              </div>
              <div className="rounded-xl bg-white/10 px-2 py-3">
                <p className="text-slate-300">Desk</p>
                <p className="mt-1 font-semibold">Roads</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">This card is an illustration of the product, not a live AI response.</p>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-navy">The problem</h2>
            <p className="mt-3 text-slate-600">
              Civic complaints arrive as phone calls, photos in chat groups, and paper notes. The same pothole is reported three times, while a sewage overflow waits because nobody can see how serious it is.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-navy">The approach</h2>
            <p className="mt-3 text-slate-600">
              A citizen submits one photo. The server asks Gemini what it sees, stores the complaint in Postgres, and lets an administrator correct the result, assign a department, and compare a repair photo. AI never closes a case by itself.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-navy">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <step.icon className="h-5 w-5 text-blue-700" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-bold text-navy">Issue categories</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_VALUES.map((category) => (
              <div key={category} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <CategoryIcon category={category} className="h-5 w-5 text-blue-700" />
                <span className="text-sm font-medium">{categoryLabel(category)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-bold text-navy">{live ? 'Connected database' : 'Sample dataset'}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {live
            ? 'Counts below are complaint totals stored in the connected database. They do not include names or photos.'
            : 'These figures come from the bundled Bengaluru sample. They are not a live city feed.'}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Complaints" value={live ? live.complaints : sample.total} />
          <Stat label="Resolved" value={live ? live.resolved : sample.resolved} />
          <Stat label="Open critical" value={live ? '—' : sample.critical} />
        </div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        AI CivicEye · Bengaluru sample city · OpenStreetMap
      </footer>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-navy">{value}</p>
    </div>
  )
}
