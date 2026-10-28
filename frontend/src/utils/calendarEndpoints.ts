/**
 * Crestara CRM - Calendar & Scheduling Endpoints Service
 * Standalone, decoupled service for calendar events, attendee lookups,
 * and 1-click calendar invites (Google, Outlook, Apple .ICS).
 * Replaces Frappe Event DocType with native Supabase PostgreSQL + offline local fallback.
 */

import { supabase } from '@/utils/supabase'
import {
  sendCalendarInvitationEmails,
  sendCalendarCancellationEmails,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsContent,
} from './mailer'

export interface CalendarParticipant {
  email: string
  full_name?: string
  label?: string
  attending?: 'Yes' | 'No' | 'Maybe' | 'Awaiting'
  reference_doctype?: string
  reference_docname?: string
}

export interface CalendarNotification {
  type: 'Notification' | 'Email'
  before: number
  interval: 'minutes' | 'hours' | 'days' | 'weeks'
  time?: string
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  status: 'Open' | 'Completed' | 'Cancelled'
  fromDate: string
  toDate: string
  fromTime: string
  toTime: string
  isFullDay: boolean
  eventType?: string
  location?: string
  color?: string
  attending?: 'Yes' | 'No' | 'Maybe' | 'Awaiting'
  referenceDoctype?: string
  referenceDocname?: string
  owner?: any
  event_participants?: CalendarParticipant[]
  notifications?: CalendarNotification[]
  isInvoice?: boolean
  invoiceId?: string
  created_at?: string
  updated_at?: string
}

export const CALENDAR_STORAGE_KEY = 'crestara_calendar_events'

// ============================================================================
// LOCAL STORAGE CACHE HELPERS
// ============================================================================

export function loadStoredEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(CALENDAR_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveStoredEvents(events: CalendarEvent[]): void {
  try {
    localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(events))
  } catch (e) {
    console.warn('[Calendar] Failed to save local events cache:', e)
  }
}

// ============================================================================
// DATE & TIME CALCULATION HELPERS
// ============================================================================

export function allTimeSlots() {
  const out = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const ampm = h >= 12 ? 'pm' : 'am'
      const hour12 = h % 12 === 0 ? 12 : h % 12
      out.push({
        value: `${hh}:${mm}`,
        label: `${hour12}:${mm} ${ampm}`,
      })
    }
  }
  return out
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} mins`
  const hours = mins / 60
  if (Number.isInteger(hours)) {
    return hours === 1 ? '1 hr' : `${hours} hrs`
  }
  const formatted = hours % 1 === 0.5 ? hours.toFixed(1) : hours.toFixed(2)
  return `${formatted} hrs`
}

export function buildEndTimeOptions(fromTime?: string) {
  const timeSlots = allTimeSlots()
  if (!fromTime) return timeSlots
  const startIndex = timeSlots.findIndex((o) => o.value > fromTime)
  if (startIndex === -1) return []
  const [fh, fm] = fromTime.split(':').map((n) => parseInt(n, 10))
  const fromTotal = fh * 60 + fm
  return timeSlots.slice(startIndex).map((o) => {
    const [th, tm] = o.value.split(':').map((n) => parseInt(n, 10))
    const toTotal = th * 60 + tm
    const duration = toTotal - fromTotal
    return { ...o, label: `${o.label} (${formatDuration(duration)})` }
  })
}

export function computeAutoToTime(fromTime?: string): string {
  if (!fromTime) return ''
  const [hour, minute] = fromTime.split(':').map((n) => parseInt(n, 10))
  let nh = hour + 1
  let nm = minute
  if (nh >= 24) {
    nh = 23
    nm = 59
  }
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export function validateTimeRange({
  fromDate,
  fromTime,
  toTime,
  isFullDay,
}: {
  fromDate?: string
  fromTime?: string
  toTime?: string
  isFullDay?: boolean
}): { valid: boolean; error: string | null } {
  if (isFullDay) return { valid: true, error: null }
  if (!fromTime || !toTime) {
    return { valid: false, error: 'Start & End Time Are Required' }
  }
  if (!fromDate) {
    return { valid: false, error: 'Event Date is Required' }
  }

  const start = new Date(`${fromDate}T${fromTime}:00`)
  const end = new Date(`${fromDate}T${toTime}:00`)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid Start Or End Time' }
  }
  if (end.getTime() <= start.getTime()) {
    return { valid: false, error: 'End Time Should Be After Start Time' }
  }
  return { valid: true, error: null }
}

export function normalizeParticipants(list: any[] = []): CalendarParticipant[] {
  const seen = new Set<string>()
  const out: CalendarParticipant[] = []
  for (const a of list || []) {
    const email = typeof a === 'string' ? a.trim() : a?.email?.trim()
    if (!email || seen.has(email.toLowerCase())) continue
    seen.add(email.toLowerCase())
    out.push({
      email,
      full_name: a?.full_name || a?.label || email.split('@')[0],
      label: a?.label || a?.full_name || email.split('@')[0],
      attending: a?.attending || 'Awaiting',
      reference_doctype: a?.reference_doctype || 'Contact',
      reference_docname: a?.reference_docname || '',
    })
  }
  return out
}

// ============================================================================
// SUPABASE OBJECT TRANSFORMERS
// ============================================================================

export function parseSupabaseEvent(row: any): CalendarEvent {
  const start = row.starts_on ? new Date(row.starts_on) : new Date()
  const end = row.ends_on ? new Date(row.ends_on) : start
  const pad = (n: number) => String(n).padStart(2, '0')
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

  return {
    id: row.id,
    title: row.subject || row.title || 'Untitled Event',
    description: row.description || '',
    status: row.status || 'Open',
    fromDate: toDateStr(start),
    toDate: toDateStr(end),
    fromTime: toTimeStr(start),
    toTime: toTimeStr(end),
    isFullDay: Boolean(row.all_day),
    eventType: row.event_type || 'Public',
    location: row.location || '',
    color: row.color || '#30A66D',
    attending: row.attending || 'Yes',
    referenceDoctype: row.reference_doctype || '',
    referenceDocname: row.reference_docname || '',
    owner: row.owner || '',
    event_participants: Array.isArray(row.event_participants) ? row.event_participants : [],
    notifications: Array.isArray(row.notifications) ? row.notifications : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function buildSupabaseEventPayload(ev: Partial<CalendarEvent>) {
  const isFullDay = Boolean(ev.isFullDay)
  const startsOn = isFullDay
    ? `${ev.fromDate}T00:00:00.000Z`
    : `${ev.fromDate}T${ev.fromTime || '09:00'}:00`
  const endsOn = isFullDay
    ? `${ev.toDate || ev.fromDate}T23:59:59.000Z`
    : `${ev.toDate || ev.fromDate}T${ev.toTime || '10:00'}:00`

  return {
    subject: ev.title || 'Meeting',
    description: ev.description || '',
    starts_on: startsOn,
    ends_on: endsOn,
    all_day: isFullDay,
    event_type: ev.eventType || 'Public',
    status: ev.status || 'Open',
    location: ev.location || '',
    color: ev.color || '#30A66D',
    attending: ev.attending || 'Yes',
    reference_doctype: ev.referenceDoctype || '',
    reference_docname: ev.referenceDocname || '',
    owner:
      typeof ev.owner === 'object'
        ? ev.owner?.value || ev.owner?.email || ''
        : ev.owner || '',
    event_participants: ev.event_participants || [],
    notifications: ev.notifications || [],
    updated_at: new Date().toISOString(),
  }
}

// ============================================================================
// CRUD SERVICE OPERATIONS
// ============================================================================

export interface FetchCalendarParams {
  startDate?: string
  endDate?: string
  user?: string | null
  referenceDoctype?: string
  referenceDocname?: string
}

export async function fetchCalendarEvents(params: FetchCalendarParams = {}): Promise<CalendarEvent[]> {
  try {
    let query = supabase.from('events').select('*')

    if (params.startDate) {
      query = query.gte('ends_on', `${params.startDate}T00:00:00.000Z`)
    }
    if (params.endDate) {
      query = query.lte('starts_on', `${params.endDate}T23:59:59.000Z`)
    }
    if (params.referenceDoctype) {
      query = query.eq('reference_doctype', params.referenceDoctype)
    }
    if (params.referenceDocname) {
      query = query.eq('reference_docname', params.referenceDocname)
    }

    const { data, error } = await query.order('starts_on', { ascending: true })

    if (!error && Array.isArray(data)) {
      let events = data.map(parseSupabaseEvent)

      // Filter by staff user if specified (owner or in participants)
      if (params.user) {
        const u = params.user.toLowerCase()
        events = events.filter((ev) => {
          const ownerMatch = typeof ev.owner === 'string' && ev.owner.toLowerCase() === u
          const participantMatch = ev.event_participants?.some(
            (p) => p.email?.toLowerCase() === u,
          )
          return ownerMatch || participantMatch
        })
      }

      saveStoredEvents(events)
      return events
    }
  } catch (err) {
    console.warn('[Calendar] Failed to fetch events from Supabase, using cache fallback:', err)
  }

  // Fallback to local storage
  let localEvents = loadStoredEvents()
  if (params.referenceDoctype && params.referenceDocname) {
    localEvents = localEvents.filter(
      (ev) =>
        ev.referenceDoctype === params.referenceDoctype &&
        ev.referenceDocname === params.referenceDocname,
    )
  }
  if (params.user) {
    const u = params.user.toLowerCase()
    localEvents = localEvents.filter((ev) => {
      const ownerMatch = typeof ev.owner === 'string' && ev.owner.toLowerCase() === u
      const participantMatch = ev.event_participants?.some(
        (p) => p.email?.toLowerCase() === u,
      )
      return ownerMatch || participantMatch
    })
  }
  return localEvents
}

export async function createCalendarEvent(
  eventData: Partial<CalendarEvent>,
  options: { sendInvites?: boolean; businessSettings?: any; personalMessage?: string } = {},
): Promise<CalendarEvent> {
  const payload = buildSupabaseEventPayload(eventData)

  let createdEvent: CalendarEvent | null = null

  try {
    const { data, error } = await supabase.from('events').insert([payload]).select('*').single()
    if (!error && data) {
      createdEvent = parseSupabaseEvent(data)
    }
  } catch (err) {
    console.warn('[Calendar] Supabase insert error, falling back to local creation:', err)
  }

  if (!createdEvent) {
    const fallbackId = `evt-${Date.now()}`
    createdEvent = parseSupabaseEvent({
      id: fallbackId,
      ...payload,
      created_at: new Date().toISOString(),
    })
  }

  // Update local cache
  const stored = loadStoredEvents().filter((e) => e.id !== createdEvent!.id)
  stored.push(createdEvent)
  saveStoredEvents(stored)

  // Dispatch email invitations with 1-click Google, Outlook & Apple .ICS
  if (options.sendInvites && createdEvent.event_participants?.length) {
    try {
      await sendCalendarInvitationEmails({
        event: createdEvent,
        attendees: createdEvent.event_participants,
        businessSettings: options.businessSettings || {},
        isUpdate: false,
        personalMessage: options.personalMessage,
      })
    } catch (e) {
      console.warn('[Calendar] Failed to dispatch invitation emails:', e)
    }
  }

  return createdEvent
}

export async function updateCalendarEvent(
  id: string,
  eventData: Partial<CalendarEvent>,
  options: { sendInvites?: boolean; businessSettings?: any; personalMessage?: string } = {},
): Promise<CalendarEvent> {
  const payload = buildSupabaseEventPayload(eventData)

  let updatedEvent: CalendarEvent | null = null

  try {
    const { data, error } = await supabase
      .from('events')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (!error && data) {
      updatedEvent = parseSupabaseEvent(data)
    }
  } catch (err) {
    console.warn('[Calendar] Supabase update error, falling back to local update:', err)
  }

  if (!updatedEvent) {
    updatedEvent = parseSupabaseEvent({
      id,
      ...payload,
    })
  }

  // Update local cache
  const stored = loadStoredEvents()
  const idx = stored.findIndex((e) => e.id === id)
  if (idx !== -1) {
    stored[idx] = updatedEvent
  } else {
    stored.push(updatedEvent)
  }
  saveStoredEvents(stored)

  // Dispatch updated invitations if requested
  if (options.sendInvites && updatedEvent.event_participants?.length) {
    try {
      await sendCalendarInvitationEmails({
        event: updatedEvent,
        attendees: updatedEvent.event_participants,
        businessSettings: options.businessSettings || {},
        isUpdate: true,
        personalMessage: options.personalMessage,
      })
    } catch (e) {
      console.warn('[Calendar] Failed to dispatch updated invitation emails:', e)
    }
  }

  return updatedEvent
}

export async function deleteCalendarEvent(
  id: string,
  options: { sendCancellation?: boolean; businessSettings?: any; personalMessage?: string } = {},
): Promise<boolean> {
  const stored = loadStoredEvents()
  const target = stored.find((e) => e.id === id)

  try {
    await supabase.from('events').delete().eq('id', id)
  } catch (err) {
    console.warn('[Calendar] Supabase delete error:', err)
  }

  // Remove from local cache
  const remaining = stored.filter((e) => e.id !== id)
  saveStoredEvents(remaining)

  // Dispatch cancellation emails if requested
  if (options.sendCancellation && target && target.event_participants?.length) {
    try {
      await sendCalendarCancellationEmails({
        event: target,
        attendees: target.event_participants,
        businessSettings: options.businessSettings || {},
        personalMessage: options.personalMessage,
      })
    } catch (e) {
      console.warn('[Calendar] Failed to dispatch cancellation emails:', e)
    }
  }

  return true
}

export async function updateAttendingStatus(
  eventId: string,
  attendeeEmail: string,
  status: 'Yes' | 'No' | 'Maybe' | 'Awaiting',
): Promise<CalendarEvent | null> {
  const stored = loadStoredEvents()
  const ev = stored.find((e) => e.id === eventId)
  if (!ev) return null

  const isOwner =
    typeof ev.owner === 'string'
      ? ev.owner.toLowerCase() === attendeeEmail.toLowerCase()
      : ev.owner?.value?.toLowerCase() === attendeeEmail.toLowerCase()

  if (isOwner) {
    ev.attending = status
  } else if (Array.isArray(ev.event_participants)) {
    const part = ev.event_participants.find((p) => p.email?.toLowerCase() === attendeeEmail.toLowerCase())
    if (part) {
      part.attending = status
    } else {
      ev.event_participants.push({
        email: attendeeEmail,
        attending: status,
      })
    }
  }

  // Update local storage immediately
  saveStoredEvents(stored)

  // Sync to Supabase
  try {
    await supabase
      .from('events')
      .update({
        attending: ev.attending,
        event_participants: ev.event_participants,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)
  } catch (e) {
    console.warn('[Calendar] Could not sync attending status to Supabase:', e)
  }

  return ev
}

/**
 * Searches across customers (and contacts) and profiles for attendee autosuggestions
 * Replaces Frappe `crm.api.contact.search_emails`
 */
export async function searchCalendarAttendees(
  query: string,
  existingEmails: string[] = [],
  businessStore?: any,
): Promise<{ label: string; value: string; name: string; type: string }[]> {
  const q = (query || '').trim().toLowerCase()
  const exclude = new Set(existingEmails.map((e) => e.toLowerCase()))

  const results: { label: string; value: string; name: string; type: string }[] = []

  // 1. Check local business store users (team members)
  const storeUsers = businessStore?.users || []
  for (const u of storeUsers) {
    const email = u.email || ''
    if (!email || exclude.has(email.toLowerCase())) continue
    const name = u.full_name || email.split('@')[0]
    if (!q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q)) {
      results.push({
        label: name,
        value: email,
        name: email,
        type: 'Staff',
      })
      exclude.add(email.toLowerCase())
    }
  }

  // 2. Check local business store customers
  const storeCustomers = businessStore?.customers || []
  for (const c of storeCustomers) {
    const email = c.primary_email || c.email || ''
    if (!email || exclude.has(email.toLowerCase())) continue
    const name =
      c.first_name || c.last_name
        ? `${c.first_name || ''} ${c.last_name || ''}`.trim()
        : c.company_name || email.split('@')[0]
    if (!q || name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || (c.company_name && c.company_name.toLowerCase().includes(q))) {
      results.push({
        label: `${name}${c.company_name && c.company_name !== name ? ` (${c.company_name})` : ''}`,
        value: email,
        name: email,
        type: 'Client',
      })
      exclude.add(email.toLowerCase())
    }
  }

  // 3. If query given and fewer than 10 results, search Supabase profiles & customers table
  if (q && results.length < 10) {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .ilike('email', `%${q}%`)
        .limit(5)

      if (Array.isArray(profiles)) {
        for (const p of profiles) {
          if (p.email && !exclude.has(p.email.toLowerCase())) {
            results.push({
              label: p.full_name || p.email.split('@')[0],
              value: p.email,
              name: p.email,
              type: 'Staff',
            })
            exclude.add(p.email.toLowerCase())
          }
        }
      }

      const { data: dbCustomers } = await supabase
        .from('customers')
        .select('id, first_name, last_name, company_name, primary_email')
        .or(`primary_email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%,company_name.ilike.%${q}%`)
        .limit(5)

      if (Array.isArray(dbCustomers)) {
        for (const c of dbCustomers) {
          if (c.primary_email && !exclude.has(c.primary_email.toLowerCase())) {
            const name =
              c.first_name || c.last_name
                ? `${c.first_name || ''} ${c.last_name || ''}`.trim()
                : c.company_name || c.primary_email.split('@')[0]
            results.push({
              label: `${name}${c.company_name && c.company_name !== name ? ` (${c.company_name})` : ''}`,
              value: c.primary_email,
              name: c.primary_email,
              type: 'Client',
            })
            exclude.add(c.primary_email.toLowerCase())
          }
        }
      }
    } catch {
      // offline or table query not available
    }
  }

  return results
}
