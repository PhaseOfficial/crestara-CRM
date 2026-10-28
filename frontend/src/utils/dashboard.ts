import { dayjs } from 'frappe-ui'

export function getLastXDays(range: number = 30): string | null {
  const today = new Date()
  const lastXDate = new Date(today)
  lastXDate.setDate(today.getDate() - range)

  return `${dayjs(lastXDate).format('YYYY-MM-DD')},${dayjs(today).format(
    'YYYY-MM-DD',
  )}`
}

export function formatter(range: string | [string, string] | null | undefined): string {
  if (!range) return ''
  let from = ''
  let to = ''

  if (Array.isArray(range)) {
    from = range[0] || ''
    to = range[1] || ''
  } else if (typeof range === 'string') {
    if (range.includes(',')) {
      const parts = range.split(',')
      from = parts[0] || ''
      to = parts[1] || ''
    } else {
      from = range
    }
  }

  if (from && to) {
    return `${formatRange(from)} to ${formatRange(to)}`
  }
  return formatRange(from)
}

export function formatRange(date: string | null | undefined): string {
  if (!date) return ''
  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) return String(date)

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      dateObj.getFullYear() === new Date().getFullYear()
        ? undefined
        : 'numeric',
  })
}
