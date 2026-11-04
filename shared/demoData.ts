import { DEMO_ACCOUNTS, categoryLabel, departmentById, severityLabel } from './constants'
import type { Complaint, ComplaintStatus, ComplaintUpdate } from './types'

type Draft = {
  n: number
  title: string
  description: string
  category: Complaint['category']
  severity: Complaint['severity']
  status: ComplaintStatus
  departmentId: string
  address: string
  latitude: number
  longitude: number
  created: string
  resolved?: string
  officerId?: string
  confidence: number
  action: string
  reason: string
  unclear?: boolean
  internal?: string
  progressNote?: string
  resolutionNote?: string
  verification?: {
    human: boolean
    confidence: number
    improvement: boolean
    observations: string
    recommendation: string
  }
}

const drafts: Draft[] = [
  {
    n: 1,
    title: 'Deep pothole near Patia Square',
    description: 'A wide break in the asphalt on the Patia Square approach is holding rainwater and forcing vehicles to swerve.',
    category: 'pothole',
    severity: 'critical',
    status: 'pending',
    departmentId: 'road-maintenance',
    address: 'Patia Square, Bhubaneswar',
    latitude: 20.3548,
    longitude: 85.8186,
    created: '2026-10-28T04:10:00.000Z',
    confidence: 0.93,
    action: 'Inspect the carriageway and close the break before peak traffic.',
    reason: 'The opening is large enough to damage a two-wheeler or throw a car off line.',
  },
  {
    n: 2,
    title: 'Overflowing waste bins at Jaydev Vihar',
    description: 'Household waste has spilled from the community bins onto the footpath opposite the Jaydev Vihar market.',
    category: 'garbage',
    severity: 'high',
    status: 'in_progress',
    departmentId: 'sanitation',
    address: 'Jaydev Vihar market, Bhubaneswar',
    latitude: 20.3018,
    longitude: 85.8192,
    created: '2026-10-18T06:20:00.000Z',
    officerId: 'officer-rakesh',
    confidence: 0.88,
    action: 'Clear the spill and increase the evening collection round.',
    reason: 'Waste is blocking pedestrians and attracting stray animals.',
    progressNote: 'Sanitation crew scheduled for the evening collection.',
  },
  {
    n: 3,
    title: 'Blocked drain on Saheed Nagar main road',
    description: 'The roadside drain in front of the Saheed Nagar shops is clogged and storm water is standing on the lane.',
    category: 'drainage',
    severity: 'medium',
    status: 'pending',
    departmentId: 'drainage',
    address: 'Saheed Nagar main road, Bhubaneswar',
    latitude: 20.2889,
    longitude: 85.8448,
    created: '2026-10-30T08:00:00.000Z',
    confidence: 0.81,
    action: 'Desilt the inlet and confirm the downstream pipe is open.',
    reason: 'Water is pooling, but it is not yet entering homes.',
  },
  {
    n: 4,
    title: 'Streetlight out along Khandagiri road',
    description: 'Three consecutive streetlights on the Khandagiri approach have been dark for several nights.',
    category: 'streetlight',
    severity: 'high',
    status: 'in_progress',
    departmentId: 'electrical',
    address: 'Khandagiri road, Bhubaneswar',
    latitude: 20.2554,
    longitude: 85.7786,
    created: '2026-10-11T13:40:00.000Z',
    officerId: 'officer-meera',
    confidence: 0.86,
    action: 'Replace the failed fittings and check the feeder line.',
    reason: 'A dark stretch of road is a risk for pedestrians after dusk.',
    progressNote: 'Electrical team has the feeder on the work list.',
  },
  {
    n: 5,
    title: 'Pipeline leak at Rasulgarh crossing',
    description: 'Treated water is jetting from a joint near the Rasulgarh crossing and running into the bus bay.',
    category: 'water_leakage',
    severity: 'critical',
    status: 'pending',
    departmentId: 'water-supply',
    address: 'Rasulgarh crossing, Bhubaneswar',
    latitude: 20.2762,
    longitude: 85.8631,
    created: '2026-11-01T03:15:00.000Z',
    confidence: 0.95,
    action: 'Isolate the joint and repair it before the morning peak.',
    reason: 'The leak is continuous and is undermining the road edge.',
  },
  {
    n: 6,
    title: 'Repaired carriageway patch in Chandrasekharpur',
    description: 'A medium pothole on the Chandrasekharpur service lane was reported and later patched.',
    category: 'pothole',
    severity: 'medium',
    status: 'resolved',
    departmentId: 'road-maintenance',
    address: 'Chandrasekharpur service lane, Bhubaneswar',
    latitude: 20.3312,
    longitude: 85.8104,
    created: '2026-09-12T05:00:00.000Z',
    resolved: '2026-09-18T09:30:00.000Z',
    officerId: 'officer-suresh',
    confidence: 0.79,
    action: 'Fill and compact the failed patch.',
    reason: 'The defect was confined to one wheel track.',
    resolutionNote: 'Patch compacted and the lane reopened.',
    verification: {
      human: true,
      confidence: 0.74,
      improvement: true,
      observations: 'The stored sample note says the repaired patch covers the earlier break in the road surface.',
      recommendation: 'A municipal officer should confirm the repair on site before treating similar cases as closed.',
    },
  },
  {
    n: 7,
    title: 'Garbage heap beside Patia village road',
    description: 'Mixed waste has been dumped beside the Patia village road, blocking the shoulder.',
    category: 'garbage',
    severity: 'medium',
    status: 'pending',
    departmentId: 'sanitation',
    address: 'Patia village road, Bhubaneswar',
    latitude: 20.3496,
    longitude: 85.8244,
    created: '2026-11-02T07:45:00.000Z',
    confidence: 0.84,
    action: 'Lift the dump and watch the spot for repeat dumping.',
    reason: 'The heap is local and is not yet spilling into traffic.',
  },
  {
    n: 8,
    title: 'Another waste dump near Patia village road',
    description: 'A second report of mixed waste dumped on the shoulder of the Patia village road, close to an earlier complaint.',
    category: 'garbage',
    severity: 'high',
    status: 'pending',
    departmentId: 'sanitation',
    address: 'Patia village road, near the weekly market, Bhubaneswar',
    latitude: 20.3504,
    longitude: 85.8251,
    created: '2026-11-03T02:20:00.000Z',
    confidence: 0.83,
    action: 'Compare with the nearby open complaint before sending a second crew.',
    reason: 'The dump is spreading toward the carriageway.',
  },
  {
    n: 9,
    title: 'Single dark lamp in Jaydev Vihar',
    description: 'One streetlight outside the Jaydev Vihar park gate was out and has since been replaced.',
    category: 'streetlight',
    severity: 'low',
    status: 'resolved',
    departmentId: 'electrical',
    address: 'Jaydev Vihar park gate, Bhubaneswar',
    latitude: 20.2968,
    longitude: 85.8241,
    created: '2026-08-04T12:00:00.000Z',
    resolved: '2026-08-08T11:00:00.000Z',
    officerId: 'officer-meera',
    confidence: 0.7,
    action: 'Replace the lamp.',
    reason: 'Nearby lights were still working.',
    resolutionNote: 'Lamp replaced and the pole is lit.',
  },
  {
    n: 10,
    title: 'Broken road edge in Saheed Nagar',
    description: 'The bitumen edge outside a Saheed Nagar apartment has crumbled into a long pothole.',
    category: 'pothole',
    severity: 'high',
    status: 'in_progress',
    departmentId: 'road-maintenance',
    address: 'Saheed Nagar, Lane 3, Bhubaneswar',
    latitude: 20.2914,
    longitude: 85.8412,
    created: '2026-10-06T04:50:00.000Z',
    officerId: 'officer-suresh',
    confidence: 0.9,
    action: 'Cut back the failed edge and lay a fresh patch.',
    reason: 'Two-wheelers are dropping into the broken edge.',
    progressNote: 'Road crew marked the failed section.',
  },
  {
    n: 11,
    title: 'Drain surcharge at Khandagiri',
    description: 'Sewage is surcharging from a manhole on the Khandagiri lower road after rain.',
    category: 'drainage',
    severity: 'critical',
    status: 'pending',
    departmentId: 'drainage',
    address: 'Khandagiri lower road, Bhubaneswar',
    latitude: 20.2588,
    longitude: 85.7815,
    created: '2026-10-25T09:10:00.000Z',
    confidence: 0.92,
    action: 'Clear the blockage and disinfect the spill area.',
    reason: 'Sewage on the road is a direct public-health risk.',
    internal: 'Night desilting crew requested. Do not close this before the downstream line is checked.',
  },
  {
    n: 12,
    title: 'Cleared litter point at Rasulgarh',
    description: 'A small litter point near the Rasulgarh bus stop was lifted.',
    category: 'garbage',
    severity: 'low',
    status: 'resolved',
    departmentId: 'sanitation',
    address: 'Rasulgarh bus stop, Bhubaneswar',
    latitude: 20.2728,
    longitude: 85.8588,
    created: '2026-07-16T06:00:00.000Z',
    resolved: '2026-07-21T08:40:00.000Z',
    officerId: 'officer-rakesh',
    confidence: 0.66,
    action: 'Remove the litter and wash the spot.',
    reason: 'The pile was small and away from the carriageway.',
    resolutionNote: 'Litter removed. Awaiting a human check of the after photo.',
    verification: {
      human: false,
      confidence: 0.58,
      improvement: true,
      observations: 'The sample comparison notes less loose waste than the earlier description, but the photo angle is different.',
      recommendation: 'A person should confirm the spot is clean before this case is treated as verified.',
    },
  },
  {
    n: 13,
    title: 'Damaged footpath slab in Chandrasekharpur',
    description: 'Two footpath slabs near the Chandrasekharpur market have collapsed, leaving a hole beside the shops.',
    category: 'infrastructure',
    severity: 'medium',
    status: 'pending',
    departmentId: 'road-maintenance',
    address: 'Chandrasekharpur market, Bhubaneswar',
    latitude: 20.3274,
    longitude: 85.8062,
    created: '2026-09-29T10:25:00.000Z',
    confidence: 0.77,
    action: 'Replace the broken slabs and check the base.',
    reason: 'Pedestrians can step into the gap, but traffic is unaffected.',
  },
  {
    n: 14,
    title: 'Water leak on Patia main feeder',
    description: 'A service pipe on the Patia main feeder is leaking across the footpath.',
    category: 'water_leakage',
    severity: 'high',
    status: 'in_progress',
    departmentId: 'water-supply',
    address: 'Patia main road, Bhubaneswar',
    latitude: 20.3461,
    longitude: 85.8127,
    created: '2026-10-08T02:55:00.000Z',
    officerId: 'officer-lata',
    confidence: 0.89,
    action: 'Shut the valve, replace the joint, and restore supply.',
    reason: 'The leak is steady and is making the footpath slippery.',
    progressNote: 'Valve location confirmed by the water supply team.',
  },
  {
    n: 15,
    title: 'Unclear photo of a Jaydev Vihar drain',
    description: 'The image is unclear. A resident reported standing water near a Jaydev Vihar drain, but the photo does not show the inlet clearly.',
    category: 'drainage',
    severity: 'low',
    status: 'pending',
    departmentId: 'drainage',
    address: 'Jaydev Vihar, Lane 7, Bhubaneswar',
    latitude: 20.3044,
    longitude: 85.8266,
    created: '2026-11-03T11:05:00.000Z',
    confidence: 0.32,
    action: 'Ask for a clearer photo or inspect the lane.',
    reason: 'The image is unclear, so the severity should not be treated as certain.',
    unclear: true,
  },
  {
    n: 16,
    title: 'Dark stretch in Saheed Nagar',
    description: 'A full row of streetlights is out on the Saheed Nagar ring, leaving the junction dark.',
    category: 'streetlight',
    severity: 'critical',
    status: 'pending',
    departmentId: 'electrical',
    address: 'Saheed Nagar ring road, Bhubaneswar',
    latitude: 20.2861,
    longitude: 85.8494,
    created: '2026-10-31T14:15:00.000Z',
    confidence: 0.91,
    action: 'Restore the circuit and replace damaged fittings.',
    reason: 'The junction has no working public light.',
  },
  {
    n: 17,
    title: 'Market waste at Khandagiri haat',
    description: 'Vegetable waste from the Khandagiri haat is piled against the compound wall.',
    category: 'garbage',
    severity: 'medium',
    status: 'in_progress',
    departmentId: 'sanitation',
    address: 'Khandagiri haat, Bhubaneswar',
    latitude: 20.2519,
    longitude: 85.7748,
    created: '2026-09-21T04:30:00.000Z',
    officerId: 'officer-rakesh',
    confidence: 0.8,
    action: 'Clear the organic waste and add a market-day pickup.',
    reason: 'The pile smells and blocks the walkway, but the road is open.',
    progressNote: 'Extra market-day pickup added to the ward roster.',
  },
  {
    n: 18,
    title: 'Small pothole at Rasulgarh lane',
    description: 'A shallow pothole on a Rasulgarh side lane was filled.',
    category: 'pothole',
    severity: 'low',
    status: 'resolved',
    departmentId: 'road-maintenance',
    address: 'Rasulgarh side lane, Bhubaneswar',
    latitude: 20.2794,
    longitude: 85.8552,
    created: '2026-06-14T05:40:00.000Z',
    resolved: '2026-06-20T07:10:00.000Z',
    officerId: 'officer-suresh',
    confidence: 0.68,
    action: 'Fill the shallow break during routine patching.',
    reason: 'The defect is small and on a low-speed lane.',
    resolutionNote: 'Cold mix placed and checked by the ward supervisor.',
  },
  {
    n: 19,
    title: 'Seep near Chandrasekharpur tank',
    description: 'A slow seep from a valve chamber is wetting the path near the Chandrasekharpur elevated tank.',
    category: 'water_leakage',
    severity: 'low',
    status: 'pending',
    departmentId: 'water-supply',
    address: 'Chandrasekharpur elevated tank, Bhubaneswar',
    latitude: 20.3348,
    longitude: 85.8148,
    created: '2026-10-17T08:35:00.000Z',
    confidence: 0.71,
    action: 'Repack the valve and check for a chamber crack.',
    reason: 'The seep is slow and is not flooding the road.',
  },
  {
    n: 20,
    title: 'Broken railing at Jaydev Vihar bridge',
    description: 'A section of pedestrian railing on the Jaydev Vihar bridge is bent and detached.',
    category: 'infrastructure',
    severity: 'high',
    status: 'pending',
    departmentId: 'road-maintenance',
    address: 'Jaydev Vihar bridge, Bhubaneswar',
    latitude: 20.2992,
    longitude: 85.8155,
    created: '2026-11-04T01:25:00.000Z',
    confidence: 0.87,
    action: 'Barricade the gap and replace the railing section.',
    reason: 'The missing railing is on a bridge footpath.',
  },
  {
    n: 21,
    title: 'Cleared bin overflow in Saheed Nagar',
    description: 'An overflowing bin near the Saheed Nagar post office was emptied and the spot washed.',
    category: 'garbage',
    severity: 'medium',
    status: 'resolved',
    departmentId: 'sanitation',
    address: 'Saheed Nagar post office, Bhubaneswar',
    latitude: 20.2936,
    longitude: 85.8384,
    created: '2026-08-22T06:15:00.000Z',
    resolved: '2026-08-27T10:00:00.000Z',
    officerId: 'officer-rakesh',
    confidence: 0.76,
    action: 'Empty the bin and wash the pad.',
    reason: 'Waste had spilled but remained on the bin pad.',
    resolutionNote: 'Bin emptied and the pad washed.',
  },
  {
    n: 22,
    title: 'Flickering lights in Patia',
    description: 'Streetlights along the Patia IT corridor flicker and drop out after 9 pm.',
    category: 'streetlight',
    severity: 'medium',
    status: 'in_progress',
    departmentId: 'electrical',
    address: 'Patia IT corridor, Bhubaneswar',
    latitude: 20.3572,
    longitude: 85.8218,
    created: '2026-10-02T15:05:00.000Z',
    officerId: 'officer-meera',
    confidence: 0.74,
    action: 'Check the timer and tighten the neutral connection.',
    reason: 'The road is not fully dark, but the flicker is persistent.',
    progressNote: 'Timer panel inspection is booked.',
  },
]

function addDays(iso: string, days: number): string {
  const date = new Date(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

function officerName(id: string | undefined): string | null {
  if (!id) return null
  return DEMO_ACCOUNTS.officers.find((officer) => officer.id === id)?.fullName ?? null
}

function update(
  complaintId: string,
  suffix: string,
  createdAt: string,
  oldStatus: Complaint['status'] | null,
  newStatus: Complaint['status'],
  remarks: string,
  internal = false,
): ComplaintUpdate {
  const author = internal || oldStatus !== null ? DEMO_ACCOUNTS.admin : DEMO_ACCOUNTS.citizen
  return {
    id: `${complaintId}-${suffix}`,
    complaint_id: complaintId,
    updated_by: internal || oldStatus !== null ? 'demo-admin' : 'demo-citizen',
    author_name: author.fullName,
    old_status: oldStatus,
    new_status: newStatus,
    remarks,
    is_internal: internal,
    created_at: createdAt,
  }
}

function build(draft: Draft): Complaint {
  const id = `demo-${String(draft.n).padStart(2, '0')}`
  const department = departmentById(draft.departmentId)
  const updates: ComplaintUpdate[] = [
    update(id, 'submitted', draft.created, null, 'pending', 'Complaint submitted.'),
  ]
  if (draft.internal) {
    updates.push(update(id, 'internal', addDays(draft.created, 0), 'pending', draft.status === 'pending' ? 'pending' : draft.status, draft.internal, true))
  }
  if (draft.status !== 'pending') {
    updates.push(
      update(
        id,
        'progress',
        addDays(draft.created, 1),
        'pending',
        'in_progress',
        draft.progressNote ?? 'Assigned for field inspection.',
      ),
    )
  }
  if (draft.status === 'resolved' && draft.resolved) {
    updates.push(
      update(id, 'resolved', draft.resolved, 'in_progress', 'resolved', draft.resolutionNote ?? 'Work completed.'),
    )
  }
  return {
    id,
    reference_number: `CE-2026-${String(draft.n).padStart(5, '0')}`,
    citizen_id: 'demo-citizen',
    citizen_name: DEMO_ACCOUNTS.citizen.fullName,
    title: draft.title,
    description: draft.description,
    category: draft.category,
    severity: draft.severity,
    status: draft.status,
    department_id: draft.departmentId,
    department_name: department?.name ?? null,
    assigned_officer_id: draft.officerId ?? null,
    assigned_officer_name: officerName(draft.officerId),
    image_url: null,
    resolution_image_url: null,
    latitude: draft.latitude,
    longitude: draft.longitude,
    address: draft.address,
    ai_confidence: draft.confidence,
    ai_analysis: {
      category: categoryLabel(draft.category),
      severity: severityLabel(draft.severity),
      description: draft.description,
      department: department?.name ?? '',
      confidence: draft.confidence,
      recommended_action: draft.action,
      priority_reason: draft.reason,
      image_unclear: draft.unclear ?? false,
      source: 'gemini',
    },
    created_at: draft.created,
    updated_at: draft.resolved ?? draft.created,
    resolved_at: draft.resolved ?? null,
    updates,
    duplicate_flags: [],
    verifications: draft.verification
      ? [
          {
            id: `${id}-verification`,
            complaint_id: id,
            before_image_url: null,
            after_image_url: null,
            ai_result: {
              improvement_detected: draft.verification.improvement,
              observations: draft.verification.observations,
              confidence: draft.verification.confidence,
              recommendation: draft.verification.recommendation,
            },
            human_verified: draft.verification.human,
            verified_by: draft.verification.human ? 'demo-admin' : null,
            created_at: draft.resolved ?? draft.created,
          },
        ]
      : [],
    duplicate_count: 0,
  }
}

export const demoComplaints: Complaint[] = drafts.map(build)

const duplicateSource = demoComplaints.find((item) => item.reference_number === 'CE-2026-00008')
const duplicateTarget = demoComplaints.find((item) => item.reference_number === 'CE-2026-00007')
if (duplicateSource && duplicateTarget) {
  duplicateSource.duplicate_flags = [
    {
      id: 'demo-flag-08-07',
      complaint_id: duplicateSource.id,
      possible_duplicate_id: duplicateTarget.id,
      possible_duplicate_reference: duplicateTarget.reference_number,
      similarity_score: 0.82,
      review_status: 'pending',
      created_at: duplicateSource.created_at,
    },
  ]
  duplicateSource.duplicate_count = 1
}

export const demoOfficers = DEMO_ACCOUNTS.officers.map((officer) => ({
  id: officer.id,
  fullName: officer.fullName,
  email: officer.email,
  role: 'officer' as const,
}))
