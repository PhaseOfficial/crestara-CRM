import { supabase } from '@/utils/supabase'

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * Validates file MIME type and byte size
 * @param {File} file
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected' }
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type?.toLowerCase())) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload PNG, JPG, WebP, or SVG.',
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds 5MB limit. Please upload a smaller image.',
    }
  }

  return { valid: true, error: null }
}

/**
 * Cleans a filename to prevent path traversal or invalid characters
 * @param {string} originalName
 * @returns {string}
 */
export function sanitizeFileName(originalName = 'image.png') {
  return originalName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Uploads an image file to Supabase Storage bucket 'crm-assets'
 * @param {File} file
 * @param {'company' | 'avatars' | 'clients' | 'inventory'} folder
 * @param {string} [customName]
 * @returns {Promise<{ success: boolean, url: string | null, path: string | null, error: string | null }>}
 */
export async function uploadCrmAsset(file, folder = 'avatars', customName = '') {
  const validation = validateImageFile(file)
  if (!validation.valid) {
    return { success: false, url: null, path: null, error: validation.error }
  }

  const cleanName = sanitizeFileName(customName || file.name)
  const filePath = `${folder}/${Date.now()}-${cleanName}`

  try {
    const { data, error } = await supabase.storage
      .from('crm-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.error('[Storage] Upload error:', error)
      return { success: false, url: null, path: null, error: error.message }
    }

    const { data: publicUrlData } = supabase.storage
      .from('crm-assets')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: filePath,
      error: null,
    }
  } catch (err) {
    console.error('[Storage] Unexpected upload error:', err)
    return {
      success: false,
      url: null,
      path: null,
      error: err.message || 'Image upload failed',
    }
  }
}

/**
 * Uploads a PDF document to Supabase Storage bucket 'crm-assets' in 'invoices' or 'receipts' folder
 * @param {Blob|File} pdfBlob - PDF Blob or File
 * @param {string} filename - Filename (e.g. INV-2026-1045.pdf)
 * @param {'invoices' | 'receipts'} [folder]
 * @returns {Promise<{ success: boolean, url: string | null, path: string | null, error: string | null }>}
 */
export async function uploadPdfAsset(pdfBlob, filename, folder = 'invoices') {
  if (!pdfBlob) return { success: false, url: null, path: null, error: 'No PDF data provided' }
  const cleanName = sanitizeFileName(filename || 'document.pdf')
  const filePath = `${folder}/${Date.now()}-${cleanName}`

  try {
    const { error } = await supabase.storage
      .from('crm-assets')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.warn('[Storage] PDF upload error:', error)
      return { success: false, url: null, path: null, error: error.message }
    }

    const { data: publicUrlData } = supabase.storage
      .from('crm-assets')
      .getPublicUrl(filePath)

    return {
      success: true,
      url: publicUrlData?.publicUrl || null,
      path: filePath,
      error: null,
    }
  } catch (err) {
    console.warn('[Storage] Unexpected PDF upload error:', err)
    return { success: false, url: null, path: null, error: err.message || 'PDF upload failed' }
  }
}

/**
 * Deletes an asset from Supabase Storage bucket 'crm-assets'
 * @param {string} path
 * @returns {Promise<{ success: boolean, error: string | null }>}
 */
export async function deleteCrmAsset(path) {
  if (!path) return { success: true, error: null }

  try {
    const { error } = await supabase.storage.from('crm-assets').remove([path])
    if (error) {
      console.warn('[Storage] Delete error:', error)
      return { success: false, error: error.message }
    }
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err.message }
  }
}
