/**
 * Pure utility functions for navigation click frequency tracking and dynamic ranking.
 */

export const STAFF_STORAGE_KEY = 'crm_staff_nav_clicks'
export const CLIENT_STORAGE_KEY = 'crm_client_nav_clicks'

export const DEFAULT_STAFF_COUNTS = {
  Leads: 10,
  Deals: 9,
  Clients: 8,
  Invoices: 7,
  Tasks: 6,
  Contacts: 5,
  Inventory: 4,
  Transactions: 3,
  Reminders: 2,
  Notes: 2,
  Analytics: 1,
  'Call Logs': 1,
}

export const DEFAULT_CLIENT_COUNTS = {
  Dashboard: 10,
  Purchases: 8,
  Calendar: 6,
  Promotions: 4,
  Account: 2,
}

/**
 * Safely parse stored counts from localStorage or return default counts.
 */
export function getStoredCounts(storageKey, defaultCounts = {}) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...defaultCounts }
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { ...defaultCounts }
    const parsed = JSON.parse(raw)
    return { ...defaultCounts, ...parsed }
  } catch {
    return { ...defaultCounts }
  }
}

/**
 * Increment click count for a given item key, returning a new immutable counts object.
 */
export function incrementClickCount(currentCounts, key) {
  const counts = { ...currentCounts }
  const current = typeof counts[key] === 'number' ? counts[key] : 0
  counts[key] = current + 1
  return counts
}

/**
 * Rank staff navigation candidate items by click counts descending.
 * Selects topN items (defaults to 4).
 */
export function rankNavItems(candidateItems, counts = {}, topN = 4) {
  if (!Array.isArray(candidateItems)) return []

  // Create a shallow copy with current score
  const itemsWithScores = candidateItems.map((item, originalIndex) => {
    const score = typeof counts[item.key] === 'number' ? counts[item.key] : 0
    return { item, score, originalIndex }
  })

  // Sort descending by score; if tied, retain original index order
  itemsWithScores.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.originalIndex - b.originalIndex
  })

  const topItems = itemsWithScores.slice(0, topN).map((entry) => entry.item)
  return topItems
}

/**
 * Rank client portal navigation items by click counts descending.
 */
export function rankClientNavItems(candidateItems, counts = {}) {
  if (!Array.isArray(candidateItems)) return []

  const itemsWithScores = candidateItems.map((item, originalIndex) => {
    const score = typeof counts[item.key] === 'number' ? counts[item.key] : 0
    return { item, score, originalIndex }
  })

  itemsWithScores.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.originalIndex - b.originalIndex
  })

  return itemsWithScores.map((entry) => entry.item)
}
