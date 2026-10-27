import { describe, it, expect } from 'vitest'
import {
  validateImageFile,
  sanitizeFileName,
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE_BYTES,
  uploadPdfAsset,
} from '@/utils/storage'

describe('storage utility functions', () => {
  it('sanitizes unsafe characters and spaces in filenames', () => {
    expect(sanitizeFileName('My Profile Photo (2026)!.PNG')).toBe(
      'my-profile-photo-2026-.png',
    )
    expect(sanitizeFileName('../../etc/passwd.jpg')).toBe('..-..-etc-passwd.jpg')
    expect(sanitizeFileName('clean-image.webp')).toBe('clean-image.webp')
  })

  it('validates supported image mime types', () => {
    ALLOWED_IMAGE_TYPES.forEach((type) => {
      const mockFile = { type, size: 1024 * 100 }
      expect(validateImageFile(mockFile).valid).toBe(true)
    })
  })

  it('rejects unsupported file formats', () => {
    const pdfFile = { type: 'application/pdf', size: 1024 }
    const exeFile = { type: 'application/x-msdownload', size: 1024 }
    const textFile = { type: 'text/plain', size: 1024 }

    expect(validateImageFile(pdfFile).valid).toBe(false)
    expect(validateImageFile(exeFile).valid).toBe(false)
    expect(validateImageFile(textFile).valid).toBe(false)
  })

  it('rejects files larger than 5MB', () => {
    const hugeFile = {
      type: 'image/png',
      size: MAX_FILE_SIZE_BYTES + 1024,
    }
    const result = validateImageFile(hugeFile)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('5MB limit')
  })

  it('accepts files within 5MB limit', () => {
    const validFile = {
      type: 'image/png',
      size: 2 * 1024 * 1024, // 2MB
    }
    expect(validateImageFile(validFile).valid).toBe(true)
  })

  it('constructs correct storage paths for inventory folder', () => {
    const folder = 'inventory'
    const clean = sanitizeFileName('Product 48-Port Switch.png')
    const path = `${folder}/${clean}`
    expect(path).toBe('inventory/product-48-port-switch.png')
  })

  it('uploadPdfAsset returns error when null blob is provided', async () => {
    const res = await uploadPdfAsset(null, 'invoice.pdf')
    expect(res.success).toBe(false)
    expect(res.error).toContain('No PDF')
  })
})
