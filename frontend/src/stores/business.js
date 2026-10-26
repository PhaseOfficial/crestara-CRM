import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'
import { sessionStore } from './session'
const defaultSettings = {
  business_name: '',
  business_email: '',
  business_phone: '',
  business_address: '',
  tax_id: '',
  currency: 'USD',
  currency_symbol: '$',
  invoice_prefix: 'INV-2026-',
  next_invoice_number: 1001,
  default_payment_terms: 30,
  tax_rate: 0.0,
  late_fee_percentage: 0.0,
  logo_url: '',
  notes_template: 'Thank you for your business.',
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

  function formatCurrency(amount, cur) {
    const currencyCode = cur || settings.value.currency || 'USD'
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(Number(amount) || 0)
    } catch {
      return `$${Number(amount || 0).toFixed(2)}`
    }
  }

  // ==========================================
  // INVOICE ACTIONS
  // ==========================================
  function createInvoice(invoiceData) {
    const nextNum = settings.value.next_invoice_number || 1045
    const prefix = settings.value.invoice_prefix || 'INV-2026-'
    const invoiceNumber = `${prefix}${nextNum}`

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

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoice_number: invoiceNumber,
      client_name: invoiceData.client_name || 'Client',
      client_email: invoiceData.client_email || '',
      contact_name: invoiceData.contact_name || invoiceData.client_name || '',
      organization_name: invoiceData.organization_name || '',
      status: invoiceData.status || 'Issued',
      issue_date: invoiceData.issue_date || new Date().toISOString().split('T')[0],
      due_date: invoiceData.due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      payment_terms: invoiceData.payment_terms || 'Net 30',
      currency: settings.value.currency || 'USD',
      tax_rate: taxRate,
      discount_percentage: discountPercentage,
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: Number(discountAmount.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      total_amount: totalAmount,
      amount_paid: 0.0,
      balance_due: totalAmount,
      items,
      notes: invoiceData.notes || settings.value.notes_template || '',
    }

    invoices.value.unshift(newInvoice)
    saveStorage('invoices', invoices.value)

    // Increment invoice counter
    settings.value.next_invoice_number = nextNum + 1
    saveStorage('settings', settings.value)

    return newInvoice
  }

  function updateInvoice(id, updatedFields) {
    const idx = invoices.value.findIndex((inv) => inv.id === id)
    if (idx !== -1) {
      invoices.value[idx] = { ...invoices.value[idx], ...updatedFields }
      saveStorage('invoices', invoices.value)
      return invoices.value[idx]
    }
    return null
  }

  function cancelInvoice(id) {
    const inv = invoices.value.find((i) => i.id === id)
    if (inv) {
      inv.status = 'Cancelled'
      inv.balance_due = 0.0
      saveStorage('invoices', invoices.value)
    }
  }

  function deleteInvoice(id) {
    invoices.value = invoices.value.filter((i) => i.id !== id)
    saveStorage('invoices', invoices.value)
  }

  function recordPayment(invoiceId, { amount, payment_method, notes, payment_date }) {
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

    // Record corresponding transaction
    const newTx = {
      id: `tx-${Date.now()}`,
      transaction_ref: `TXN-2026-${Math.floor(100 + Math.random() * 900)}`,
      invoice_number: inv.invoice_number,
      invoice_id: inv.id,
      client_name: inv.client_name,
      amount: payAmount,
      currency: inv.currency,
      payment_method: payment_method || 'Credit Card',
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      status: 'Settled',
      notes: notes || `Payment recorded against ${inv.invoice_number}`,
    }

    transactions.value.unshift(newTx)
    saveStorage('transactions', transactions.value)
    saveStorage('invoices', invoices.value)

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
      // 1. Fetch from customers table (portal & B2B master records)
      const { data: customerData, error: customerErr } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      // 2. Fetch from organizations and associated contacts
      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .select('*, contacts(*)')
        .order('created_at', { ascending: false })

      const combined = []
      const processedIds = new Set()
      const processedEmails = new Set()

      // Ingest Supabase customers
      if (!customerErr && customerData && customerData.length > 0) {
        customerData.forEach((c) => {
          processedIds.add(c.id)
          if (c.primary_email) processedEmails.add(c.primary_email.toLowerCase())
          if (c.billing_email) processedEmails.add(c.billing_email.toLowerCase())

          const contactPerson = {
            id: `ct-${c.id}`,
            first_name: c.first_name || '',
            last_name: c.last_name || '',
            name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : (c.primary_email ? c.primary_email.split('@')[0] : 'Primary Contact'),
            email: c.primary_email || c.billing_email || '',
            phone: c.phone || c.mobile_no || '',
            role: c.job_title || 'Primary Representative',
            is_primary: true,
          }

          combined.push({
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
            contacts: [contactPerson],
            created_at: c.created_at,
            updated_at: c.updated_at,
          })
        })
      }

      // Ingest Supabase organizations & contacts
      if (!orgErr && orgData && orgData.length > 0) {
        orgData.forEach((org) => {
          if (processedIds.has(org.id)) return

          const primaryContact = (org.contacts || []).find((ct) => ct.is_primary) || (org.contacts || [])[0]
          const contactEmail = primaryContact?.email || ''
          if (contactEmail && processedEmails.has(contactEmail.toLowerCase())) return

          const contactList = (org.contacts || []).map((ct) => ({
            id: ct.id,
            first_name: ct.first_name || '',
            last_name: ct.last_name || '',
            name: ct.full_name || `${ct.first_name} ${ct.last_name || ''}`.trim(),
            email: ct.email || '',
            phone: ct.phone || ct.mobile_no || '',
            role: ct.job_title || 'Contact Person',
            is_primary: ct.is_primary || false,
          }))

          combined.push({
            id: org.id,
            customer_type: 'Business',
            status: 'Active',
            lifecycle_stage: 'Active',
            company_name: org.name,
            legal_structure: 'Corporation',
            company_registration_number: '',
            tin: '',
            vat_number: '',
            industry: org.industry || 'Technology',
            website: org.website || '',
            first_name: primaryContact?.first_name || '',
            last_name: primaryContact?.last_name || '',
            job_title: primaryContact?.job_title || 'Primary Contact',
            primary_email: primaryContact?.email || '',
            billing_email: primaryContact?.email || '',
            phone: org.phone || primaryContact?.phone || '',
            mobile_no: primaryContact?.mobile_no || '',
            national_id_number: '',
            billing_address_line1: '',
            billing_city: '',
            billing_state_province: '',
            billing_postal_code: '',
            billing_country: 'United States',
            default_currency: 'USD',
            default_payment_terms: 'Net 30',
            credit_limit: 25000.0,
            is_profile_complete: true,
            contacts: contactList.length > 0 ? contactList : [
              {
                id: `ct-${org.id}`,
                first_name: 'Primary',
                last_name: 'Contact',
                name: 'Primary Contact',
                email: primaryContact?.email || '',
                phone: org.phone || '',
                role: 'Representative',
                is_primary: true,
              }
            ],
            created_at: org.created_at,
            updated_at: org.updated_at,
          })
        })
      }

      customers.value = combined
      saveStorage('customers', customers.value)
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
        .select('*')
        .eq('id', customerId)
        .maybeSingle()

      if (!error && data) {
        const idx = customers.value.findIndex((c) => c.id === data.id)
        if (idx !== -1) {
          customers.value[idx] = { ...customers.value[idx], ...data }
        } else {
          customers.value.unshift(data)
        }
        saveStorage('customers', customers.value)
        return data
      }

      // If not in customers, also check organizations table
      const { data: org, error: orgErr } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', customerId)
        .maybeSingle()

      if (!orgErr && org) {
        let contacts = []
        try {
          const { data: ctData } = await supabase
            .from('contacts')
            .select('*')
            .eq('organization_id', org.id)
          if (ctData) contacts = ctData
        } catch {}

        const primaryContact = contacts.find((ct) => ct.is_primary) || contacts[0]
        const clientObj = {
          id: org.id,
          customer_type: 'Business',
          status: 'Active',
          lifecycle_stage: 'Active',
          company_name: org.name || org.company_name || 'Organization',
          legal_structure: org.legal_structure || 'Corporation',
          company_registration_number: org.company_registration_number || '',
          tin: org.tin || org.tax_id || '',
          vat_number: org.vat_number || '',
          industry: org.industry || 'Technology',
          website: org.website || '',
          first_name: primaryContact?.first_name || '',
          last_name: primaryContact?.last_name || '',
          job_title: primaryContact?.job_title || 'Primary Contact',
          primary_email: primaryContact?.email || org.email || '',
          billing_email: primaryContact?.email || org.email || '',
          phone: org.phone || primaryContact?.phone || '',
          mobile_no: primaryContact?.mobile_no || '',
          national_id_number: '',
          billing_address_line1: org.address || org.billing_address_line1 || '',
          billing_city: org.city || org.billing_city || '',
          billing_state_province: org.state || org.billing_state_province || '',
          billing_postal_code: org.postal_code || org.zip || '',
          billing_country: org.country || 'United States',
          default_currency: org.currency || 'USD',
          default_payment_terms: org.payment_terms || 'Net 30',
          credit_limit: Number(org.credit_limit) || 25000.0,
          is_profile_complete: true,
          contacts: contacts.length > 0 ? contacts : [
            {
              id: `ct-${org.id}`,
              first_name: 'Primary',
              last_name: 'Contact',
              name: 'Primary Contact',
              email: org.email || '',
              phone: org.phone || '',
              role: 'Representative',
              is_primary: true,
            }
          ],
          created_at: org.created_at,
          updated_at: org.updated_at,
        }

        const idx = customers.value.findIndex((c) => c.id === clientObj.id)
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

    // 1. Sync to Supabase organizations table
    try {
      const { data: orgData, error: orgErr } = await supabase
        .from('organizations')
        .insert({
          name: newClient.company_name,
          industry: newClient.industry || null,
          website: newClient.website || null,
          phone: newClient.phone || null,
        })
        .select()
        .single()

      if (!orgErr && orgData) {
        // Associate created Supabase org id
        newClient.organization_id = orgData.id

        // 2. Insert primary contact into Supabase contacts table
        if (newClient.first_name || newClient.primary_email) {
          await supabase.from('contacts').insert({
            organization_id: orgData.id,
            first_name: newClient.first_name || 'Primary',
            last_name: newClient.last_name || '',
            email: newClient.primary_email || null,
            phone: newClient.phone || null,
            job_title: newClient.job_title || 'Primary Representative',
            is_primary: true,
          })
        }
      }
    } catch (err) {
      console.warn('[Business] Could not insert organization into Supabase:', err)
    }

    // 3. Sync to Supabase customers table if profile ID is valid
    try {
      await supabase.from('customers').insert({
        id: newClient.id.startsWith('usr-') || newClient.id.startsWith('cl-') ? undefined : newClient.id,
        customer_type: newClient.customer_type,
        status: newClient.status,
        company_name: newClient.company_name,
        company_registration_number: newClient.company_registration_number || null,
        tin: newClient.tin || null,
        vat_number: newClient.vat_number || null,
        industry: newClient.industry || null,
        first_name: newClient.first_name || null,
        last_name: newClient.last_name || null,
        primary_email: newClient.primary_email || null,
        phone: newClient.phone || null,
        billing_address_line1: newClient.billing_address_line1 || null,
        billing_city: newClient.billing_city || null,
        billing_postal_code: newClient.billing_postal_code || null,
        billing_country: newClient.billing_country || 'United States',
        default_currency: newClient.default_currency || 'USD',
        default_payment_terms: newClient.default_payment_terms || 'Net 30',
      })
    } catch (err) {
      // Expected if non-auth ID
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

      // Sync to Supabase customers
      try {
        await supabase
          .from('customers')
          .update({
            company_name: updatedData.company_name,
            company_registration_number: updatedData.company_registration_number,
            tin: updatedData.tin,
            vat_number: updatedData.vat_number,
            industry: updatedData.industry,
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
      } catch (err) {
        // Ignore if not a customers table row
      }

      // Sync to Supabase organizations & contacts
      try {
        await supabase
          .from('organizations')
          .update({
            name: updatedData.company_name,
            industry: updatedData.industry,
            website: updatedData.website,
            phone: updatedData.phone,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientId)

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
            .eq('organization_id', clientId)
            .eq('is_primary', true)
        }
      } catch (err) {
        console.warn('[Business] Could not update organization in Supabase:', err)
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
      // ignore
    }

    try {
      await supabase.from('organizations').delete().eq('id', clientId)
    } catch (err) {
      console.warn('[Business] Could not delete organization from Supabase:', err)
    }
  }

  // ==========================================
  // SETTINGS & COMPUTED METRICS
  // ==========================================
  function updateBusinessSettings(newSettings) {
    settings.value = { ...settings.value, ...newSettings }
    saveStorage('settings', settings.value)
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
    fetchUsersFromSupabase()
    fetchClientsFromSupabase()
    fetchChangeRequestsFromSupabase()
  } catch (e) {
    // ignore
  }

  return {
    settings,
    inventory,
    products: inventory,
    invoices,
    transactions,
    reminders,
    promotions,
    users,
    fetchUsersFromSupabase,
    updateUserRole,
    changeRequests,
    pendingChangeRequests,
    currentRole,
    currentUser,
    isAdmin,
    setRole,
    resolveUserRole,
    formatCurrency,
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
    // Settings
    updateBusinessSettings,
    // Computed Metrics
    totalRevenue,
    totalOutstanding,
    overdueInvoicesCount,
    paidInvoicesCount,
    lowStockItems,
  }
})
