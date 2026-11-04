import 'dotenv/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ACCOUNTS, DEPARTMENTS } from '../shared/constants.js'
import { demoComplaints } from '../shared/demoData.js'
import type { ComplaintUpdate, Role } from '../shared/types.js'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`Missing ${name}. Add it to .env before running npm run seed.`)
    process.exit(1)
  }
  return value
}

function password(name: string): string {
  const value = required(name)
  if (value.length < 8) {
    console.error(`${name} must be at least 8 characters.`)
    process.exit(1)
  }
  return value
}

async function findUser(supabase: SupabaseClient, email: string) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(error.message)
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (found) return found
    if (data.users.length < 200) return null
  }
  return null
}

async function ensureUser(
  supabase: SupabaseClient,
  email: string,
  userPassword: string,
  fullName: string,
  phone: string | null,
) {
  const existing = await findUser(supabase, email)
  if (existing) return existing.id
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: userPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone },
  })
  if (error || !data.user) throw new Error(error?.message || `Could not create ${email}`)
  return data.user.id
}

async function setProfile(
  supabase: SupabaseClient,
  id: string,
  role: Role,
  fullName: string,
  email: string,
  phone: string | null,
) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role, full_name: fullName, email, phone })
      .eq('id', id)
      .select('id')
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data) return
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  const { error } = await supabase.from('profiles').insert({
    id,
    role,
    full_name: fullName,
    email,
    phone,
  })
  if (error) throw new Error(error.message)
}

async function main() {
  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const citizenPassword = password('DEMO_CITIZEN_PASSWORD')
  const adminPassword = password('DEMO_ADMIN_PASSWORD')
  const officerPassword = process.env.DEMO_OFFICER_PASSWORD?.trim()

  const { data: departments, error: departmentError } = await supabase
    .from('departments')
    .upsert(
      DEPARTMENTS.map((department) => ({ name: department.name, description: department.description })),
      { onConflict: 'name' },
    )
    .select('id, name')
  if (departmentError || !departments) throw new Error(departmentError?.message || 'Could not save departments')
  const departmentIds = new Map(departments.map((department) => [department.name, department.id]))

  const citizenId = await ensureUser(
    supabase,
    DEMO_ACCOUNTS.citizen.email,
    citizenPassword,
    DEMO_ACCOUNTS.citizen.fullName,
    DEMO_ACCOUNTS.citizen.phone,
  )
  await setProfile(
    supabase,
    citizenId,
    'citizen',
    DEMO_ACCOUNTS.citizen.fullName,
    DEMO_ACCOUNTS.citizen.email,
    DEMO_ACCOUNTS.citizen.phone,
  )

  const adminId = await ensureUser(
    supabase,
    DEMO_ACCOUNTS.admin.email,
    adminPassword,
    DEMO_ACCOUNTS.admin.fullName,
    DEMO_ACCOUNTS.admin.phone,
  )
  await setProfile(
    supabase,
    adminId,
    'admin',
    DEMO_ACCOUNTS.admin.fullName,
    DEMO_ACCOUNTS.admin.email,
    DEMO_ACCOUNTS.admin.phone,
  )

  const officerIds = new Map<string, string>()
  if (officerPassword && officerPassword.length >= 8) {
    for (const officer of DEMO_ACCOUNTS.officers) {
      const id = await ensureUser(supabase, officer.email, officerPassword, officer.fullName, null)
      await setProfile(supabase, id, 'officer', officer.fullName, officer.email, null)
      officerIds.set(officer.id, id)
    }
  } else {
    console.log('DEMO_OFFICER_PASSWORD was not set. Sample complaints will be unassigned.')
  }

  const { data: existing, error: existingError } = await supabase.from('complaints').select('id, reference_number')
  if (existingError) throw new Error(existingError.message)
  const existingIds = new Map((existing ?? []).map((row) => [row.reference_number, row.id]))
  const referenceToId = new Map(existingIds)

  for (const complaint of demoComplaints) {
    if (existingIds.has(complaint.reference_number)) {
      console.log(`Skipping ${complaint.reference_number}`)
      continue
    }
    const { data, error } = await supabase
      .from('complaints')
      .insert({
        reference_number: complaint.reference_number,
        citizen_id: citizenId,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        severity: complaint.severity,
        status: complaint.status,
        department_id: complaint.department_name ? departmentIds.get(complaint.department_name) ?? null : null,
        assigned_officer_id: complaint.assigned_officer_id ? officerIds.get(complaint.assigned_officer_id) ?? null : null,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        address: complaint.address,
        ai_confidence: complaint.ai_confidence,
        ai_analysis: complaint.ai_analysis,
        created_at: complaint.created_at,
        updated_at: complaint.updated_at,
        resolved_at: complaint.resolved_at,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(error?.message || `Could not insert ${complaint.reference_number}`)
    referenceToId.set(complaint.reference_number, data.id)

    const updates: ComplaintUpdate[] = complaint.updates
    if (updates.length) {
      const { error: updateError } = await supabase.from('complaint_updates').insert(
        updates.map((item) => ({
          complaint_id: data.id,
          updated_by: item.updated_by === 'demo-admin' ? adminId : citizenId,
          old_status: item.old_status,
          new_status: item.new_status,
          remarks: item.remarks,
          is_internal: item.is_internal,
          created_at: item.created_at,
        })),
      )
      if (updateError) throw new Error(updateError.message)
    }
    console.log(`Inserted ${complaint.reference_number}`)
  }

  for (const complaint of demoComplaints) {
    const complaintId = referenceToId.get(complaint.reference_number)
    if (!complaintId) continue
    for (const flag of complaint.duplicate_flags) {
      const possible = demoComplaints.find((item) => item.id === flag.possible_duplicate_id)
      const possibleId = possible ? referenceToId.get(possible.reference_number) : null
      if (!possibleId) continue
      const { error } = await supabase.from('duplicate_flags').insert({
        complaint_id: complaintId,
        possible_duplicate_id: possibleId,
        similarity_score: flag.similarity_score,
        review_status: flag.review_status,
        created_at: flag.created_at,
      })
      if (error && error.code !== '23505') throw new Error(error.message)
    }
    for (const verification of complaint.verifications) {
      const { data: existingVerification } = await supabase
        .from('resolution_verifications')
        .select('id')
        .eq('complaint_id', complaintId)
        .limit(1)
        .maybeSingle()
      if (existingVerification) continue
      const { error } = await supabase.from('resolution_verifications').insert({
        complaint_id: complaintId,
        before_image_url: verification.before_image_url,
        after_image_url: verification.after_image_url,
        ai_result: verification.ai_result,
        human_verified: verification.human_verified,
        verified_by: verification.human_verified ? adminId : null,
        created_at: verification.created_at,
      })
      if (error) throw new Error(error.message)
    }
  }

  console.log('Seed complete.')
  console.log(`Citizen: ${DEMO_ACCOUNTS.citizen.email}`)
  console.log(`Administrator: ${DEMO_ACCOUNTS.admin.email}`)
  console.log('Passwords were read from the environment and were not printed.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
