<template>
  <div class="flex items-center gap-4">
    <!-- Visual Image / Dropzone Container -->
    <div
      class="group relative shrink-0 cursor-pointer transition-all duration-200 select-none"
      :class="[
        sizeClasses,
        shapeClasses,
        isDragOver ? 'ring-2 ring-blue-500 bg-surface-blue-2/30' : '',
        editable ? 'hover:shadow-md' : 'cursor-default',
      ]"
      @click="triggerFileInput"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <!-- Actual Image Rendered -->
      <img
        v-if="modelValue && !imageError"
        :src="modelValue"
        class="h-full w-full object-contain p-1"
        :class="shapeClasses"
        alt="Uploaded Media"
        @error="imageError = true"
      />

      <!-- Fallback Display (Initials or Generic Icon) -->
      <div
        v-else
        class="h-full w-full flex items-center justify-center bg-surface-gray-2 dark:bg-surface-gray-1 border border-outline-gray-2/60 text-ink-gray-7 dark:text-ink-gray-5 font-bold"
        :class="[shapeClasses, textSizeClass]"
      >
        <span v-if="fallbackInitials">{{ fallbackInitials }}</span>
        <span v-else-if="shape === 'circle'" class="lucide-user size-1/2 opacity-60" />
        <span v-else class="lucide-image size-1/2 opacity-60" />
      </div>

      <!-- Hover Overlay (Camera Action) -->
      <div
        v-if="editable && !uploading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-black/45 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        :class="shapeClasses"
      >
        <span class="lucide-camera size-4 mb-0.5" />
        <span class="text-[9px] font-semibold tracking-tight uppercase">{{ modelValue ? __('Change') : __('Upload') }}</span>
      </div>

      <!-- Uploading Spinner State -->
      <div
        v-if="uploading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white"
        :class="shapeClasses"
      >
        <span class="lucide-loader-2 size-5 animate-spin text-white mb-1" />
        <span class="text-[9px] font-semibold uppercase">{{ __('Uploading...') }}</span>
      </div>
    </div>

    <!-- Metadata Details & Actions -->
    <div v-if="label || displayHint || (editable && allowRemove && modelValue)" class="space-y-1.5 text-left">
      <div v-if="label" class="text-xs font-bold text-ink-gray-9 leading-tight">
        {{ label }}
      </div>
      <p v-if="displayHint" class="text-[11px] text-ink-gray-5 leading-normal">
        {{ displayHint }}
      </p>

      <div class="flex items-center gap-2 pt-0.5">
        <button
          v-if="editable"
          type="button"
          class="text-xs font-semibold text-ink-blue-7 dark:text-ink-blue-3 hover:underline inline-flex items-center gap-1"
          @click="triggerFileInput"
        >
          <span class="lucide-upload size-3.5" />
          {{ modelValue ? __('Replace') : __('Upload Photo') }}
        </button>

        <span v-if="editable && allowRemove && modelValue" class="text-ink-gray-4 text-xs">•</span>

        <button
          v-if="editable && allowRemove && modelValue"
          type="button"
          class="text-xs font-semibold text-ink-red-7 dark:text-ink-red-4 hover:underline inline-flex items-center gap-1"
          @click="removeImage"
        >
          <span class="lucide-trash-2 size-3.5" />
          {{ __('Remove') }}
        </button>
      </div>

      <p v-if="errorMessage" class="text-xs text-ink-red-7 font-medium pt-1">
        {{ errorMessage }}
      </p>
    </div>

    <!-- Hidden native file input -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
      @change="onFileChange"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { uploadCrmAsset } from '@/utils/storage'

const props = defineProps({
  modelValue: { type: String, default: '' },
  folder: { type: String, default: 'avatars' }, // 'company' | 'avatars' | 'clients'
  shape: { type: String, default: 'rounded' }, // 'circle' | 'rounded' | 'rect'
  size: { type: String, default: 'lg' }, // 'sm' | 'md' | 'lg' | 'xl' | 'rect'
  fallbackLabel: { type: String, default: '' },
  fallbackText: { type: String, default: '' },
  allowRemove: { type: Boolean, default: true },
  editable: { type: Boolean, default: true },
  label: { type: String, default: '' },
  hint: { type: String, default: 'PNG, JPG, WebP, or SVG (max 5MB)' },
  description: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'uploaded', 'removed', 'error', 'dataUri'])

const fileInputRef = ref(null)
const uploading = ref(false)
const isDragOver = ref(false)
const errorMessage = ref('')
const imageError = ref(false)

const displayHint = computed(() => props.description || props.hint)

const fallbackInitials = computed(() => {
  const text = props.fallbackText || props.fallbackLabel
  if (!text) return ''
  const words = text.trim().split(/\s+/)
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'size-9'
    case 'md':
      return 'size-12'
    case 'lg':
      return 'size-16'
    case 'xl':
      return 'size-24'
    case 'rect':
      return 'h-20 w-36'
    default:
      return 'size-16'
  }
})

const shapeClasses = computed(() => {
  if (props.shape === 'circle') return 'rounded-full overflow-hidden'
  if (props.shape === 'rect') return 'rounded-xl overflow-hidden'
  return 'rounded-xl overflow-hidden'
})

const textSizeClass = computed(() => {
  if (props.size === 'sm') return 'text-xs'
  if (props.size === 'md') return 'text-sm'
  if (props.size === 'lg') return 'text-lg'
  if (props.size === 'xl') return 'text-2xl'
  return 'text-base'
})

function triggerFileInput() {
  if (!props.editable || uploading.value) return
  errorMessage.value = ''
  fileInputRef.value?.click()
}

function onDragOver() {
  if (!props.editable) return
  isDragOver.value = true
}

function onDragLeave() {
  isDragOver.value = false
}

function onDrop(e) {
  if (!props.editable) return
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleUpload(file)
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) handleUpload(file)
  if (fileInputRef.value) fileInputRef.value.value = ''
}

async function handleUpload(file) {
  uploading.value = true
  errorMessage.value = ''
  imageError.value = false

  // Instantly read local file as Data URI for immediate caching and PDF rendering
  try {
    const reader = new FileReader()
    reader.onload = (evt) => {
      if (evt.target?.result) {
        emit('dataUri', evt.target.result)
      }
    }
    reader.readAsDataURL(file)
  } catch (readerErr) {
    // Non-fatal, uploadCrmAsset will provide remote URL
  }

  try {
    const result = await uploadCrmAsset(file, props.folder)
    if (!result.success) {
      errorMessage.value = result.error || 'Upload failed'
      emit('error', errorMessage.value)
      return
    }

    emit('update:modelValue', result.url)
    emit('uploaded', result.url)
  } catch (err) {
    errorMessage.value = err.message || 'Image upload error'
    emit('error', errorMessage.value)
  } finally {
    uploading.value = false
  }
}

function removeImage() {
  imageError.value = false
  errorMessage.value = ''
  emit('update:modelValue', '')
  emit('dataUri', '')
  emit('removed')
}
</script>
