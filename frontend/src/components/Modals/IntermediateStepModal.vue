<template>
  <Dialog
    v-model="show"
    :title="resolvedOptions.title"
    :size="resolvedOptions.size || '2xl'"
    :actions="resolvedOptions.actions"
  >
    <template #default>
      <slot>
        <div class="flex flex-col gap-2 text-ink-gray-9 text-base">
          <div v-if="currentStep.message">{{ currentStep.message }}</div>
          <video
            v-if="currentStep.videoURL"
            class="w-full rounded"
            controls
            autoplay
            muted
          >
            <source :src="currentStep.videoURL" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </slot>
    </template>
    <template #actions>
      <slot name="actions" />
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog } from 'frappe-ui'
import { computed } from 'vue'

const props = defineProps({
  currentStep: {
    type: Object,
    default: () => ({
      title: 'Title',
      message: 'Message',
      videoURL: '',
      buttonLabel: 'Button Label',
      onClick: () => {},
    }),
  },
  dialogOptions: {
    type: Object,
    default: () => ({}),
  },
})

const show = defineModel()

const resolvedOptions = computed(() => {
  if (props.dialogOptions && Object.keys(props.dialogOptions).length) {
    return props.dialogOptions
  }

  return {
    title: props.currentStep?.title || '',
    size: '2xl',
    actions: props.currentStep?.buttonLabel
      ? [
          {
            label: props.currentStep.buttonLabel,
            variant: 'solid',
            onClick: props.currentStep.onClick,
          },
        ]
      : [],
  }
})
</script>
