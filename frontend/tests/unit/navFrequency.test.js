import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_STAFF_COUNTS,
  DEFAULT_CLIENT_COUNTS,
  STAFF_STORAGE_KEY,
  getStoredCounts,
  incrementClickCount,
  rankNavItems,
  rankClientNavItems,
} from '@/utils/navFrequency'

describe('navFrequency utility', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getStoredCounts', () => {
    it('returns default counts when storage is empty', () => {
      const counts = getStoredCounts(STAFF_STORAGE_KEY, DEFAULT_STAFF_COUNTS)
      expect(counts).toEqual(DEFAULT_STAFF_COUNTS)
      expect(counts.Leads).toBe(10)
    })

    it('merges stored counts over default counts', () => {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify({ Inventory: 99, Leads: 5 }))
      const counts = getStoredCounts(STAFF_STORAGE_KEY, DEFAULT_STAFF_COUNTS)
      expect(counts.Inventory).toBe(99)
      expect(counts.Leads).toBe(5)
      expect(counts.Deals).toBe(DEFAULT_STAFF_COUNTS.Deals)
    })

    it('recovers gracefully from corrupted JSON in localStorage', () => {
      localStorage.setItem(STAFF_STORAGE_KEY, 'not-valid-json{{{')
      const counts = getStoredCounts(STAFF_STORAGE_KEY, DEFAULT_STAFF_COUNTS)
      expect(counts).toEqual(DEFAULT_STAFF_COUNTS)
    })
  })

  describe('incrementClickCount', () => {
    it('returns a new immutable object with incremented count', () => {
      const original = { Leads: 10, Deals: 5 }
      const updated = incrementClickCount(original, 'Deals')

      expect(updated).not.toBe(original)
      expect(updated.Deals).toBe(6)
      expect(original.Deals).toBe(5)
    })

    it('initializes non-existent keys to 1', () => {
      const original = { Leads: 10 }
      const updated = incrementClickCount(original, 'Inventory')

      expect(updated.Inventory).toBe(1)
    })
  })

  describe('rankNavItems', () => {
    const candidates = [
      { key: 'Leads', label: 'Leads' },
      { key: 'Deals', label: 'Deals' },
      { key: 'Clients', label: 'Clients' },
      { key: 'Invoices', label: 'Invoices' },
      { key: 'Inventory', label: 'Inventory' },
      { key: 'Tasks', label: 'Tasks' },
    ]

    it('returns top 4 items based on default counts', () => {
      const counts = {
        Leads: 10,
        Deals: 9,
        Clients: 8,
        Invoices: 7,
        Inventory: 4,
        Tasks: 3,
      }

      const topItems = rankNavItems(candidates, counts, 4)
      expect(topItems.map((i) => i.key)).toEqual(['Leads', 'Deals', 'Clients', 'Invoices'])
    })

    it('dynamically promotes Inventory into the top 4 when its click count exceeds Invoices', () => {
      const counts = {
        Leads: 10,
        Deals: 9,
        Clients: 8,
        Invoices: 7,
        Inventory: 25, // User heavily uses Inventory!
        Tasks: 3,
      }

      const topItems = rankNavItems(candidates, counts, 4)
      expect(topItems.map((i) => i.key)).toEqual(['Inventory', 'Leads', 'Deals', 'Clients'])
    })

    it('preserves stable order for items with equal scores', () => {
      const counts = {
        Leads: 5,
        Deals: 5,
        Clients: 5,
        Invoices: 5,
      }

      const topItems = rankNavItems(candidates, counts, 4)
      expect(topItems.map((i) => i.key)).toEqual(['Leads', 'Deals', 'Clients', 'Invoices'])
    })

    it('handles empty or invalid inputs gracefully', () => {
      expect(rankNavItems(null, {})).toEqual([])
      expect(rankNavItems(undefined, {})).toEqual([])
    })
  })

  describe('rankClientNavItems', () => {
    const clientCandidates = [
      { key: 'Dashboard', label: 'Dashboard' },
      { key: 'Purchases', label: 'Purchases' },
      { key: 'Calendar', label: 'Calendar' },
      { key: 'Promotions', label: 'Promotions' },
      { key: 'Account', label: 'Account' },
    ]

    it('ranks all client navigation items by frequency descending', () => {
      const counts = {
        Dashboard: 5,
        Purchases: 20,
        Calendar: 2,
        Promotions: 15,
        Account: 8,
      }

      const ranked = rankClientNavItems(clientCandidates, counts)
      expect(ranked.map((i) => i.key)).toEqual([
        'Purchases',
        'Promotions',
        'Account',
        'Dashboard',
        'Calendar',
      ])
    })
  })
})
