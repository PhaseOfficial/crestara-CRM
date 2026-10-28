import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  validateTimeRange,
  computeAutoToTime,
  buildEndTimeOptions,
  normalizeParticipants,
  formatDuration,
  parseSupabaseEvent,
  buildSupabaseEventPayload,
  searchCalendarAttendees,
  allTimeSlots,
} from '@/utils/calendarEndpoints'
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsContent,
  buildCalendarInvitationEmailHtml,
  buildCalendarCancellationEmailHtml,
} from '@/utils/mailer'

describe('Calendar Service & Endpoints', () => {
  describe('Time Calculation & Validation', () => {
    it('validates correct time ranges', () => {
      const res = validateTimeRange({
        fromDate: '2026-11-09',
        fromTime: '09:00',
        toTime: '10:30',
        isFullDay: false,
      })
      expect(res.valid).toBe(true)
      expect(res.error).toBeNull()
    })

    it('rejects end time before or equal to start time', () => {
      const res1 = validateTimeRange({
        fromDate: '2026-11-09',
        fromTime: '10:00',
        toTime: '09:30',
        isFullDay: false,
      })
      expect(res1.valid).toBe(false)
      expect(res1.error).toContain('End Time Should Be After Start Time')

      const res2 = validateTimeRange({
        fromDate: '2026-11-09',
        fromTime: '10:00',
        toTime: '10:00',
        isFullDay: false,
      })
      expect(res2.valid).toBe(false)
    })

    it('always considers full day events valid', () => {
      const res = validateTimeRange({
        fromDate: '2026-11-09',
        isFullDay: true,
      })
      expect(res.valid).toBe(true)
      expect(res.error).toBeNull()
    })

    it('computes auto end time by adding 1 hour', () => {
      expect(computeAutoToTime('09:15')).toBe('10:15')
      expect(computeAutoToTime('14:30')).toBe('15:30')
      expect(computeAutoToTime('23:15')).toBe('23:59')
      expect(computeAutoToTime('')).toBe('')
    })

    it('formats duration correctly', () => {
      expect(formatDuration(30)).toBe('30 mins')
      expect(formatDuration(60)).toBe('1 hr')
      expect(formatDuration(90)).toBe('1.5 hrs')
      expect(formatDuration(120)).toBe('2 hrs')
    })

    it('builds end time options after selected fromTime', () => {
      const options = buildEndTimeOptions('11:00')
      expect(options.length).toBeGreaterThan(0)
      expect(options[0].value).toBe('11:15')
      expect(options[0].label).toContain('15 mins')
    })
  })

  describe('Participant Normalization', () => {
    it('deduplicates emails case-insensitively and formats participants', () => {
      const input = [
        { email: 'john@example.com', label: 'John Doe' },
        'JANE@EXAMPLE.COM',
        { email: 'JOHN@example.com', label: 'Duplicate John' },
        { email: '' },
      ]

      const normalized = normalizeParticipants(input)
      expect(normalized).toHaveLength(2)
      expect(normalized[0].email).toBe('john@example.com')
      expect(normalized[0].full_name).toBe('John Doe')
      expect(normalized[1].email).toBe('JANE@EXAMPLE.COM')
      expect(normalized[1].attending).toBe('Awaiting')
    })
  })

  describe('Object Mapping & Supabase Payload', () => {
    it('parses Supabase row into clean UI CalendarEvent', () => {
      const row = {
        id: 'evt-123',
        subject: 'Product Strategy Review',
        description: 'Discuss Q4 roadmap',
        starts_on: '2026-11-09T14:00:00.000Z',
        ends_on: '2026-11-09T15:30:00.000Z',
        all_day: false,
        event_type: 'Public',
        status: 'Open',
        location: 'Room 402',
        color: '#10b981',
        attending: 'Yes',
        owner: 'admin@crestara.com',
        event_participants: [{ email: 'client@example.com', attending: 'Yes' }],
      }

      const parsed = parseSupabaseEvent(row)
      expect(parsed.id).toBe('evt-123')
      expect(parsed.title).toBe('Product Strategy Review')
      expect(parsed.fromDate).toBeDefined()
      expect(parsed.fromTime).toBeDefined()
      expect(parsed.isFullDay).toBe(false)
      expect(parsed.location).toBe('Room 402')
      expect(parsed.event_participants).toHaveLength(1)
    })

    it('builds Supabase payload from UI event', () => {
      const ev = {
        title: 'Board Meeting',
        description: 'Annual shareholder update',
        fromDate: '2026-11-15',
        toDate: '2026-11-15',
        fromTime: '10:00',
        toTime: '12:00',
        isFullDay: false,
        location: 'Executive Suite',
        color: '#ef4444',
      }

      const payload = buildSupabaseEventPayload(ev)
      expect(payload.subject).toBe('Board Meeting')
      expect(payload.starts_on).toBe('2026-11-15T10:00:00')
      expect(payload.ends_on).toBe('2026-11-15T12:00:00')
      expect(payload.all_day).toBe(false)
      expect(payload.color).toBe('#ef4444')
    })
  })

  describe('Attendee Search', () => {
    it('searches business users and customers matching query', async () => {
      const mockBusinessStore = {
        users: [
          { email: 'alex@crestara.com', full_name: 'Alex Johnson' },
          { email: 'sarah@crestara.com', full_name: 'Sarah Connor' },
        ],
        customers: [
          {
            primary_email: 'buyer@acme.com',
            first_name: 'Bob',
            last_name: 'Smith',
            company_name: 'Acme Corp',
          },
        ],
      }

      const results = await searchCalendarAttendees('alex', [], mockBusinessStore)
      expect(results).toHaveLength(1)
      expect(results[0].value).toBe('alex@crestara.com')
      expect(results[0].type).toBe('Staff')

      const acmeResults = await searchCalendarAttendees('acme', [], mockBusinessStore)
      expect(acmeResults).toHaveLength(1)
      expect(acmeResults[0].value).toBe('buyer@acme.com')
      expect(acmeResults[0].type).toBe('Client')
    })

    it('filters out already added emails', async () => {
      const mockBusinessStore = {
        users: [{ email: 'alex@crestara.com', full_name: 'Alex Johnson' }],
      }

      const results = await searchCalendarAttendees('alex', ['alex@crestara.com'], mockBusinessStore)
      expect(results).toHaveLength(0)
    })
  })

  describe('Universal Calendar Integrations (Google, Outlook, Apple .ICS)', () => {
    const sampleEvent = {
      id: 'evt-test-99',
      title: 'Enterprise Architecture Sync',
      description: 'Discuss cloud migration milestones.',
      location: 'Zoom Conf Room 12',
      fromDate: '2026-11-09',
      toDate: '2026-11-09',
      fromTime: '14:00',
      toTime: '15:00',
      isFullDay: false,
      event_participants: [{ email: 'client@domain.com', full_name: 'Client VIP' }],
    }

    it('generates 1-click Google Calendar template URL', () => {
      const url = generateGoogleCalendarUrl(sampleEvent)
      expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
      expect(url).toContain('Enterprise%20Architecture%20Sync')
      expect(url).toContain('Zoom%20Conf%20Room%2012')
      expect(url).toContain('&dates=')
    })

    it('generates 1-click Outlook web compose URL', () => {
      const url = generateOutlookCalendarUrl(sampleEvent)
      expect(url).toContain('https://outlook.live.com/calendar/0/deeplink/compose')
      expect(url).toContain('rru=addevent')
      expect(url).toContain('Enterprise%20Architecture%20Sync')
      expect(url).toContain('Zoom%20Conf%20Room%2012')
    })

    it('generates RFC 5545 valid iCalendar content', () => {
      const ics = generateIcsContent(sampleEvent, { business_name: 'Crestara CRM' })
      expect(ics).toContain('BEGIN:VCALENDAR')
      expect(ics).toContain('VERSION:2.0')
      expect(ics).toContain('METHOD:REQUEST')
      expect(ics).toContain('BEGIN:VEVENT')
      expect(ics).toContain('SUMMARY:Enterprise Architecture Sync')
      expect(ics).toContain('LOCATION:Zoom Conf Room 12')
      expect(ics).toContain('ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=Client VIP:mailto:client@domain.com')
      expect(ics).toContain('END:VEVENT')
      expect(ics).toContain('END:VCALENDAR')
    })

    it('generates RFC 5545 cancellation content', () => {
      const ics = generateIcsContent(sampleEvent, {}, 'CANCEL')
      expect(ics).toContain('METHOD:CANCEL')
      expect(ics).toContain('STATUS:CANCELLED')
    })

    it('builds invitation email with 1-click calendar buttons', () => {
      const html = buildCalendarInvitationEmailHtml({
        event: sampleEvent,
        attendee: { email: 'client@domain.com', full_name: 'Client VIP' },
        businessSettings: { business_name: 'Crestara Advisory' },
      })

      expect(html).toContain('MEETING INVITATION')
      expect(html).toContain('Enterprise Architecture Sync')
      expect(html).toContain('Client VIP')
      expect(html).toContain('Zoom Conf Room 12')
      expect(html).toContain('Add to Google Calendar')
      expect(html).toContain('Add to Outlook')
      expect(html).toContain('invite.ics')
    })

    it('builds cancellation email notification', () => {
      const html = buildCalendarCancellationEmailHtml({
        event: sampleEvent,
        attendee: { email: 'client@domain.com', full_name: 'Client VIP' },
      })

      expect(html).toContain('MEETING CANCELLED')
      expect(html).toContain('Enterprise Architecture Sync')
      expect(html).toContain('Client VIP')
    })
  })
})
