import { describe, it, expect } from 'vitest'

/**
 * Calculates gross profit margin percentage
 */
export function calculateGrossMargin(unitPrice, costPrice) {
  const price = Number(unitPrice) || 0
  const cost = Number(costPrice) || 0
  if (price <= 0) return 0
  return Math.round(((price - cost) / price) * 100)
}

/**
 * Determines whether an inventory item has low stock
 */
export function isLowStock(item) {
  if (!item || !item.track_stock || item.type === 'Service') {
    return false
  }
  const threshold = Number(item.low_stock_threshold ?? 5)
  const stock = Number(item.quantity_in_stock ?? 0)
  return stock <= threshold
}

/**
 * Calculates updated stock quantity based on business settings and item properties
 */
export function processInvoiceStockDeduction(item, quantitySold, settings = {}) {
  // If auto deduction is disabled in business settings, return current stock unchanged
  if (!settings.auto_deduct_inventory) {
    return {
      updatedQuantity: item.quantity_in_stock,
      decremented: false,
      reason: 'Auto deduction disabled in business settings',
    }
  }

  // Services and non-tracked items never decrement stock
  if (item.type === 'Service' || !item.track_stock) {
    return {
      updatedQuantity: item.quantity_in_stock,
      decremented: false,
      reason: 'Services and non-tracked items do not decrement stock',
    }
  }

  const currentStock = Number(item.quantity_in_stock ?? 0)
  const qty = Number(quantitySold ?? 0)
  const newStock = currentStock - qty

  if (newStock < 0 && !settings.allow_negative_stock) {
    return {
      updatedQuantity: 0,
      decremented: true,
      clampedAtZero: true,
      reason: 'Stock deducted and clamped at zero (negative stock disallowed)',
    }
  }

  return {
    updatedQuantity: newStock,
    decremented: true,
    reason: 'Stock successfully decremented for physical product',
  }
}

describe('inventory logic and stock calculation utilities', () => {
  it('calculates correct gross margin percentage', () => {
    expect(calculateGrossMargin(100, 60)).toBe(40)
    expect(calculateGrossMargin(200, 50)).toBe(75)
    expect(calculateGrossMargin(0, 50)).toBe(0)
    expect(calculateGrossMargin(50, 50)).toBe(0)
  })

  it('correctly identifies low stock items for physical tracked products', () => {
    const productLow = {
      type: 'Product',
      track_stock: true,
      quantity_in_stock: 2,
      low_stock_threshold: 5,
    }
    const productOptimal = {
      type: 'Product',
      track_stock: true,
      quantity_in_stock: 20,
      low_stock_threshold: 5,
    }
    const service = {
      type: 'Service',
      track_stock: false,
      quantity_in_stock: 0,
      low_stock_threshold: 5,
    }

    expect(isLowStock(productLow)).toBe(true)
    expect(isLowStock(productOptimal)).toBe(false)
    expect(isLowStock(service)).toBe(false)
  })

  it('respects auto_deduct_inventory = false in business settings', () => {
    const product = {
      type: 'Product',
      track_stock: true,
      quantity_in_stock: 10,
    }
    const result = processInvoiceStockDeduction(product, 3, {
      auto_deduct_inventory: false,
    })
    expect(result.decremented).toBe(false)
    expect(result.updatedQuantity).toBe(10)
  })

  it('never decrements stock for services even when auto_deduct_inventory = true', () => {
    const service = {
      type: 'Service',
      track_stock: false,
      quantity_in_stock: 0,
    }
    const result = processInvoiceStockDeduction(service, 5, {
      auto_deduct_inventory: true,
    })
    expect(result.decremented).toBe(false)
    expect(result.updatedQuantity).toBe(0)
  })

  it('decrements stock for physical tracked products when auto_deduct_inventory = true', () => {
    const product = {
      type: 'Product',
      track_stock: true,
      quantity_in_stock: 14,
    }
    const result = processInvoiceStockDeduction(product, 4, {
      auto_deduct_inventory: true,
      allow_negative_stock: false,
    })
    expect(result.decremented).toBe(true)
    expect(result.updatedQuantity).toBe(10)
  })
})
