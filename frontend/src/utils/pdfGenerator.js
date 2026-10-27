import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DEFAULT_CRESTARA_LOGO_BASE64 } from './defaultLogo'

/**
 * LaTeX-Inspired Vector PDF Generator & Clean Printer
 * Produces publication-grade, formal vector documents using booktabs rules,
 * Latin Modern / Times serif typography, and isolated print frames.
 */

// Helper to format currency numbers
export function formatAmount(amount) {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Currency symbol lookup
export function getCurrencySign(cur) {
  const map = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    ZAR: 'R',
    ZWG: 'ZiG ',
  }
  if (cur && map[cur]) return map[cur]
  return cur ? `${cur} ` : '$'
}

/**
 * Resolves an image URL or loaded DOM image to a Base64 data URI string.
 * @param {string} url - Image URL or relative path
 * @returns {Promise<string|null>}
 */
export async function loadImageAsBase64(url) {
  if (!url || typeof url !== 'string') return null
  if (url.startsWith('data:image/')) return url

  // 1. If exact image is already loaded in DOM, extract from canvas
  if (typeof document !== 'undefined') {
    try {
      const allImgs = Array.from(document.querySelectorAll('img'))
      const match = allImgs.find((img) => img.src === url || img.getAttribute('src') === url)
      if (match && match.complete && match.naturalWidth > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = match.naturalWidth
        canvas.height = match.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(match, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        if (dataUrl && dataUrl.startsWith('data:image/')) {
          return dataUrl
        }
      }
    } catch (e) {
      // Proceed to fetch/image loader if canvas tainted or unreadable
    }
  }

  // 2. Fetch image as blob and convert via FileReader (standard for Supabase & remote URLs)
  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch(url)
      if (res.ok) {
        const blob = await res.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = () => resolve(null)
          reader.readAsDataURL(blob)
        })
      }
    } catch (err) {
      // Fall through to Image element loader
    }
  }

  // 3. Load via HTML Image element with crossOrigin
  if (typeof Image !== 'undefined') {
    try {
      const dataUri = await new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth || 200
            canvas.height = img.naturalHeight || 60
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/png'))
          } catch {
            resolve(null)
          }
        }
        img.onerror = () => resolve(null)
        img.src = url
      })
      if (dataUri) return dataUri
    } catch {
      // Ignore
    }
  }

  return null
}

/**
 * Prepares settings object by resolving logo_url to logo_data_uri if needed.
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
export async function preparePdfSettings(settings = {}) {
  if (!settings.logo_url && !settings.logo_data_uri) {
    return settings
  }

  // 1. If logo_url is already a data URI, adopt it immediately
  if (settings.logo_url && settings.logo_url.startsWith('data:image/')) {
    return { ...settings, logo_data_uri: settings.logo_url, _resolved_logo_url: settings.logo_url }
  }

  // 2. If already resolved for this exact logo_url, return cached settings
  if (settings.logo_data_uri && settings._resolved_logo_url === settings.logo_url) {
    return settings
  }

  // 3. If logo_data_uri exists and no logo_url was provided, preserve it (e.g. unit tests)
  if (settings.logo_data_uri && !settings.logo_url) {
    return settings
  }

  // 4. Resolve fresh base64 data URI for the current logo_url
  if (settings.logo_url) {
    const b64 = await loadImageAsBase64(settings.logo_url)
    if (b64) {
      return { ...settings, logo_data_uri: b64, _resolved_logo_url: settings.logo_url }
    }
  }

  return settings
}

/**
 * Generates an official LaTeX-styled Invoice PDF using jsPDF + autoTable
 * @param {Object} invoice - Invoice record
 * @param {Object} settings - Business settings
 * @returns {jsPDF}
 */
export function generateInvoicePdf(invoice, settings = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18 // 18mm standard formal margin
  const contentWidth = pageWidth - margin * 2
  const curSign = getCurrencySign(invoice.currency || settings.currency)

  // Typography: Latin Modern / Times Roman serif aesthetic
  doc.setFont('times', 'normal')

  // Top Rule (LaTeX \toprule equivalent across page header)
  doc.setDrawColor(30, 41, 59) // Slate-800
  doc.setLineWidth(0.8)
  doc.line(margin, margin, pageWidth - margin, margin)

  let y = margin + 8

  // --- Header Block: Two Columns ---
  // Left Column: Business Entity Branding
  const bizName = settings.business_name || 'Crestara CRM'
  let logoData = settings.logo_data_uri || (settings.logo_url && settings.logo_url.startsWith('data:image/') ? settings.logo_url : null)
  if (!logoData && (!settings.logo_url || settings.logo_url === '/crestara_logo.png' || settings.logo_url.includes('crestara_logo.png'))) {
    logoData = DEFAULT_CRESTARA_LOGO_BASE64
  }

  if (logoData) {
    try {
      // Dynamic un-squished aspect ratio calculation (preserves original 909x243 / ~3.74:1)
      let logoWidth = 46
      let logoHeight = 46 / (909 / 243) // 12.3mm
      try {
        const props = doc.getImageProperties(logoData)
        if (props && props.width && props.height) {
          const ratio = props.width / props.height
          logoWidth = 46
          logoHeight = logoWidth / ratio
          if (logoHeight > 14) {
            logoHeight = 14
            logoWidth = logoHeight * ratio
          }
        }
      } catch (propErr) {
        logoWidth = 46
        logoHeight = 46 / (909 / 243)
      }

      let imgFormat = 'PNG'
      if (typeof logoData === 'string' && logoData.startsWith('data:image/')) {
        const match = logoData.match(/^data:image\/([a-zA-Z0-9+]+);base64,/)
        if (match && match[1]) {
          const subtype = match[1].toLowerCase()
          if (subtype === 'jpeg' || subtype === 'jpg') imgFormat = 'JPEG'
          else if (subtype === 'png') imgFormat = 'PNG'
          else if (subtype === 'webp') imgFormat = 'WEBP'
        }
      }

      doc.addImage(logoData, imgFormat, margin, y, logoWidth, logoHeight, undefined, 'FAST')
      y += logoHeight + 3.5
    } catch (err) {
      console.warn('Could not embed logo image in PDF:', err)
      doc.setFont('times', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42)
      doc.text(bizName, margin, y)
      y += 5
    }
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.text(bizName, margin, y)
    y += 5
  }

  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105) // Slate-600

  if (settings.legal_name && settings.legal_name !== bizName) {
    doc.text(settings.legal_name, margin, y)
    y += 4
  }

  if (settings.business_address) {
    const addrLines = doc.splitTextToSize(settings.business_address, 85)
    doc.text(addrLines, margin, y)
    y += addrLines.length * 3.8
  }

  const contactPieces = []
  if (settings.tax_id) contactPieces.push(`Tax ID: ${settings.tax_id}`)
  if (settings.business_phone) contactPieces.push(`Tel: ${settings.business_phone}`)
  if (settings.business_email) contactPieces.push(settings.business_email)

  if (contactPieces.length > 0) {
    const contactText = doc.splitTextToSize(contactPieces.join('  •  '), 85)
    doc.text(contactText, margin, y)
    y += contactText.length * 3.8
  }

  // Right Column: Invoice Metadata (Aligned Right)
  let rightY = margin + 8
  doc.setFont('times', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text('INVOICE', pageWidth - margin, rightY, { align: 'right' })

  rightY += 6
  doc.setFont('times', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(51, 65, 85)
  doc.text(invoice.invoice_number || 'INV-DRAFT', pageWidth - margin, rightY, { align: 'right' })

  rightY += 5
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)

  doc.text(`Issue Date: ${invoice.issue_date || '-'}`, pageWidth - margin, rightY, { align: 'right' })
  rightY += 4.2
  doc.text(`Due Date: ${invoice.due_date || '-'}`, pageWidth - margin, rightY, { align: 'right' })
  rightY += 4.2
  doc.text(`Terms: ${invoice.payment_terms || 'Net 30'}`, pageWidth - margin, rightY, { align: 'right' })

  // Max Y between left and right
  y = Math.max(y, rightY) + 6

  // Horizontal separator below header
  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 7

  // --- Bill To Section ---
  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('BILLED TO', margin, y)

  y += 4.5
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(invoice.client_name || 'Valued Customer', margin, y)

  y += 4.2
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)

  if (invoice.contact_name && invoice.contact_name !== invoice.client_name) {
    doc.text(`Attn: ${invoice.contact_name}`, margin, y)
    y += 4
  }
  if (invoice.client_email) {
    doc.text(`Email: ${invoice.client_email}`, margin, y)
    y += 4
  }

  // --- Official Watermark Stamp (if Paid) ---
  const isPaid = invoice.status === 'Paid' || Number(invoice.balance_due) <= 0
  if (isPaid) {
    // Elegant bordered PAID IN FULL stamp in right column
    const stampX = pageWidth - margin - 48
    const stampY = y - 12
    doc.setDrawColor(22, 101, 52) // Green-800
    doc.setLineWidth(0.75)
    doc.roundedRect(stampX, stampY, 48, 14, 1.5, 1.5, 'S')

    // Inner dashed rule
    doc.setDrawColor(187, 247, 208) // Green-200
    doc.setLineWidth(0.3)
    doc.roundedRect(stampX + 1, stampY + 1, 46, 12, 1, 1, 'S')

    doc.setFont('times', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(22, 101, 52)
    doc.text('PAID IN FULL', stampX + 24, stampY + 8.5, { align: 'center' })
  }

  y += 6

  // --- LaTeX Booktabs Items Table ---
  const tableRows = (invoice.items || []).map((item, idx) => {
    const desc = item.code ? `${item.name} (${item.code})` : (item.name || `Item ${idx + 1}`)
    return [
      desc,
      String(item.quantity || 1),
      `${curSign}${formatAmount(item.unit_price)}`,
      `${curSign}${formatAmount(item.amount)}`,
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: tableRows.length ? tableRows : [['No items listed', '-', '-', '-']],
    theme: 'plain', // Clean booktabs style without striped background
    styles: {
      font: 'times',
      fontSize: 9,
      textColor: [30, 41, 59],
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
      lineColor: [203, 213, 225],
    },
    headStyles: {
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8.5,
      textColor: [15, 23, 42],
      fillColor: false, // Pure LaTeX booktabs background
      lineWidth: { top: 0.8, bottom: 0.4 }, // \toprule and \midrule
      lineColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 32, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    didDrawPage: (data) => {
      // Bottom rule (\bottomrule) after table body
      const finalY = data.cursor.y
      doc.setDrawColor(30, 41, 59)
      doc.setLineWidth(0.6)
      doc.line(margin, finalY, pageWidth - margin, finalY)
    },
  })

  let afterTableY = doc.lastAutoTable.finalY + 5

  // --- Financial Summary & Bank Information ---
  // Ensure enough room on current page, or add page
  if (afterTableY > pageHeight - 65) {
    doc.addPage()
    afterTableY = margin
  }

  const summaryWidth = 75
  const summaryX = pageWidth - margin - summaryWidth

  // Left side: Remittance Settlement Details & Notes
  let notesY = afterTableY + 2
  const leftColWidth = contentWidth - summaryWidth - 10

  if (settings.bank_name || settings.bank_account_number) {
    doc.setFont('times', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(30, 41, 59)
    doc.text('REMITTANCE INSTRUCTIONS', margin, notesY)

    notesY += 4
    doc.setFont('times', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)

    if (settings.bank_name) {
      doc.text(`Bank: ${settings.bank_name}`, margin, notesY)
      notesY += 3.5
    }
    if (settings.bank_account_name) {
      doc.text(`Account Name: ${settings.bank_account_name}`, margin, notesY)
      notesY += 3.5
    }
    if (settings.bank_account_number) {
      doc.text(`Account / IBAN: ${settings.bank_account_number}`, margin, notesY)
      notesY += 3.5
    }
    if (settings.swift_bic) {
      doc.text(`SWIFT / BIC: ${settings.swift_bic}`, margin, notesY)
      notesY += 3.5
    }
    if (settings.payment_instructions) {
      const instrLines = doc.splitTextToSize(settings.payment_instructions, leftColWidth)
      doc.text(instrLines, margin, notesY)
      notesY += instrLines.length * 3.5
    }
  }

  if (invoice.notes) {
    notesY += 2
    doc.setFont('times', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(30, 41, 59)
    doc.text('NOTES', margin, notesY)

    notesY += 4
    doc.setFont('times', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(71, 85, 105)
    const noteLines = doc.splitTextToSize(invoice.notes, leftColWidth)
    doc.text(noteLines, margin, notesY)
    notesY += noteLines.length * 3.5
  }

  // Right side: Financial Calculations
  let calcY = afterTableY + 2
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)

  // Subtotal
  doc.text('Subtotal:', summaryX, calcY)
  doc.text(`${curSign}${formatAmount(invoice.subtotal)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 5

  // Discount
  if (Number(invoice.discount_percentage) > 0 || Number(invoice.discount_amount) > 0) {
    doc.text(`Discount (${invoice.discount_percentage || 0}%):`, summaryX, calcY)
    doc.text(`-${curSign}${formatAmount(invoice.discount_amount)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 5
  }

  // Tax
  if (Number(invoice.tax_rate) > 0 || Number(invoice.tax_amount) > 0) {
    doc.text(`Tax (${invoice.tax_rate || 0}%):`, summaryX, calcY)
    doc.text(`+${curSign}${formatAmount(invoice.tax_amount)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 5
  }

  // Divider above Total
  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.line(summaryX, calcY - 1, pageWidth - margin, calcY - 1)
  calcY += 3

  // Grand Total (Emphasized)
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('Grand Total:', summaryX, calcY)
  doc.text(`${curSign}${formatAmount(invoice.total_amount)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 6

  // Paid & Balance
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(22, 101, 52) // Green-800
  doc.text('Amount Paid:', summaryX, calcY)
  doc.text(`${curSign}${formatAmount(invoice.amount_paid)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 5

  const balanceDue = Number(invoice.balance_due || 0)
  doc.setFont('times', 'bold')
  doc.setTextColor(balanceDue > 0 ? 180 : 71, balanceDue > 0 ? 83 : 85, balanceDue > 0 ? 9 : 105)
  doc.text('Balance Due:', summaryX, calcY)
  doc.text(`${curSign}${formatAmount(balanceDue)}`, pageWidth - margin, calcY, { align: 'right' })

  // Double underline below Balance Due (Classic LaTeX Accounting Rule)
  calcY += 1.5
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.4)
  doc.line(summaryX, calcY, pageWidth - margin, calcY)
  doc.line(summaryX, calcY + 0.6, pageWidth - margin, calcY + 0.6)

  // --- Formal Footer (Bottom of Page) ---
  const footerY = pageHeight - 12
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

  doc.setFont('times', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184) // Slate-400
  const legalLine = `${bizName}  •  ${settings.website || 'https://crestara.com'}  •  Generated electronically`
  doc.text(legalLine, pageWidth / 2, footerY, { align: 'center' })

  return doc
}

/**
 * Generates an official LaTeX-styled Commercial Receipt PDF
 * @param {Object} invoice - Invoice record
 * @param {Object} payment - Payment transaction record
 * @param {Object} settings - Business settings
 * @returns {jsPDF}
 */
export function generateReceiptPdf(invoice, payment, settings = {}) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  const curSign = getCurrencySign(payment.currency || invoice?.currency || settings.currency)

  doc.setFont('times', 'normal')

  // Top Rule
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.8)
  doc.line(margin, margin, pageWidth - margin, margin)

  let y = margin + 8

  // Left Column: Business Entity Branding
  const bizName = settings.business_name || 'Crestara CRM'
  let logoData = settings.logo_data_uri || (settings.logo_url && settings.logo_url.startsWith('data:image/') ? settings.logo_url : null)
  if (!logoData && (!settings.logo_url || settings.logo_url === '/crestara_logo.png' || settings.logo_url.includes('crestara_logo.png'))) {
    logoData = DEFAULT_CRESTARA_LOGO_BASE64
  }

  if (logoData) {
    try {
      // Dynamic un-squished aspect ratio calculation (preserves original 909x243 / ~3.74:1)
      let logoWidth = 46
      let logoHeight = 46 / (909 / 243) // 12.3mm
      try {
        const props = doc.getImageProperties(logoData)
        if (props && props.width && props.height) {
          const ratio = props.width / props.height
          logoWidth = 46
          logoHeight = logoWidth / ratio
          if (logoHeight > 14) {
            logoHeight = 14
            logoWidth = logoHeight * ratio
          }
        }
      } catch (propErr) {
        logoWidth = 46
        logoHeight = 46 / (909 / 243)
      }

      let imgFormat = 'PNG'
      if (typeof logoData === 'string' && logoData.startsWith('data:image/')) {
        const match = logoData.match(/^data:image\/([a-zA-Z0-9+]+);base64,/)
        if (match && match[1]) {
          const subtype = match[1].toLowerCase()
          if (subtype === 'jpeg' || subtype === 'jpg') imgFormat = 'JPEG'
          else if (subtype === 'png') imgFormat = 'PNG'
          else if (subtype === 'webp') imgFormat = 'WEBP'
        }
      }

      doc.addImage(logoData, imgFormat, margin, y, logoWidth, logoHeight, undefined, 'FAST')
      y += logoHeight + 3.5
    } catch (err) {
      console.warn('Could not embed logo image in Receipt PDF:', err)
      doc.setFont('times', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42)
      doc.text(bizName, margin, y)
      y += 5
    }
  } else {
    doc.setFont('times', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.text(bizName, margin, y)
    y += 5
  }

  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)

  if (settings.legal_name && settings.legal_name !== bizName) {
    doc.text(settings.legal_name, margin, y)
    y += 4
  }
  if (settings.business_address) {
    const addrLines = doc.splitTextToSize(settings.business_address, 85)
    doc.text(addrLines, margin, y)
    y += addrLines.length * 3.8
  }
  if (settings.tax_id) {
    doc.text(`Tax ID / TIN: ${settings.tax_id}`, margin, y)
    y += 4
  }

  // Right Column: Receipt Metadata
  let rightY = margin + 8
  doc.setFont('times', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('OFFICIAL RECEIPT', pageWidth - margin, rightY, { align: 'right' })

  rightY += 6
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 41, 59)
  const recNumber = payment.receipt_number || payment.transaction_ref || 'REC-SETTLED'
  doc.text(recNumber, pageWidth - margin, rightY, { align: 'right' })

  rightY += 5
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Payment Date: ${payment.payment_date || new Date().toISOString().split('T')[0]}`, pageWidth - margin, rightY, { align: 'right' })
  rightY += 4.2
  doc.text(`Payment Method: ${payment.payment_method || 'Electronic Wire'}`, pageWidth - margin, rightY, { align: 'right' })
  rightY += 4.2
  doc.text(`Invoice Ref: ${invoice?.invoice_number || 'Direct Payment'}`, pageWidth - margin, rightY, { align: 'right' })

  y = Math.max(y, rightY) + 6

  // Horizontal line
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 7

  // Received From & Settlement Box
  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('RECEIVED FROM', margin, y)

  y += 4.5
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(invoice?.client_name || payment.client_name || 'Valued Client', margin, y)

  y += 4.2
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  if (invoice?.client_email) {
    doc.text(`Email: ${invoice.client_email}`, margin, y)
    y += 4
  }

  // Official Verified Stamp
  const stampX = pageWidth - margin - 52
  const stampY = y - 12
  doc.setDrawColor(21, 128, 61) // Green-700
  doc.setLineWidth(0.8)
  doc.roundedRect(stampX, stampY, 52, 16, 2, 2, 'S')
  doc.setFont('times', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(21, 128, 61)
  doc.text('OFFICIALLY SETTLED', stampX + 26, stampY + 6.5, { align: 'center' })
  doc.setFont('times', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text('ELECTRONIC AUDIT VERIFIED', stampX + 26, stampY + 11.5, { align: 'center' })

  y += 8

  // Receipt Breakdown Table
  const receiptRows = [
    [
      `Payment towards Invoice ${invoice?.invoice_number || ''}`,
      payment.payment_method || 'Electronic Transfer',
      payment.transaction_ref || recNumber,
      `${curSign}${formatAmount(payment.amount)}`,
    ],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Description', 'Payment Channel', 'Reference / Batch #', 'Amount Paid']],
    body: receiptRows,
    theme: 'plain',
    styles: {
      font: 'times',
      fontSize: 9.5,
      textColor: [30, 41, 59],
      cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
    },
    headStyles: {
      font: 'times',
      fontStyle: 'bold',
      fontSize: 8.5,
      textColor: [15, 23, 42],
      fillColor: false,
      lineWidth: { top: 0.8, bottom: 0.4 },
      lineColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 38 },
      2: { cellWidth: 42 },
      3: { cellWidth: 35, halign: 'right' },
    },
    didDrawPage: (data) => {
      const finalY = data.cursor.y
      doc.setDrawColor(30, 41, 59)
      doc.setLineWidth(0.6)
      doc.line(margin, finalY, pageWidth - margin, finalY)
    },
  })

  let afterTableY = doc.lastAutoTable.finalY + 6

  // Invoice Ledger Reconciliation Block
  const summaryWidth = 80
  const summaryX = pageWidth - margin - summaryWidth

  // Left side: Reference notes & Verification seal info
  let notesY = afterTableY + 2
  const leftColWidth = contentWidth - summaryWidth - 10

  doc.setFont('times', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)
  doc.text('AUDIT & COMPLIANCE VERIFICATION', margin, notesY)

  notesY += 4
  doc.setFont('times', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  doc.text(`Receipt Reference: ${recNumber}`, margin, notesY)
  notesY += 3.5
  doc.text(`Recorded Date: ${payment.payment_date || new Date().toISOString().split('T')[0]}`, margin, notesY)
  notesY += 3.5
  if (payment.notes) {
    const notesText = doc.splitTextToSize(`Notes: ${payment.notes}`, leftColWidth)
    doc.text(notesText, margin, notesY)
    notesY += notesText.length * 3.5
  }

  // Right side: Financial reconciliation
  let calcY = afterTableY + 2
  doc.setFont('times', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)

  if (invoice) {
    doc.text('Original Invoice Total:', summaryX, calcY)
    doc.text(`${curSign}${formatAmount(invoice.total_amount)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 5

    doc.text('Total Paid Prior:', summaryX, calcY)
    const priorPaid = Math.max(0, (Number(invoice.amount_paid) || 0) - (Number(payment.amount) || 0))
    doc.text(`${curSign}${formatAmount(priorPaid)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 5
  }

  doc.setDrawColor(203, 213, 225)
  doc.setLineWidth(0.4)
  doc.line(summaryX, calcY - 1, pageWidth - margin, calcY - 1)
  calcY += 3

  // Amount Paid in this Receipt
  doc.setFont('times', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(21, 128, 61)
  doc.text('Amount Credited:', summaryX, calcY)
  doc.text(`${curSign}${formatAmount(payment.amount)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 6

  // Remaining Balance on Invoice
  if (invoice) {
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text('Remaining Balance Due:', summaryX, calcY)
    doc.text(`${curSign}${formatAmount(invoice.balance_due)}`, pageWidth - margin, calcY, { align: 'right' })
  }

  // Classic LaTeX Double Underline
  calcY += 1.5
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.4)
  doc.line(summaryX, calcY, pageWidth - margin, calcY)
  doc.line(summaryX, calcY + 0.6, pageWidth - margin, calcY + 0.6)

  // Footer
  const footerY = pageHeight - 12
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)

  doc.setFont('times', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(148, 163, 184)
  const legalLine = `${bizName}  •  Commercial Payment Receipt  •  Official Record`
  doc.text(legalLine, pageWidth / 2, footerY, { align: 'center' })

  return doc
}

/**
 * Download Invoice PDF directly
 */
export async function downloadInvoicePdf(invoice, settings) {
  const activeSettings = await preparePdfSettings(settings)
  const doc = generateInvoicePdf(invoice, activeSettings)
  const filename = `${invoice.invoice_number || 'invoice'}.pdf`
  doc.save(filename)
  return doc
}

/**
 * Download Receipt PDF directly
 */
export async function downloadReceiptPdf(invoice, payment, settings) {
  const activeSettings = await preparePdfSettings(settings)
  const doc = generateReceiptPdf(invoice, payment, activeSettings)
  const filename = `${payment.receipt_number || payment.transaction_ref || 'receipt'}.pdf`
  doc.save(filename)
  return doc
}

/**
 * Returns Base64-encoded PDF string (without data URI prefix) for API attachment
 */
export function getInvoicePdfBase64(invoice, settings) {
  const doc = generateInvoicePdf(invoice, settings)
  const dataUri = doc.output('datauristring')
  return dataUri.split(',')[1] || dataUri
}

/**
 * Returns Base64-encoded PDF string asynchronously with resolved logo
 */
export async function getInvoicePdfBase64Async(invoice, settings) {
  const activeSettings = await preparePdfSettings(settings)
  return getInvoicePdfBase64(invoice, activeSettings)
}

/**
 * Returns Base64-encoded Receipt PDF string
 */
export function getReceiptPdfBase64(invoice, payment, settings) {
  const doc = generateReceiptPdf(invoice, payment, settings)
  const dataUri = doc.output('datauristring')
  return dataUri.split(',')[1] || dataUri
}

/**
 * Returns Base64-encoded Receipt PDF string asynchronously with resolved logo
 */
export async function getReceiptPdfBase64Async(invoice, payment, settings) {
  const activeSettings = await preparePdfSettings(settings)
  return getReceiptPdfBase64(invoice, payment, activeSettings)
}

/**
 * Returns Blob URL for in-app preview inside <iframe> or <embed>
 */
export function getInvoicePdfBlobUrl(invoice, settings) {
  const doc = generateInvoicePdf(invoice, settings)
  return doc.output('bloburl')
}

/**
 * Returns Blob URL for in-app preview asynchronously with resolved logo
 */
export async function getInvoicePdfBlobUrlAsync(invoice, settings) {
  const activeSettings = await preparePdfSettings(settings)
  return getInvoicePdfBlobUrl(invoice, activeSettings)
}

/**
 * Returns Blob URL for receipt
 */
export function getReceiptPdfBlobUrl(invoice, payment, settings) {
  const doc = generateReceiptPdf(invoice, payment, settings)
  return doc.output('bloburl')
}

/**
 * Returns Blob URL for receipt asynchronously with resolved logo
 */
export async function getReceiptPdfBlobUrlAsync(invoice, payment, settings) {
  const activeSettings = await preparePdfSettings(settings)
  return getReceiptPdfBlobUrl(invoice, payment, activeSettings)
}

/**
 * Isolated Printing via Hidden IFrame
 * Ensures clean document printing without browser headers, sidebars, or CRM screen elements.
 * @param {jsPDF|string} docOrBlobUrl - jsPDF document or blob URL
 */
export function printDocumentPdf(docOrBlobUrl) {
  let blobUrl = typeof docOrBlobUrl === 'string'
    ? docOrBlobUrl
    : (docOrBlobUrl?.output ? docOrBlobUrl.output('bloburl') : null)

  if (!blobUrl) {
    console.error('printDocumentPdf: Invalid PDF document or URL provided')
    return
  }

  // Create an invisible iframe attached to body
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.src = blobUrl

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.warn('IFrame direct print failed, falling back to window.open:', e)
      const printWindow = window.open(blobUrl, '_blank')
      if (printWindow) {
        printWindow.focus()
        printWindow.print()
      }
    } finally {
      // Remove iframe from DOM after print dialog triggers
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 60000)
    }
  }

  document.body.appendChild(iframe)
}

/**
 * Generates raw, standard LaTeX source code (.tex)
 * Compatible with TeX Live, Overleaf, pdflatex, and xelatex.
 */
export function generateLatexSource(invoice, settings = {}) {
  const cur = invoice.currency || settings.currency || 'USD'
  const items = (invoice.items || []).map((it) => {
    const desc = (it.name || 'Item').replace(/([&%$#_{}~^\\])/g, '\\$1')
    const qty = it.quantity || 1
    const unitPrice = formatAmount(it.unit_price)
    const amount = formatAmount(it.amount)
    return `    ${desc} & ${qty} & ${unitPrice} & ${amount} \\\\`
  }).join('\n')

  return `% ==============================================================================
% Crestara CRM Official LaTeX Invoice Document
% Compile with: pdflatex or xelatex
% ==============================================================================
\\documentclass[10pt,a4paper]{article}
\\usepackage[margin=20mm]{geometry}
\\usepackage{booktabs}
\\usepackage{tabularx}
\\usepackage{microtype}
\\usepackage{xcolor}
\\usepackage{parskip}

\\definecolor{slate}{RGB}{30, 41, 59}
\\definecolor{darkgray}{RGB}{71, 85, 105}

\\pagestyle{empty}

\\begin{document}

% Top Rule
\\noindent\\rule{\\textwidth}{1.2pt}
\\vspace{4mm}

% Header Block
\\noindent
\\begin{minipage}[t]{0.55\\textwidth}
    ${(settings.logo_url || settings.logo_data_uri) ? '{\\includegraphics[height=1.2cm]{logo.png}}\\\\\n    \\vspace{2mm}\n    ' : ''}{\\LARGE\\bfseries\\color{slate} ${settings.business_name || 'Crestara CRM'}}\\\\
    \\vspace{1.5mm}
    {\\small\\color{darkgray} ${settings.legal_name || ''}}\\\\
    {\\small\\color{darkgray} ${settings.business_address ? settings.business_address.replace(/\n/g, '\\\\ ') : ''}}\\\\
    {\\small\\color{darkgray} Tax ID: ${settings.tax_id || ''} \\quad Tel: ${settings.business_phone || ''}}\\\\
    {\\small\\color{darkgray} ${settings.business_email || ''}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.40\\textwidth}
    \\raggedleft
    {\\Huge\\bfseries\\color{slate} INVOICE}\\\\
    \\vspace{2mm}
    {\\large\\bfseries ${invoice.invoice_number || 'INV-DRAFT'}}\\\\
    \\vspace{2mm}
    {\\small\\color{darkgray} Issue Date: ${invoice.issue_date || '-'}}\\\\
    {\\small\\color{darkgray} Due Date: ${invoice.due_date || '-'}}\\\\
    {\\small\\color{darkgray} Terms: ${invoice.payment_terms || 'Net 30'}}
\\end{minipage}

\\vspace{6mm}
\\noindent\\rule{\\textwidth}{0.4pt}
\\vspace{4mm}

% Billed To Section
\\noindent
\\begin{minipage}[t]{0.6\\textwidth}
    {\\bfseries\\footnotesize\\color{darkgray} BILLED TO}\\\\
    \\vspace{1.5mm}
    {\\large\\bfseries ${invoice.client_name || 'Valued Customer'}}\\\\
    {\\small\\color{darkgray} Attn: ${invoice.contact_name || ''}}\\\\
    {\\small\\color{darkgray} ${invoice.client_email || ''}}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.35\\textwidth}
    \\raggedleft
    ${invoice.status === 'Paid' ? '{\\Large\\bfseries\\color[RGB]{22,101,52} [ PAID IN FULL ]}' : ''}
\\end{minipage}

\\vspace{6mm}

% Line Items Table (Booktabs Standard)
\\noindent
\\begin{tabularx}{\\textwidth}{X r r r}
    \\toprule
    \\textbf{Description} & \\textbf{Qty} & \\textbf{Unit Price (${cur})} & \\textbf{Amount (${cur})} \\\\
    \\midrule
${items || '    No items listed & 0 & 0.00 & 0.00 \\\\'}
    \\bottomrule
\\end{tabularx}

\\vspace{6mm}

% Summary & Remittance
\\noindent
\\begin{minipage}[t]{0.55\\textwidth}
    ${settings.bank_name ? `{\\bfseries\\footnotesize\\color{slate} REMITTANCE INSTRUCTIONS}\\\\
    \\vspace{1.5mm}
    {\\small\\color{darkgray} Bank: ${settings.bank_name}}\\\\
    {\\small\\color{darkgray} Account / IBAN: ${settings.bank_account_number || ''}}\\\\
    {\\small\\color{darkgray} SWIFT / BIC: ${settings.swift_bic || ''}}` : ''}

    \\vspace{4mm}
    ${invoice.notes ? `{\\bfseries\\footnotesize\\color{slate} NOTES}\\\\
    \\vspace{1mm}
    {\\small\\color{darkgray} ${invoice.notes.replace(/\n/g, '\\\\ ')}}` : ''}
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.40\\textwidth}
    \\raggedleft
    \\begin{tabular}{r r}
        Subtotal: & ${cur} ${formatAmount(invoice.subtotal)} \\\\
        Discount (${invoice.discount_percentage || 0}\\%): & -${cur} ${formatAmount(invoice.discount_amount)} \\\\
        Tax (${invoice.tax_rate || 0}\\%): & +${cur} ${formatAmount(invoice.tax_amount)} \\\\
        \\midrule
        \\textbf{Grand Total:} & \\textbf{${cur} ${formatAmount(invoice.total_amount)}} \\\\
        Amount Paid: & ${cur} ${formatAmount(invoice.amount_paid)} \\\\
        \\midrule
        \\textbf{Balance Due:} & \\textbf{${cur} ${formatAmount(invoice.balance_due)}} \\\\
        \\bottomrule
    \\end{tabular}
\\end{minipage}

\\vfill
\\noindent\\rule{\\textwidth}{0.3pt}\\\\
\\centering{\\scriptsize\\color{darkgray} ${settings.business_name || 'Crestara CRM'} $\\cdot$ ${settings.website || 'https://crestara.com'} $\\cdot$ Generated electronically}

\\end{document}
`
}

/**
 * Downloads .tex source file
 */
export function downloadLatexSource(invoice, settings) {
  const texContent = generateLatexSource(invoice, settings)
  const blob = new Blob([texContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${invoice.invoice_number || 'invoice'}.tex`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
