import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { CATEGORY_VALUES, DEPARTMENTS, SEVERITY_VALUES, categoryLabel, departmentForCategory, normalizeCategory, normalizeSeverity, severityLabel } from '@shared/constants'
import type { AiAnalysis } from '@shared/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/feedback'
import { Input, Select, Textarea } from '@/components/ui/input'
import { api, getErrorCode, getErrorMessage } from '@/lib/api'
import { fileToDataUrl } from '@/lib/format'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const schema = z.object({
  latitude: z.number({ error: 'Enter a latitude.' }).min(-90).max(90),
  longitude: z.number({ error: 'Enter a longitude.' }).min(-180).max(180),
  address: z.string().max(500).optional(),
  title: z.string().trim().min(3, 'Enter a short title.').max(140),
  description: z.string().trim().min(10, 'Describe the issue in a sentence or two.').max(4000),
  category: z.enum(CATEGORY_VALUES, { error: 'Choose a category.' }),
  severity: z.enum(SEVERITY_VALUES, { error: 'Choose a severity.' }),
  departmentName: z.string().trim().min(2, 'Choose a department.'),
})

type ReportValues = z.infer<typeof schema>

const steps = ['Photo and place', 'Review details', 'Confirm']

export function ReportPage() {
  useDocumentTitle('Report an issue')
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState('')
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'ready' | 'manual'>('idle')
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [edited, setEdited] = useState(false)
  const [locating, setLocating] = useState(false)
  const form = useForm<ReportValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      address: '',
      title: '',
      description: '',
      departmentName: '',
      latitude: undefined as unknown as number,
      longitude: undefined as unknown as number,
      category: undefined as unknown as ReportValues['category'],
      severity: undefined as unknown as ReportValues['severity'],
    },
  })

  function onFile(next: File | null) {
    setFileError('')
    setAnalysis(null)
    setAiState('idle')
    setEdited(false)
    if (!next) {
      setFile(null)
      setPreview(null)
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setFileError('Upload a JPEG, PNG, or WebP image.')
      return
    }
    if (next.size > 4 * 1024 * 1024) {
      setFileError('Images must be under 4 MB.')
      return
    }
    setFile(next)
    setPreview(URL.createObjectURL(next))
  }

  async function analyse() {
    if (!file) {
      setFileError('A complaint photo is required.')
      return
    }
    setAiState('loading')
    try {
      const dataUrl = await fileToDataUrl(file)
      const { data } = await api.post<AiAnalysis>('/api/ai/analyse-image', {
        imageBase64: dataUrl,
        mimeType: file.type,
      })
      const category = normalizeCategory(data.category)
      const severity = normalizeSeverity(data.severity)
      if (!category || !severity) {
        throw new Error('AI analysis returned details this form could not use. Enter them manually.')
      }
      setAnalysis(data)
      form.setValue('category', category)
      form.setValue('severity', severity)
      form.setValue('description', data.description)
      form.setValue('departmentName', data.department || departmentForCategory(category))
      const place = form.getValues('address')
      form.setValue('title', `${categoryLabel(category)}${place ? ` at ${place}` : ''}`.slice(0, 140))
      setEdited(false)
      setAiState('ready')
      setStep(1)
    } catch (error) {
      setAiState(getErrorCode(error) === 'AI_UNAVAILABLE' ? 'manual' : 'idle')
      toast.error(getErrorMessage(error, 'AI analysis failed. You can enter the details manually.'))
      setStep(1)
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      toast.error('This browser cannot share a location. Enter the latitude and longitude.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue('latitude', Number(position.coords.latitude.toFixed(6)), { shouldValidate: true })
        form.setValue('longitude', Number(position.coords.longitude.toFixed(6)), { shouldValidate: true })
        setLocating(false)
      },
      () => {
        setLocating(false)
        toast.error('Location permission was denied. Enter the latitude and longitude.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  async function lookupAddress() {
    const latitude = form.getValues('latitude')
    const longitude = form.getValues('longitude')
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast.error('Add a latitude and longitude first.')
      return
    }
    try {
      const { data } = await api.get<{ address: string }>('/api/geocode', { params: { lat: latitude, lng: longitude } })
      if (!data.address) {
        toast.error('No address was found. You can type one.')
        return
      }
      form.setValue('address', data.address)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Address lookup is unavailable. You can type the address.'))
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Report an issue</h1>
        <p className="text-sm text-slate-600">Upload a photo, confirm the place, then check the details before they are sent.</p>
      </div>
      <ol className="grid grid-cols-3 gap-2 text-xs font-semibold sm:text-sm">
        {steps.map((label, index) => (
          <li key={label} className={index === step ? 'rounded-full bg-navy px-3 py-2 text-center text-white' : 'rounded-full bg-white px-3 py-2 text-center text-slate-500 ring-1 ring-slate-200'}>
            {index + 1}. {label}
          </li>
        ))}
      </ol>
      <Card>
        <CardContent>
          {step === 0 ? (
            <div className="space-y-4">
              <Field label="Complaint photo" error={fileError}>
                <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onFile(event.target.files?.[0] ?? null)} />
              </Field>
              {preview ? <img src={preview} alt="Selected complaint" className="max-h-72 w-full rounded-xl object-cover" /> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Latitude" error={form.formState.errors.latitude?.message}>
                  <Input type="number" step="any" {...form.register('latitude', { valueAsNumber: true })} />
                </Field>
                <Field label="Longitude" error={form.formState.errors.longitude?.message}>
                  <Input type="number" step="any" {...form.register('longitude', { valueAsNumber: true })} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={locate} disabled={locating}>
                  {locating ? 'Finding location…' : 'Use my location'}
                </Button>
                <Button type="button" variant="outline" onClick={() => void lookupAddress()}>
                  Look up address
                </Button>
              </div>
              <Field label="Address (optional)" error={form.formState.errors.address?.message}>
                <Input {...form.register('address')} placeholder="Patia Square, Bhubaneswar" />
              </Field>
              <Button
                type="button"
                onClick={async () => {
                  if (!file) {
                    setFileError('A complaint photo is required.')
                    return
                  }
                  const valid = await form.trigger(['latitude', 'longitude', 'address'])
                  if (!valid) return
                  await analyse()
                }}
                disabled={aiState === 'loading'}
              >
                {aiState === 'loading' ? 'Analysing photo…' : 'Analyse photo'}
              </Button>
            </div>
          ) : null}

          {step === 1 ? (
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(() => setStep(2))}
            >
              {aiState === 'manual' ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">AI is unavailable. Enter the complaint details yourself. Nothing has been classified automatically.</p>
              ) : null}
              {analysis?.image_unclear ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">The image is unclear, so this result is uncertain. Correct anything that does not match the photo.</p>
              ) : null}
              {aiState === 'ready' ? (
                <p className="text-sm text-slate-600">Confidence {Math.round((analysis?.confidence ?? 0) * 100)}%. You can edit every field before submitting.</p>
              ) : null}
              <Field label="Title" error={form.formState.errors.title?.message}>
                <Input {...form.register('title', { onChange: () => setEdited(true) })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" error={form.formState.errors.category?.message}>
                  <Select
                    {...form.register('category', {
                      onChange: (event) => {
                        setEdited(true)
                        const category = event.target.value as ReportValues['category']
                        form.setValue('departmentName', departmentForCategory(category))
                      },
                    })}
                  >
                    <option value="">Choose</option>
                    {CATEGORY_VALUES.map((category) => (
                      <option key={category} value={category}>{categoryLabel(category)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Severity" error={form.formState.errors.severity?.message}>
                  <Select {...form.register('severity', { onChange: () => setEdited(true) })}>
                    <option value="">Choose</option>
                    {SEVERITY_VALUES.map((severity) => (
                      <option key={severity} value={severity}>{severityLabel(severity)}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Department" error={form.formState.errors.departmentName?.message}>
                <Select {...form.register('departmentName', { onChange: () => setEdited(true) })}>
                  <option value="">Choose</option>
                  {DEPARTMENTS.map((department) => (
                    <option key={department.id} value={department.name}>{department.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Description" error={form.formState.errors.description?.message}>
                <Textarea {...form.register('description', { onChange: () => setEdited(true) })} />
              </Field>
              {analysis ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <p><span className="font-semibold">Suggested action:</span> {analysis.recommended_action}</p>
                  <p className="mt-1"><span className="font-semibold">Why this priority:</span> {analysis.priority_reason}</p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(0)}>Back</Button>
                <Button type="submit">Review</Button>
              </div>
            </form>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4 text-sm">
              {preview ? <img src={preview} alt="Complaint" className="max-h-64 w-full rounded-xl object-cover" /> : null}
              <dl className="grid gap-2 sm:grid-cols-2">
                <Item label="Title" value={form.getValues('title')} />
                <Item label="Category" value={categoryLabel(form.getValues('category'))} />
                <Item label="Severity" value={severityLabel(form.getValues('severity'))} />
                <Item label="Department" value={form.getValues('departmentName')} />
                <Item label="Location" value={`${form.getValues('latitude')}, ${form.getValues('longitude')}`} />
                <Item label="Address" value={form.getValues('address') || 'Not provided'} />
              </dl>
              <p className="text-slate-700">{form.getValues('description')}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button
                  type="button"
                  disabled={form.formState.isSubmitting}
                  onClick={form.handleSubmit(async (values) => {
                    if (!file) {
                      toast.error('A complaint photo is required.')
                      setStep(0)
                      return
                    }
                    try {
                      const dataUrl = await fileToDataUrl(file)
                      const source = aiState === 'ready' ? (edited ? 'edited' : 'gemini') : 'manual'
                      const { data } = await api.post<{ complaint: { id: string; reference_number: string; duplicate_count: number } }>(
                        '/api/complaints',
                        {
                          ...values,
                          imageBase64: dataUrl,
                          mimeType: file.type,
                          aiSource: source,
                          aiConfidence: source === 'manual' ? null : analysis?.confidence ?? null,
                          aiAnalysis: source === 'manual' ? null : analysis,
                        },
                      )
                      toast.success(`Complaint ${data.complaint.reference_number} submitted.`)
                      if (data.complaint.duplicate_count > 0) {
                        toast.message('A possible duplicate was flagged for an administrator. Your complaint was still saved.')
                      }
                      navigate(`/app/complaints/${data.complaint.id}`)
                    } catch (error) {
                      toast.error(getErrorMessage(error))
                    }
                  })}
                >
                  {form.formState.isSubmitting ? 'Submitting…' : 'Submit complaint'}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  )
}
