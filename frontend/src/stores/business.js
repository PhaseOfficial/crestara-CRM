import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'
import { sessionStore } from './session'
const defaultSettings = {
  business_name: 'Crestara CRM',
  legal_name: 'Crestara Technologies Inc.',
  business_email: 'billing@crestara.com',
  business_phone: '+1 (555) 000-1234',
  business_address: '100 Business Parkway, Suite 500, San Francisco, CA 94105',
  tax_id: 'US-94-8829103',
  website: 'https://crestara.com',
  currency: 'USD',
  currency_symbol: '$',
  invoice_prefix: 'INV-2026-',
  next_invoice_number: 1045,
  default_payment_terms: 30,
  tax_rate: 8.5,
  late_fee_percentage: 2.0,
  logo_url: '',
  notes_template: 'Thank you for your business. Remittance is due within agreed terms.',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_routing_iban: '',
  swift_bic: '',
  payment_instructions: '',
}

export const useBusinessStore = defineStore('business-store', () => {
  // Helper to load or initialize from localStorage
  function loadStorage(key, fallback) {
    try {
      const stored = localStorage.getItem(`crestara_${key}`)
      return stored ? JSON.parse(stored) : fallback
    } catch {
      return fallback
    }
  }

  function saveStorage(key, value) {
    try {
      localStorage.setItem(`crestara_${key}`, JSON.stringify(value))
    } catch (e) {
      console.warn(`Could not save crestara_${key} to localStorage:`, e)
    }
  }

  // Purge any legacy mock entries from local storage
  const MOCK_IDS = new Set([
    'usr-admin-01', 'usr-staff-01', 'usr-staff-02', 'usr-staff-03', 'usr-client-01',
    'usr-client-02', 'usr-client-03', 'cust-b2b-01', 'cust-b2b-02', 'cust-b2b-03',
    'cust-b2b-04', 'cust-b2b-05', 'cust-b2b-06', 'cr-1001',
    'inv-001', 'inv-002', 'inv-003', 'inv-004', 'inv-005', 'inv-006', 'inv-007',
    'prod-001', 'prod-002', 'prod-003', 'prod-004', 'prod-005', 'prod-006',
  ])

  function cleanStoredList(key) {
    const list = loadStorage(key, [])
    const cleaned = Array.isArray(list) ? list.filter((item) => !MOCK_IDS.has(item?.id)) : []
    saveStorage(key, cleaned)
    return cleaned
  }

  // Reactive state - strictly real backend data
  const settings = ref(loadStorage('settings', defaultSettings))
  const inventory = ref(cleanStoredList('inventory'))
  const invoices = ref(cleanStoredList('invoices'))
  const transactions = ref(cleanStoredList('transactions'))
  const reminders = ref(cleanStoredList('reminders'))
  const promotions = ref(cleanStoredList('promotions'))
  const users = ref(cleanStoredList('users'))
  const customers = ref(cleanStoredList('customers'))
  const changeRequests = ref(cleanStoredList('change_requests'))

  // Role: 'Administrator' | 'Staff' | 'Customer'
  const currentRole = ref(localStorage.getItem('crestara_current_role') || 'Administrator')

  function setRole(role) {
    if (['Administrator', 'Staff', 'Customer'].includes(role)) {
      currentRole.value = role
      localStorage.setItem('crestara_current_role', role)
    }
  }

  const currentUser = computed(() => {
    try {
      const session = sessionStore()
      if (session.isLoggedIn && (session.userProfile || session.currentUser)) {
        const email = session.currentUser?.email || session.user
        const meta = session.currentUser?.user_metadata || {}
        const profile = session.userProfile || {}
        const fallbackName = typeof email === 'string' ? email.split('@')[0] : 'User'
        return {
          id: session.currentUser?.id || profile.id || 'current-user',
          email: email,
          full_name: profile.full_name || meta.full_name || fallbackName,
          first_name: profile.first_name || meta.first_name || fallbackName,
          last_name: profile.last_name || meta.last_name || '',
          role: profile.role || meta.role || currentRole.value,
          avatar: profile.avatar_url || meta.avatar_url || null,
          phone: profile.phone || meta.phone || '',
          organization: profile.organization || meta.organization || 'Client Account',
          company: profile.organization || meta.organization || 'Client Account',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          zip: profile.zip || '',
          tax_id: profile.tax_id || '',
        }
      }
    } catch (e) {
      // ignore
    }

    return users.value.find((u) => u.role === currentRole.value) || users.value[0]
  })

  const isAdmin = computed(() => currentRole.value === 'Administrator')

  async function fetchUsersFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true })

      if (!error && data) {
        users.value = data.map((p) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name || p.email.split('@')[0],
          role: p.role || 'Staff',
          avatar: p.avatar_url,
          phone: p.phone || '',
          organization: p.organization || '',
          created_at: p.created_at,
        }))
        saveStorage('users', users.value)
      }
    } catch (err) {
      console.warn('[Business] Could not fetch profiles from Supabase:', err)
    }
  }

  async function updateUserRole(userId, newRole) {
    const u = users.value.find((item) => item.id === userId)
    if (u) {
      u.role = newRole
      saveStorage('users', users.value)
    }
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    } catch (err) {
      console.warn('[Business] Could not update profile role in Supabase:', err)
    }
  }

  async function inviteStaffMember({ email, full_name, role }) {
    if (!email) throw new Error('Email is required')
    const cleanEmail = email.trim().toLowerCase()
    const roleToAssign = role || 'Staff'
    const nameToAssign = (full_name || email.split('@')[0]).trim()

    // 1. Check if user already exists in profiles or users
    const existingUser = users.value.find((u) => u.email?.toLowerCase() === cleanEmail)
    if (existingUser) {
      // Elevate their role directly
      await updateUserRole(existingUser.id, roleToAssign)
      existingUser.full_name = nameToAssign || existingUser.full_name
      saveStorage('users', users.value)
      return { user: existingUser, elevated: true }
    }

    // 2. Check if user is registered in customers table
    const existingCustomer = customers.value.find(
      (c) => (c.primary_email || c.billing_email || '').toLowerCase() === cleanEmail
    )
    if (existingCustomer && existingCustomer.id) {
      // Elevate user role if a profile exists with this customer ID or email
      await updateUserRole(existingCustomer.id, roleToAssign)
    }

    // 3. Option B: Pre-provision account via native Supabase Auth
    let authUser = null
    try {
      // Temporary cryptographically random password for initial account setup
      const tempPassword = crypto.randomUUID() + 'Cr!2026'
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: tempPassword,
        options: {
          data: {
            full_name: nameToAssign,
            role: roleToAssign,
          },
        },
      })

      if (error) {
        // If user already registered in Supabase auth, attempt role update on profiles
        if (error.message?.toLowerCase().includes('already registered')) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle()
          if (profileData) {
            await updateUserRole(profileData.id, roleToAssign)
            return { user: profileData, elevated: true }
          }
        }
        console.warn('[Business] Supabase auth signup notice:', error.message)
      } else if (data?.user) {
        authUser = data.user
      }
    } catch (authErr) {
      console.warn('[Business] Supabase auth provision error, falling back locally:', authErr)
    }

    // Create local entry immediately so UI is updated without lag
    const newStaff = {
      id: authUser?.id || `usr-${Date.now()}`,
      email: cleanEmail,
      full_name: nameToAssign,
      role: roleToAssign,
      avatar: null,
      created_at: new Date().toISOString(),
    }

    // Add to users if not already present
    if (!users.value.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      users.value.push(newStaff)
      saveStorage('users', users.value)
    }

    // If they were in customers, remove from customers so they transition out of client lists
    if (existingCustomer) {
      customers.value = customers.value.filter((c) => c.id !== existingCustomer.id)
      saveStorage('customers', customers.value)
    }

    // Refresh profiles from Supabase to capture any trigger-created rows
    fetchUsersFromSupabase().catch(() => {})

    return { user: newStaff, elevated: false }
  }

  function resolveUserRole(email) {
    if (!email) return currentRole.value || 'Administrator'

    // Check if sessionStore has a confirmed Supabase profile role
    try {
      const session = sessionStore()
      if (session.userProfile?.role) {
        setRole(session.userProfile.role)
        return session.userProfile.role
      }
      if (session.currentUser?.user_metadata?.role) {
        setRole(session.currentUser.user_metadata.role)
        return session.currentUser.user_metadata.role
      }
    } catch (e) {
      // ignore
    }

    const found = users.value.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (found?.role) {
      setRole(found.role)
      return found.role
    }
    const isCustomer = invoices.value.some((inv) => inv.client_email?.toLowerCase() === email.toLowerCase())
    if (isCustomer) {
      setRole('Customer')
      return 'Customer'
    }
    if (email.toLowerCase().includes('staff') || email.toLowerCase().includes('agent')) {
      setRole('Staff')
      return 'Staff'
    }
    setRole('Administrator')
    return 'Administrator'
  }

  const CURRENCY_SYMBOLS = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    ZAR: 'R',
    ZWG: 'ZiG ',
  }

  function getCurrencySymbol(cur) {
    const code = cur || settings.value.currency || 'USD'
    return CURRENCY_SYMBOLS[code] || settings.value.currency_symbol || '$'
  }

  function formatCurrency(amount, cur) {
    const currencyCode = cur || settings.value.currency || 'USD'
    const num = Number(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    if (currencyCode === 'ZWG') {
      return `ZiG ${num}`
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(Number(amount) || 0)
    } catch {
      const sym = CURRENCY_SYMBOLS[currencyCode] || settings.value.currency_symbol || `${currencyCode} `
      return `${sym}${num}`
    }
  }

  // ==========================================
  // INVOICE ACTIONS
  // ==========================================
  async function getNextInvoiceNumber() {
    try {
      const { data, error } = await supabase.rpc('get_next_invoice_number')
      if (!error && data) {
        const prefix = settings.value.invoice_prefix || 'INV-2026-'
        const numPart = String(data).replace(prefix, '')
        const parsedNum = parseInt(numPart, 10)
        if (!isNaN(parsedNum)) {
          settings.value.next_invoice_number = parsedNum + 1
          saveStorage('settings', settings.value)
        }
        return String(data)
      }
    } catch (err) {
      console.warn('[Business] Supabase RPC get_next_invoice_number error, falling back locally:', err)
    }

    const nextNum = settings.value.next_invoice_number || 1045
    const prefix = settings.value.invoice_prefix || 'INV-2026-'
    const invoiceNumber = `${prefix}${nextNum}`
    settings.value.next_invoice_number = nextNum + 1
    saveStorage('settings', settings.value)
    return invoiceNumber
  }

  // ==========================================
  // INVOICES & PAYMENTS (SUPABASE 1-TABLE MODEL)
  // ==========================================
  async function fetchInvoicesFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[Business] Supabase fetchInvoices error:', error)
        return invoices.value
      }

      if (data && data.length > 0) {
        invoices.value = data.map((inv) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          customer_id: inv.customer_id,
          client_name: inv.client_name,
          client_email: inv.client_email || '',
          contact_name: inv.contact_name || '',
          status: inv.status,
          issue_date: inv.issue_date,
          due_date: inv.due_date,
          payment_terms: inv.payment_terms || 'Net 30',
          currency: inv.currency || 'USD',
          tax_rate: Number(inv.tax_rate) || 0,
          discount_percentage: Number(inv.discount_percentage) || 0,
          subtotal: Number(inv.subtotal) || 0,
          discount_amount: Number(inv.discount_amount) || 0,
          tax_amount: Number(inv.tax_amount) || 0,
          total_amount: Number(inv.total_amount) || 0,
          amount_paid: Number(inv.amount_paid) || 0,
          balance_due: Number(inv.balance_due) || 0,
          items: Array.isArray(inv.items) ? inv.items : [],
          payments: Array.isArray(inv.payments) ? inv.payments : [],
          notes: inv.notes || '',
          created_at: inv.created_at,
          updated_at: inv.updated_at,
        }))
        saveStorage('invoices', invoices.value)

        // Sync embedded payments into transactions list for seamless ledger view
        const allInvoicePayments = []
        invoices.value.forEach((inv) => {
          if (Array.isArray(inv.payments)) {
            inv.payments.forEach((p) => {
              allInvoicePayments.push({
                id: p.id || `tx-${inv.id}`,
                transaction_ref: p.transaction_ref || `TXN-${inv.invoice_number}`,
                invoice_number: inv.invoice_number,
                invoice_id: inv.id,
                client_name: inv.client_name,
                amount: Number(p.amount) || 0,
                currency: p.currency || inv.currency || 'USD',
                payment_method: p.payment_method || 'Credit Card',
                payment_date: p.payment_date || inv.issue_date,
                status: p.status || 'Settled',
                notes: p.notes || '',
              })
            })
          }
        })
        if (allInvoicePayments.length > 0) {
          transactions.value = allInvoicePayments
          saveStorage('transactions', transactions.value)
        }
      } else if (invoices.value.length > 0) {
        // Auto-seed existing cached/mock invoices to Supabase if Supabase table is empty
        for (const localInv of invoices.value) {
          try {
            await supabase.from('invoices').insert({
              invoice_number: localInv.invoice_number,
              customer_id: localInv.customer_id || null,
              client_name: localInv.client_name || 'Client',
              client_email: localInv.client_email || '',
              contact_name: localInv.contact_name || '',
              status: localInv.status || 'Issued',
              issue_date: localInv.issue_date || new Date().toISOString().split('T')[0],
              due_date: localInv.due_date || new Date().toISOString().split('T')[0],
              payment_terms: localInv.payment_terms || 'Net 30',
              currency: localInv.currency || 'USD',
              tax_rate: Number(localInv.tax_rate) || 0,
              discount_percentage: Number(localInv.discount_percentage) || 0,
              subtotal: Number(localInv.subtotal) || 0,
              discount_amount: Number(localInv.discount_amount) || 0,
              tax_amount: Number(localInv.tax_amount) || 0,
              total_amount: Number(localInv.total_amount) || 0,
              amount_paid: Number(localInv.amount_paid) || 0,
              balance_due: Number(localInv.balance_due) || 0,
              items: localInv.items || [],
              payments: localInv.payments || [],
              notes: localInv.notes || '',
            })
          } catch (e) {
            // ignore duplicates
          }
        }
      }
    } catch (err) {
      console.warn('[Business] Could not load invoices from Supabase:', err)
    }
    return invoices.value
  }

  async function createInvoice(invoiceData) {
    const invoiceNumber = invoiceData.invoice_number || (await getNextInvoiceNumber())

    // Calculate line item totals
    const items = (invoiceData.items || []).map((item, idx) => ({
      id: item.id || `item-${Date.now()}-${idx}`,
      product_id: item.product_id || null,
      code: item.code || '',
      name: item.name || '',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      amount: (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
    }))

    const subtotal = items.reduce((acc, item) => acc + item.amount, 0)
    const discountPercentage = Number(invoiceData.discount_percentage) || 0
    const discountAmount = (subtotal * discountPercentage) / 100
    const taxableAmount = Math.max(0, subtotal - discountAmount)
    const taxRate = Number(invoiceData.tax_rate ?? settings.value.tax_rate) || 0
    const taxAmount = (taxableAmount * taxRate) / 100
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2))

    // Per-invoice currency selection priority:
    // 1. invoiceData.currency (explicit user selection)
    // 2. settings.value.currency (company base currency)
    // 3. Fallback to 'USD'
    const invoiceCurrency = invoiceData.currency || settings.value.currency || 'USD'

    const payload = {
      invoice_number: invoiceNumber,
      customer_id: invoiceData.customer_id || null,
      client_name: invoiceData.client_name || 'Client',
      client_email: invoiceData.client_email || '',
      contact_name: invoiceData.contact_name || invoiceData.client_name || '',
      status: invoiceData.status || 'Issued',
      issue_date: invoiceData.issue_date || new Date().toISOString().split('T')[0],
      due_date: invoiceData.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      payment_terms: invoiceData.payment_terms || 'Net 30',
      currency: invoiceCurrency,
      tax_rate: taxRate,
      discount_percentage: discountPercentage,
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      total_amount: totalAmount,
      amount_paid: 0.0,
      balance_due: totalAmount,
      items,
      payments: [],
      notes: invoiceData.notes || settings.value.notes_template || '',
    }

    let createdId = `inv-${Date.now()}`
    try {
      const { data, error } = await supabase.from('invoices').insert(payload).select().single()
      if (data && !error) {
        createdId = data.id
      }
    } catch (err) {
      console.warn('[Business] Could not insert invoice into Supabase:', err)
    }

    const newInvoice = {
      id: createdId,
      ...payload,
    }

    invoices.value.unshift(newInvoice)
    saveStorage('invoices', invoices.value)

    return newInvoice
  }

  async function updateInvoice(id, updatedFields) {
    const idx = invoices.value.findIndex((inv) => inv.id === id)
    if (idx !== -1) {
      invoices.value[idx] = { ...invoices.value[idx], ...updatedFields }
      saveStorage('invoices', invoices.value)

      try {
        await supabase
          .from('invoices')
          .update({
            client_name: invoices.value[idx].client_name,
            client_email: invoices.value[idx].client_email,
            contact_name: invoices.value[idx].contact_name,
            customer_id: invoices.value[idx].customer_id || null,
            status: invoices.value[idx].status,
            issue_date: invoices.value[idx].issue_date,
            due_date: invoices.value[idx].due_date,
            payment_terms: invoices.value[idx].payment_terms,
            currency: invoices.value[idx].currency,
            tax_rate: invoices.value[idx].tax_rate,
            discount_percentage: invoices.value[idx].discount_percentage,
            subtotal: invoices.value[idx].subtotal,
            discount_amount: invoices.value[idx].discount_amount,
            tax_amount: invoices.value[idx].tax_amount,
            total_amount: invoices.value[idx].total_amount,
            amount_paid: invoices.value[idx].amount_paid,
            balance_due: invoices.value[idx].balance_due,
            items: invoices.value[idx].items,
            payments: invoices.value[idx].payments,
            notes: invoices.value[idx].notes,
          })
          .eq('id', id)
      } catch (err) {
        console.warn('[Business] Could not update invoice in Supabase:', err)
      }

      return invoices.value[idx]
    }
    return null
  }

  async function cancelInvoice(id) {
    const inv = invoices.value.find((i) => i.id === id)
    if (inv) {
      inv.status = 'Cancelled'
      inv.balance_due = 0.0
      saveStorage('invoices', invoices.value)

      try {
        await supabase
          .from('invoices')
          .update({ status: 'Cancelled', balance_due: 0.0 })
          .eq('id', id)
      } catch (err) {
        console.warn('[Business] Could not cancel invoice in Supabase:', err)
      }
    }
  }

  async function deleteInvoice(id) {
    invoices.value = invoices.value.filter((i) => i.id !== id)
    saveStorage('invoices', invoices.value)

    try {
      await supabase.from('invoices').delete().eq('id', id)
    } catch (err) {
      console.warn('[Business] Could not delete invoice from Supabase:', err)
    }
  }

  async function recordPayment(invoiceId, { amount, payment_method, notes, payment_date }) {
    const inv = invoices.value.find((i) => i.id === invoiceId)
    if (!inv) throw new Error('Invoice not found')

    const payAmount = Math.min(Number(amount) || 0, inv.balance_due)
    if (payAmount <= 0) throw new Error('Payment amount must be greater than zero')

    inv.amount_paid = Number((inv.amount_paid + payAmount).toFixed(2))
    inv.balance_due = Number(Math.max(0, inv.total_amount - inv.amount_paid).toFixed(2))

    if (inv.balance_due === 0) {
      inv.status = 'Paid'
    } else {
      inv.status = 'Partially paid'
    }

    if (!Array.isArray(inv.payments)) {
      inv.payments = []
    }

    // Record corresponding transaction payload
    const newTx = {
      id: `pay-${Date.now()}`,
      transaction_ref: `TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      invoice_number: inv.invoice_number,
      invoice_id: inv.id,
      client_name: inv.client_name,
      amount: payAmount,
      currency: inv.currency, // Inherits the invoice's specific currency
      payment_method: payment_method || 'Credit Card',
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      status: 'Settled',
      notes: notes || `Payment recorded against ${inv.invoice_number}`,
    }

    inv.payments.unshift(newTx)
    transactions.value.unshift(newTx)

    saveStorage('transactions', transactions.value)
    saveStorage('invoices', invoices.value)

    // Persist payment to Supabase
    try {
      await supabase
        .from('invoices')
        .update({
          amount_paid: inv.amount_paid,
          balance_due: inv.balance_due,
          status: inv.status,
          payments: inv.payments,
        })
        .eq('id', inv.id)
    } catch (err) {
      console.warn('[Business] Could not persist payment to Supabase:', err)
    }

    return { invoice: inv, transaction: newTx }
  }

  // ==========================================
  // INVENTORY ACTIONS
  // ==========================================
  function addProduct(productData) {
    const newProd = {
      id: `prod-${Date.now()}`,
      code: productData.code || `PRD-${Math.floor(100 + Math.random() * 900)}`,
      name: productData.name,
      description: productData.description || '',
      category: productData.category || 'General',
      type: productData.type || 'Product', // 'Product' | 'Service'
      unit_price: Number(productData.unit_price) || 0,
      cost_price: Number(productData.cost_price) || 0,
      quantity_in_stock: productData.type === 'Service' ? 0 : Number(productData.quantity_in_stock) || 0,
      low_stock_threshold: productData.type === 'Service' ? null : Number(productData.low_stock_threshold) || 5,
      track_stock: productData.type !== 'Service' && Boolean(productData.track_stock),
      status: productData.status || 'Active',
    }

    inventory.value.unshift(newProd)
    saveStorage('inventory', inventory.value)
    return newProd
  }

  function updateProduct(id, fields) {
    const idx = inventory.value.findIndex((p) => p.id === id)
    if (idx !== -1) {
      inventory.value[idx] = { ...inventory.value[idx], ...fields }
      saveStorage('inventory', inventory.value)
      return inventory.value[idx]
    }
    return null
  }

  function deleteProduct(id) {
    inventory.value = inventory.value.filter((p) => p.id !== id)
    saveStorage('inventory', inventory.value)
  }

  // ==========================================
  // REMINDER ACTIONS
  // ==========================================
  function sendReminder(id) {
    const rem = reminders.value.find((r) => r.id === id)
    if (rem) {
      rem.last_sent_date = new Date().toISOString().split('T')[0]
      rem.delivery_status = 'Delivered'
      saveStorage('reminders', reminders.value)
    }
  }

  // ==========================================
  // CUSTOMER MASTER DATA & ONBOARDING
  // ==========================================
  const currentCustomerRecord = computed(() => {
    const user = currentUser.value || {}
    const found = customers.value.find(
      (c) => c.id === user.id || (user.email && c.primary_email?.toLowerCase() === user.email.toLowerCase())
    )
    if (found) return found

    // Fallback constructed customer record
    return {
      id: user.id || 'current-customer',
      customer_type: 'Business',
      status: 'Active',
      company_name: user.organization || user.company || 'Client Organization',
      legal_name: user.organization || user.company || 'Client Organization LLC',
      trade_name: user.organization || user.company || 'Client Organization',
      company_registration_number: user.company_registration_number || '',
      tin: user.tin || user.tax_id || '',
      vat_number: user.vat_number || '',
      salutation: user.salutation || 'Mr.',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      gender: user.gender || '',
      date_of_birth: user.date_of_birth || null,
      national_id_number: user.national_id_number || '',
      national_id_type: user.national_id_type || 'National ID',
      nationality: user.nationality || 'United States',
      primary_email: user.email || '',
      billing_email: user.billing_email || user.email || '',
      phone: user.phone || '',
      mobile_no: user.mobile_no || '',
      billing_address_line1: user.address || '',
      billing_city: user.city || '',
      billing_state_province: user.state || '',
      billing_postal_code: user.zip || '',
      billing_country: user.country || 'United States',
      default_currency: 'USD',
      default_payment_terms: 'Net 30',
      credit_limit: 25000.0,
      is_profile_complete: false,
      profile_completion_percentage: 40,
    }
  })

  // Evaluates missing profile fields and completion percentage
  const profileCompletion = computed(() => {
    const c = currentCustomerRecord.value || {}
    const isBusiness = c.customer_type !== 'Individual'

    const checklist = isBusiness
      ? [
          { key: 'company_name', label: 'Company / Organization Name', value: c.company_name },
          { key: 'company_registration_number', label: 'Company Registration Number (CRN)', value: c.company_registration_number },
          { key: 'tin', label: 'Tax Identification Number (TIN / EIN)', value: c.tin || c.tax_id },
          { key: 'billing_address_line1', label: 'Billing Street Address', value: c.billing_address_line1 || c.address },
          { key: 'billing_city', label: 'Billing City', value: c.billing_city || c.city },
          { key: 'billing_postal_code', label: 'Postal / ZIP Code', value: c.billing_postal_code || c.zip },
          { key: 'phone', label: 'Primary Contact Phone', value: c.phone },
          { key: 'billing_email', label: 'Billing / Invoicing Email', value: c.billing_email || c.primary_email },
        ]
      : [
          { key: 'first_name', label: 'First Name', value: c.first_name },
          { key: 'last_name', label: 'Last Name', value: c.last_name },
          { key: 'gender', label: 'Gender', value: c.gender },
          { key: 'date_of_birth', label: 'Date of Birth', value: c.date_of_birth },
          { key: 'national_id_number', label: 'National ID / Passport Number', value: c.national_id_number },
          { key: 'billing_address_line1', label: 'Residential Address', value: c.billing_address_line1 || c.address },
          { key: 'billing_city', label: 'City', value: c.billing_city || c.city },
          { key: 'phone', label: 'Mobile / Phone Number', value: c.phone || c.mobile_no },
        ]

    const total = checklist.length
    const filled = checklist.filter((item) => Boolean(item.value && String(item.value).trim())).length
    const percentage = Math.round((filled / total) * 100)
    const missing = checklist.filter((item) => !item.value || !String(item.value).trim())

    return {
      percentage,
      isComplete: percentage === 100,
      checklist,
      missing,
    }
  })

  // Customer Educational Onboarding Steps (Mirrors staff CRM Getting Started)
  const customerOnboardingSteps = ref(
    loadStorage('customer_onboarding_steps', [
      {
        id: 'complete_profile',
        title: 'Complete Official Account Profile',
        description: 'Provide company registry, tax identification, and verified billing address for compliance.',
        icon: 'file-text',
        route: '/portal/account',
        actionLabel: 'Complete Profile',
        completed: false,
      },
      {
        id: 'review_invoices',
        title: 'Review Invoices & Download Receipts',
        description: 'Inspect line-item breakdowns, check payment due dates, and download official tax receipts.',
        icon: 'receipt',
        route: '/portal/purchases',
        actionLabel: 'View Invoices',
        completed: true,
      },
      {
        id: 'make_payment',
        title: 'Online Invoicing & Payment Settlement',
        description: 'Learn how instant payment processing and automated balance settlement work.',
        icon: 'credit-card',
        route: '/portal/purchases',
        actionLabel: 'Settle Balance',
        completed: false,
      },
      {
        id: 'explore_promotions',
        title: 'Explore Promotions & Loyalty Discounts',
        description: 'Discover active coupons, bundled credits, and enterprise discounts available on your account.',
        icon: 'tag',
        route: '/portal/promotions',
        actionLabel: 'Browse Deals',
        completed: false,
      },
      {
        id: 'schedule_appointment',
        title: 'Schedule Meetings on the Calendar',
        description: 'Book consultation sessions and support reviews directly with your dedicated account manager.',
        icon: 'calendar',
        route: '/portal/calendar',
        actionLabel: 'Open Calendar',
        completed: false,
      },
    ])
  )

  const completedOnboardingStepsCount = computed(() => {
    return customerOnboardingSteps.value.filter((s) => s.completed).length
  })

  const onboardingPercentage = computed(() => {
    return Math.round((completedOnboardingStepsCount.value / customerOnboardingSteps.value.length) * 100)
  })

  function markOnboardingStep(stepId, isCompleted = true) {
    const step = customerOnboardingSteps.value.find((s) => s.id === stepId)
    if (step) {
      step.completed = isCompleted
      saveStorage('customer_onboarding_steps', customerOnboardingSteps.value)
    }
  }

  // ==========================================
  // CHANGE REQUEST ACTIONS & SUPABASE SYNC
  // ==========================================
  const pendingChangeRequests = computed(() => {
    return changeRequests.value.filter((r) => r.status === 'Pending')
  })

  const isFetchingClients = ref(false)

  async function fetchClientsFromSupabase() {
    isFetchingClients.value = true
    try {
      // Fetch directly from customers master table with associated contacts
      const { data: customerData, error: customerErr } = await supabase
        .from('customers')
        .select('*, contacts(*)')
        .order('created_at', { ascending: false })

      if (!customerErr && customerData) {
        customers.value = customerData.map((c) => {
          const contactList = (c.contacts && c.contacts.length > 0)
            ? c.contacts.map((ct) => ({
                id: ct.id,
                first_name: ct.first_name || '',
                last_name: ct.last_name || '',
                name: ct.full_name || `${ct.first_name} ${ct.last_name || ''}`.trim(),
                email: ct.email || '',
                phone: ct.phone || ct.mobile_no || '',
                role: ct.job_title || 'Contact Person',
                is_primary: ct.is_primary || false,
              }))
            : [
                {
                  id: `ct-${c.id}`,
                  first_name: c.first_name || '',
                  last_name: c.last_name || '',
                  name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : (c.primary_email ? c.primary_email.split('@')[0] : 'Primary Contact'),
                  email: c.primary_email || c.billing_email || '',
                  phone: c.phone || c.mobile_no || '',
                  role: c.job_title || 'Primary Representative',
                  is_primary: true,
                },
              ]

          return {
            id: c.id,
            customer_type: c.customer_type || 'Business',
            status: c.status || 'Active',
            lifecycle_stage: c.lifecycle_stage || 'Active',
            company_name: c.company_name || c.legal_name || 'Client Entity',
            legal_structure: c.legal_structure || 'Corporation',
            company_registration_number: c.company_registration_number || '',
            tin: c.tin || c.tax_id || '',
            vat_number: c.vat_number || '',
            industry: c.industry || 'General Business',
            website: c.website || '',
            salutation: c.salutation || 'Mr.',
            first_name: c.first_name || '',
            last_name: c.last_name || '',
            job_title: c.job_title || 'Primary Representative',
            primary_email: c.primary_email || '',
            billing_email: c.billing_email || c.primary_email || '',
            phone: c.phone || '',
            mobile_no: c.mobile_no || '',
            national_id_number: c.national_id_number || '',
            billing_address_line1: c.billing_address_line1 || '',
            billing_city: c.billing_city || '',
            billing_state_province: c.billing_state_province || '',
            billing_postal_code: c.billing_postal_code || '',
            billing_country: c.billing_country || 'United States',
            default_currency: c.default_currency || 'USD',
            default_payment_terms: c.default_payment_terms || 'Net 30',
            credit_limit: Number(c.credit_limit) || 25000.0,
            is_profile_complete: c.is_profile_complete ?? true,
            contacts: contactList,
            created_at: c.created_at,
            updated_at: c.updated_at,
          }
        })

        saveStorage('customers', customers.value)
      }
    } catch (err) {
      console.warn('[Business] Could not fetch clients from Supabase:', err)
    } finally {
      isFetchingClients.value = false
    }
  }

  async function fetchCustomerFromSupabase(customerId) {
    if (!customerId) return null
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*, contacts(*)')
        .eq('id', customerId)
        .maybeSingle()

      if (!error && data) {
        const contactList = (data.contacts && data.contacts.length > 0)
          ? data.contacts.map((ct) => ({
              id: ct.id,
              first_name: ct.first_name || '',
              last_name: ct.last_name || '',
              name: ct.full_name || `${ct.first_name} ${ct.last_name || ''}`.trim(),
              email: ct.email || '',
              phone: ct.phone || ct.mobile_no || '',
              role: ct.job_title || 'Contact Person',
              is_primary: ct.is_primary || false,
            }))
          : [
              {
                id: `ct-${data.id}`,
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                name: data.first_name ? `${data.first_name} ${data.last_name || ''}`.trim() : (data.primary_email ? data.primary_email.split('@')[0] : 'Primary Contact'),
                email: data.primary_email || data.billing_email || '',
                phone: data.phone || data.mobile_no || '',
                role: data.job_title || 'Primary Representative',
                is_primary: true,
              },
            ]

        const clientObj = {
          ...data,
          contacts: contactList,
        }

        const idx = customers.value.findIndex((c) => c.id === data.id)
        if (idx !== -1) {
          customers.value[idx] = { ...customers.value[idx], ...clientObj }
        } else {
          customers.value.unshift(clientObj)
        }
        saveStorage('customers', customers.value)
        return clientObj
      }
    } catch (err) {
      console.warn('[Business] Could not fetch customer from Supabase:', err)
    }
    return null
  }

  async function fetchChangeRequestsFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('client_change_requests')
        .select('*')
        .order('requested_at', { ascending: false })

      if (!error && data) {
        changeRequests.value = data.map((r) => ({
          id: r.id,
          customer_id: r.customer_id,
          client_id: r.customer_id,
          client_name: r.requested_data?.full_name || r.current_data?.full_name || 'Client',
          client_email: r.requested_data?.email || r.current_data?.email || '',
          organization: r.requested_data?.company || r.current_data?.company || 'Organization',
          requested_date: r.requested_at ? r.requested_at.split('T')[0] : new Date().toISOString().split('T')[0],
          status: r.status,
          reason: r.reason,
          current_details: r.current_data || {},
          requested_details: r.requested_data || {},
          review_notes: r.review_notes || '',
          reviewed_by: r.reviewer_name || null,
          reviewed_date: r.reviewed_at ? r.reviewed_at.split('T')[0] : null,
        }))
        saveStorage('change_requests', changeRequests.value)
      }
    } catch (err) {
      console.warn('[Business] Could not fetch change requests from Supabase:', err)
    }
  }

  async function submitChangeRequest({ requested_details, reason }) {
    const activeClient = currentUser.value || {}
    const activeCustomer = currentCustomerRecord.value || {}
    const fallbackName = activeClient.email ? activeClient.email.split('@')[0] : 'Client'
    const customerId = activeClient.id || activeCustomer.id || 'usr-client-01'

    const currentSnapshot = {
      company: activeCustomer.company_name || activeClient.organization || '',
      full_name: activeClient.full_name || fallbackName,
      phone: activeCustomer.phone || activeClient.phone || '',
      address: activeCustomer.billing_address_line1 || activeClient.address || '',
      city: activeCustomer.billing_city || activeClient.city || '',
      state: activeCustomer.billing_state_province || activeClient.state || '',
      zip: activeCustomer.billing_postal_code || activeClient.zip || '',
      tax_id: activeCustomer.tin || activeCustomer.tax_id || activeClient.tax_id || '',
      company_registration_number: activeCustomer.company_registration_number || '',
      national_id_number: activeCustomer.national_id_number || '',
      gender: activeCustomer.gender || '',
      date_of_birth: activeCustomer.date_of_birth || '',
    }

    const newReq = {
      id: `cr-${Date.now()}`,
      customer_id: customerId,
      client_id: customerId,
      client_name: activeClient.full_name || fallbackName,
      client_email: activeClient.email || '',
      organization: activeCustomer.company_name || activeClient.organization || 'Client Organization',
      requested_date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      reason: reason || 'Customer requested information updates.',
      current_details: currentSnapshot,
      requested_details: { ...currentSnapshot, ...requested_details },
      review_notes: '',
      reviewed_by: null,
      reviewed_date: null,
    }

    changeRequests.value.unshift(newReq)
    saveStorage('change_requests', changeRequests.value)

    // Sync to Supabase client_change_requests if connected
    try {
      await supabase.from('client_change_requests').insert({
        id: newReq.id.startsWith('cr-') ? undefined : newReq.id,
        customer_id: customerId,
        requested_by: activeClient.id,
        status: 'Pending',
        reason: newReq.reason,
        current_data: currentSnapshot,
        requested_data: newReq.requested_details,
      })
    } catch (err) {
      console.warn('[Business] Could not write change request to Supabase:', err)
    }

    return newReq
  }

  async function approveChangeRequest(requestId, reviewer = 'Admin') {
    const req = changeRequests.value.find((r) => r.id === requestId)
    if (!req) throw new Error('Change request not found')

    req.status = 'Approved'
    req.reviewed_by = reviewer
    req.reviewed_date = new Date().toISOString().split('T')[0]

    // Apply the changes to the customer master record
    const targetCustomerId = req.customer_id || req.client_id
    let cust = customers.value.find((c) => c.id === targetCustomerId)
    if (!cust) {
      cust = customers.value.find((c) => c.primary_email === req.client_email)
    }

    if (cust) {
      if (req.requested_details.company) cust.company_name = req.requested_details.company
      if (req.requested_details.phone) cust.phone = req.requested_details.phone
      if (req.requested_details.address) cust.billing_address_line1 = req.requested_details.address
      if (req.requested_details.city) cust.billing_city = req.requested_details.city
      if (req.requested_details.state) cust.billing_state_province = req.requested_details.state
      if (req.requested_details.zip) cust.billing_postal_code = req.requested_details.zip
      if (req.requested_details.tax_id) cust.tin = req.requested_details.tax_id
      if (req.requested_details.company_registration_number) cust.company_registration_number = req.requested_details.company_registration_number
      if (req.requested_details.national_id_number) cust.national_id_number = req.requested_details.national_id_number
      if (req.requested_details.gender) cust.gender = req.requested_details.gender
      if (req.requested_details.date_of_birth) cust.date_of_birth = req.requested_details.date_of_birth
      cust.is_profile_complete = true
      saveStorage('customers', customers.value)
    }

    // Also update users array for backward compatibility
    const userToUpdate = users.value.find((u) => u.email === req.client_email || u.id === targetCustomerId)
    if (userToUpdate) {
      if (req.requested_details.full_name) userToUpdate.full_name = req.requested_details.full_name
      if (req.requested_details.phone) userToUpdate.phone = req.requested_details.phone
      if (req.requested_details.company) {
        userToUpdate.company = req.requested_details.company
        userToUpdate.client_name = req.requested_details.company
      }
      saveStorage('users', users.value)
    }

    saveStorage('change_requests', changeRequests.value)

    // Mark step 1 in onboarding completed
    markOnboardingStep('complete_profile', true)

    // Sync approval to Supabase
    try {
      if (targetCustomerId) {
        await supabase
          .from('customers')
          .update({
            company_name: req.requested_details.company,
            phone: req.requested_details.phone,
            billing_address_line1: req.requested_details.address,
            billing_city: req.requested_details.city,
            billing_state_province: req.requested_details.state,
            billing_postal_code: req.requested_details.zip,
            tin: req.requested_details.tax_id,
            company_registration_number: req.requested_details.company_registration_number,
            national_id_number: req.requested_details.national_id_number,
            gender: req.requested_details.gender,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetCustomerId)
      }

      await supabase
        .from('client_change_requests')
        .update({
          status: 'Approved',
          reviewer_name: reviewer,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', req.id)
    } catch (err) {
      console.warn('[Business] Could not sync approval to Supabase:', err)
    }

    return req
  }

  async function rejectChangeRequest(requestId, notes = '', reviewer = 'Admin') {
    const req = changeRequests.value.find((r) => r.id === requestId)
    if (!req) throw new Error('Change request not found')

    req.status = 'Rejected'
    req.review_notes = notes || 'Rejected by administration'
    req.reviewed_by = reviewer
    req.reviewed_date = new Date().toISOString().split('T')[0]

    saveStorage('change_requests', changeRequests.value)

    // Sync rejection to Supabase
    try {
      await supabase
        .from('client_change_requests')
        .update({
          status: 'Rejected',
          review_notes: notes,
          reviewer_name: reviewer,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', req.id)
    } catch (err) {
      console.warn('[Business] Could not sync rejection to Supabase:', err)
    }

    return req
  }

  // ==========================================
  // CLIENT ORGANIZATIONS & CONTACTS CRUD
  // ==========================================
  async function addClient(clientData) {
    const newId = clientData.id || `usr-client-${Date.now()}`
    const companyName = clientData.company_name || 'New Client Organization'
    const contactName = clientData.first_name ? `${clientData.first_name} ${clientData.last_name || ''}`.trim() : (clientData.contact_name || companyName)

    const newClient = {
      id: newId,
      customer_type: clientData.customer_type || 'Business',
      status: clientData.status || 'Active',
      company_name: companyName,
      legal_name: clientData.legal_name || companyName,
      trade_name: clientData.trade_name || companyName,
      company_registration_number: clientData.company_registration_number || '',
      tin: clientData.tin || clientData.tax_id || '',
      vat_number: clientData.vat_number || '',
      duns_number: clientData.duns_number || '',
      legal_structure: clientData.legal_structure || 'LLC',
      industry: clientData.industry || 'Technology & SaaS',
      annual_revenue: Number(clientData.annual_revenue) || 0,
      employee_count_range: clientData.employee_count_range || '1-10',
      website: clientData.website || '',
      salutation: clientData.salutation || 'Mr.',
      first_name: clientData.first_name || contactName.split(' ')[0],
      last_name: clientData.last_name || contactName.split(' ').slice(1).join(' ') || '',
      gender: clientData.gender || '',
      date_of_birth: clientData.date_of_birth || null,
      national_id_number: clientData.national_id_number || '',
      job_title: clientData.job_title || 'Primary Representative',
      primary_email: clientData.primary_email || clientData.email || '',
      billing_email: clientData.billing_email || clientData.primary_email || '',
      phone: clientData.phone || '',
      mobile_no: clientData.mobile_no || '',
      billing_address_line1: clientData.billing_address_line1 || clientData.address || '',
      billing_address_line2: clientData.billing_address_line2 || '',
      billing_city: clientData.billing_city || clientData.city || '',
      billing_state_province: clientData.billing_state_province || clientData.state || '',
      billing_postal_code: clientData.billing_postal_code || clientData.zip || '',
      billing_country: clientData.billing_country || 'United States',
      default_currency: clientData.default_currency || 'USD',
      default_payment_terms: clientData.default_payment_terms || 'Net 30',
      credit_limit: Number(clientData.credit_limit) || 25000.0,
      is_profile_complete: true,
      profile_completion_percentage: 100,
      contacts: clientData.contacts || [
        {
          id: `cnt-${Date.now()}`,
          name: contactName,
          email: clientData.primary_email || clientData.email || '',
          phone: clientData.phone || '',
          role: clientData.job_title || 'Primary Representative',
          is_primary: true,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    customers.value.unshift(newClient)
    saveStorage('customers', customers.value)

    // Sync to Supabase customers master table
    try {
      const { data: insertedCustomer } = await supabase
        .from('customers')
        .insert({
          id: newClient.id.startsWith('usr-') || newClient.id.startsWith('cl-') ? undefined : newClient.id,
          customer_type: newClient.customer_type,
          status: newClient.status,
          company_name: newClient.company_name,
          legal_name: newClient.company_name,
          company_registration_number: newClient.company_registration_number || null,
          tin: newClient.tin || null,
          vat_number: newClient.vat_number || null,
          industry: newClient.industry || null,
          website: newClient.website || null,
          first_name: newClient.first_name || null,
          last_name: newClient.last_name || null,
          primary_email: newClient.primary_email || 'client@crestara.com',
          phone: newClient.phone || null,
          billing_address_line1: newClient.billing_address_line1 || null,
          billing_city: newClient.billing_city || null,
          billing_postal_code: newClient.billing_postal_code || null,
          billing_country: newClient.billing_country || 'United States',
          default_currency: newClient.default_currency || 'USD',
          default_payment_terms: newClient.default_payment_terms || 'Net 30',
          credit_limit: newClient.credit_limit,
          is_profile_complete: true,
        })
        .select()
        .single()

      const finalId = insertedCustomer?.id || newClient.id
      if (insertedCustomer) {
        newClient.id = insertedCustomer.id
        saveStorage('customers', customers.value)
      }

      // Insert primary contact into contacts table if provided
      if (newClient.first_name || newClient.primary_email) {
        await supabase.from('contacts').insert({
          customer_id: finalId,
          first_name: newClient.first_name || 'Primary',
          last_name: newClient.last_name || '',
          email: newClient.primary_email || null,
          phone: newClient.phone || null,
          job_title: newClient.job_title || 'Primary Representative',
          is_primary: true,
        })
      }
    } catch (err) {
      console.warn('[Business] Could not insert customer into Supabase:', err)
    }

    return newClient
  }

  async function updateClient(clientId, updatedData) {
    const idx = customers.value.findIndex((c) => c.id === clientId)
    if (idx !== -1) {
      customers.value[idx] = {
        ...customers.value[idx],
        ...updatedData,
        updated_at: new Date().toISOString(),
      }
      saveStorage('customers', customers.value)

      // Sync directly to Supabase customers
      try {
        await supabase
          .from('customers')
          .update({
            company_name: updatedData.company_name,
            company_registration_number: updatedData.company_registration_number,
            tin: updatedData.tin,
            vat_number: updatedData.vat_number,
            industry: updatedData.industry,
            website: updatedData.website,
            first_name: updatedData.first_name,
            last_name: updatedData.last_name,
            phone: updatedData.phone,
            billing_address_line1: updatedData.billing_address_line1,
            billing_city: updatedData.billing_city,
            billing_state_province: updatedData.billing_state_province,
            billing_postal_code: updatedData.billing_postal_code,
            default_payment_terms: updatedData.default_payment_terms,
            status: updatedData.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId)

        // Sync primary contact in contacts table
        if (updatedData.first_name || updatedData.primary_email) {
          await supabase
            .from('contacts')
            .update({
              first_name: updatedData.first_name,
              last_name: updatedData.last_name,
              email: updatedData.primary_email,
              phone: updatedData.phone,
              job_title: updatedData.job_title,
            })
            .eq('customer_id', clientId)
            .eq('is_primary', true)
        }
      } catch (err) {
        console.warn('[Business] Could not update customer in Supabase:', err)
      }

      return customers.value[idx]
    }
    return null
  }

  async function deleteClient(clientId) {
    customers.value = customers.value.filter((c) => c.id !== clientId)
    saveStorage('customers', customers.value)

    try {
      await supabase.from('customers').delete().eq('id', clientId)
    } catch (err) {
      console.warn('[Business] Could not delete customer from Supabase:', err)
    }
  }

  // ==========================================
  // SETTINGS & COMPUTED METRICS
  // ==========================================
  const isFetchingSettings = ref(false)
  const isSavingSettings = ref(false)

  async function fetchBusinessSettingsFromSupabase() {
    isFetchingSettings.value = true
    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle()

      if (!error && data) {
        settings.value = {
          ...defaultSettings,
          ...settings.value,
          ...data,
        }
        saveStorage('settings', settings.value)
      }
    } catch (err) {
      console.warn('[Business] Could not fetch business_settings from Supabase:', err)
    } finally {
      isFetchingSettings.value = false
    }
  }

  async function updateBusinessSettings(newSettings) {
    isSavingSettings.value = true
    // Update local reactive state and cache immediately
    settings.value = { ...settings.value, ...newSettings }
    saveStorage('settings', settings.value)

    try {
      const payload = {
        id: 'default',
        business_name: settings.value.business_name || 'Crestara CRM',
        legal_name: settings.value.legal_name || 'Crestara Technologies Inc.',
        business_email: settings.value.business_email || 'billing@crestara.com',
        business_phone: settings.value.business_phone || '',
        business_address: settings.value.business_address || '',
        tax_id: settings.value.tax_id || '',
        website: settings.value.website || '',
        logo_url: settings.value.logo_url || '',
        currency: settings.value.currency || 'USD',
        currency_symbol: settings.value.currency_symbol || '$',
        invoice_prefix: settings.value.invoice_prefix || 'INV-2026-',
        next_invoice_number: Number(settings.value.next_invoice_number) || 1045,
        default_payment_terms: Number(settings.value.default_payment_terms) || 30,
        tax_rate: Number(settings.value.tax_rate) || 0,
        late_fee_percentage: Number(settings.value.late_fee_percentage) || 0,
        notes_template: settings.value.notes_template || '',
        bank_name: settings.value.bank_name || '',
        bank_account_name: settings.value.bank_account_name || '',
        bank_account_number: settings.value.bank_account_number || '',
        bank_routing_iban: settings.value.bank_routing_iban || '',
        swift_bic: settings.value.swift_bic || '',
        payment_instructions: settings.value.payment_instructions || '',
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('business_settings')
        .upsert(payload, { onConflict: 'id' })

      if (error) {
        console.warn('[Business] Error syncing business_settings to Supabase:', error.message)
      }
    } catch (err) {
      console.warn('[Business] Supabase updateBusinessSettings exception:', err)
    } finally {
      isSavingSettings.value = false
    }

    return settings.value
  }

  const totalRevenue = computed(() => {
    return transactions.value
      .filter((t) => t.status === 'Settled')
      .reduce((acc, t) => acc + Number(t.amount || 0), 0)
  })

  const totalOutstanding = computed(() => {
    return invoices.value
      .filter((i) => i.status !== 'Cancelled' && i.status !== 'Paid')
      .reduce((acc, i) => acc + Number(i.balance_due || 0), 0)
  })

  const overdueInvoicesCount = computed(() => {
    return invoices.value.filter((i) => i.status === 'Overdue').length
  })

  const paidInvoicesCount = computed(() => {
    return invoices.value.filter((i) => i.status === 'Paid').length
  })

  const lowStockItems = computed(() => {
    return inventory.value.filter(
      (p) => p.track_stock && p.quantity_in_stock <= (p.low_stock_threshold || 5),
    )
  })

  // Auto-fetch real backend data from Supabase
  try {
    fetchBusinessSettingsFromSupabase()
    fetchUsersFromSupabase()
    fetchClientsFromSupabase()
    fetchChangeRequestsFromSupabase()
    fetchInvoicesFromSupabase()
  } catch (e) {
    // ignore
  }

  return {
    settings,
    isFetchingSettings,
    isSavingSettings,
    fetchBusinessSettingsFromSupabase,
    updateBusinessSettings,
    inventory,
    products: inventory,
    invoices,
    transactions,
    reminders,
    promotions,
    users,
    fetchUsersFromSupabase,
    updateUserRole,
    inviteStaffMember,
    changeRequests,
    pendingChangeRequests,
    currentRole,
    currentUser,
    isAdmin,
    setRole,
    resolveUserRole,
    formatCurrency,
    getCurrencySymbol,
    CURRENCY_SYMBOLS,
    // Customer Master & Onboarding
    customers,
    currentCustomerRecord,
    profileCompletion,
    customerOnboardingSteps,
    completedOnboardingStepsCount,
    onboardingPercentage,
    markOnboardingStep,
    isFetchingClients,
    fetchClientsFromSupabase,
    fetchCustomerFromSupabase,
    fetchChangeRequestsFromSupabase,
    // Change Requests
    submitChangeRequest,
    approveChangeRequest,
    rejectChangeRequest,
    // Client Organizations & Contacts
    addClient,
    updateClient,
    deleteClient,
    // Invoices
    fetchInvoicesFromSupabase,
    getNextInvoiceNumber,
    createInvoice,
    updateInvoice,
    cancelInvoice,
    deleteInvoice,
    recordPayment,
    // Inventory
    addProduct,
    updateProduct,
    deleteProduct,
    // Reminders
    sendReminder,
    // Computed Metrics
    totalRevenue,
    totalOutstanding,
    overdueInvoicesCount,
    paidInvoicesCount,
    lowStockItems,
  }
})
