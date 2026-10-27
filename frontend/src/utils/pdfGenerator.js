import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DEFAULT_CRESTARA_LOGO_BASE64 } from './defaultLogo'

/**
 * High-End Vector PDF Generator & Clean Printer
 * Produces publication-grade, modern vector documents mirroring the UI canvas design:
 * clean sans-serif typography, soft rounded cards, Frappe UI / Tailwind slate palette,
 * emerald settlement accents, and isolated print frames.
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
 * Generates an official vector Invoice PDF mirroring the Crestara CRM UI canvas.
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
  const margin = 15 // 15mm clean margin (mirrors max-w-4xl p-6 sm:p-8)
  const contentWidth = pageWidth - margin * 2
  const curSign = getCurrencySign(invoice.currency || settings.currency)

  // Modern UI Typography: clean sans-serif
  doc.setFont('helvetica', 'normal')

  let y = margin

  // --- Top Row: Business Branding & Invoice Metadata ---
  // Left Column: Business Branding
  const bizName = settings.business_name || 'Crestara CRM'
  let logoData = settings.logo_data_uri || (settings.logo_url && settings.logo_url.startsWith('data:image/') ? settings.logo_url : null)
  if (!logoData && (!settings.logo_url || settings.logo_url === '/crestara_logo.png' || settings.logo_url.includes('crestara_logo.png'))) {
    logoData = DEFAULT_CRESTARA_LOGO_BASE64
  }

  let yBiz = y
  if (logoData) {
    try {
      let logoWidth = 46
      let logoHeight = 46 / (909 / 243)
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
      yBiz += logoHeight + 3
    } catch (err) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42) // text-ink-gray-9
      doc.text(bizName, margin, yBiz + 5)
      yBiz += 7
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.text(bizName, margin, yBiz + 5)
    yBiz += 7
  }

  // Legal name
  if (settings.legal_name && settings.legal_name !== bizName) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105) // text-ink-gray-7
    doc.text(settings.legal_name, margin, yBiz)
    yBiz += 3.8
  }

  // Address
  if (settings.business_address) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139) // text-ink-gray-6
    const addrLines = doc.splitTextToSize(settings.business_address, 85)
    doc.text(addrLines, margin, yBiz)
    yBiz += addrLines.length * 3.5
  }

  // Contact details: Tax ID, phone, email
  const contactPieces = []
  if (settings.tax_id) contactPieces.push(`Tax ID: ${settings.tax_id}`)
  if (settings.business_phone) contactPieces.push(settings.business_phone)
  if (settings.business_email) contactPieces.push(settings.business_email)

  if (contactPieces.length > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    const contactText = doc.splitTextToSize(contactPieces.join('  •  '), 85)
    doc.text(contactText, margin, yBiz)
    yBiz += contactText.length * 3.4
  }

  // Right Column: Invoice Metadata (mirrors UI top right)
  let rightY = y
  const isPaid = invoice.status === 'Paid' || Number(invoice.balance_due) <= 0
  const invNumberText = invoice.invoice_number || 'DRAFT INVOICE'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text(invNumberText, pageWidth - margin, rightY + 4, { align: 'right' })
  rightY += 6.5

  // Paid in Full Pill or Status Badge
  if (isPaid) {
    const badgeW = 30
    const badgeH = 5.5
    const badgeX = pageWidth - margin - badgeW
    const badgeY = rightY

    doc.setFillColor(236, 253, 245) // emerald-500/10 / surface-green-2
    doc.setDrawColor(167, 243, 208) // emerald-500/40 / outline-green-2
    doc.setLineWidth(0.3)
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(21, 128, 61) // emerald-700
    doc.text('PAID IN FULL', badgeX + badgeW / 2, badgeY + 3.8, { align: 'center' })
    rightY += badgeH + 3.5
  } else if (invoice.status) {
    const statusText = String(invoice.status).toUpperCase()
    const badgeW = Math.max(22, doc.getTextWidth(statusText) + 8)
    const badgeH = 5.2
    const badgeX = pageWidth - margin - badgeW
    const badgeY = rightY

    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(71, 85, 105)
    doc.text(statusText, badgeX + badgeW / 2, badgeY + 3.6, { align: 'center' })
    rightY += badgeH + 3.5
  }

  // Metadata Grid: Issue Date, Due Date, Terms, Currency
  const metaItems = [
    { label: 'Issue Date:', val: invoice.issue_date || '-' },
    { label: 'Due Date:', val: invoice.due_date || '-' },
    { label: 'Terms:', val: invoice.payment_terms || 'Net 30' },
    { label: 'Currency:', val: invoice.currency || settings.currency || 'USD' },
  ]

  for (const item of metaItems) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(item.label, pageWidth - margin - 35, rightY, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(15, 23, 42)
    doc.text(item.val, pageWidth - margin, rightY, { align: 'right' })
    rightY += 4
  }

  // Horizontal divider below header
  y = Math.max(yBiz, rightY) + 5
  doc.setDrawColor(226, 232, 240) // border-outline-gray-1
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  // --- Bill To Section: Rounded Card (mirrors UI bg-surface-gray-1 p-5 rounded-xl border) ---
  const clientLines = []
  clientLines.push({ text: invoice.client_name || 'Valued Customer', font: 'bold', size: 10, color: [15, 23, 42] })
  if (invoice.contact_name && invoice.contact_name !== invoice.client_name) {
    clientLines.push({ text: `Attn: ${invoice.contact_name}`, font: 'normal', size: 8, color: [71, 85, 105] })
  }
  if (invoice.client_email) {
    clientLines.push({ text: invoice.client_email, font: 'normal', size: 8, color: [100, 116, 139] })
  }
  if (invoice.client_phone) {
    clientLines.push({ text: `Tel: ${invoice.client_phone}`, font: 'normal', size: 8, color: [100, 116, 139] })
  }

  const cardPad = 4
  const cardH = 8 + (clientLines.length * 4) + 2
  const cardW = contentWidth

  doc.setFillColor(248, 250, 252) // bg-surface-gray-1 (#F8FAFC)
  doc.setDrawColor(226, 232, 240) // border-outline-gray-1 (#E2E8F0)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, cardW, cardH, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139) // uppercase tracking-wider
  doc.text('BILLED TO CLIENT', margin + cardPad, y + cardPad + 2.5)

  let curLineY = y + cardPad + 7.5
  for (const line of clientLines) {
    doc.setFont('helvetica', line.font)
    doc.setFontSize(line.size)
    doc.setTextColor(line.color[0], line.color[1], line.color[2])
    doc.text(line.text, margin + cardPad, curLineY)
    curLineY += 4
  }

  y += cardH + 5

  // --- Line Items Table: Modern UI Style with Header & Item SKU sub-row ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Line Items', margin, y)
  y += 2.5

  const tableRows = (invoice.items || []).map((item, idx) => {
    const desc = item.code ? `${item.name || 'Item'}\nSKU: ${item.code}` : (item.name || `Item ${idx + 1}`)
    return [
      desc,
      String(item.quantity || 1),
      `${curSign}${formatAmount(item.unit_price)}`,
      `${curSign}${formatAmount(item.amount || (item.quantity * item.unit_price))}`,
    ]
  })

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['ITEM & DESCRIPTION', 'QTY', `UNIT PRICE (${curSign.trim()})`, `AMOUNT (${curSign.trim()})`]],
    body: tableRows.length ? tableRows : [['No items listed', '-', '-', '-']],
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [15, 23, 42],
      cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
      lineColor: [241, 245, 249],
      lineWidth: { bottom: 0.3 },
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5,
      textColor: [100, 116, 139],
      fillColor: [248, 250, 252],
      lineColor: [226, 232, 240],
      lineWidth: { top: 0.3, bottom: 0.3 },
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      const finalY = data.cursor.y
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(margin, finalY, pageWidth - margin, finalY)
    },
  })

  let afterTableY = doc.lastAutoTable.finalY + 5

  // Page break check if remaining height is tight
  if (afterTableY > pageHeight - 75) {
    doc.addPage()
    afterTableY = margin + 5
  }

  // --- Financial Summary & Remittance Section ---
  const summaryWidth = 72
  const summaryX = pageWidth - margin - summaryWidth
  const leftColWidth = summaryX - margin - 8

  // Left Column: Notes & Remittance Settlement Details
  let leftY = afterTableY + 2
  if (invoice.notes) {
    const noteLines = doc.splitTextToSize(invoice.notes, leftColWidth - 6)
    const noteBoxH = Math.max(13, noteLines.length * 3.4 + 7)

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, leftY, leftColWidth, noteBoxH, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text('NOTES / INSTRUCTIONS', margin + 3, leftY + 3.8)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    doc.text(noteLines, margin + 3, leftY + 7.5)

    leftY += noteBoxH + 4
  }

  if (settings.bank_name || settings.bank_account_number) {
    const remitLines = []
    if (settings.bank_name) remitLines.push(`Bank: ${settings.bank_name}`)
    if (settings.bank_account_name) remitLines.push(`Account Name: ${settings.bank_account_name}`)
    if (settings.bank_account_number) remitLines.push(`Account / IBAN: ${settings.bank_account_number}`)
    if (settings.swift_bic) remitLines.push(`SWIFT / BIC: ${settings.swift_bic}`)

    let remitBoxH = 7 + (remitLines.length * 3.5)
    let instrLines = []
    if (settings.payment_instructions) {
      instrLines = doc.splitTextToSize(settings.payment_instructions, leftColWidth - 6)
      remitBoxH += instrLines.length * 3.2 + 2
    }

    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(margin, leftY, leftColWidth, remitBoxH, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(15, 23, 42)
    doc.text('Remittance Settlement Details', margin + 3, leftY + 4)

    let rY = leftY + 7.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    for (const rLine of remitLines) {
      doc.text(rLine, margin + 3, rY)
      rY += 3.5
    }

    if (instrLines.length > 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      doc.text(instrLines, margin + 3, rY + 0.5)
    }

    leftY += remitBoxH + 4
  }

  // Right Column: Financial Calculation Box
  let calcY = afterTableY + 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)

  // Subtotal
  doc.text('Subtotal:', summaryX, calcY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(`${curSign}${formatAmount(invoice.subtotal)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 4.8

  // Discount
  if (Number(invoice.discount_percentage) > 0 || Number(invoice.discount_amount) > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Discount (${invoice.discount_percentage || 0}%):`, summaryX, calcY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(21, 128, 61) // text-ink-green-7
    doc.text(`-${curSign}${formatAmount(invoice.discount_amount)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 4.8
  }

  // Tax
  if (Number(invoice.tax_rate) > 0 || Number(invoice.tax_amount) > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(`Tax (${invoice.tax_rate || 0}%):`, summaryX, calcY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text(`+${curSign}${formatAmount(invoice.tax_amount)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 4.8
  }

  // Divider above Grand Total
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(summaryX, calcY - 1, pageWidth - margin, calcY - 1)
  calcY += 3.5

  // Grand Total
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11.5)
  doc.setTextColor(15, 23, 42)
  doc.text('Grand Total:', summaryX, calcY)
  doc.text(`${curSign}${formatAmount(invoice.total_amount)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 5.5

  // Amount Paid
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Amount Paid:', summaryX, calcY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(21, 128, 61)
  doc.text(`${curSign}${formatAmount(invoice.amount_paid)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 4.8

  // Balance Due
  const balanceDue = Number(invoice.balance_due || 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Balance Due:', summaryX, calcY)
  doc.setTextColor(balanceDue > 0 ? 217 : 21, balanceDue > 0 ? 119 : 128, balanceDue > 0 ? 6 : 61) // amber-600 or emerald-700
  doc.text(`${curSign}${formatAmount(balanceDue)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 5.5

  // Settled Box if Paid (mirrors UI settled box)
  if (isPaid) {
    doc.setFillColor(236, 253, 245)
    doc.setDrawColor(167, 243, 208)
    doc.setLineWidth(0.3)
    doc.roundedRect(summaryX, calcY, summaryWidth, 6.2, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(21, 128, 61)
    doc.text('PAID IN FULL', summaryX + 3.5, calcY + 4.2)
    doc.setFontSize(7)
    doc.text('Settled', pageWidth - margin - 3.5, calcY + 4.2, { align: 'right' })
    calcY += 9
  }

  // --- Recorded Payments Table (if payments recorded) ---
  let bottomSectionY = Math.max(leftY, calcY) + 3
  if (invoice.payments && invoice.payments.length > 0) {
    if (bottomSectionY > pageHeight - 45) {
      doc.addPage()
      bottomSectionY = margin + 5
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(15, 23, 42)
    doc.text(`Recorded Payments & Commercial Receipts (${invoice.payments.length})`, margin, bottomSectionY)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(21, 128, 61)
    doc.text(`Total Settled: ${curSign}${formatAmount(invoice.amount_paid)}`, pageWidth - margin, bottomSectionY, { align: 'right' })
    bottomSectionY += 2.5

    const paymentRows = invoice.payments.map((p) => [
      p.receipt_number || p.transaction_ref || 'REC-SETTLED',
      p.payment_date || '-',
      p.payment_method || 'Electronic',
      `${curSign}${formatAmount(p.amount)}`,
      p.status || 'Settled',
    ])

    autoTable(doc, {
      startY: bottomSectionY,
      margin: { left: margin, right: margin },
      head: [['RECEIPT #', 'DATE', 'METHOD', 'AMOUNT', 'STATUS']],
      body: paymentRows,
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        textColor: [15, 23, 42],
        cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
        lineColor: [241, 245, 249],
        lineWidth: { bottom: 0.25 },
      },
      headStyles: {
        font: 'helvetica',
        fontStyle: 'bold',
        fontSize: 7,
        textColor: [100, 116, 139],
        fillColor: [248, 250, 252],
        lineColor: [226, 232, 240],
        lineWidth: { top: 0.25, bottom: 0.25 },
        cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
      },
      columnStyles: {
        0: { fontStyle: 'bold' },
        3: { halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] },
        4: { halign: 'center', textColor: [21, 128, 61], fontStyle: 'bold' },
      },
      didDrawPage: (data) => {
        const finalY = data.cursor.y
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.3)
        doc.line(margin, finalY, pageWidth - margin, finalY)
      },
    })
  }

  // --- Invoice Bottom Footer (Small Font, exactly mirroring UI footer) ---
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const footerDividerY = pageHeight - 13

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(margin, footerDividerY, pageWidth - margin, footerDividerY)

    // Footer Line 1: Business Name • Legal Name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105) // text-ink-gray-7
    const footLine1 = `${bizName}${settings.legal_name && settings.legal_name !== bizName ? '  •  ' + settings.legal_name : ''}`
    doc.text(footLine1, pageWidth / 2, footerDividerY + 4, { align: 'center' })

    // Footer Line 2: Address • Tax ID • Phone
    const footParts = []
    if (settings.business_address) footParts.push(settings.business_address.replace(/\n/g, ', '))
    if (settings.tax_id) footParts.push(`Tax ID: ${settings.tax_id}`)
    if (settings.business_phone) footParts.push(settings.business_phone)

    if (footParts.length > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(100, 116, 139) // text-ink-gray-6
      doc.text(footParts.join('  •  '), pageWidth / 2, footerDividerY + 7.5, { align: 'center' })
    }
  }

  return doc
}

/**
 * Generates an official Commercial Receipt PDF mirroring the UI CommercialReceiptModal design.
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
  const margin = 15
  const contentWidth = pageWidth - margin * 2
  const curSign = getCurrencySign(payment.currency || invoice?.currency || settings.currency)

  doc.setFont('helvetica', 'normal')

  let y = margin

  // Left Column: Business Branding
  const bizName = settings.business_name || 'Crestara CRM'
  let logoData = settings.logo_data_uri || (settings.logo_url && settings.logo_url.startsWith('data:image/') ? settings.logo_url : null)
  if (!logoData && (!settings.logo_url || settings.logo_url === '/crestara_logo.png' || settings.logo_url.includes('crestara_logo.png'))) {
    logoData = DEFAULT_CRESTARA_LOGO_BASE64
  }

  let yBiz = y
  if (logoData) {
    try {
      let logoWidth = 46
      let logoHeight = 46 / (909 / 243)
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
      yBiz += logoHeight + 3
    } catch (err) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(15, 23, 42)
      doc.text(bizName, margin, yBiz + 5)
      yBiz += 7
    }
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(15, 23, 42)
    doc.text(bizName, margin, yBiz + 5)
    yBiz += 7
  }

  if (settings.legal_name && settings.legal_name !== bizName) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text(settings.legal_name, margin, yBiz)
    yBiz += 3.8
  }

  if (settings.business_address) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    const addrLines = doc.splitTextToSize(settings.business_address, 85)
    doc.text(addrLines, margin, yBiz)
    yBiz += addrLines.length * 3.5
  }

  if (settings.tax_id) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text(`Tax ID / TIN: ${settings.tax_id}`, margin, yBiz)
    yBiz += 3.8
  }

  // Right Column: Official Receipt Metadata (mirrors UI)
  let rightY = y
  const badgeW = 28
  const badgeH = 5.2
  const badgeX = pageWidth - margin - badgeW

  doc.setFillColor(236, 253, 245)
  doc.setDrawColor(167, 243, 208)
  doc.setLineWidth(0.3)
  doc.roundedRect(badgeX, rightY, badgeW, badgeH, 1.5, 1.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(21, 128, 61)
  doc.text('OFFICIAL RECEIPT', badgeX + badgeW / 2, rightY + 3.6, { align: 'center' })
  rightY += badgeH + 3

  const recNumber = payment.receipt_number || payment.transaction_ref || 'REC-SETTLED'
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(recNumber, pageWidth - margin, rightY + 4, { align: 'right' })
  rightY += 7.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text(`Date: ${payment.payment_date || new Date().toISOString().split('T')[0]}`, pageWidth - margin, rightY, { align: 'right' })
  rightY += 4

  // Divider below header
  y = Math.max(yBiz, rightY) + 5
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageWidth - margin, y)
  y += 5

  // --- Received From & Settlement Reference Card (2 columns inside card) ---
  const cardPad = 4
  const cardW = contentWidth
  const cardH = 26

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, y, cardW, cardH, 2.5, 2.5, 'FD')

  // Left side: Received From
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('RECEIVED FROM', margin + cardPad, y + cardPad + 2.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text(invoice?.client_name || payment.client_name || 'Valued Customer', margin + cardPad, y + cardPad + 7)

  let leftCardY = y + cardPad + 11
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  if (invoice?.client_email) {
    doc.text(invoice.client_email, margin + cardPad, leftCardY)
    leftCardY += 3.8
  }
  if (invoice?.contact_name) {
    doc.text(`Attn: ${invoice.contact_name}`, margin + cardPad, leftCardY)
  }

  // Right side: Settlement Reference
  const rightColX = margin + (cardW / 2) + 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('SETTLEMENT REFERENCE', rightColX, y + cardPad + 2.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Invoice Number:', rightColX, y + cardPad + 7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(invoice?.invoice_number || 'Direct Payment', margin + cardW - cardPad, y + cardPad + 7, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text('Payment Method:', rightColX, y + cardPad + 11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(payment.payment_method || 'Electronic Transfer', margin + cardW - cardPad, y + cardPad + 11, { align: 'right' })

  if (payment.transaction_ref && payment.transaction_ref !== recNumber) {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Transaction Ref:', rightColX, y + cardPad + 15)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(payment.transaction_ref, margin + cardW - cardPad, y + cardPad + 15, { align: 'right' })
  }

  y += cardH + 5

  // --- Settlement Breakdown Table ---
  const receiptRows = [
    [
      `Payment towards Invoice ${invoice?.invoice_number || ''}${payment.notes ? '\n' + payment.notes : ''}`,
      payment.payment_method || 'Electronic Transfer',
      payment.transaction_ref || recNumber,
      `${curSign}${formatAmount(payment.amount)}`,
    ],
  ]

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['DESCRIPTION', 'PAYMENT CHANNEL', 'REFERENCE / BATCH #', 'CREDITED AMOUNT']],
    body: receiptRows,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      textColor: [15, 23, 42],
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      lineColor: [241, 245, 249],
      lineWidth: { bottom: 0.3 },
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 7.5,
      textColor: [100, 116, 139],
      fillColor: [248, 250, 252],
      lineColor: [226, 232, 240],
      lineWidth: { top: 0.3, bottom: 0.3 },
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 38 },
      2: { cellWidth: 42 },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] },
    },
    didDrawPage: (data) => {
      const finalY = data.cursor.y
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(margin, finalY, pageWidth - margin, finalY)
    },
  })

  let afterTableY = doc.lastAutoTable.finalY + 6

  if (afterTableY > pageHeight - 65) {
    doc.addPage()
    afterTableY = margin + 5
  }

  // --- Reconciliation & Audit Verified Seal ---
  const summaryWidth = 75
  const summaryX = pageWidth - margin - summaryWidth
  const leftColWidth = summaryX - margin - 8

  // Left side: Official Audit Verified Seal Card (mirrors UI)
  const sealH = 18
  doc.setFillColor(236, 253, 245)
  doc.setDrawColor(167, 243, 208)
  doc.setLineWidth(0.3)
  doc.roundedRect(margin, afterTableY, leftColWidth, sealH, 2, 2, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(21, 128, 61)
  doc.text('AUDIT VERIFIED SETTLEMENT', margin + 4, afterTableY + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Authenticated commercial receipt recorded in ledger.', margin + 4, afterTableY + 10.5)
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  doc.text(`Receipt Reference: ${recNumber}`, margin + 4, afterTableY + 14.5)

  // Right side: Financial reconciliation
  let calcY = afterTableY + 1
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)

  if (invoice) {
    doc.text('Invoice Total:', summaryX, calcY)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`${curSign}${formatAmount(invoice.total_amount)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 4.8

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text('Total Paid Prior:', summaryX, calcY)
    const priorPaid = Math.max(0, (Number(invoice.amount_paid) || 0) - (Number(payment.amount) || 0))
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text(`${curSign}${formatAmount(priorPaid)}`, pageWidth - margin, calcY, { align: 'right' })
    calcY += 4.8
  }

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(summaryX, calcY - 1, pageWidth - margin, calcY - 1)
  calcY += 3.5

  // Amount Credited (Highlighted in Green)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(21, 128, 61)
  doc.text('Amount Credited:', summaryX, calcY)
  doc.text(`${curSign}${formatAmount(payment.amount)}`, pageWidth - margin, calcY, { align: 'right' })
  calcY += 5.5

  // Remaining Balance Due
  if (invoice) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text('Remaining Balance Due:', summaryX, calcY)
    const remBal = Number(invoice.balance_due || 0)
    doc.setTextColor(remBal > 0 ? 217 : 21, remBal > 0 ? 119 : 128, remBal > 0 ? 6 : 61)
    doc.text(`${curSign}${formatAmount(remBal)}`, pageWidth - margin, calcY, { align: 'right' })
  }

  // --- Receipt Footer ---
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const footerDividerY = pageHeight - 13

    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.line(margin, footerDividerY, pageWidth - margin, footerDividerY)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(71, 85, 105)
    const footLine1 = `${bizName}${settings.legal_name && settings.legal_name !== bizName ? '  •  ' + settings.legal_name : ''}`
    doc.text(footLine1, pageWidth / 2, footerDividerY + 4, { align: 'center' })

    const footParts = []
    if (settings.business_address) footParts.push(settings.business_address.replace(/\n/g, ', '))
    if (settings.tax_id) footParts.push(`Tax ID: ${settings.tax_id}`)
    if (settings.business_phone) footParts.push(settings.business_phone)

    if (footParts.length > 0) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.8)
      doc.setTextColor(100, 116, 139)
      doc.text(footParts.join('  •  '), pageWidth / 2, footerDividerY + 7.5, { align: 'center' })
    }
  }

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
