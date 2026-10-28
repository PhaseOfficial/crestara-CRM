<template>
  <CreateDocumentModal
    v-if="showCreateDocumentModal"
    v-model="showCreateDocumentModal"
    :doctype="createDocumentDoctype"
    :data="createDocumentData"
    @callback="(data) => createDocumentCallback(data)"
  />
  <QuickEntryModal
    v-if="showQuickEntryModal"
    v-model="showQuickEntryModal"
    v-bind="quickEntryProps"
  />
  <ChangePasswordModal
    v-if="showChangePasswordModal"
    v-model="showChangePasswordModal"
  />
  <AboutModal v-model="showAboutModal" />
  <FieldLayoutDialogContainer />

  <!-- Global Command Palette & Search (Ctrl+K, /) -->
  <CommandPaletteModal
    v-if="showCommandPalette"
    v-model="showCommandPalette"
  />

  <!-- Global New Task Modal (T) -->
  <TaskModal
    v-if="showGlobalTaskModal"
    v-model="showGlobalTaskModal"
    :task="globalTaskData"
  />

  <!-- Global Help & Documentation Modal -->
  <CrmHelpModal
    v-if="showHelpModal"
    v-model="showHelpModal"
  />
</template>
<script setup>
import FieldLayoutDialogContainer from '@/components/Modals/FieldLayoutDialogContainer.vue'
import ChangePasswordModal from '@/components/Modals/ChangePasswordModal.vue'
import CreateDocumentModal from '@/components/Modals/CreateDocumentModal.vue'
import QuickEntryModal from '@/components/Modals/QuickEntryModal.vue'
import AboutModal from '@/components/Modals/AboutModal.vue'
import CommandPaletteModal from '@/components/Modals/CommandPaletteModal.vue'
import TaskModal from '@/components/Tasks/TaskModal.vue'
import CrmHelpModal from '@/components/Modals/CrmHelpModal.vue'
import { useGlobalShortcuts } from '@/composables/useGlobalShortcuts'
import {
  showCreateDocumentModal,
  createDocumentDoctype,
  createDocumentData,
  createDocumentCallback,
} from '@/composables/document'
import {
  showQuickEntryModal,
  quickEntryProps,
  showAboutModal,
  showChangePasswordModal,
  showCommandPalette,
  showGlobalTaskModal,
  globalTaskData,
  showHelpModal,
} from '@/composables/modals'

// Register application-wide shortcuts (Ctrl+K, /, T)
useGlobalShortcuts()
</script>
