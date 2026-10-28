export interface DashboardLayoutItem {
  name: string
  type: 'number_chart' | 'line_chart' | 'bar_chart' | 'axis_chart' | 'donut_chart' | 'funnel_chart' | 'bar_list' | 'gauge_chart' | 'spacer'
  layout: {
    x: number
    y: number
    w: number
    h: number
    i: string
  }
  data?: any
}

export interface DashboardParams {
  from_date?: string | null
  to_date?: string | null
  user?: string | null
}

const DASHBOARD_STORAGE_KEY = 'crestara_dashboard_layout'

let _storeResolver: (() => any) | null = null

export function setDashboardStoreResolver(resolver: () => any) {
  _storeResolver = resolver
}

export function resolveStore(passedStore?: any) {
  if (passedStore) return passedStore
  if (_storeResolver) {
    try {
      return _storeResolver()
    } catch {
      return {}
    }
  }
  return {}
}

// ==========================================
// DATE & STRING UTILITIES (DEFENSIVE)
// ==========================================

export function toDateString(val: any): string {
  if (!val) return ''
  if (typeof val === 'string') return val.slice(0, 10)
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10)
  }
  return ''
}

export function isDateInRange(
  dateVal: any,
  fromDate?: string | null,
  toDate?: string | null,
): boolean {
  if (!dateVal) return false
  if (!fromDate && !toDate) return true

  const target = toDateString(dateVal)
  if (!target) return false
  if (fromDate && target < toDateString(fromDate)) return false
  if (toDate && target > toDateString(toDate)) return false
  return true
}

export function getPriorPeriodRange(fromDate?: string | null, toDate?: string | null): {
  priorFrom: string
  priorTo: string
} | null {
  if (!fromDate || !toDate) return null
  const from = new Date(fromDate)
  const to = new Date(toDate)
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null

  const durationMs = to.getTime() - from.getTime()
  if (durationMs < 0) return null

  // Prior period ends the day before fromDate
  const priorToDate = new Date(from.getTime() - 24 * 60 * 60 * 1000)
  const priorFromDate = new Date(priorToDate.getTime() - durationMs)

  const toIso = (d: Date) => d.toISOString().split('T')[0]
  return {
    priorFrom: toIso(priorFromDate),
    priorTo: toIso(priorToDate),
  }
}

export function calcDelta(current: number, prior: number): {
  delta: number
  deltaPrefix: string
  deltaSuffix: string
} {
  if (prior <= 0) {
    if (current > 0) return { delta: 100, deltaPrefix: '+', deltaSuffix: '%' }
    return { delta: 0, deltaPrefix: '', deltaSuffix: '%' }
  }
  const pct = Math.round(((current - prior) / prior) * 100 * 10) / 10
  return {
    delta: pct,
    deltaPrefix: pct >= 0 ? '+' : '',
    deltaSuffix: '%',
  }
}

export function formatNum(val: number | string | undefined | null, prefix = '$'): string {
  const num = Number(val || 0)
  return `${prefix}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// ==========================================
// DEFAULT DASHBOARD LAYOUT (RICH & POLISHED)
// ==========================================

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayoutItem[] = [
  // Row 0: 4 Modernized Number Cards (h: 3 gives generous visual breathing space)
  {
    name: 'total_revenue',
    type: 'number_chart',
    layout: { x: 0, y: 0, w: 5, h: 3, i: 'total_revenue_0' },
  },
  {
    name: 'outstanding_balance',
    type: 'number_chart',
    layout: { x: 5, y: 0, w: 5, h: 3, i: 'outstanding_balance_1' },
  },
  {
    name: 'overdue_invoices',
    type: 'number_chart',
    layout: { x: 10, y: 0, w: 5, h: 3, i: 'overdue_invoices_2' },
  },
  {
    name: 'inventory_valuation',
    type: 'number_chart',
    layout: { x: 15, y: 0, w: 5, h: 3, i: 'inventory_valuation_3' },
  },
  // Row 3: Visual Telemetry (Spline Area Line Graph + Status Donut)
  {
    name: 'revenue_velocity_line',
    type: 'line_chart',
    layout: { x: 0, y: 3, w: 12, h: 7, i: 'line_velocity_4' },
  },
  {
    name: 'invoices_by_status',
    type: 'donut_chart',
    layout: { x: 12, y: 3, w: 8, h: 7, i: 'invoices_by_status_5' },
  },
  // Row 10: Stacked Monthly Bar Chart + Funnel Pipeline
  {
    name: 'monthly_status_stacked',
    type: 'bar_chart',
    layout: { x: 0, y: 10, w: 10, h: 7, i: 'bar_stacked_6' },
  },
  {
    name: 'invoice_lifecycle_funnel',
    type: 'funnel_chart',
    layout: { x: 10, y: 10, w: 10, h: 7, i: 'funnel_7' },
  },
  // Row 17: Category Progress BarList + Ranked Top Clients Horizontal Bar
  {
    name: 'category_revenue_list',
    type: 'bar_list',
    layout: { x: 0, y: 17, w: 10, h: 7, i: 'barlist_8' },
  },
  {
    name: 'top_clients_ranking',
    type: 'bar_chart',
    layout: { x: 10, y: 17, w: 10, h: 7, i: 'clients_ranking_9' },
  },
]

// ==========================================
// CHART COMPUTATION ENGINE
// ==========================================

export function computeChartData(
  name: string,
  type: string,
  params: DashboardParams = {},
  store?: any,
): any {
  const business = resolveStore(store)
  const invoices = business.invoices || []
  const transactions = business.transactions || []
  const inventory = business.inventory || business.products || []
  const fromDate = params.from_date || null
  const toDate = params.to_date || null
  const userFilter = params.user || null
  const currencySymbol = business.getCurrencySymbol?.() || '$'

  const activeInvoices = invoices.filter((inv: any) => {
    if (inv.status === 'Cancelled') return false
    if (!isDateInRange(inv.issue_date || inv.created_at, fromDate, toDate)) return false
    if (userFilter) {
      const invUser = inv.created_by || inv.owner || inv.sales_person || inv.user
      if (invUser && invUser !== userFilter) return false
    }
    return true
  })

  const activeTransactions = transactions.filter((t: any) => {
    if (t.status !== 'Settled') return false
    if (!isDateInRange(t.payment_date || t.created_at, fromDate, toDate)) return false
    if (userFilter) {
      const txUser = t.created_by || t.user || t.recorded_by
      if (txUser && txUser !== userFilter) return false
    }
    return true
  })

  // Prior period data for delta calculation
  const prior = getPriorPeriodRange(fromDate, toDate)
  const priorTransactions = prior
    ? transactions.filter((t: any) => {
        if (t.status !== 'Settled') return false
        if (!isDateInRange(t.payment_date || t.created_at, prior.priorFrom, prior.priorTo)) return false
        if (userFilter) {
          const txUser = t.created_by || t.user || t.recorded_by
          if (txUser && txUser !== userFilter) return false
        }
        return true
      })
    : []

  const priorInvoices = prior
    ? invoices.filter((inv: any) => {
        if (inv.status === 'Cancelled') return false
        if (!isDateInRange(inv.issue_date || inv.created_at, prior.priorFrom, prior.priorTo)) return false
        if (userFilter) {
          const invUser = inv.created_by || inv.owner || inv.sales_person || inv.user
          if (invUser && invUser !== userFilter) return false
        }
        return true
      })
    : []

  // ------------------------------------------
  // 1. NUMBER CHARTS (ENRICHED SHADCN KPI CARDS)
  // ------------------------------------------
  if (type === 'number_chart') {
    switch (name) {
      case 'total_revenue': {
        const currentSum = activeTransactions.reduce(
          (acc: number, t: any) => acc + Number(t.amount || 0),
          0,
        )
        const priorSum = priorTransactions.reduce(
          (acc: number, t: any) => acc + Number(t.amount || 0),
          0,
        )
        const { delta, deltaPrefix, deltaSuffix } = calcDelta(currentSum, priorSum)
        return {
          title: 'Total Revenue',
          value: currentSum,
          formattedValue: formatNum(currentSum, currencySymbol),
          prefix: currencySymbol,
          delta: prior ? delta : undefined,
          deltaPrefix,
          deltaSuffix,
          negativeIsBetter: false,
          icon: 'trending-up',
          theme: 'green',
          subtitle: prior ? 'vs prior period' : 'Total settled cash',
          tooltip: 'Total cash collected from settled payments in selected period',
        }
      }

      case 'outstanding_balance': {
        const totalOutstanding = activeInvoices
          .filter((i: any) => i.status !== 'Paid')
          .reduce((acc: number, i: any) => acc + Number(i.balance_due || 0), 0)
        const unpaidCount = activeInvoices.filter(
          (i: any) => i.status !== 'Paid' && Number(i.balance_due || 0) > 0,
        ).length
        return {
          title: 'Outstanding Receivables',
          value: totalOutstanding,
          formattedValue: formatNum(totalOutstanding, currencySymbol),
          prefix: currencySymbol,
          negativeIsBetter: true,
          icon: 'clock',
          theme: 'amber',
          badgeText: `${unpaidCount} open invoices`,
          badgeType: unpaidCount > 0 ? 'amber' : 'neutral',
          subtitle: `${unpaidCount} invoices awaiting payment`,
          tooltip: 'Total pending balance across unpaid or partially paid invoices',
        }
      }

      case 'overdue_invoices': {
        const overdueList = activeInvoices.filter((i: any) => i.status === 'Overdue')
        const overdueAmount = overdueList.reduce(
          (acc: number, i: any) => acc + Number(i.balance_due || 0),
          0,
        )
        return {
          title: 'Overdue Accounts',
          value: overdueAmount,
          formattedValue: formatNum(overdueAmount, currencySymbol),
          prefix: currencySymbol,
          negativeIsBetter: true,
          icon: 'alert-circle',
          theme: 'red',
          badgeText: overdueList.length > 0 ? `${overdueList.length} past due` : 'All clear',
          badgeType: overdueList.length > 0 ? 'red' : 'green',
          subtitle: overdueList.length > 0 ? 'Requires immediate reminder' : 'No overdue accounts',
          tooltip: 'Total balance on invoices that have passed their payment due date',
        }
      }

      case 'total_invoiced': {
        const currentBilled = activeInvoices.reduce(
          (acc: number, i: any) => acc + Number(i.total_amount || 0),
          0,
        )
        const priorBilled = priorInvoices.reduce(
          (acc: number, i: any) => acc + Number(i.total_amount || 0),
          0,
        )
        const { delta, deltaPrefix, deltaSuffix } = calcDelta(currentBilled, priorBilled)
        return {
          title: 'Gross Invoiced Volume',
          value: currentBilled,
          formattedValue: formatNum(currentBilled, currencySymbol),
          prefix: currencySymbol,
          delta: prior ? delta : undefined,
          deltaPrefix,
          deltaSuffix,
          negativeIsBetter: false,
          icon: 'receipt',
          theme: 'indigo',
          subtitle: `${activeInvoices.length} invoices issued`,
          tooltip: 'Gross dollar value billed across all issued invoices in range',
        }
      }

      case 'collection_rate': {
        const billed = activeInvoices.reduce(
          (acc: number, i: any) => acc + Number(i.total_amount || 0),
          0,
        )
        const collected = activeTransactions.reduce(
          (acc: number, t: any) => acc + Number(t.amount || 0),
          0,
        )
        const rate = billed > 0 ? Math.round((collected / billed) * 100) : 0
        return {
          title: 'Collection Efficiency',
          value: rate,
          formattedValue: `${rate}%`,
          suffix: '%',
          negativeIsBetter: false,
          icon: 'percent',
          theme: 'cyan',
          badgeText: rate >= 80 ? 'Optimal' : rate >= 50 ? 'Moderate' : 'Low',
          badgeType: rate >= 80 ? 'green' : rate >= 50 ? 'amber' : 'red',
          subtitle: 'Cash settlement conversion',
          tooltip: 'Percentage of billed invoice volume collected as settled cash',
        }
      }

      case 'inventory_valuation': {
        const totalRetail = inventory
          .filter((p: any) => p.track_stock)
          .reduce(
            (acc: number, p: any) =>
              acc + Number(p.quantity_in_stock || 0) * Number(p.unit_price || 0),
            0,
          )
        return {
          title: 'Inventory Valuation',
          value: Math.round(totalRetail),
          formattedValue: formatNum(Math.round(totalRetail), currencySymbol),
          prefix: currencySymbol,
          negativeIsBetter: false,
          icon: 'package',
          theme: 'blue',
          subtitle: `${inventory.filter((p: any) => p.track_stock).length} tracked products`,
          tooltip: 'Current retail valuation of tracked stock on hand',
        }
      }

      case 'low_stock_warnings': {
        const lowStockCount = inventory.filter(
          (p: any) =>
            p.track_stock &&
            Number(p.quantity_in_stock || 0) <= Number(p.low_stock_threshold || 5),
        ).length
        return {
          title: 'Stock Reorder Alerts',
          value: lowStockCount,
          formattedValue: `${lowStockCount} items`,
          suffix: ' items',
          negativeIsBetter: true,
          icon: 'alert-triangle',
          theme: 'amber',
          badgeText: lowStockCount > 0 ? `${lowStockCount} low stock` : 'Healthy stock',
          badgeType: lowStockCount > 0 ? 'amber' : 'green',
          subtitle: lowStockCount > 0 ? 'Needs inventory reorder' : 'All stock optimal',
          tooltip: 'Products at or below their reorder threshold',
        }
      }

      case 'active_clients': {
        const clientSet = new Set(
          activeInvoices.map((i: any) => i.client_email || i.client_name).filter(Boolean),
        )
        return {
          title: 'Active Billed Clients',
          value: clientSet.size,
          formattedValue: `${clientSet.size} accounts`,
          suffix: ' clients',
          negativeIsBetter: false,
          icon: 'users',
          theme: 'purple',
          subtitle: 'Active client organizations',
          tooltip: 'Distinct client organizations billed within this period',
        }
      }

      default:
        return {
          title: name.replace(/_/g, ' '),
          value: 0,
          formattedValue: '0',
          icon: 'bar-chart',
          theme: 'neutral',
        }
    }
  }

  // ------------------------------------------
  // 2. LINE GRAPHS (SPLINE, GRADIENT AREA, VELOCITY)
  // ------------------------------------------
  if (
    type === 'line_chart' ||
    (type === 'axis_chart' &&
      [
        'revenue_velocity_line',
        'revenue_trend',
        'collections_line',
        'cumulative_revenue_line',
        'avg_invoice_line',
      ].includes(name))
  ) {
    switch (name) {
      case 'collections_line': {
        // Pure daily cash collections line graph
        const dateMap: Record<string, number> = {}
        activeTransactions.forEach((tx: any) => {
          const d = toDateString(tx.payment_date || tx.created_at)
          if (!d) return
          dateMap[d] = (dateMap[d] || 0) + Number(tx.amount || 0)
        })

        const sortedDates = Object.keys(dateMap).sort()
        let chartData = sortedDates.map((d) => ({
          date: d,
          Collected: Math.round(dateMap[d]),
        }))

        if (chartData.length === 0) {
          const today = new Date().toISOString().split('T')[0]
          chartData = [{ date: today, Collected: 0 }]
        }

        return {
          title: 'Cash Flow & Collections Timeline (Line)',
          data: chartData,
          xAxis: { key: 'date', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'Collected',
              type: 'line',
              color: '#10b981',
              echartOptions: {
                smooth: true,
                lineStyle: { width: 3 },
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(16, 185, 129, 0.35)' },
                      { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
                    ],
                  },
                },
              },
            },
          ],
        }
      }

      case 'cumulative_revenue_line': {
        // Running total cumulative revenue curve
        const dateMap: Record<string, number> = {}
        activeTransactions.forEach((tx: any) => {
          const d = toDateString(tx.payment_date || tx.created_at)
          if (!d) return
          dateMap[d] = (dateMap[d] || 0) + Number(tx.amount || 0)
        })

        const sortedDates = Object.keys(dateMap).sort()
        let runningTotal = 0
        let chartData = sortedDates.map((d) => {
          runningTotal += Number(dateMap[d] || 0)
          return {
            date: d,
            CumulativeRevenue: Math.round(runningTotal),
          }
        })

        if (chartData.length === 0) {
          const today = new Date().toISOString().split('T')[0]
          chartData = [{ date: today, CumulativeRevenue: 0 }]
        }

        return {
          title: 'Cumulative Revenue Running Growth (Line)',
          data: chartData,
          xAxis: { key: 'date', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'CumulativeRevenue',
              type: 'line',
              color: '#6366f1',
              echartOptions: {
                smooth: true,
                lineStyle: { width: 3.5 },
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(99, 102, 241, 0.35)' },
                      { offset: 1, color: 'rgba(99, 102, 241, 0.02)' },
                    ],
                  },
                },
              },
            },
          ],
        }
      }

      case 'avg_invoice_line': {
        const monthMap: Record<string, { total: number; count: number }> = {}
        activeInvoices.forEach((inv: any) => {
          const m = toDateString(inv.issue_date || inv.created_at).slice(0, 7)
          if (!m) return
          if (!monthMap[m]) monthMap[m] = { total: 0, count: 0 }
          monthMap[m].total += Number(inv.total_amount || 0)
          monthMap[m].count += 1
        })

        const sortedMonths = Object.keys(monthMap).sort()
        let chartData = sortedMonths.map((m) => ({
          month: m,
          AverageInvoice: Math.round(monthMap[m].total / Math.max(1, monthMap[m].count)),
        }))

        if (chartData.length === 0) {
          const curMonth = new Date().toISOString().slice(0, 7)
          chartData = [{ month: curMonth, AverageInvoice: 0 }]
        }

        return {
          title: 'Average Invoice Deal Size Trend (Line)',
          data: chartData,
          xAxis: { key: 'month', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'AverageInvoice',
              type: 'line',
              color: '#f59e0b',
              echartOptions: {
                smooth: true,
                lineStyle: { width: 3 },
              },
            },
          ],
        }
      }

      case 'revenue_trend':
      case 'revenue_velocity_line':
      default: {
        // Dual spline curve (Billed vs Collected)
        const dateMap: Record<string, { date: string; Collected: number; Billed: number }> = {}

        activeInvoices.forEach((inv: any) => {
          const d = toDateString(inv.issue_date || inv.created_at)
          if (!d) return
          if (!dateMap[d]) dateMap[d] = { date: d, Collected: 0, Billed: 0 }
          dateMap[d].Billed += Number(inv.total_amount || 0)
        })

        activeTransactions.forEach((tx: any) => {
          const d = toDateString(tx.payment_date || tx.created_at)
          if (!d) return
          if (!dateMap[d]) dateMap[d] = { date: d, Collected: 0, Billed: 0 }
          dateMap[d].Collected += Number(tx.amount || 0)
        })

        const sortedDates = Object.keys(dateMap).sort()
        let chartData = sortedDates.map((k) => ({
          date: k,
          Collected: Math.round(dateMap[k].Collected),
          Billed: Math.round(dateMap[k].Billed),
        }))

        if (chartData.length === 0) {
          const today = new Date().toISOString().split('T')[0]
          chartData = [{ date: today, Collected: 0, Billed: 0 }]
        }

        return {
          title: 'Revenue vs Invoicing Velocity (Line Graph)',
          data: chartData,
          xAxis: { key: 'date', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'Collected',
              type: 'line',
              color: '#10b981',
              echartOptions: {
                smooth: true,
                lineStyle: { width: 3 },
                areaStyle: {
                  color: {
                    type: 'linear',
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: 'rgba(16, 185, 129, 0.30)' },
                      { offset: 1, color: 'rgba(16, 185, 129, 0.02)' },
                    ],
                  },
                },
              },
            },
            {
              name: 'Billed',
              type: 'line',
              color: '#3b82f6',
              echartOptions: {
                smooth: true,
                lineStyle: { width: 2.5, type: 'dashed' },
              },
            },
          ],
        }
      }
    }
  }

  // ------------------------------------------
  // 3. BAR CHARTS (COLUMNS, GROUPED, STACKED, HORIZONTAL)
  // ------------------------------------------
  if (type === 'bar_chart' || type === 'axis_chart') {
    switch (name) {
      case 'billed_vs_collected_bar': {
        const monthMap: Record<string, { month: string; Billed: number; Collected: number }> = {}

        activeInvoices.forEach((inv: any) => {
          const m = toDateString(inv.issue_date || inv.created_at).slice(0, 7)
          if (!m) return
          if (!monthMap[m]) monthMap[m] = { month: m, Billed: 0, Collected: 0 }
          monthMap[m].Billed += Number(inv.total_amount || 0)
        })

        activeTransactions.forEach((tx: any) => {
          const m = toDateString(tx.payment_date || tx.created_at).slice(0, 7)
          if (!m) return
          if (!monthMap[m]) monthMap[m] = { month: m, Billed: 0, Collected: 0 }
          monthMap[m].Collected += Number(tx.amount || 0)
        })

        const sortedMonths = Object.keys(monthMap).sort()
        let chartData = sortedMonths.map((m) => ({
          month: m,
          Billed: Math.round(monthMap[m].Billed),
          Collected: Math.round(monthMap[m].Collected),
        }))

        if (chartData.length === 0) {
          const curMonth = new Date().toISOString().slice(0, 7)
          chartData = [{ month: curMonth, Billed: 0, Collected: 0 }]
        }

        return {
          title: 'Billed vs Collected Comparison (Grouped Bar)',
          data: chartData,
          xAxis: { key: 'month', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'Billed',
              type: 'bar',
              color: '#3b82f6',
              echartOptions: { itemStyle: { borderRadius: [5, 5, 0, 0] }, barMaxWidth: 35 },
            },
            {
              name: 'Collected',
              type: 'bar',
              color: '#10b981',
              echartOptions: { itemStyle: { borderRadius: [5, 5, 0, 0] }, barMaxWidth: 35 },
            },
          ],
        }
      }

      case 'monthly_collections': {
        const monthMap: Record<string, number> = {}
        activeTransactions.forEach((tx: any) => {
          const d = toDateString(tx.payment_date || tx.created_at).slice(0, 7)
          if (!d) return
          monthMap[d] = (monthMap[d] || 0) + Number(tx.amount || 0)
        })

        const sortedMonths = Object.keys(monthMap).sort()
        let chartData = sortedMonths.map((m) => ({
          month: m,
          Collections: Math.round(monthMap[m]),
        }))

        if (chartData.length === 0) {
          const curMonth = new Date().toISOString().slice(0, 7)
          chartData = [{ month: curMonth, Collections: 0 }]
        }

        return {
          title: 'Monthly Cash Inflow (Bar Chart)',
          data: chartData,
          xAxis: { key: 'month', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'Collections',
              type: 'bar',
              color: '#10b981',
              echartOptions: { itemStyle: { borderRadius: [6, 6, 0, 0] }, barMaxWidth: 45 },
            },
          ],
        }
      }

      case 'monthly_status_stacked': {
        const monthMap: Record<string, { month: string; Paid: number; Issued: number; Overdue: number }> = {}

        activeInvoices.forEach((inv: any) => {
          const m = toDateString(inv.issue_date || inv.created_at).slice(0, 7)
          if (!m) return
          if (!monthMap[m]) monthMap[m] = { month: m, Paid: 0, Issued: 0, Overdue: 0 }
          const s = inv.status
          if (s === 'Paid') monthMap[m].Paid += Number(inv.total_amount || 0)
          else if (s === 'Overdue') monthMap[m].Overdue += Number(inv.total_amount || 0)
          else monthMap[m].Issued += Number(inv.total_amount || 0)
        })

        const sortedMonths = Object.keys(monthMap).sort()
        let chartData = sortedMonths.map((m) => ({
          month: m,
          Paid: Math.round(monthMap[m].Paid),
          Issued: Math.round(monthMap[m].Issued),
          Overdue: Math.round(monthMap[m].Overdue),
        }))

        if (chartData.length === 0) {
          const curMonth = new Date().toISOString().slice(0, 7)
          chartData = [{ month: curMonth, Paid: 0, Issued: 0, Overdue: 0 }]
        }

        return {
          title: 'Monthly Invoicing Composition (Stacked Bar)',
          stacked: true,
          data: chartData,
          xAxis: { key: 'month', type: 'category' },
          yAxis: {},
          series: [
            { name: 'Paid', type: 'bar', color: '#10b981' },
            { name: 'Issued', type: 'bar', color: '#3b82f6' },
            { name: 'Overdue', type: 'bar', color: '#ef4444' },
          ],
        }
      }

      case 'top_clients_ranking': {
        const clientRevenue: Record<string, number> = {}
        activeInvoices.forEach((inv: any) => {
          const name = inv.client_name || 'Individual'
          clientRevenue[name] = (clientRevenue[name] || 0) + Number(inv.total_amount || 0)
        })

        const chartData = Object.entries(clientRevenue)
          .map(([client, amount]) => ({ client, Amount: Math.round(amount) }))
          .sort((a, b) => b.Amount - a.Amount)
          .slice(0, 5)

        return {
          title: 'Top 5 Clients by Invoiced Volume (Horizontal Bar)',
          swapXY: true,
          data: chartData.length > 0 ? chartData : [{ client: 'No Data', Amount: 0 }],
          xAxis: { key: 'client', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'Amount',
              type: 'bar',
              color: '#3b82f6',
              echartOptions: { itemStyle: { borderRadius: [0, 6, 6, 0] }, barMaxWidth: 25 },
            },
          ],
        }
      }

      case 'sales_by_category':
      default: {
        const catMap: Record<string, number> = {}
        activeInvoices.forEach((inv: any) => {
          if (Array.isArray(inv.items) && inv.items.length > 0) {
            inv.items.forEach((item: any) => {
              const cat = item.category || 'Standard Sales'
              catMap[cat] = (catMap[cat] || 0) + Number(item.amount || item.rate * item.quantity || 0)
            })
          } else {
            catMap['Standard Services'] =
              (catMap['Standard Services'] || 0) + Number(inv.total_amount || 0)
          }
        })

        const chartData = Object.entries(catMap)
          .map(([category, amount]) => ({
            category,
            Amount: Math.round(amount),
          }))
          .sort((a, b) => b.Amount - a.Amount)
          .slice(0, 6)

        return {
          title: 'Sales by Product / Service Category (Bar Chart)',
          data:
            chartData.length > 0
              ? chartData
              : [{ category: 'Standard Services', Amount: 0 }],
          xAxis: { key: 'category', type: 'category' },
          yAxis: {},
          series: [
            {
              name: 'Amount',
              type: 'bar',
              color: '#6366f1',
              echartOptions: { itemStyle: { borderRadius: [6, 6, 0, 0] }, barMaxWidth: 45 },
            },
          ],
        }
      }
    }
  }

  // ------------------------------------------
  // 4. DONUT CHARTS
  // ------------------------------------------
  if (type === 'donut_chart') {
    switch (name) {
      case 'invoices_by_status': {
        const statusMap: Record<string, number> = {
          Paid: 0,
          Issued: 0,
          'Partially paid': 0,
          Overdue: 0,
          Draft: 0,
        }

        activeInvoices.forEach((inv: any) => {
          const s = inv.status || 'Draft'
          const key = s === 'Partially Paid' ? 'Partially paid' : s
          if (statusMap[key] !== undefined) {
            statusMap[key] += 1
          } else {
            statusMap[key] = (statusMap[key] || 0) + 1
          }
        })

        const data = Object.entries(statusMap)
          .filter(([_, count]) => count > 0)
          .map(([status, count]) => ({ status, count }))

        return {
          title: 'Invoices by Status',
          categoryColumn: 'status',
          valueColumn: 'count',
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8'],
          data: data.length > 0 ? data : [{ status: 'No Invoices', count: 1 }],
        }
      }

      case 'revenue_by_customer': {
        const customerRevenue: Record<string, number> = {}
        activeInvoices.forEach((inv: any) => {
          const clientName = inv.client_name || 'Individual Clients'
          customerRevenue[clientName] = (customerRevenue[clientName] || 0) + Number(inv.total_amount || 0)
        })

        const sorted = Object.entries(customerRevenue)
          .map(([customer, amount]) => ({ customer, amount: Math.round(amount) }))
          .sort((a, b) => b.amount - a.amount)

        const top = sorted.slice(0, 5)
        const restSum = sorted.slice(5).reduce((acc, c) => acc + c.amount, 0)
        if (restSum > 0) {
          top.push({ customer: 'Others', amount: restSum })
        }

        return {
          title: 'Revenue by Top Customers',
          categoryColumn: 'customer',
          valueColumn: 'amount',
          colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#94a3b8'],
          data: top.length > 0 ? top : [{ customer: 'No Data', amount: 1 }],
        }
      }

      case 'inventory_stock_status': {
        let optimal = 0
        let low = 0
        let out = 0

        inventory.forEach((p: any) => {
          if (!p.track_stock) return
          const q = Number(p.quantity_in_stock || 0)
          const threshold = Number(p.low_stock_threshold || 5)
          if (q <= 0) out += 1
          else if (q <= threshold) low += 1
          else optimal += 1
        })

        return {
          title: 'Inventory Stock Health',
          categoryColumn: 'status',
          valueColumn: 'count',
          colors: ['#10b981', '#f59e0b', '#ef4444'],
          data: [
            { status: 'Optimal Stock', count: optimal },
            { status: 'Low Stock', count: low },
            { status: 'Out of Stock', count: out },
          ].filter((d) => d.count > 0),
        }
      }

      default:
        return {
          title: name.replace(/_/g, ' '),
          categoryColumn: 'name',
          valueColumn: 'value',
          data: [],
        }
    }
  }

  // ------------------------------------------
  // 5. FUNNEL CHARTS (INVOICE LIFECYCLE PIPELINE)
  // ------------------------------------------
  if (type === 'funnel_chart') {
    const totalIssued = activeInvoices.length
    const nonDraft = activeInvoices.filter((i: any) => i.status !== 'Draft').length
    const partiallyPaid = activeInvoices.filter((i: any) => i.status === 'Partially paid' || i.status === 'Partially Paid').length
    const paidInFull = activeInvoices.filter((i: any) => i.status === 'Paid').length

    return {
      title: 'Invoice Conversion & Settlement Pipeline',
      categoryColumn: 'stage',
      valueColumn: 'count',
      data: [
        { stage: '1. Invoices Created', count: Math.max(totalIssued, 1) },
        { stage: '2. Sent to Client', count: Math.max(nonDraft, 1) },
        { stage: '3. Partially Paid', count: Math.max(partiallyPaid + paidInFull, 1) },
        { stage: '4. Settled in Full', count: Math.max(paidInFull, 1) },
      ],
    }
  }

  // ------------------------------------------
  // 6. BAR LIST / PROGRESS CHARTS (TREMOR/SHADCN PROGRESS)
  // ------------------------------------------
  if (type === 'bar_list') {
    switch (name) {
      case 'payment_methods_list': {
        const methodMap: Record<string, number> = {}
        activeTransactions.forEach((tx: any) => {
          const m = tx.payment_method || 'Credit Card'
          methodMap[m] = (methodMap[m] || 0) + Number(tx.amount || 0)
        })

        const total = Object.values(methodMap).reduce((a, b) => a + b, 0) || 1
        const list = Object.entries(methodMap)
          .map(([label, value]) => ({
            label,
            value: Math.round(value),
            formattedValue: formatNum(value, currencySymbol),
            percentage: Math.min(100, Math.round((value / total) * 100)),
          }))
          .sort((a, b) => b.value - a.value)

        return {
          title: 'Settlement by Payment Method',
          items: list.length > 0 ? list : [{ label: 'Direct Settlement', value: 0, formattedValue: '$0.00', percentage: 100 }],
        }
      }

      case 'category_revenue_list':
      default: {
        const catMap: Record<string, number> = {}
        activeInvoices.forEach((inv: any) => {
          if (Array.isArray(inv.items) && inv.items.length > 0) {
            inv.items.forEach((item: any) => {
              const cat = item.category || 'General Sales'
              catMap[cat] = (catMap[cat] || 0) + Number(item.amount || item.rate * item.quantity || 0)
            })
          } else {
            catMap['General Services'] = (catMap['General Services'] || 0) + Number(inv.total_amount || 0)
          }
        })

        const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1
        const list = Object.entries(catMap)
          .map(([label, value]) => ({
            label,
            value: Math.round(value),
            formattedValue: formatNum(value, currencySymbol),
            percentage: Math.min(100, Math.round((value / total) * 100)),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)

        return {
          title: 'Top Sales Categories (BarList)',
          items: list.length > 0 ? list : [{ label: 'Cloud Hosting & Hardware', value: 0, formattedValue: '$0.00', percentage: 100 }],
        }
      }
    }
  }

  // ------------------------------------------
  // 7. GAUGE CHART (CIRCULAR EFFICIENCY METER)
  // ------------------------------------------
  if (type === 'gauge_chart') {
    const billed = activeInvoices.reduce((acc: number, i: any) => acc + Number(i.total_amount || 0), 0)
    const collected = activeTransactions.reduce((acc: number, t: any) => acc + Number(t.amount || 0), 0)
    const rate = billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : 0
    const target = 85

    return {
      title: 'Collection Target Efficiency',
      value: rate,
      target,
      status: rate >= target ? 'On Target' : rate >= 60 ? 'Close to Target' : 'Under Target',
      billedAmount: formatNum(billed, currencySymbol),
      collectedAmount: formatNum(collected, currencySymbol),
    }
  }

  // Fallback for axis/line/bar charts to prevent Frappe UI eChartOptions undefined title crash
  if (type === 'axis_chart' || type === 'line_chart' || type === 'bar_chart') {
    return {
      title: name ? name.replace(/_/g, ' ') : 'Metric Trend',
      xAxis: { key: 'label', type: 'category', title: '' },
      yAxis: { title: '' },
      data: [{ label: 'No Data', value: 0 }],
      series: [{ name: 'value', type: type === 'line_chart' ? 'line' : 'bar' }],
    }
  }

  // Fallback for donut
  if (type === 'donut_chart') {
    return {
      title: name ? name.replace(/_/g, ' ') : 'Distribution',
      categoryColumn: 'label',
      valueColumn: 'value',
      data: [{ label: 'No Data', value: 0 }],
    }
  }

  // Fallback for funnel
  if (type === 'funnel_chart') {
    return {
      title: name ? name.replace(/_/g, ' ') : 'Pipeline',
      categoryColumn: 'stage',
      valueColumn: 'count',
      data: [{ stage: 'Active', count: 1 }],
    }
  }

  // Spacer or unrecognized
  return {}
}

// ==========================================
// REFACTORED ENDPOINTS
// ==========================================

export async function getDashboard(
  params: DashboardParams = {},
  store?: any,
): Promise<DashboardLayoutItem[]> {
  let layout: DashboardLayoutItem[] = []

  try {
    const saved = localStorage.getItem(DASHBOARD_STORAGE_KEY)
    if (saved) {
      layout = JSON.parse(saved)
    }
  } catch (e) {
    console.warn('[Dashboard] Could not parse saved layout from localStorage:', e)
  }

  const validTypes = new Set([
    'number_chart',
    'line_chart',
    'bar_chart',
    'axis_chart',
    'donut_chart',
    'funnel_chart',
    'bar_list',
    'gauge_chart',
    'spacer',
  ])

  // Filter out corrupted or legacy records from previous Frappe schema
  if (Array.isArray(layout)) {
    layout = layout.filter((i) => i && i.name && validTypes.has(i.type))
  }

  if (!Array.isArray(layout) || layout.length === 0) {
    layout = JSON.parse(JSON.stringify(DEFAULT_DASHBOARD_LAYOUT))
  }

  return layout.map((item) => ({
    ...item,
    data: computeChartData(item.name, item.type, params, store),
  }))
}

export async function getChart(
  name: string,
  type: string,
  params: DashboardParams = {},
  store?: any,
): Promise<any> {
  return computeChartData(name, type, params, store)
}

export async function saveDashboardLayout(items: DashboardLayoutItem[]): Promise<boolean> {
  try {
    const cleanItems = items.map((item) => ({
      name: item.name,
      type: item.type,
      layout: { ...item.layout },
    }))
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(cleanItems))
    return true
  } catch (e) {
    console.error('[Dashboard] Error saving layout:', e)
    return false
  }
}

export async function resetDashboardToDefault(
  params: DashboardParams = {},
  store?: any,
): Promise<DashboardLayoutItem[]> {
  try {
    localStorage.removeItem(DASHBOARD_STORAGE_KEY)
  } catch (e) {
    // ignore
  }
  return getDashboard(params, store)
}
