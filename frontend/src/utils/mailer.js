import {
  getInvoicePdfBase64,
  getInvoicePdfBase64Async,
  getReceiptPdfBase64,
  getReceiptPdfBase64Async,
  formatAmount,
  getCurrencySign,
} from './pdfGenerator'

/**
 * cPanel Mailer Client
 * Connects frontend Vue application to cPanel endpoint `/api/send_email.php`.
 * Handles automated & on-demand dispatch of invoices and receipts with vector PDF attachments.
 */

/**
 * Builds responsive, email-client-friendly HTML markup for invoice notifications
 */
export function buildInvoiceEmailHtml({ invoice, businessSettings = {}, personalMessage = '' }) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const cur = getCurrencySign(invoice.currency || businessSettings.currency)
  const isPaid = invoice.status === 'Paid' || Number(invoice.balance_due) <= 0

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number || ''}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Commercial Invoice: ${invoice.invoice_number || 'INV'}</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>${invoice.client_name || 'Customer'}</strong>,
      </p>

      ${personalMessage ? `
      <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 18px 0; border-radius: 4px; font-size: 14px; color: #334155;">
        ${personalMessage.replace(/\n/g, '<br>')}
      </div>
      ` : `
      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Please find attached your official commercial invoice <strong>${invoice.invoice_number}</strong>.
      </p>
      `}

      <!-- Key Details Box -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Issue Date:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${invoice.issue_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Due:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${invoice.due_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Total Invoice Amount:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${cur}${formatAmount(invoice.total_amount)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b;">Balance Due:</td>
          <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: ${isPaid ? '#15803d' : '#b45309'}; text-align: right;">${cur}${formatAmount(invoice.balance_due)}</td>
        </tr>
      </table>

      ${isPaid ? `
      <div style="text-align: center; padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 14px; font-weight: 700;">
        ✓ THIS INVOICE IS FULLY SETTLED
      </div>
      ` : businessSettings.bank_name || businessSettings.bank_account_number ? `
      <!-- Wire settlement box -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 12px; color: #475569;">
        <strong style="color: #0f172a; display: block; margin-bottom: 6px;">Remittance & Bank Wire Details:</strong>
        ${businessSettings.bank_name ? `<div>Bank: ${businessSettings.bank_name}</div>` : ''}
        ${businessSettings.bank_account_name ? `<div>Account Name: ${businessSettings.bank_account_name}</div>` : ''}
        ${businessSettings.bank_account_number ? `<div>Account / IBAN: ${businessSettings.bank_account_number}</div>` : ''}
        ${businessSettings.swift_bic ? `<div>SWIFT / BIC: ${businessSettings.swift_bic}</div>` : ''}
      </div>
      ` : ''}

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        A publication-grade vector PDF of your invoice is attached to this email for your accounting records.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      ${bizName} ${businessSettings.business_phone ? `• ${businessSettings.business_phone}` : ''} • Powered by Crestara CRM
    </div>
  </div>
</body>
</html>`
}

/**
 * Builds responsive, email-client-friendly HTML markup for receipt notifications
 */
export function buildReceiptEmailHtml({ invoice, payment, businessSettings = {}, personalMessage = '' }) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const cur = getCurrencySign(payment.currency || invoice?.currency || businessSettings.currency)
  const recNumber = payment.receipt_number || payment.transaction_ref || 'RECEIPT'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt ${recNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <div style="background-color: #15803d; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700;">${bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #bbf7d0;">Official Payment Receipt: ${recNumber}</p>
    </div>

    <div style="padding: 32px;">
      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>${invoice?.client_name || payment.client_name || 'Customer'}</strong>,
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #475569;">
        Thank you for your payment. We have successfully processed and recorded your transaction.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #166534; border-bottom: 1px solid #bbf7d0;">Receipt Number:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #14532d; text-align: right; border-bottom: 1px solid #bbf7d0;">${recNumber}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #166534; border-bottom: 1px solid #bbf7d0;">Payment Date:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #14532d; text-align: right; border-bottom: 1px solid #bbf7d0;">${payment.payment_date || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #166534; border-bottom: 1px solid #bbf7d0;">Payment Method:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #14532d; text-align: right; border-bottom: 1px solid #bbf7d0;">${payment.payment_method || 'Electronic Transfer'}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #166534; border-bottom: 1px solid #bbf7d0;">Invoice Reference:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #14532d; text-align: right; border-bottom: 1px solid #bbf7d0;">${invoice?.invoice_number || '-'}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 14px; font-weight: 700; color: #14532d;">Amount Credited:</td>
          <td style="padding: 14px 16px; font-size: 16px; font-weight: 800; color: #15803d; text-align: right;">${cur}${formatAmount(payment.amount)}</td>
        </tr>
      </table>

      ${invoice ? `
      <div style="font-size: 13px; color: #475569; text-align: right; margin-bottom: 20px;">
        Remaining Invoice Balance: <strong>${cur}${formatAmount(invoice.balance_due)}</strong>
      </div>
      ` : ''}

      <p style="font-size: 13px; color: #64748b;">
        An official commercial PDF receipt is attached to this email with audit verification.
      </p>
    </div>

    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      ${bizName} • Official Financial Receipt
    </div>
  </div>
</body>
</html>`
}

/**
 * Sends an email with an invoice PDF attachment via cPanel API endpoint
 */
export async function sendInvoiceEmail({
  invoice,
  recipientEmail,
  subject,
  personalMessage = '',
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  if (!recipientEmail) {
    throw new Error('Recipient email address is required')
  }

  // Generate vector PDF base64 with embedded logo
  const pdfBase64 = await getInvoicePdfBase64Async(invoice, businessSettings)
  const defaultSubject = `Invoice ${invoice.invoice_number || ''} from ${businessSettings.business_name || 'Crestara CRM'}`
  const htmlContent = buildInvoiceEmailHtml({ invoice, businessSettings, personalMessage })

  const payload = {
    recipient: recipientEmail,
    subject: subject || defaultSubject,
    html: htmlContent,
    attachments: [
      {
        filename: `${invoice.invoice_number || 'invoice'}.pdf`,
        content_type: 'application/pdf',
        base64_data: pdfBase64,
      },
    ],
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Failed to send email (HTTP ${response.status})`)
  }

  return resJson
}

/**
 * Sends an email with a commercial receipt PDF attachment via cPanel API endpoint
 */
export async function sendReceiptEmail({
  invoice,
  payment,
  recipientEmail,
  subject,
  personalMessage = '',
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  if (!recipientEmail) {
    throw new Error('Recipient email address is required')
  }

  const recNumber = payment.receipt_number || payment.transaction_ref || 'receipt'
  const pdfBase64 = await getReceiptPdfBase64Async(invoice, payment, businessSettings)
  const defaultSubject = `Official Payment Receipt ${recNumber} - ${businessSettings.business_name || 'Crestara CRM'}`
  const htmlContent = buildReceiptEmailHtml({ invoice, payment, businessSettings, personalMessage })

  const payload = {
    recipient: recipientEmail,
    subject: subject || defaultSubject,
    html: htmlContent,
    attachments: [
      {
        filename: `${recNumber}.pdf`,
        content_type: 'application/pdf',
        base64_data: pdfBase64,
      },
    ],
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Failed to send receipt email (HTTP ${response.status})`)
  }

  return resJson
}

/**
 * Sends a test email to verify cPanel SMTP / mailer settings
 */
export async function sendTestEmail({
  recipientEmail,
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  if (!recipientEmail) throw new Error('Recipient email is required')

  const bizName = businessSettings.business_name || 'Crestara CRM'
  const payload = {
    recipient: recipientEmail,
    subject: `Test Delivery from ${bizName} (cPanel Mailer)`,
    html: `
      <div style="font-family: sans-serif; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">cPanel Mail Delivery Test Succeeded</h2>
        <p style="color: #475569;">Your Crestara CRM email delivery configuration is operational.</p>
        <p style="font-size: 12px; color: #94a3b8;">Timestamp: ${new Date().toISOString()}</p>
      </div>
    `,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Mail test failed (HTTP ${response.status})`)
  }

  return resJson
}

/**
 * Builds responsive, email-client-friendly HTML markup for automated & manual payment reminders
 */
export function buildPaymentReminderEmailHtml({
  invoice,
  businessSettings = {},
  countdownStage = 'upcoming',
  daysMetric = 0,
  personalMessage = '',
}) {
  const bizName = businessSettings.business_name || 'Crestara CRM'
  const cur = getCurrencySign(invoice.currency || businessSettings.currency)
  const invNum = invoice.invoice_number || 'INVOICE'
  const clientName = invoice.client_name || 'Valued Customer'
  const dueDateStr = invoice.due_date || 'the agreed deadline'

  let badgeColor = '#2563eb'
  let badgeBg = '#eff6ff'
  let badgeBorder = '#bfdbfe'
  let badgeText = `⏰ ${daysMetric} DAYS UNTIL DEADLINE`

  if (countdownStage === 'due_today') {
    badgeColor = '#d97706'
    badgeBg = '#fffbeb'
    badgeBorder = '#fde68a'
    badgeText = '🔔 PAYMENT DEADLINE IS TODAY'
  } else if (countdownStage === 'overdue') {
    badgeColor = '#dc2626'
    badgeBg = '#fef2f2'
    badgeBorder = '#fecaca'
    badgeText = `⏳ GENTLE REMINDER • ${daysMetric} DAY${daysMetric === 1 ? '' : 'S'} PAST DEADLINE`
  }

  const bankHtml = (businessSettings.bank_name || businessSettings.bank_account_number)
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #475569;">
        <strong style="color: #0f172a; display: block; margin-bottom: 6px;">Remittance & Bank Wire Details:</strong>
        ${businessSettings.bank_name ? `<div>Bank: ${businessSettings.bank_name}</div>` : ''}
        ${businessSettings.bank_account_name ? `<div>Account Name: ${businessSettings.bank_account_name}</div>` : ''}
        ${businessSettings.bank_account_number ? `<div>Account / IBAN: ${businessSettings.bank_account_number}</div>` : ''}
        ${businessSettings.swift_bic ? `<div>SWIFT / BIC: ${businessSettings.swift_bic}</div>` : ''}
      </div>
    `
    : ''

  const formattedMsg = personalMessage
    ? personalMessage.replace(/\n/g, '<br>')
    : `Please review your outstanding balance for invoice <strong>${invNum}</strong> due on <strong>${dueDateStr}</strong>.`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder ${invNum}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.04);">
    <!-- Header -->
    <div style="background-color: #0f172a; padding: 28px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${bizName}</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Commercial Invoice: ${invNum}</p>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <!-- Badge -->
      <div style="display: inline-block; padding: 6px 14px; border-radius: 9999px; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 20px; border: 1px solid ${badgeBorder};">
        ${badgeText}
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Dear <strong>${clientName}</strong>,
      </p>

      <div style="font-size: 14px; line-height: 1.6; color: #475569; margin: 16px 0; background-color: #f8fafc; border-left: 4px solid ${badgeColor}; padding: 12px 16px; border-radius: 4px;">
        ${formattedMsg}
      </div>

      <!-- Financial Summary Box -->
      <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Payment Deadline:</td>
          <td style="padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; border-bottom: 1px solid #e2e8f0;">${dueDateStr}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 13px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Total Invoice Amount:</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${cur}${formatAmount(invoice.total_amount)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #1e293b;">Balance Due:</td>
          <td style="padding: 12px 16px; font-size: 15px; font-weight: 700; color: #b45309; text-align: right;">${cur}${formatAmount(invoice.balance_due)}</td>
        </tr>
      </table>

      ${bankHtml}

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        A copy of your original commercial invoice is attached as a publication-grade vector PDF for your records.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
      ${bizName} ${businessSettings.business_phone ? `• ${businessSettings.business_phone}` : ''} • Powered by Crestara CRM
    </div>
  </div>
</body>
</html>`
}

/**
 * Sends a payment reminder email with optional invoice PDF attachment via cPanel API
 */
export async function sendPaymentReminderEmail({
  invoice,
  recipientEmail,
  subject,
  personalMessage = '',
  countdownStage = 'upcoming',
  daysMetric = 0,
  attachPdf = true,
  businessSettings = {},
  endpoint = '/api/send_email.php',
}) {
  if (!recipientEmail) {
    throw new Error('Recipient email address is required')
  }

  const defaultSubject = subject || `Payment Reminder: Invoice ${invoice.invoice_number || ''}`
  const htmlContent = buildPaymentReminderEmailHtml({
    invoice,
    businessSettings,
    countdownStage,
    daysMetric,
    personalMessage,
  })

  const attachments = []
  if (attachPdf) {
    const pdfBase64 = await getInvoicePdfBase64Async(invoice, businessSettings)
    attachments.push({
      filename: `${invoice.invoice_number || 'invoice'}.pdf`,
      content_type: 'application/pdf',
      base64_data: pdfBase64,
    })
  }

  const payload = {
    recipient: recipientEmail,
    subject: defaultSubject,
    html: htmlContent,
    attachments,
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const resJson = await response.json().catch(() => ({}))
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || `Failed to dispatch reminder email (HTTP ${response.status})`)
  }

  return resJson
}
