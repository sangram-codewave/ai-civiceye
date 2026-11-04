import type { Category, Severity } from './types.js'

export const CATEGORY_VALUES = [
  'pothole',
  'garbage',
  'drainage',
  'streetlight',
  'water_leakage',
  'infrastructure',
  'other',
] as const satisfies readonly Category[]

export const SEVERITY_VALUES = ['low', 'medium', 'high', 'critical'] as const satisfies readonly Severity[]

export const STATUS_VALUES = ['pending', 'in_progress', 'resolved'] as const

export const DEPARTMENTS = [
  {
    id: 'road-maintenance',
    name: 'Road Maintenance',
    description: 'Carriageway repairs, potholes, and damaged civic infrastructure.',
  },
  {
    id: 'sanitation',
    name: 'Sanitation',
    description: 'Solid waste collection, overflowing bins, and street cleaning.',
  },
  {
    id: 'drainage',
    name: 'Drainage',
    description: 'Storm drains, blocked culverts, and sewage overflow.',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    description: 'Streetlights and public electrical fixtures.',
  },
  {
    id: 'water-supply',
    name: 'Water Supply',
    description: 'Leaking pipelines and public water supply faults.',
  },
] as const

export const DEMO_ACCOUNTS = {
  citizen: {
    email: 'asha.nayak@civiceye.demo',
    fullName: 'Asha Nayak',
    phone: '9876543210',
  },
  admin: {
    email: 'admin@civiceye.demo',
    fullName: 'Priya Mohanty',
    phone: '9876500000',
  },
  officers: [
    { id: 'officer-rakesh', email: 'rakesh.mohanty@civiceye.demo', fullName: 'Rakesh Mohanty' },
    { id: 'officer-meera', email: 'meera.das@civiceye.demo', fullName: 'Meera Das' },
    { id: 'officer-suresh', email: 'suresh.behera@civiceye.demo', fullName: 'Suresh Behera' },
    { id: 'officer-lata', email: 'lata.panda@civiceye.demo', fullName: 'Lata Panda' },
  ],
} as const

export const BENGALURU = { latitude: 12.9716, longitude: 77.5946 }

const CATEGORY_LABELS: Record<Category, string> = {
  pothole: 'Pothole',
  garbage: 'Garbage overflow',
  drainage: 'Drainage blockage',
  streetlight: 'Broken streetlight',
  water_leakage: 'Water leakage',
  infrastructure: 'Damaged public infrastructure',
  other: 'Other',
}

const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
}

export function categoryLabel(category: Category): string {
  return CATEGORY_LABELS[category]
}

export function severityLabel(severity: Severity): string {
  return SEVERITY_LABELS[severity]
}

export function statusLabel(status: 'pending' | 'in_progress' | 'resolved'): string {
  if (status === 'in_progress') return 'In progress'
  if (status === 'resolved') return 'Resolved'
  return 'Pending'
}

export function departmentForCategory(category: Category): string {
  switch (category) {
    case 'pothole':
    case 'infrastructure':
      return 'Road Maintenance'
    case 'garbage':
      return 'Sanitation'
    case 'drainage':
      return 'Drainage'
    case 'streetlight':
      return 'Electrical'
    case 'water_leakage':
      return 'Water Supply'
    default:
      return ''
  }
}

export function resolveDepartmentName(input: string | null | undefined): string | null {
  if (!input?.trim()) return null
  const found = DEPARTMENTS.find((item) => item.name.toLowerCase() === input.trim().toLowerCase())
  return found?.name ?? null
}

export function normalizeCategory(input: string): Category | null {
  const key = input.trim().toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  const aliases: Record<string, Category> = {
    pothole: 'pothole',
    road_pothole: 'pothole',
    garbage: 'garbage',
    garbage_overflow: 'garbage',
    drainage: 'drainage',
    drainage_blockage: 'drainage',
    streetlight: 'streetlight',
    broken_streetlight: 'streetlight',
    street_light: 'streetlight',
    water_leakage: 'water_leakage',
    water_leak: 'water_leakage',
    infrastructure: 'infrastructure',
    damaged_public_infrastructure: 'infrastructure',
    other: 'other',
  }
  return aliases[key] ?? null
}

export function normalizeSeverity(input: string): Severity | null {
  const key = input.trim().toLowerCase()
  if (key === 'low' || key === 'medium' || key === 'high' || key === 'critical') return key
  return null
}

export function departmentById(id: string | null | undefined) {
  return DEPARTMENTS.find((item) => item.id === id) ?? null
}
