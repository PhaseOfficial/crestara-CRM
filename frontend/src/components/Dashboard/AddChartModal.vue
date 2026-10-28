<template>
  <Dialog v-model:open="show" :title="__('Add Chart Widget')" @close="show = false">
    <template #default>
      <div class="flex flex-col gap-4">
        <!-- 1. Chart Type Selection -->
        <FormControl
          v-model="chartType"
          type="select"
          :label="__('Chart Widget Type')"
          :options="chartTypes"
        />

        <!-- 2. Sub-options based on type -->
        <FormControl
          v-if="chartType === 'number_chart'"
          v-model="numberChart"
          type="select"
          :label="__('Number Card (KPI Metric)')"
          :options="numberCharts"
        />

        <FormControl
          v-if="chartType === 'line_chart'"
          v-model="lineChart"
          type="select"
          :label="__('Line Graph Metric (Spline & Area)')"
          :options="lineCharts"
        />

        <FormControl
          v-if="chartType === 'bar_chart'"
          v-model="barChart"
          type="select"
          :label="__('Bar Chart Metric (Columns & Stacked)')"
          :options="barCharts"
        />

        <FormControl
          v-if="chartType === 'donut_chart'"
          v-model="donutChart"
          type="select"
          :label="__('Donut Chart (Distribution)')"
          :options="donutCharts"
        />

        <FormControl
          v-if="chartType === 'funnel_chart'"
          v-model="funnelChart"
          type="select"
          :label="__('Funnel Chart (Conversion Pipeline)')"
          :options="funnelCharts"
        />

        <FormControl
          v-if="chartType === 'bar_list'"
          v-model="barListChart"
          type="select"
          :label="__('Category Progress List (BarList)')"
          :options="barListCharts"
        />

        <FormControl
          v-if="chartType === 'gauge_chart'"
          v-model="gaugeChart"
          type="select"
          :label="__('Target Efficiency Gauge')"
          :options="gaugeCharts"
        />
      </div>
    </template>
    <template #actions>
      <div class="flex items-center justify-end gap-2">
        <Button variant="outline" :label="__('Cancel')" @click="show = false" />
        <Button variant="solid" :label="__('Add to Dashboard')" @click="addChart" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { getRandom } from '@/utils'
import { getChart } from '@/utils/dashboardEndpoints'
import { Dialog, FormControl, Button } from 'frappe-ui'
import { ref, reactive, inject } from 'vue'

const show = defineModel({
  type: Boolean,
  default: false,
})

const items = defineModel('items', {
  type: Array,
  default: () => [],
})

const fromDate = inject('fromDate', ref(''))
const toDate = inject('toDate', ref(''))
const filters = inject('filters', reactive({ period: '', user: null }))

const chartType = ref('number_chart')
const chartTypes = [
  { label: __('Number Card (KPI Metric)'), value: 'number_chart' },
  { label: __('Line Graph (Spline & Area Trend)'), value: 'line_chart' },
  { label: __('Bar Chart (Columns, Grouped & Stacked)'), value: 'bar_chart' },
  { label: __('Donut Chart (Distribution)'), value: 'donut_chart' },
  { label: __('Funnel Chart (Conversion Pipeline)'), value: 'funnel_chart' },
  { label: __('Category Progress List (BarList)'), value: 'bar_list' },
  { label: __('Target / Efficiency Gauge'), value: 'gauge_chart' },
  { label: __('Grid Spacer'), value: 'spacer' },
]

const numberChart = ref('total_revenue')
const numberCharts = [
  { label: __('Total Revenue (Collected Cash)'), value: 'total_revenue' },
  { label: __('Outstanding Receivables'), value: 'outstanding_balance' },
  { label: __('Overdue Accounts'), value: 'overdue_invoices' },
  { label: __('Gross Invoiced Volume'), value: 'total_invoiced' },
  { label: __('Collection Efficiency (%)'), value: 'collection_rate' },
  { label: __('Inventory Valuation'), value: 'inventory_valuation' },
  { label: __('Stock Reorder Alerts'), value: 'low_stock_warnings' },
  { label: __('Active Billed Clients'), value: 'active_clients' },
]

const lineChart = ref('revenue_velocity_line')
const lineCharts = [
  { label: __('Revenue vs Invoicing Velocity (Smooth Dual Spline)'), value: 'revenue_velocity_line' },
  { label: __('Cash Flow & Collections Timeline (Area Fill)'), value: 'collections_line' },
  { label: __('Cumulative Revenue Running Growth Curve'), value: 'cumulative_revenue_line' },
  { label: __('Average Invoice Deal Size Trend'), value: 'avg_invoice_line' },
]

const barChart = ref('billed_vs_collected_bar')
const barCharts = [
  { label: __('Billed vs Collected Comparison (Grouped Bar)'), value: 'billed_vs_collected_bar' },
  { label: __('Monthly Cash Inflow (Column Bar)'), value: 'monthly_collections' },
  { label: __('Monthly Invoicing Composition (Stacked Bar)'), value: 'monthly_status_stacked' },
  { label: __('Top 5 Clients by Invoiced Volume (Horizontal Bar)'), value: 'top_clients_ranking' },
  { label: __('Sales by Product / Service Category'), value: 'sales_by_category' },
]

const axisChart = ref('revenue_velocity_line')
const axisCharts = [
  { label: __('Revenue & Invoicing Trend (Spline Area)'), value: 'revenue_velocity_line' },
  { label: __('Monthly Cash Inflow (Bar)'), value: 'monthly_collections' },
  { label: __('Monthly Invoicing Composition (Stacked)'), value: 'monthly_status_stacked' },
  { label: __('Top 5 Clients by Volume (Horizontal)'), value: 'top_clients_ranking' },
  { label: __('Sales by Product Category'), value: 'sales_by_category' },
]

const donutChart = ref('invoices_by_status')
const donutCharts = [
  { label: __('Invoices by Status (Paid, Issued, Overdue)'), value: 'invoices_by_status' },
  { label: __('Revenue by Top Customers'), value: 'revenue_by_customer' },
  { label: __('Inventory Stock Health'), value: 'inventory_stock_status' },
]

const funnelChart = ref('invoice_lifecycle_funnel')
const funnelCharts = [
  { label: __('Invoice Conversion & Settlement Pipeline'), value: 'invoice_lifecycle_funnel' },
]

const barListChart = ref('category_revenue_list')
const barListCharts = [
  { label: __('Top Sales Categories (BarList)'), value: 'category_revenue_list' },
  { label: __('Settlement by Payment Method (BarList)'), value: 'payment_methods_list' },
]

const gaugeChart = ref('collection_efficiency_gauge')
const gaugeCharts = [
  { label: __('Collection Target Efficiency Meter'), value: 'collection_efficiency_gauge' },
]

async function addChart() {
  show.value = false

  if (chartType.value === 'spacer') {
    items.value.push({
      name: 'spacer',
      type: 'spacer',
      layout: { x: 0, y: 0, w: 4, h: 2, i: 'spacer_' + getRandom(4) },
    })
    return
  }

  let name = ''
  let width = 5
  let height = 3

  switch (chartType.value) {
    case 'number_chart':
      name = numberChart.value
      width = 5
      height = 3
      break
    case 'line_chart':
      name = lineChart.value
      width = 10
      height = 7
      break
    case 'bar_chart':
      name = barChart.value
      width = 10
      height = 7
      break
    case 'axis_chart':
      name = axisChart.value
      width = 10
      height = 7
      break
    case 'donut_chart':
      name = donutChart.value
      width = 8
      height = 7
      break
    case 'funnel_chart':
      name = funnelChart.value
      width = 10
      height = 7
      break
    case 'bar_list':
      name = barListChart.value
      width = 10
      height = 7
      break
    case 'gauge_chart':
      name = gaugeChart.value
      width = 6
      height = 7
      break
  }

  const chartData = await getChart(name, chartType.value, {
    from_date: fromDate.value,
    to_date: toDate.value,
    user: filters.user,
  })

  items.value.push({
    name,
    type: chartType.value,
    layout: {
      x: 0,
      y: 0,
      w: width,
      h: height,
      i: `${name}_${getRandom(4)}`,
    },
    data: chartData,
  })
}
</script>
