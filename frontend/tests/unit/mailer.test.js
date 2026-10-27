import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildInvoiceEmailHtml,
  buildReceiptEmailHtml,
  sendInvoiceEmail,
  sendReceiptEmail,
  sendTestEmail,
} from '@/utils/mailer'

describe('cPanel Mailer Client & Email Templates', () => {
  const originalFetch = globalThis.fetch

  const mockSettings = {
    business_name: 'Crestara CRM',
    business_email: 'billing@crestara.com',
    business_phone: '+1 555 1234',
    currency: 'USD',
    smtp_host: 'mail.crestara.com',
    smtp_port: 465,
    smtp_user: 'billing@crestara.com',
    smtp_pass: 'SecretPass123',
    smtp_secure: 'ssl',
    from_name: 'Crestara Accounts',
    from_email: 'billing@crestara.com',
  }

  const mockInvoice = {
    id: 'inv-101',
    invoice_number: 'INV-2026-9001',
    client_name: 'MegaCorp Industries',
    client_email: 'ap@megacorp.com',
    issue_date: '2026-10-27',
    due_date: '2026-11-27',
    currency: 'USD',
    total_amount: 5000.0,
    amount_paid: 2000.0,
    balance_due: 3000.0,
    status: 'Partially paid',
    items: [],
  }

  const mockPayment = {
    id: 'pay-501',
    receipt_number: 'REC-2026-7001',
    transaction_ref: 'REC-2026-7001',
    payment_method: 'Stripe',
    payment_date: '2026-10-27',
    amount: 2000.0,
    currency: 'USD',
    status: 'Settled',
    notes: 'Partial payment',
  }

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Dispatched successfully',
        has_attachments: true,
      }),
    })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('HTML Template Generators', () => {
    it('builds responsive HTML for invoice notifications', () => {
      const html = buildInvoiceEmailHtml({
        invoice: mockInvoice,
        businessSettings: mockSettings,
        personalMessage: 'Thank you for your prompt remittance.',
      })

      expect(html).toContain('INV-2026-9001')
      expect(html).toContain('MegaCorp Industries')
      expect(html).toContain('Thank you for your prompt remittance.')
      expect(html).toContain('$5,000.00')
      expect(html).toContain('$3,000.00')
    })

    it('builds responsive HTML for receipt notifications', () => {
      const html = buildReceiptEmailHtml({
        invoice: mockInvoice,
        payment: mockPayment,
        businessSettings: mockSettings,
      })

      expect(html).toContain('REC-2026-7001')
      expect(html).toContain('Official Payment Receipt')
      expect(html).toContain('$2,000.00')
      expect(html).toContain('MegaCorp Industries')
      expect(html).toContain('Stripe')
    })
  })

  describe('sendInvoiceEmail', () => {
    it('throws when recipient email is missing', async () => {
      await expect(
        sendInvoiceEmail({
          invoice: mockInvoice,
          recipientEmail: '',
          businessSettings: mockSettings,
        }),
      ).rejects.toThrow('Recipient email address is required')
    })

    it('posts multipart payload with base64 PDF attachment to cPanel endpoint', async () => {
      const res = await sendInvoiceEmail({
        invoice: mockInvoice,
        recipientEmail: 'ap@megacorp.com',
        businessSettings: mockSettings,
      })

      expect(res.success).toBe(true)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)

      const [endpoint, req] = globalThis.fetch.mock.calls[0]
      expect(endpoint).toBe('/api/send_email.php')
      expect(req.method).toBe('POST')

      const body = JSON.parse(req.body)
      expect(body.recipient).toBe('ap@megacorp.com')
      expect(body.attachments).toBeInstanceOf(Array)
      expect(body.attachments.length).toBe(1)
      expect(body.attachments[0].filename).toBe('INV-2026-9001.pdf')
      expect(body.attachments[0].content_type).toBe('application/pdf')
      expect(typeof body.attachments[0].base64_data).toBe('string')
      expect(body.smtp).toBeUndefined() // Secured server-side on cPanel
    })
  })

  describe('sendReceiptEmail', () => {
    it('posts receipt payload with PDF attachment to cPanel endpoint', async () => {
      const res = await sendReceiptEmail({
        invoice: mockInvoice,
        payment: mockPayment,
        recipientEmail: 'ap@megacorp.com',
        businessSettings: mockSettings,
      })

      expect(res.success).toBe(true)
      const [, req] = globalThis.fetch.mock.calls[0]
      const body = JSON.parse(req.body)
      expect(body.recipient).toBe('ap@megacorp.com')
      expect(body.attachments[0].filename).toBe('REC-2026-7001.pdf')
    })
  })

  describe('sendTestEmail', () => {
    it('sends test verification email without attachments', async () => {
      const res = await sendTestEmail({
        recipientEmail: 'test@crestara.com',
        businessSettings: mockSettings,
      })

      expect(res.success).toBe(true)
      const [, req] = globalThis.fetch.mock.calls[0]
      const body = JSON.parse(req.body)
      expect(body.recipient).toBe('test@crestara.com')
      expect(body.subject).toContain('Test Delivery')
    })
  })
})
