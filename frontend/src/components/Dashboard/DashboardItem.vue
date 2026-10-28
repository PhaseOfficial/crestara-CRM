<template>
  <div class="h-full w-full">
    <!-- 1. MODERN SHADCN / TREMOR STYLE NUMBER CARD -->
    <div
      v-if="item.type === 'number_chart'"
      class="h-full w-full rounded-xl border border-outline-gray-1 bg-surface-base shadow-sm p-4 hover:border-outline-gray-3 hover:shadow transition-all flex flex-col justify-between overflow-hidden cursor-pointer"
    >
      <Tooltip :text="item.data?.tooltip ? __(item.data.tooltip) : ''" class="w-full h-full flex flex-col justify-between">
        <!-- Top Row: Title & Contextual Icon -->
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-ink-gray-6 dark:text-ink-gray-4 truncate">
            {{ item.data?.title || item.name }}
          </span>
          <div
            class="p-2 rounded-xl shrink-0 flex items-center justify-center"
            :class="getIconThemeClass(item.data?.theme)"
          >
            <component :is="getIconComponent(item.data?.icon)" class="size-4" />
          </div>
        </div>

        <!-- Middle Hero Metric -->
        <div class="my-auto py-1">
          <div class="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-ink-gray-9 leading-none truncate">
            {{ item.data?.formattedValue || item.data?.value || 0 }}
          </div>
        </div>

        <!-- Footer / Delta Badge -->
        <div class="flex items-center gap-2 pt-1 border-t border-outline-gray-1/40">
          <!-- Dynamic Delta Percentage -->
          <template v-if="item.data?.delta !== undefined">
            <span
              class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0"
              :class="
                item.data.delta >= 0
                  ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2'
                  : 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border-outline-red-2'
              "
            >
              <LucideTrendingUp v-if="item.data.delta >= 0" class="size-3" />
              <LucideTrendingDown v-else class="size-3" />
              {{ item.data.deltaPrefix }}{{ item.data.delta }}{{ item.data.deltaSuffix }}
            </span>
            <span class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 truncate">
              {{ item.data.subtitle || __('vs prior period') }}
            </span>
          </template>

          <!-- Status Badge Tag -->
          <template v-else-if="item.data?.badgeText">
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border shrink-0"
              :class="getBadgeClass(item.data.badgeType)"
            >
              {{ item.data.badgeText }}
            </span>
            <span v-if="item.data?.subtitle" class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 truncate">
              {{ item.data.subtitle }}
            </span>
          </template>

          <!-- Simple Subtitle Fallback -->
          <template v-else>
            <span class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 truncate">
              {{ item.data?.subtitle || __('Operational Metric') }}
            </span>
          </template>
        </div>
      </Tooltip>
    </div>

    <!-- 2. FUNNEL PIPELINE CHART -->
    <div
      v-else-if="item.type === 'funnel_chart'"
      class="h-full w-full rounded-xl border border-outline-gray-1 bg-surface-base shadow-sm p-4 overflow-hidden flex flex-col"
    >
      <div v-if="safeFunnelChartConfig?.title" class="text-xs font-semibold uppercase tracking-wider text-ink-gray-6 dark:text-ink-gray-4 mb-2">
        {{ __(safeFunnelChartConfig.title) }}
      </div>
      <div class="flex-1 w-full min-h-0">
        <FunnelChart v-if="safeFunnelChartConfig" :config="safeFunnelChartConfig" class="!h-full !w-full" />
      </div>
    </div>

    <!-- 3. SHADCN / TREMOR STYLE BAR LIST -->
    <div
      v-else-if="item.type === 'bar_list'"
      class="h-full w-full rounded-xl border border-outline-gray-1 bg-surface-base shadow-sm p-5 overflow-hidden flex flex-col justify-between"
    >
      <div class="flex items-center justify-between mb-3">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-6 dark:text-ink-gray-4">
          {{ __(item.data?.title || 'Performance Breakdown') }}
        </h4>
        <span class="text-xs text-ink-gray-5">{{ __('Ranked by Volume') }}</span>
      </div>

      <div class="space-y-3 flex-1 overflow-y-auto pr-1">
        <div
          v-for="bar in item.data?.items || []"
          :key="bar.label"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between text-xs font-medium">
            <span class="text-ink-gray-8 dark:text-ink-gray-2 truncate max-w-[65%]">{{ bar.label }}</span>
            <span class="font-mono font-bold text-ink-gray-9 dark:text-ink-gray-1">{{ bar.formattedValue }}</span>
          </div>
          <div class="w-full bg-surface-gray-2 dark:bg-surface-gray-3 rounded-full h-2 overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
              :style="{ width: `${bar.percentage}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 4. EFFICIENCY GAUGE / CIRCULAR METER -->
    <div
      v-else-if="item.type === 'gauge_chart'"
      class="h-full w-full rounded-xl border border-outline-gray-1 bg-surface-base shadow-sm p-5 overflow-hidden flex flex-col justify-between"
    >
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-6 dark:text-ink-gray-4">
          {{ __(item.data?.title || 'Target Efficiency') }}
        </h4>
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
          :class="item.data?.value >= item.data?.target ? 'bg-surface-green-2 text-ink-green-7 border-outline-green-2' : 'bg-surface-amber-2 text-ink-amber-7 border-outline-amber-2'"
        >
          {{ item.data?.status }}
        </span>
      </div>

      <!-- Circular SVG Meter -->
      <div class="relative flex items-center justify-center my-auto py-2">
        <svg class="size-28 -rotate-90" viewBox="0 0 36 36">
          <!-- Background Circle -->
          <path
            class="text-surface-gray-2 dark:text-surface-gray-3"
            stroke="currentColor"
            stroke-width="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <!-- Progress Stroke -->
          <path
            class="text-emerald-500 transition-all duration-700 ease-out"
            stroke="currentColor"
            stroke-width="3.2"
            stroke-linecap="round"
            fill="none"
            :stroke-dasharray="`${item.data?.value || 0}, 100`"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div class="absolute flex flex-col items-center justify-center">
          <span class="text-2xl font-bold font-mono text-ink-gray-9">{{ item.data?.value || 0 }}%</span>
          <span class="text-[10px] text-ink-gray-5 uppercase font-medium">Target: {{ item.data?.target }}%</span>
        </div>
      </div>

      <!-- Footer Telemetry -->
      <div class="grid grid-cols-2 gap-2 text-center pt-2 border-t border-outline-gray-1">
        <div>
          <span class="text-[10px] text-ink-gray-5 uppercase font-semibold block">{{ __('Collected') }}</span>
          <span class="font-mono text-xs font-bold text-ink-green-7 dark:text-ink-green-4">{{ item.data?.collectedAmount }}</span>
        </div>
        <div>
          <span class="text-[10px] text-ink-gray-5 uppercase font-semibold block">{{ __('Billed') }}</span>
          <span class="font-mono text-xs font-bold text-ink-gray-9">{{ item.data?.billedAmount }}</span>
        </div>
      </div>
    </div>

    <!-- 5. AXIS / LINE / BAR CHARTS -->
    <div
      v-else-if="item.type === 'axis_chart' || item.type === 'line_chart' || item.type === 'bar_chart'"
      class="h-full w-full rounded-xl border border-outline-gray-1 bg-surface-base shadow-sm p-3 overflow-hidden flex flex-col"
    >
      <AxisChart v-if="safeAxisChartConfig" :config="safeAxisChartConfig" class="!h-full !w-full" />
    </div>

    <!-- 6. DONUT CHART -->
    <div
      v-else-if="item.type === 'donut_chart'"
      class="h-full w-full rounded-xl border border-outline-gray-1 bg-surface-base shadow-sm p-3 overflow-hidden flex flex-col"
    >
      <DonutChart v-if="safeDonutChartConfig" :config="safeDonutChartConfig" class="!h-full !w-full" />
    </div>

    <!-- 7. SPACER -->
    <div
      v-else-if="item.type === 'spacer'"
      class="rounded-xl bg-surface-base h-full overflow-hidden text-ink-gray-5 flex items-center justify-center"
      :class="editing ? 'border border-dashed border-outline-gray-2' : ''"
    >
      {{ editing ? __('Spacer') : '' }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { AxisChart, DonutChart, FunnelChart, Tooltip } from 'frappe-ui'
import LucideTrendingUp from '~icons/lucide/trending-up'
import LucideTrendingDown from '~icons/lucide/trending-down'
import LucideClock from '~icons/lucide/clock'
import LucideAlertCircle from '~icons/lucide/alert-circle'
import LucideAlertTriangle from '~icons/lucide/alert-triangle'
import LucidePackage from '~icons/lucide/package'
import LucideReceipt from '~icons/lucide/receipt'
import LucidePercent from '~icons/lucide/percent'
import LucideUsers from '~icons/lucide/users'
import LucideBarChart3 from '~icons/lucide/bar-chart-3'

const props = defineProps({
  index: { type: Number, required: true },
  item: { type: Object, required: true },
  editing: { type: Boolean, default: false },
})

const safeAxisChartConfig = computed(() => {
  if (!props.item?.data) return null
  const d = props.item.data
  return {
    ...d,
    title: d.title || props.item.name || '',
    xAxis: {
      key: d.xAxis?.key || 'category',
      type: d.xAxis?.type || 'category',
      title: d.xAxis?.title || '',
      ...(d.xAxis || {}),
    },
    yAxis: {
      title: d.yAxis?.title || '',
      ...(d.yAxis || {}),
    },
    series: Array.isArray(d.series) ? d.series : [],
    data: Array.isArray(d.data) ? d.data : [],
  }
})

const safeDonutChartConfig = computed(() => {
  if (!props.item?.data) return null
  const d = props.item.data
  return {
    ...d,
    title: d.title || props.item.name || '',
    categoryColumn: d.categoryColumn || 'status',
    valueColumn: d.valueColumn || 'count',
    data: Array.isArray(d.data) ? d.data : [],
  }
})

const safeFunnelChartConfig = computed(() => {
  if (!props.item?.data) return null
  const d = props.item.data
  return {
    ...d,
    title: d.title || props.item.name || '',
    categoryColumn: d.categoryColumn || 'stage',
    valueColumn: d.valueColumn || 'count',
    data: Array.isArray(d.data) ? d.data : [],
  }
})

function getIconComponent(iconName) {
  switch (iconName) {
    case 'trending-up':
      return LucideTrendingUp
    case 'clock':
      return LucideClock
    case 'alert-circle':
      return LucideAlertCircle
    case 'alert-triangle':
      return LucideAlertTriangle
    case 'package':
      return LucidePackage
    case 'receipt':
      return LucideReceipt
    case 'percent':
      return LucidePercent
    case 'users':
      return LucideUsers
    default:
      return LucideBarChart3
  }
}

function getIconThemeClass(theme) {
  switch (theme) {
    case 'green':
      return 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4'
    case 'amber':
      return 'bg-surface-amber-2 text-ink-amber-7 dark:text-amber-300'
    case 'red':
      return 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4'
    case 'blue':
      return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3'
    case 'indigo':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
    case 'cyan':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300'
    case 'purple':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7'
  }
}

function getBadgeClass(type) {
  switch (type) {
    case 'green':
      return 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2'
    case 'amber':
      return 'bg-surface-amber-2 text-ink-amber-7 dark:text-amber-300 border-outline-amber-2'
    case 'red':
      return 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border-outline-red-2'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7 border-outline-gray-2'
  }
}
</script>
