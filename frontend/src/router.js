import { createRouter, createWebHistory } from 'vue-router'
import { call } from 'frappe-ui'
import { usersStore } from '@/stores/users'
import { sessionStore } from '@/stores/session'
import { viewsStore } from '@/stores/views'
import { useBusinessStore } from '@/stores/business'

let personaChecked = false
export const PERSONA_DONE_KEY = 'crm_persona_captured'

async function shouldCapturePersona() {
  return false
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/Login.vue'),
  },
  {
    path: '/',
    name: 'Home',
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: () => import('@/pages/MobileNotification.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/pages/Dashboard.vue'),
  },
  // ============================================================================
  // RETIRED INTO BACKGROUND: Leads & Deals
  // (Temporarily retired from active user routing and commented out)
  // Components:
  //   - '@/pages/Leads.vue'
  //   - '@/pages/Lead.vue' / '@/pages/MobileLead.vue'
  //   - '@/pages/Deals.vue'
  //   - '@/pages/Deal.vue' / '@/pages/MobileDeal.vue'
  // ============================================================================
  /*
  {
    alias: '/leads',
    path: '/leads/view/:viewType?',
    name: 'Leads',
    component: () => import('@/pages/Leads.vue'),
  },
  {
    path: '/leads/:leadId',
    name: 'Lead',
    component: () => import(`@/pages/${handleMobileView('Lead')}.vue`),
    props: true,
  },
  {
    alias: '/deals',
    path: '/deals/view/:viewType?',
    name: 'Deals',
    component: () => import('@/pages/Deals.vue'),
  },
  {
    path: '/deals/:dealId',
    name: 'Deal',
    component: () => import(`@/pages/${handleMobileView('Deal')}.vue`),
    props: true,
  },
  */
  // ============================================================================
  // RETIRED INTO BACKGROUND: Notes
  // (Temporarily retired from active user routing and commented out)
  // Components:
  //   - '@/pages/Notes.vue'
  // ============================================================================
  /*
  {
    alias: '/notes',
    path: '/notes/view/:viewType?',
    name: 'Notes',
    component: () => import('@/pages/Notes.vue'),
  },
  */
  {
    alias: '/tasks',
    path: '/tasks/view/:viewType?',
    name: 'Tasks',
    component: () => import('@/pages/Tasks.vue'),
  },
  // ============================================================================
  // RETIRED INTO BACKGROUND: Contacts
  // (Temporarily retired from active user routing and commented out)
  // Components:
  //   - '@/pages/Contacts.vue'
  //   - '@/pages/Contact.vue' / '@/pages/MobileContact.vue'
  // ============================================================================
  /*
  {
    alias: '/contacts',
    path: '/contacts/view/:viewType?',
    name: 'Contacts',
    component: () => import('@/pages/Contacts.vue'),
  },
  {
    path: '/contacts/:contactId',
    name: 'Contact',
    component: () => import(`@/pages/${handleMobileView('Contact')}.vue`),
    props: true,
  },
  */
  {
    alias: ['/organizations', '/organizations/view/:viewType?', '/clients/view/:viewType?'],
    path: '/clients',
    name: 'Clients',
    component: () => import('@/pages/Clients.vue'),
  },
  {
    path: '/organizations/view/:viewType?',
    name: 'Organizations',
    redirect: '/clients',
  },
  {
    path: '/organizations/:organizationId',
    name: 'Organization',
    redirect: (to) => ({ path: `/clients/${to.params.organizationId}` }),
  },
  {
    path: '/clients/:clientId',
    name: 'Client',
    component: () => import('@/pages/Client.vue'),
    props: true,
  },
  // ============================================================================
  // RETIRED INTO BACKGROUND: Call Logs
  // (Temporarily retired from active user routing and commented out)
  // Component:
  //   - '@/pages/CallLogs.vue'
  // ============================================================================
  /*
  {
    alias: '/call-logs',
    path: '/call-logs/view/:viewType?',
    name: 'Call Logs',
    component: () => import('@/pages/CallLogs.vue'),
  },
  */
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/pages/Calendar.vue'),
  },
  {
    path: '/data-import',
    name: 'DataImportList',
    component: () => import('@/pages/DataImport.vue'),
  },
  {
    path: '/data-import/doctype/:doctype',
    name: 'NewDataImport',
    component: () => import('@/pages/DataImport.vue'),
    props: true,
  },
  {
    path: '/data-import/:importName',
    name: 'DataImport',
    component: () => import('@/pages/DataImport.vue'),
    props: true,
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('@/pages/Welcome.vue'),
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/pages/PersonaForm.vue'),
  },
  {
    path: '/:invalidpath',
    name: 'Invalid Page',
    component: () => import('@/pages/InvalidPage.vue'),
  },
  // Business Management & Invoicing Modules
  {
    path: '/invoices',
    name: 'Invoices',
    component: () => import('@/pages/Invoices/Invoices.vue'),
  },
  {
    path: '/invoices/:invoiceId',
    name: 'InvoiceDetail',
    component: () => import('@/pages/Invoices/InvoiceDetail.vue'),
    props: true,
  },
  {
    path: '/transactions',
    name: 'Transactions',
    component: () => import('@/pages/Transactions/Transactions.vue'),
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/pages/Inventory/Inventory.vue'),
  },
  {
    path: '/reminders',
    name: 'PaymentReminders',
    component: () => import('@/pages/Reminders/PaymentReminders.vue'),
  },
  /*
  {
    path: '/analytics',
    name: 'Analytics',
    component: () => import('@/pages/Analytics/Analytics.vue'),
  },
  */
  {
    path: '/business-settings',
    name: 'BusinessSettings',
    component: () => import('@/pages/BusinessSettings/BusinessSettings.vue'),
  },

  // Customer Portal Modules
  {
    path: '/portal',
    name: 'CustomerDashboard',
    component: () => import('@/pages/Portal/CustomerDashboard.vue'),
  },
  {
    path: '/portal/purchases',
    name: 'CustomerPurchases',
    component: () => import('@/pages/Portal/CustomerPurchases.vue'),
  },
  {
    path: '/portal/calendar',
    name: 'CustomerCalendar',
    component: () => import('@/pages/Portal/CustomerCalendar.vue'),
  },
  {
    path: '/portal/promotions',
    name: 'CustomerPromotions',
    component: () => import('@/pages/Portal/CustomerPromotions.vue'),
  },
  {
    path: '/portal/account',
    name: 'CustomerAccount',
    component: () => import('@/pages/Portal/CustomerAccount.vue'),
  },
  {
    path: '/not-permitted',
    name: 'Not Permitted',
    component: () => import('@/pages/NotPermitted.vue'),
  },
]

const handleMobileView = (componentName) => {
  return window.innerWidth < 768 ? `Mobile${componentName}` : componentName
}

let router = createRouter({
  history: createWebHistory('/crm'),
  routes,
})

router.beforeEach(async (to, from, next) => {
  router.previousRoute = from

  const session = sessionStore()
  if (!session.isInitialized) {
    try {
      await session.initPromise
    } catch (e) {
      // ignore
    }
  }

  const { isLoggedIn, user } = session
  const { users, isCrmUser, isAdmin } = usersStore()
  const business = useBusinessStore()
  const currentRole = business.currentRole

  if (to.name === 'Login') {
    if (isLoggedIn) {
      if (currentRole === 'Customer') {
        return next({ path: '/portal' })
      }
      return next({ name: 'Home' })
    }
    return next()
  }

  if (!isLoggedIn) {
    return next({ name: 'Login' })
  }

  // Customer Portal Guard
  if (currentRole === 'Customer') {
    if (!to.path.startsWith('/portal')) {
      return next({ path: '/portal' })
    }
    return next()
  }

  // Staff Restriction to Business Settings
  if (currentRole === 'Staff' && to.name === 'BusinessSettings') {
    return next({ name: 'Not Permitted' })
  }

  if (isLoggedIn && !users.fetched) {
    try {
      await users.promise
    } catch (error) {
      console.error('Error loading users', error)
    }
  }

  const isAdminUser = isLoggedIn && (isAdmin() || user === 'Administrator')

  // Only admins who haven't finished may reach the wizard, even via direct URL.
  if (isLoggedIn && to.name === 'Onboarding') {
    try {
      if (!isAdminUser || !(await shouldCapturePersona())) {
        return next({ name: 'Home' })
      }
    } catch {
      return next({ name: 'Home' })
    }
  }

  if (
    isLoggedIn &&
    isCrmUser() &&
    !personaChecked &&
    to.name !== 'Onboarding' &&
    isAdminUser
  ) {
    personaChecked = true
    try {
      if (await shouldCapturePersona()) {
        return next({ name: 'Onboarding' })
      }
    } catch (error) {
      // fail open
    }
  }

  if (isLoggedIn && to.name !== 'Not Permitted' && !isCrmUser()) {
    next({ name: 'Not Permitted' })
  } else if (to.name === 'Home' && isLoggedIn) {
    const { views, getDefaultView } = viewsStore()
    await views.promise

    let defaultView = getDefaultView()
    if (!defaultView) {
      // Formerly routed to 'Leads'. Since Leads is retired to the background, fallback to 'Dashboard'.
      next({ name: 'Dashboard' })
      return
    }

    let { route_name, type, name, is_standard } = defaultView
    // If route_name was one of the retired modules, fallback to Dashboard
    if (['Leads', 'Deals', 'Contacts', 'Call Logs'].includes(route_name)) {
      route_name = 'Dashboard'
    } else {
      route_name = route_name || 'Dashboard'
    }

    if (name && !is_standard && route_name !== 'Dashboard') {
      next({
        name: route_name,
        params: { viewType: type },
        query: { view: name },
      })
    } else {
      next({ name: route_name, params: { viewType: type } })
    }
  } else if (!isLoggedIn) {
    next({ name: 'Login' })
  } else if (to.matched.length === 0) {
    next({ name: 'Invalid Page' })
  // Deal & Lead tab hash persistence (commented out as modules are retired)
  /*
  } else if (['Deal', 'Lead'].includes(to.name) && !to.hash) {
    let storageKey = to.name === 'Deal' ? 'lastDealTab' : 'lastLeadTab'
    const activeTab = localStorage.getItem(storageKey) || 'activity'
    const hash = '#' + activeTab
    next({ ...to, hash })
  */
  } else if (
    [
      // 'Leads',     // Retired into background
      // 'Deals',     // Retired into background
      // 'Contacts',  // Retired into background
      // 'Organizations', // Redirects to /clients; handled as bespoke page
      // 'Clients',       // Bespoke clients page, not standard DocType view
      // 'Tasks',         // Native tasks page, decoupled from Frappe viewsStore
      // 'Notes',         // Retired into background
      // 'Call Logs', // Retired into background
    ].includes(to.name) &&
    !to.query?.view
  ) {
    const { views, standardViews, getDefaultView } = viewsStore()
    await views.promise

    const viewType = to.params?.viewType ?? ''
    const standardViewTypes = ['list', 'kanban', 'group_by']

    if (!viewType) {
      const doctypeMap = {
        Leads: 'CRM Lead',
        Deals: 'CRM Deal',
        Contacts: 'Contact',
        Organizations: 'CRM Organization',
        Notes: 'FCRM Note',
        Tasks: 'CRM Task',
        'Call Logs': 'CRM Call Log',
      }

      const doctype = doctypeMap[to.name]
      let defaultViewType = 'list'

      let globalDefault = getDefaultView()
      if (globalDefault && globalDefault.route_name === to.name) {
        defaultViewType = globalDefault.type || 'list'
        if (globalDefault.name && !globalDefault.is_standard) {
          next({
            name: to.name,
            params: { viewType: defaultViewType },
            query: { ...to.query, view: globalDefault.name },
          })
          return
        }
      }

      for (const viewType of standardViewTypes) {
        const standardView = standardViews.value?.[doctype + ' ' + viewType]
        if (standardView?.is_default) {
          defaultViewType = viewType
          break
        }
      }

      next({
        name: to.name,
        params: { viewType: defaultViewType },
        query: to.query,
      })
    } else if (!standardViewTypes.includes(viewType)) {
      const viewNameOrLabel = viewType

      let view = views.data?.find(
        (v) => v.name == viewNameOrLabel || v.label === viewNameOrLabel,
      )

      if (view) {
        next({
          name: to.name,
          params: { viewType: view.type || 'list' },
          query: { ...to.query, view: view.name },
        })
      } else {
        next({
          name: to.name,
          params: { viewType: 'list' },
          query: to.query,
        })
      }
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
