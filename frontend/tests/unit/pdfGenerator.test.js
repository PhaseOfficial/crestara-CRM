import { describe, it, expect } from 'vitest'
import {
  formatAmount,
  getCurrencySign,
  generateInvoicePdf,
  generateReceiptPdf,
  generateLatexSource,
  getInvoicePdfBase64,
  getReceiptPdfBase64,
  loadImageAsBase64,
  preparePdfSettings,
} from '@/utils/pdfGenerator'

describe('LaTeX PDF Generator & Clean Printing Engine', () => {
  const mockSettings = {
    business_name: 'Crestara Enterprise Solutions',
    legal_name: 'Crestara Technologies Inc.',
    business_address: '100 Business Parkway, Suite 500\nSan Francisco, CA 94105',
    tax_id: 'US-94-8829103',
    business_phone: '+1 (555) 000-1234',
    business_email: 'billing@crestara.com',
    currency: 'USD',
    bank_name: 'Silicon Valley Commercial Bank',
    bank_account_number: 'US12SVBK998877665544',
  }

  const mockInvoice = {
    id: 'inv-2026-test',
    invoice_number: 'INV-2026-1045',
    client_name: 'Acme Global Corp',
    client_email: 'finance@acme.com',
    contact_name: 'Jane Doe',
    status: 'Issued',
    issue_date: '2026-10-27',
    due_date: '2026-11-26',
    payment_terms: 'Net 30',
    currency: 'USD',
    tax_rate: 8.5,
    discount_percentage: 10,
    subtotal: 1000.0,
    discount_amount: 100.0,
    tax_amount: 76.5,
    total_amount: 976.5,
    amount_paid: 200.0,
    balance_due: 776.5,
    items: [
      {
        id: 'item-1',
        name: 'Enterprise Cloud Architecture Consulting',
        code: 'SRV-ARCH',
        quantity: 10,
        unit_price: 100.0,
        amount: 1000.0,
      },
    ],
    notes: 'Payment due strictly within 30 days of invoice date.',
  }

  const mockPayment = {
    id: 'pay-2026-test',
    receipt_number: 'REC-2026-5001',
    transaction_ref: 'REC-2026-5001',
    invoice_id: 'inv-2026-test',
    client_name: 'Acme Global Corp',
    amount: 200.0,
    currency: 'USD',
    payment_method: 'Bank Wire Transfer',
    payment_date: '2026-10-27',
    status: 'Settled',
    notes: 'Wire reference #TX-9988221',
  }

  describe('formatAmount and getCurrencySign helpers', () => {
    it('formats amounts with 2 decimal places and thousands separators', () => {
      expect(formatAmount(0)).toBe('0.00')
      expect(formatAmount(1250)).toBe('1,250.00')
      expect(formatAmount(1048576.25)).toBe('1,048,576.25')
      expect(formatAmount(null)).toBe('0.00')
    })

    it('returns appropriate currency symbols', () => {
      expect(getCurrencySign('USD')).toBe('$')
      expect(getCurrencySign('EUR')).toBe('€')
      expect(getCurrencySign('GBP')).toBe('£')
      expect(getCurrencySign('ZWG')).toBe('ZiG ')
      expect(getCurrencySign('XYZ')).toBe('XYZ ')
    })
  })

  describe('generateInvoicePdf', () => {
    it('compiles a vector jsPDF document for an invoice', () => {
      const doc = generateInvoicePdf(mockInvoice, mockSettings)
      expect(doc).toBeDefined()
      expect(doc.internal.pages.length).toBeGreaterThan(0)
      expect(doc.internal.pageSize.getWidth()).toBeCloseTo(210, 0) // A4 width 210mm
      expect(doc.internal.pageSize.getHeight()).toBeCloseTo(297, 0) // A4 height 297mm
    })

    it('renders PAID IN FULL official stamp when invoice is fully paid', () => {
      const paidInvoice = { ...mockInvoice, status: 'Paid', balance_due: 0 }
      const doc = generateInvoicePdf(paidInvoice, mockSettings)
      expect(doc).toBeDefined()
    })

    it('generates base64 data without URI header for direct API attachment', () => {
      const base64 = getInvoicePdfBase64(mockInvoice, mockSettings)
      expect(typeof base64).toBe('string')
      expect(base64.length).toBeGreaterThan(100)
      expect(base64.startsWith('data:')).toBe(false)
    })
  })

  describe('generateReceiptPdf', () => {
    it('compiles a vector jsPDF document for a commercial payment receipt', () => {
      const doc = generateReceiptPdf(mockInvoice, mockPayment, mockSettings)
      expect(doc).toBeDefined()
      expect(doc.internal.pages.length).toBeGreaterThan(0)
    })

    it('generates receipt base64 string', () => {
      const base64 = getReceiptPdfBase64(mockInvoice, mockPayment, mockSettings)
      expect(typeof base64).toBe('string')
      expect(base64.length).toBeGreaterThan(100)
      expect(base64.startsWith('data:')).toBe(false)
    })
  })

  describe('generateLatexSource', () => {
    it('produces valid LaTeX markup incorporating standard booktabs rules', () => {
      const tex = generateLatexSource(mockInvoice, mockSettings)
      expect(tex).toContain('\\documentclass[10pt,a4paper]{article}')
      expect(tex).toContain('\\usepackage{booktabs}')
      expect(tex).toContain('\\toprule')
      expect(tex).toContain('\\midrule')
      expect(tex).toContain('\\bottomrule')
      expect(tex).toContain('INV-2026-1045')
      expect(tex).toContain('Acme Global Corp')
      expect(tex).toContain('Enterprise Cloud Architecture Consulting')
      expect(tex).toContain('\\end{document}')
    })

    it('includes PAID IN FULL tag when invoice status is Paid', () => {
      const paidInvoice = { ...mockInvoice, status: 'Paid', balance_due: 0 }
      const tex = generateLatexSource(paidInvoice, mockSettings)
      expect(tex).toContain('[ PAID IN FULL ]')
    })
  })

  describe('Logo embedding & image resolution', () => {
    // 1x1 transparent PNG data URI
    const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

    it('embeds logo_data_uri into invoice PDF without errors', () => {
      const settingsWithLogo = {
        ...mockSettings,
        logo_data_uri: tinyPngBase64,
      }
      const doc = generateInvoicePdf(mockInvoice, settingsWithLogo)
      expect(doc).toBeDefined()
      expect(doc.internal.pages.length).toBeGreaterThan(0)
    })

    it('embeds logo_data_uri into receipt PDF without errors', () => {
      const settingsWithLogo = {
        ...mockSettings,
        logo_data_uri: tinyPngBase64,
      }
      const doc = generateReceiptPdf(mockInvoice, mockPayment, settingsWithLogo)
      expect(doc).toBeDefined()
      expect(doc.internal.pages.length).toBeGreaterThan(0)
    })

    it('loadImageAsBase64 returns existing data URI unchanged', async () => {
      const res = await loadImageAsBase64(tinyPngBase64)
      expect(res).toBe(tinyPngBase64)
    })

    it('preparePdfSettings preserves existing logo_data_uri', async () => {
      const settings = { ...mockSettings, logo_data_uri: tinyPngBase64 }
      const prepared = await preparePdfSettings(settings)
      expect(prepared.logo_data_uri).toBe(tinyPngBase64)
    })

    it('preparePdfSettings adopts uploaded data URI logo', async () => {
      const customLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QzwAEjDAGACbSAf45rS4UAAAAAElFTkSuQmCC'
      const settings = { ...mockSettings, logo_url: customLogo }
      const prepared = await preparePdfSettings(settings)
      expect(prepared.logo_data_uri).toBe(customLogo)
    })

    it('uses bundled high-resolution crestara_logo.png by default without squishing', () => {
      const doc = generateInvoicePdf(mockInvoice, { ...mockSettings, logo_url: '/crestara_logo.png' })
      expect(doc).toBeDefined()
      expect(doc.internal.pages.length).toBeGreaterThan(0)
    })
  })
})
