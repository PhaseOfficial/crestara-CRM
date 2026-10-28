import { describe, it, expect, beforeEach } from 'vitest'
import {
  isDateInRange,
  getPriorPeriodRange,
  calcDelta,
  computeChartData,
  getDashboard,
  getChart,
  saveDashboardLayout,
  resetDashboardToDefault,
  DEFAULT_DASHBOARD_LAYOUT,
} from '@/utils/dashboardEndpoints'

describe('dashboardEndpoints Service', () => {
  const mockStore = {
    getCurrencySymbol: () => '$',
    invoices: [
      {
        id: 'inv-1',
        invoice_number: 'INV-2026-0001',
        client_name: 'Acme Corp',
        client_email: 'acme@example.com',
        status: 'Paid',
        issue_date: '2026-10-15',
        total_amount: 1000,
        amount_paid: 1000,
        balance_due: 0,
        items: [{ category: 'Cloud Hosting', amount: 1000 }],
      },
      {
        id: 'inv-2',
        invoice_number: 'INV-2026-0002',
        client_name: 'Stark Industries',
        client_email: 'stark@example.com',
        status: 'Overdue',
        issue_date: '2026-10-20',
        total_amount: 500,
        amount_paid: 100,
        balance_due: 400,
        items: [{ category: 'Hardware', amount: 500 }],
      },
      {
        id: 'inv-3',
        invoice_number: 'INV-2026-0003',
        client_name: 'Wayne Enterprises',
        client_email: 'wayne@example.com',
        status: 'Issued',
        issue_date: '2026-10-25',
        total_amount: 2500,
        amount_paid: 0,
        balance_due: 2500,
        items: [{ category: 'Cloud Hosting', amount: 2500 }],
      },
    ],
    transactions: [
      {
        id: 'tx-1',
        invoice_number: 'INV-2026-0001',
        client_name: 'Acme Corp',
        amount: 1000,
        payment_date: '2026-10-15',
        payment_method: 'Credit Card',
        status: 'Settled',
      },
      {
        id: 'tx-2',
        invoice_number: 'INV-2026-0002',
        client_name: 'Stark Industries',
        amount: 100,
        payment_date: '2026-10-20',
        payment_method: 'Bank Transfer',
        status: 'Settled',
      },
    ],
    inventory: [
      {
        id: 'p-1',
        name: 'Cloud Server',
        category: 'Cloud Hosting',
        unit_price: 200,
        quantity_in_stock: 10,
        track_stock: true,
        low_stock_threshold: 5,
      },
      {
        id: 'p-2',
        name: 'Ethernet Switch',
        category: 'Hardware',
        unit_price: 150,
        quantity_in_stock: 2,
        track_stock: true,
        low_stock_threshold: 5,
      },
    ],
  }

  beforeEach(() => {
    localStorage.clear()
  })

  describe('Date & Math Utilities', () => {
    it('isDateInRange correctly identifies dates within range', () => {
      expect(isDateInRange('2026-10-15', '2026-10-01', '2026-10-31')).toBe(true)
      expect(isDateInRange('2026-10-01', '2026-10-01', '2026-10-31')).toBe(true)
      expect(isDateInRange('2026-10-31', '2026-10-01', '2026-10-31')).toBe(true)
      expect(isDateInRange('2026-09-30', '2026-10-01', '2026-10-31')).toBe(false)
      expect(isDateInRange('2026-11-01', '2026-10-01', '2026-10-31')).toBe(false)
      expect(isDateInRange('2026-10-15', null, null)).toBe(true)
      // Handles Date objects safely
      expect(isDateInRange(new Date('2026-10-15T00:00:00Z'), '2026-10-01', '2026-10-31')).toBe(true)
      expect(isDateInRange(null, '2026-10-01', '2026-10-31')).toBe(false)
    })

    it('getPriorPeriodRange calculates preceding period of identical duration', () => {
      const prior = getPriorPeriodRange('2026-10-11', '2026-10-20')
      expect(prior).not.toBeNull()
      expect(prior?.priorTo).toBe('2026-10-10')
      expect(prior?.priorFrom).toBe('2026-10-01')
    })

    it('calcDelta computes percentage changes accurately', () => {
      expect(calcDelta(120, 100)).toEqual({ delta: 20, deltaPrefix: '+', deltaSuffix: '%' })
      expect(calcDelta(80, 100)).toEqual({ delta: -20, deltaPrefix: '', deltaSuffix: '%' })
      expect(calcDelta(100, 0)).toEqual({ delta: 100, deltaPrefix: '+', deltaSuffix: '%' })
      expect(calcDelta(0, 0)).toEqual({ delta: 0, deltaPrefix: '', deltaSuffix: '%' })
    })
  })

  describe('Number Charts Calculation', () => {
    it('computes total_revenue with formattedValue and icon theme', () => {
      const data = computeChartData(
        'total_revenue',
        'number_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.value).toBe(1100)
      expect(data.formattedValue).toBe('$1,100.00')
      expect(data.icon).toBe('trending-up')
      expect(data.theme).toBe('green')
    })

    it('computes outstanding_balance with badgeText', () => {
      const data = computeChartData(
        'outstanding_balance',
        'number_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.value).toBe(2900)
      expect(data.formattedValue).toBe('$2,900.00')
      expect(data.icon).toBe('clock')
      expect(data.theme).toBe('amber')
    })

    it('computes overdue_invoices with badgeText', () => {
      const data = computeChartData(
        'overdue_invoices',
        'number_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.value).toBe(400)
      expect(data.formattedValue).toBe('$400.00')
      expect(data.badgeText).toBe('1 past due')
      expect(data.theme).toBe('red')
    })

    it('computes inventory_valuation', () => {
      const data = computeChartData(
        'inventory_valuation',
        'number_chart',
        {},
        mockStore,
      )
      expect(data.value).toBe(2300)
      expect(data.formattedValue).toBe('$2,300.00')
      expect(data.icon).toBe('package')
    })

    it('computes collection_rate', () => {
      const data = computeChartData(
        'collection_rate',
        'number_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.value).toBe(28)
      expect(data.formattedValue).toBe('28%')
      expect(data.icon).toBe('percent')
    })

    it('computes low_stock_warnings', () => {
      const data = computeChartData(
        'low_stock_warnings',
        'number_chart',
        {},
        mockStore,
      )
      expect(data.value).toBe(1)
      expect(data.formattedValue).toBe('1 items')
    })
  })

  describe('New Chart Types (Funnel, BarList, Gauge, Stacked)', () => {
    it('generates invoice_lifecycle_funnel funnel chart', () => {
      const data = computeChartData(
        'invoice_lifecycle_funnel',
        'funnel_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.title).toBe('Invoice Conversion & Settlement Pipeline')
      expect(data.categoryColumn).toBe('stage')
      expect(data.valueColumn).toBe('count')
      expect(data.data).toHaveLength(4)
      expect(data.data[0].stage).toContain('Invoices Created')
      expect(data.data[3].stage).toContain('Settled in Full')
    })

    it('generates category_revenue_list bar_list with percentage fill', () => {
      const data = computeChartData(
        'category_revenue_list',
        'bar_list',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.title).toContain('Top Sales Categories')
      expect(data.items.length).toBeGreaterThan(0)
      expect(data.items[0]).toHaveProperty('label')
      expect(data.items[0]).toHaveProperty('percentage')
      expect(data.items[0]).toHaveProperty('formattedValue')
    })

    it('generates payment_methods_list bar_list', () => {
      const data = computeChartData(
        'payment_methods_list',
        'bar_list',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.title).toContain('Settlement by Payment Method')
      expect(data.items.length).toBeGreaterThan(0)
      const cc = data.items.find((i) => i.label === 'Credit Card')
      expect(cc?.value).toBe(1000)
    })

    it('generates collection_efficiency_gauge gauge_chart', () => {
      const data = computeChartData(
        'collection_efficiency_gauge',
        'gauge_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.title).toContain('Collection Target Efficiency')
      expect(data.value).toBe(28)
      expect(data.target).toBe(85)
      expect(data.status).toBe('Under Target')
    })

    it('generates monthly_status_stacked axis_chart', () => {
      const data = computeChartData(
        'monthly_status_stacked',
        'axis_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.title).toContain('Monthly Invoicing Composition')
      expect(data.stacked).toBe(true)
      expect(data.series).toHaveLength(3)
    })

    it('generates top_clients_ranking horizontal axis_chart', () => {
      const data = computeChartData(
        'top_clients_ranking',
        'axis_chart',
        { from_date: '2026-10-01', to_date: '2026-10-31' },
        mockStore,
      )
      expect(data.swapXY).toBe(true)
      expect(data.data[0].client).toBe('Wayne Enterprises')
    })

    it('generates line_chart options with valid yAxis configuration', () => {
      const lineTypes = [
        'revenue_velocity_line',
        'collections_line',
        'cumulative_revenue_line',
        'avg_invoice_line',
      ]

      lineTypes.forEach((name) => {
        const data = computeChartData(
          name,
          'line_chart',
          { from_date: '2026-10-01', to_date: '2026-10-31' },
          mockStore,
        )
        expect(data).toHaveProperty('title')
        expect(data).toHaveProperty('xAxis')
        expect(data).toHaveProperty('yAxis')
        expect(typeof data.yAxis).toBe('object')
        expect(data).toHaveProperty('series')
        expect(data.series[0].type).toBe('line')
      })
    })

    it('generates bar_chart options with valid yAxis configuration', () => {
      const barTypes = [
        'billed_vs_collected_bar',
        'monthly_collections',
        'monthly_status_stacked',
        'top_clients_ranking',
        'sales_by_category',
      ]

      barTypes.forEach((name) => {
        const data = computeChartData(
          name,
          'bar_chart',
          { from_date: '2026-10-01', to_date: '2026-10-31' },
          mockStore,
        )
        expect(data).toHaveProperty('title')
        expect(data).toHaveProperty('xAxis')
        expect(data).toHaveProperty('yAxis')
        expect(typeof data.yAxis).toBe('object')
        expect(data).toHaveProperty('series')
        expect(data.series[0].type).toBe('bar')
      })
    })
  })

  describe('Endpoint Orchestration & Persistence', () => {
    it('getDashboard returns default layout with new chart types', async () => {
      const items = await getDashboard({}, mockStore)
      expect(items).toHaveLength(DEFAULT_DASHBOARD_LAYOUT.length)
      expect(items.some((i) => i.type === 'funnel_chart')).toBe(true)
      expect(items.some((i) => i.type === 'bar_list')).toBe(true)
    })

    it('saveDashboardLayout saves clean items to localStorage', async () => {
      const testItems = [
        {
          name: 'total_revenue',
          type: 'number_chart',
          layout: { x: 0, y: 0, w: 5, h: 3, i: 'item-1' },
          data: { shouldBeRemoved: true },
        },
      ]
      const success = await saveDashboardLayout(testItems)
      expect(success).toBe(true)

      const saved = JSON.parse(localStorage.getItem('crestara_dashboard_layout') || '[]')
      expect(saved).toHaveLength(1)
      expect(saved[0].name).toBe('total_revenue')
      expect(saved[0].data).toBeUndefined()
    })

    it('resetDashboardToDefault clears localStorage and returns fresh defaults', async () => {
      localStorage.setItem('crestara_dashboard_layout', JSON.stringify([]))
      const items = await resetDashboardToDefault({}, mockStore)
      expect(localStorage.getItem('crestara_dashboard_layout')).toBeNull()
      expect(items).toHaveLength(DEFAULT_DASHBOARD_LAYOUT.length)
    })
  })
})
