<template>
  <div class="flex flex-col h-full overflow-hidden print:bg-white print:overflow-visible">
    <!-- Header (Hidden when printing) -->
    <LayoutHeader class="print:hidden">
      <template #left-header>
        <div class="flex items-center gap-3">
          <router-link to="/invoices" class="p-1.5 rounded-md hover:bg-surface-gray-2 text-ink-gray-6 dark:text-ink-gray-4 hover:text-ink-gray-9 transition-colors">
            <span class="lucide-arrow-left size-5" />
          </router-link>
          <div class="flex items-center gap-2.5">
            <h1 class="text-lg font-bold text-ink-gray-9">
              {{ isNew ? __('New Invoice') : invoice.invoice_number }}
            </h1>
            <span
              v-if="!isNew"
              class="text-xs px-2.5 py-0.5 rounded-full font-semibold border shrink-0"
              :class="getStatusClass(invoice.status)"
            >
              {{ invoice.status }}
            </span>
            <!-- Live Countdown Badge in Top Bar -->
            <span
              v-if="!isNew && headerCountdownBadge"
              class="text-xs px-2.5 py-0.5 rounded-full font-semibold border shrink-0 inline-flex items-center gap-1.5 shadow-2xs"
              :class="headerCountdownBadge.classes"
            >
              <span :class="headerCountdownBadge.icon" class="size-3" />
              <span>{{ headerCountdownBadge.label }}</span>
            </span>
          </div>
        </div>
      </template>

      <template #right-header>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <!-- 1-Click Mark as Paid -->
          <Button
            v-if="!isNew && invoice.balance_due > 0 && invoice.status !== 'Cancelled'"
            variant="solid"
            theme="green"
            icon="check-check"
            :tooltip="__('Mark as Paid in Full')"
            @click="handleMarkAsPaid"
          />

          <!-- Record Payment (Partial / Detailed) -->
          <Button
            v-if="!isNew && invoice.balance_due > 0 && invoice.status !== 'Cancelled'"
            variant="outline"
            icon="credit-card"
            :tooltip="__('Record Payment')"
            @click="showPaymentModal = true"
          />

          <!-- View Receipt when settled -->
          <Button
            v-if="!isNew && (invoice.status === 'Paid' || invoice.balance_due <= 0) && invoice.payments && invoice.payments.length > 0"
            variant="solid"
            theme="green"
            icon="file-text"
            :tooltip="__('View Official Commercial Receipt')"
            @click="openReceiptModal(invoice.payments[0])"
          />

          <!-- Preview & Print -->
          <Button
            v-if="!isNew"
            variant="outline"
            icon="printer"
            :tooltip="__('Preview & Print Document')"
            @click="showPreviewModal = true"
          />

          <!-- Send to WhatsApp -->
          <Button
            v-if="!isNew"
            variant="outline"
            :tooltip="invoice.status === 'Paid' ? __('Send Official Receipt to WhatsApp') : __('Send Invoice PDF to WhatsApp')"
            @click="openWhatsAppModal"
          >
            <template #icon>
              <WhatsAppIcon class="size-4 text-emerald-600 dark:text-emerald-400" />
            </template>
          </Button>

          <!-- Email Invoice / Receipt -->
          <Button
            v-if="!isNew"
            variant="outline"
            icon="mail"
            :tooltip="invoice.status === 'Paid' ? __('Email Official Receipt') : __('Email Invoice to Client')"
            @click="openInvoiceEmailModal"
          />

          <!-- Send Payment Reminder -->
          <Button
            v-if="!isNew && invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && Number(invoice.balance_due) > 0"
            variant="outline"
            icon="bell"
            :tooltip="__('Send Payment Reminder to Client')"
            @click="showReminderModal = true"
          />

          <!-- Cancel Invoice -->
          <Button
            v-if="!isNew && invoice.status !== 'Cancelled' && invoice.status !== 'Paid'"
            variant="outline"
            theme="red"
            icon="x-circle"
            :tooltip="__('Cancel Invoice')"
            @click="cancelCurrentInvoice"
          />

          <!-- Save Changes / Create & Issue -->
          <Button
            variant="solid"
            icon="save"
            :tooltip="isNew ? __('Create & Issue Invoice') : __('Save Invoice Changes')"
            :loading="saving"
            @click="saveInvoice"
          />
        </div>
      </template>
    </LayoutHeader>

    <!-- Invoice Sheet Canvas -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 md:pb-8 invoice-sheet-container print:p-0 print:overflow-visible">
      <div class="max-w-4xl mx-auto bg-surface-base rounded-2xl border border-outline-gray-1 p-6 sm:p-8 shadow-sm space-y-8 print:border-none print:shadow-none print:p-0">
        <!-- Top Row: Business Branding & Invoice Metadata -->
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-outline-gray-1 pb-6">
          <div>
            <div class="flex items-center gap-3">
              <img
                v-if="business.settings.logo_url"
                :src="business.settings.logo_url"
                alt="Logo"
                class="h-12 w-auto max-w-[200px] object-contain rounded"
              />
              <div v-else class="flex items-center gap-2">
                <span class="lucide-building-2 size-7 text-ink-blue-7 dark:text-ink-blue-3" />
                <span class="text-xl font-bold text-ink-gray-9">{{ business.settings.business_name || 'Crestara CRM' }}</span>
              </div>
            </div>
            <p v-if="business.settings.legal_name" class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 mt-1.5">{{ business.settings.legal_name }}</p>
            <p v-if="business.settings.business_address" class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1 whitespace-pre-line">{{ business.settings.business_address }}</p>
            <div class="text-xs text-ink-gray-6 dark:text-ink-gray-4 mt-1 space-x-3">
              <span v-if="business.settings.tax_id">{{ __('Tax ID:') }} {{ business.settings.tax_id }}</span>
              <span v-if="business.settings.business_phone">{{ business.settings.business_phone }}</span>
            </div>
          </div>

          <div class="space-y-3 sm:text-right min-w-[260px]">
            <div class="flex items-center sm:justify-end gap-2.5">
              <h2 class="text-2xl font-bold text-ink-gray-9 tracking-tight font-mono">
                {{ isNew ? __('DRAFT INVOICE') : invoice.invoice_number }}
              </h2>
              <div
                v-if="!isNew && (invoice.status === 'Paid' || invoice.balance_due <= 0)"
                class="paid-in-full-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 font-bold text-xs uppercase tracking-wider shadow-sm"
              >
                <span class="lucide-check-circle-2 size-3.5 text-emerald-600" />
                <span>{{ __('PAID IN FULL') }}</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <span class="text-ink-gray-6 dark:text-ink-gray-4 sm:text-right font-medium self-center">{{ __('Issue Date:') }}</span>
              <input
                v-model="invoice.issue_date"
                type="date"
                class="bg-surface-gray-1 dark:bg-surface-gray-2 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none print:border-none"
              />
              <span class="text-ink-gray-6 dark:text-ink-gray-4 sm:text-right font-medium self-center">{{ __('Due Date:') }}</span>
              <input
                v-model="invoice.due_date"
                type="date"
                class="bg-surface-gray-1 dark:bg-surface-gray-2 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none print:border-none"
              />
              <span class="text-ink-gray-6 dark:text-ink-gray-4 sm:text-right font-medium self-center">{{ __('Terms:') }}</span>
              <select
                v-model="invoice.payment_terms"
                class="bg-surface-gray-1 dark:bg-surface-gray-2 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none print:border-none"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
              <span class="text-ink-gray-6 dark:text-ink-gray-4 sm:text-right font-medium self-center">{{ __('Currency:') }}</span>
              <select
                v-model="invoice.currency"
                class="bg-surface-base dark:bg-surface-gray-2 font-bold text-xs text-ink-gray-9 border border-outline-gray-2 rounded px-2 py-1 focus:outline-none ring-1 ring-blue-500/20 print:border-none"
                @change="recalculateTotals"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (CA$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="ZAR">ZAR (R)</option>
                <option value="ZWG">ZWG (ZiG)</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Bill To Section & Inventory Injector -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-surface-gray-1 dark:bg-surface-gray-2/40 p-5 rounded-xl border border-outline-gray-1 print:bg-transparent print:border-none print:p-0">
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Billed To Client') }}</h3>
              <!-- Client Picker Selector (Hidden on print) -->
              <span v-if="isNew && availableClients.length" class="text-[11px] text-ink-blue-7 dark:text-ink-blue-3 print:hidden">
                {{ __('Auto-fill from Clients') }}
              </span>
            </div>

            <!-- Searchable Client Combobox / Dropdown (Hidden on print) -->
            <div v-if="isNew" ref="clientDropdownRef" class="relative mb-3 print:hidden">
              <!-- Selected Client Chip / Dropdown Trigger Button -->
              <div
                v-if="selectedClientObj"
                class="flex items-center justify-between p-2.5 rounded-lg border border-outline-blue-2 bg-surface-blue-2/30 dark:bg-blue-950/20 text-xs text-ink-gray-9 transition-colors"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="size-7 rounded-md bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-[11px] shrink-0 overflow-hidden">
                    <img
                      v-if="selectedClientObj.logo_url"
                      :src="selectedClientObj.logo_url"
                      :alt="selectedClientObj.company_name"
                      class="size-full object-cover"
                    />
                    <span v-else>
                      {{ (selectedClientObj.company_name || 'C').substring(0, 2).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-ink-gray-9 truncate flex items-center gap-1.5">
                      <span>{{ selectedClientObj.company_name }}</span>
                      <span class="px-1.5 py-0.2 rounded text-[10px] bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 font-semibold">
                        {{ __('Selected') }}
                      </span>
                    </div>
                    <div class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 truncate">
                      {{ selectedClientObj.billing_email || selectedClientObj.primary_email || __('No email') }}
                      <span v-if="selectedClientObj.default_currency"> • {{ selectedClientObj.default_currency }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    class="px-2 py-1 rounded text-[11px] font-semibold text-ink-blue-7 dark:text-ink-blue-3 hover:bg-surface-blue-2 transition-colors"
                    @click="toggleClientDropdown"
                  >
                    {{ __('Change') }}
                  </button>
                  <button
                    type="button"
                    class="p-1 rounded text-ink-gray-5 dark:text-ink-gray-4 hover:text-ink-red-7 dark:hover:text-ink-red-4 hover:bg-surface-red-2 transition-colors"
                    :title="__('Clear selected client')"
                    @click="clearSelectedClient"
                  >
                    <span class="lucide-x size-3.5" />
                  </button>
                </div>
              </div>

              <!-- Default Unselected Trigger Button -->
              <button
                v-else
                type="button"
                class="w-full flex items-center justify-between bg-surface-base border border-outline-gray-2 rounded-lg px-3 py-2 text-xs text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9 hover:border-outline-gray-3 transition-colors shadow-xs text-left"
                @click="toggleClientDropdown"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="lucide-search size-3.5 text-ink-gray-5 dark:text-ink-gray-4 shrink-0" />
                  <span class="truncate">{{ __('Select client') }}</span>
                </div>
                <span
                  class="lucide-chevron-down size-3.5 text-ink-gray-5 dark:text-ink-gray-4 transition-transform duration-150"
                  :class="clientDropdownOpen ? 'rotate-180' : ''"
                />
              </button>

              <!-- Floating Dropdown Panel with Search Bar & Client List -->
              <transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div
                  v-if="clientDropdownOpen"
                  class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-base border border-outline-gray-2 rounded-xl shadow-lg overflow-hidden flex flex-col max-h-72"
                >
                  <!-- Search Bar Header -->
                  <div class="p-2 border-b border-outline-gray-1 bg-surface-gray-1/50 dark:bg-surface-gray-2/50">
                    <div class="relative flex items-center">
                      <span class="lucide-search size-3.5 text-ink-gray-5 dark:text-ink-gray-4 absolute left-2.5 pointer-events-none" />
                      <input
                        ref="clientSearchInputRef"
                        v-model="clientSearchQuery"
                        type="text"
                        :placeholder="__('Search client...')"
                        class="w-full bg-surface-base border border-outline-gray-2 rounded-md pl-8 pr-7 py-1.5 text-xs text-ink-gray-9 placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        v-if="clientSearchQuery"
                        type="button"
                        class="absolute right-2 text-ink-gray-4 dark:text-ink-gray-5 hover:text-ink-gray-7 dark:hover:text-ink-gray-2 p-0.5"
                        @click="clientSearchQuery = ''"
                      >
                        <span class="lucide-x size-3" />
                      </button>
                    </div>
                  </div>

                  <!-- Scrollable Client List -->
                  <div class="overflow-y-auto divide-y divide-outline-gray-1/60 p-1 flex-1">
                    <div
                      v-for="c in filteredClients"
                      :key="c.id"
                      class="flex items-center justify-between p-2 rounded-lg hover:bg-surface-gray-1 dark:hover:bg-surface-gray-2/70 cursor-pointer transition-colors"
                      :class="selectedClientId === c.id ? 'bg-surface-blue-2/40' : ''"
                      @click="selectClient(c)"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div class="size-8 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-xs shrink-0 overflow-hidden">
                          <img
                            v-if="c.logo_url"
                            :src="c.logo_url"
                            :alt="c.company_name"
                            class="size-full object-cover"
                          />
                          <span v-else>
                            {{ (c.company_name || 'C').substring(0, 2).toUpperCase() }}
                          </span>
                        </div>
                        <div class="min-w-0">
                          <div class="font-semibold text-xs text-ink-gray-9 truncate">
                            {{ c.company_name }}
                          </div>
                          <div class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 truncate">
                            {{ c.first_name ? `${c.first_name} ${c.last_name || ''} • ` : '' }}{{ c.billing_email || c.primary_email || __('No email') }}
                            <span v-if="c.tin || c.tax_id"> • TIN: {{ c.tin || c.tax_id }}</span>
                          </div>
                        </div>
                      </div>

                      <div class="flex items-center gap-2 shrink-0 ml-2">
                        <span class="text-[10px] font-semibold text-ink-gray-6 dark:text-ink-gray-4">
                          {{ c.default_currency || 'USD' }}
                        </span>
                        <span
                          v-if="selectedClientId === c.id"
                          class="lucide-check size-4 text-ink-blue-7 dark:text-ink-blue-3"
                        />
                      </div>
                    </div>

                    <!-- Empty Search State -->
                    <div v-if="!filteredClients.length" class="p-6 text-center text-xs text-ink-gray-5 dark:text-ink-gray-4 space-y-1">
                      <div class="font-semibold text-ink-gray-8 dark:text-ink-gray-2">{{ __('No registered clients found') }}</div>
                      <p class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4">
                        {{ clientSearchQuery ? __('No client matches "{0}".', [clientSearchQuery]) : __('No clients registered yet in the system.') }}
                      </p>
                    </div>
                  </div>

                  <!-- Footer: Enter Manually -->
                  <div class="p-2 border-t border-outline-gray-1 bg-surface-gray-1/30 dark:bg-surface-gray-2/30 flex items-center justify-between text-xs">
                    <span class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4">{{ __('Total: {0} client(s)', [availableClients.length]) }}</span>
                    <button
                      type="button"
                      class="text-[11px] font-semibold text-ink-blue-7 dark:text-ink-blue-3 hover:underline"
                      @click="clearSelectedClient"
                    >
                      {{ __('Enter details manually below') }}
                    </button>
                  </div>
                </div>
              </transition>
            </div>

            <div class="space-y-2">
              <div class="relative flex items-center">
                <span class="lucide-building size-3.5 text-ink-gray-5 dark:text-ink-gray-4 absolute left-2.5 pointer-events-none print:hidden" />
                <input
                  v-model="invoice.client_name"
                  type="text"
                  :placeholder="__('Client or Company Name')"
                  class="w-full bg-surface-base dark:bg-surface-gray-1 rounded-md pl-8 pr-3 py-1.5 text-sm border border-outline-gray-2 text-ink-gray-9 font-semibold placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-outline-gray-3 transition-colors print:border-none print:p-0 print:bg-transparent"
                  required
                />
              </div>

              <div class="relative flex items-center">
                <span class="lucide-user size-3.5 text-ink-gray-5 dark:text-ink-gray-4 absolute left-2.5 pointer-events-none print:hidden" />
                <input
                  v-model="invoice.contact_name"
                  type="text"
                  :placeholder="__('Primary Contact Person')"
                  class="w-full bg-surface-base dark:bg-surface-gray-1 rounded-md pl-8 pr-3 py-1.5 text-xs border border-outline-gray-2 text-ink-gray-9 placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-outline-gray-3 transition-colors print:border-none print:p-0 print:bg-transparent"
                />
              </div>

              <div class="relative flex items-center">
                <span class="lucide-mail size-3.5 text-ink-gray-5 dark:text-ink-gray-4 absolute left-2.5 pointer-events-none print:hidden" />
                <input
                  v-model="invoice.client_email"
                  type="email"
                  :placeholder="__('Billing Email Address')"
                  class="w-full bg-surface-base dark:bg-surface-gray-1 rounded-md pl-8 pr-3 py-1.5 text-xs border border-outline-gray-2 text-ink-gray-9 placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-outline-gray-3 transition-colors print:border-none print:p-0 print:bg-transparent"
                />
              </div>
            </div>
          </div>

          <!-- Quick Fill from Inventory (Hidden on print) -->
          <div class="print:hidden space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Select item') }}</label>
              <span class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 font-medium">
                {{ business.inventory.length }} {{ __('items') }}
              </span>
            </div>

            <!-- Searchable Inventory Combobox -->
            <div ref="inventoryDropdownRef" class="relative">
              <div class="relative flex items-center">
                <span class="lucide-search size-3.5 text-ink-gray-5 dark:text-ink-gray-4 absolute left-3 pointer-events-none" />
                <input
                  ref="inventorySearchInputRef"
                  v-model="inventorySearchQuery"
                  type="text"
                  :placeholder="__('Select item')"
                  class="w-full bg-surface-base border border-outline-gray-2 rounded-lg pl-9 pr-8 py-2 text-xs text-ink-gray-9 placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  @focus="inventoryDropdownOpen = true"
                  @click="inventoryDropdownOpen = true"
                />
                <button
                  v-if="inventorySearchQuery"
                  type="button"
                  class="absolute right-2.5 text-ink-gray-4 dark:text-ink-gray-5 hover:text-ink-gray-7 dark:hover:text-ink-gray-2 p-0.5"
                  @click="inventorySearchQuery = ''; inventoryDropdownOpen = true"
                >
                  <span class="lucide-x size-3.5" />
                </button>
              </div>

              <!-- Floating Dropdown Panel with Search Results -->
              <transition
                enter-active-class="transition duration-150 ease-out"
                enter-from-class="opacity-0 translate-y-1"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
              >
                <div
                  v-if="inventoryDropdownOpen"
                  class="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-base border border-outline-gray-2 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-72"
                >
                  <div class="overflow-y-auto divide-y divide-outline-gray-1/60 p-1 flex-1">
                    <div
                      v-for="prod in filteredInventoryItems"
                      :key="prod.id"
                      class="flex items-center justify-between p-2.5 rounded-lg hover:bg-surface-gray-1 dark:hover:bg-surface-gray-2/70 cursor-pointer transition-colors group"
                      @click="selectInventoryItem(prod)"
                    >
                      <!-- Item Image Thumbnail & Details -->
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="size-8 rounded-lg overflow-hidden shrink-0 border border-outline-gray-2 bg-surface-gray-2 flex items-center justify-center font-bold text-ink-gray-7 dark:text-ink-gray-4 text-xs">
                          <img
                            v-if="prod.image_url"
                            :src="prod.image_url"
                            :alt="prod.name"
                            class="size-full object-cover"
                          />
                          <span v-else>
                            {{ (prod.name || 'P').substring(0, 2).toUpperCase() }}
                          </span>
                        </div>
                        <div class="min-w-0">
                          <div class="font-semibold text-xs text-ink-gray-9 truncate flex items-center gap-1.5">
                            <span>{{ prod.name }}</span>
                            <span class="font-mono text-[10px] text-ink-gray-6 dark:text-ink-gray-4 font-normal">({{ prod.code }})</span>
                          </div>
                          <div class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 truncate flex items-center gap-1.5 mt-0.5">
                            <span class="px-1.5 py-0.2 rounded text-[10px] bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-4 font-medium">
                              {{ prod.category }}
                            </span>
                            <span
                              v-if="prod.type === 'Service' || !prod.track_stock"
                              class="px-1.5 py-0.2 rounded text-[10px] bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-3 font-medium"
                            >
                              {{ __('Service') }}
                            </span>
                            <span
                              v-else
                              class="px-1.5 py-0.2 rounded text-[10px] font-medium"
                              :class="prod.quantity_in_stock <= prod.low_stock_threshold ? 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4' : 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4'"
                            >
                              {{ prod.quantity_in_stock }} {{ __('in stock') }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Price & Add Action -->
                      <div class="flex items-center gap-2.5 shrink-0 ml-3">
                        <span class="font-mono font-bold text-xs text-ink-gray-9">
                          {{ currencySymbol }}{{ formatNum(prod.unit_price) }}
                        </span>
                        <span class="text-[11px] font-bold text-ink-blue-7 dark:text-ink-blue-3 group-hover:underline inline-flex items-center gap-0.5">
                          <span class="lucide-plus size-3" />
                          {{ __('Add') }}
                        </span>
                      </div>
                    </div>

                    <!-- Empty Results State -->
                    <div v-if="!filteredInventoryItems.length" class="py-8 text-center text-ink-gray-5 dark:text-ink-gray-4">
                      <span class="lucide-package-open size-6 text-ink-gray-5 dark:text-ink-gray-4 mx-auto block mb-1.5" />
                      <p class="text-xs font-semibold text-ink-gray-8 dark:text-ink-gray-2">{{ __('No matching products or services') }}</p>
                      <p class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 mt-0.5">{{ __('Try searching with another keyword or code.') }}</p>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>

        <!-- Line Items Table -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-ink-gray-9">{{ __('Line Items') }}</h3>
            <Button size="sm" variant="outline" :label="__('Add Custom Item')" iconLeft="plus" class="print:hidden" @click="addCustomItem" />
          </div>

          <!-- Desktop Table (>= 768px) -->
          <div class="hidden md:block border border-outline-gray-1 rounded-xl overflow-hidden print:border-outline-gray-2">
            <table class="w-full text-left text-sm border-collapse">
              <thead class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <tr>
                  <th class="py-3 px-4">{{ __('Item & Description') }}</th>
                  <th class="py-3 px-3 w-24 text-center">{{ __('Qty') }}</th>
                  <th class="py-3 px-3 w-36 text-right">{{ __('Unit Price') }} ({{ currencySymbol }})</th>
                  <th class="py-3 px-4 w-36 text-right">{{ __('Amount') }} ({{ currencySymbol }})</th>
                  <th class="py-3 px-2 w-10 print:hidden"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="(item, idx) in invoice.items" :key="item.id || idx">
                  <td class="py-3 px-4">
                    <div class="flex items-start gap-2.5">
                      <div v-if="item.image_url" class="size-8 rounded overflow-hidden shrink-0 border border-outline-gray-2 bg-surface-gray-2 mt-0.5 print:hidden">
                        <img :src="item.image_url" :alt="item.name" class="size-full object-cover" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <input
                          v-model="item.name"
                          type="text"
                          :placeholder="__('Item title')"
                          class="w-full bg-transparent font-medium text-ink-gray-9 placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none print:border-none"
                        />
                        <input
                          v-model="item.code"
                          type="text"
                          :placeholder="__('Item code/SKU')"
                          class="w-full bg-transparent text-xs text-ink-gray-6 dark:text-ink-gray-4 font-mono placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none mt-0.5 print:border-none"
                        />
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-3">
                    <input
                      v-model.number="item.quantity"
                      type="number"
                      min="1"
                      class="w-full text-center bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 rounded py-1 text-sm font-semibold text-ink-gray-9 focus:outline-none print:border-none print:bg-transparent"
                      @input="recalculateTotals"
                    />
                  </td>
                  <td class="py-3 px-3 text-right">
                    <input
                      v-model.number="item.unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full text-right bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 rounded py-1 px-2 text-sm font-mono font-semibold text-ink-gray-9 focus:outline-none print:border-none print:bg-transparent"
                      @input="recalculateTotals"
                    />
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-bold text-ink-gray-9">
                    {{ currencySymbol }}{{ formatNum(item.quantity * item.unit_price) }}
                  </td>
                  <td class="py-3 px-2 text-center print:hidden">
                    <button
                      v-if="invoice.items.length > 1"
                      class="p-1 rounded text-ink-gray-4 dark:text-ink-gray-5 hover:text-ink-red-7 dark:hover:text-ink-red-4 transition-colors"
                      @click="removeItem(idx)"
                    >
                      <span class="lucide-trash-2 size-4" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Line Items (< 768px, Hidden on print) -->
          <div class="md:hidden space-y-3 print:hidden">
            <div
              v-for="(item, idx) in invoice.items"
              :key="item.id || idx"
              class="bg-surface-gray-1 dark:bg-surface-gray-2/40 border border-outline-gray-1 rounded-xl p-3.5 space-y-2.5"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="flex items-start gap-2 flex-1 min-w-0">
                  <div v-if="item.image_url" class="size-8 rounded overflow-hidden shrink-0 border border-outline-gray-2 bg-surface-gray-2 mt-0.5">
                    <img :src="item.image_url" :alt="item.name" class="size-full object-cover" />
                  </div>
                  <div class="flex-1 min-w-0 space-y-1">
                    <input
                      v-model="item.name"
                      type="text"
                      :placeholder="__('Item title')"
                      class="w-full bg-surface-base rounded px-2 py-1 text-sm font-semibold text-ink-gray-9 border border-outline-gray-2 focus:outline-none"
                    />
                    <input
                      v-model="item.code"
                      type="text"
                      :placeholder="__('SKU / Code')"
                      class="w-full bg-surface-base rounded px-2 py-0.5 text-xs text-ink-gray-6 dark:text-ink-gray-4 font-mono border border-outline-gray-2 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  v-if="invoice.items.length > 1"
                  class="p-1.5 rounded text-ink-gray-4 dark:text-ink-gray-5 hover:text-ink-red-7 dark:hover:text-ink-red-4 shrink-0 transition-colors"
                  @click="removeItem(idx)"
                >
                  <span class="lucide-trash-2 size-4" />
                </button>
              </div>

              <div class="grid grid-cols-3 gap-2 items-center text-xs">
                <div>
                  <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-4 block">{{ __('Qty') }}</span>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    class="w-full bg-surface-base rounded px-2 py-1 text-sm font-semibold text-center border border-outline-gray-2 text-ink-gray-9 focus:outline-none mt-0.5"
                    @input="recalculateTotals"
                  />
                </div>
                <div>
                  <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-4 block">{{ __('Price ({0})', [currencySymbol]) }}</span>
                  <input
                    v-model.number="item.unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full bg-surface-base rounded px-2 py-1 text-sm font-mono font-semibold text-right border border-outline-gray-2 text-ink-gray-9 focus:outline-none mt-0.5"
                    @input="recalculateTotals"
                  />
                </div>
                <div class="text-right">
                  <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-4 block">{{ __('Total') }}</span>
                  <span class="font-mono font-bold text-sm block mt-1 text-ink-gray-9">
                    {{ currencySymbol }}{{ formatNum(item.quantity * item.unit_price) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Totals & Summary Calculation -->
        <div class="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-outline-gray-1">
          <!-- Notes & Payment Terms -->
          <div class="flex-1 space-y-3">
            <div class="space-y-1.5">
              <label class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6">{{ __('Notes / Instructions') }}</label>
              <textarea
                v-model="invoice.notes"
                rows="3"
                class="w-full bg-surface-gray-1 dark:bg-surface-gray-2/40 border border-outline-gray-2 rounded-lg p-3 text-xs text-ink-gray-9 placeholder:text-ink-gray-5 dark:placeholder:text-ink-gray-4 focus:outline-none print:border-none print:p-0"
                placeholder="Payment instructions or terms..."
              />
            </div>

            <!-- Bank Wire Settlement Information Box -->
            <div
              v-if="business.settings.bank_name || business.settings.bank_account_number"
              class="p-3 bg-surface-gray-1 dark:bg-surface-gray-2/40 rounded-lg border border-outline-gray-2 text-xs space-y-1"
            >
              <div class="font-bold text-ink-gray-9 flex items-center gap-1.5">
                <span class="lucide-landmark size-3.5 text-ink-gray-5 dark:text-ink-gray-4" />
                {{ __('Remittance Settlement Details') }}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-ink-gray-8 dark:text-ink-gray-3 pt-1">
                <div v-if="business.settings.bank_name">
                  <span class="font-medium text-ink-gray-6 dark:text-ink-gray-4">{{ __('Bank:') }}</span> {{ business.settings.bank_name }}
                </div>
                <div v-if="business.settings.bank_account_name">
                  <span class="font-medium text-ink-gray-6 dark:text-ink-gray-4">{{ __('Account Name:') }}</span> {{ business.settings.bank_account_name }}
                </div>
                <div v-if="business.settings.bank_account_number">
                  <span class="font-medium text-ink-gray-6 dark:text-ink-gray-4">{{ __('Account / IBAN:') }}</span> {{ business.settings.bank_account_number }}
                </div>
                <div v-if="business.settings.swift_bic">
                  <span class="font-medium text-ink-gray-6 dark:text-ink-gray-4">{{ __('SWIFT / BIC:') }}</span> {{ business.settings.swift_bic }}
                </div>
              </div>
              <div v-if="business.settings.payment_instructions" class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 pt-1 italic">
                {{ business.settings.payment_instructions }}
              </div>
            </div>
          </div>

          <!-- Financial Calculation Box -->
          <div class="w-full sm:w-80 space-y-2.5 text-sm">
            <div class="flex justify-between text-ink-gray-7 dark:text-ink-gray-6">
              <span>{{ __('Subtotal:') }}</span>
              <span class="font-mono font-medium text-ink-gray-9">{{ currencySymbol }}{{ formatNum(invoice.subtotal) }}</span>
            </div>

            <div class="flex items-center justify-between text-ink-gray-7 dark:text-ink-gray-6">
              <span class="flex items-center gap-1.5">
                {{ __('Discount (%):') }}
                <input
                  v-model.number="invoice.discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  class="w-16 bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 text-ink-gray-9 rounded px-1.5 py-0.5 text-xs text-right font-semibold print:border-none"
                  @input="recalculateTotals"
                />
              </span>
              <span class="font-mono text-ink-green-7 dark:text-ink-green-4 font-semibold">-{{ currencySymbol }}{{ formatNum(invoice.discount_amount) }}</span>
            </div>

            <div class="flex items-center justify-between text-ink-gray-7 dark:text-ink-gray-6">
              <span class="flex items-center gap-1.5">
                {{ __('Tax (%):') }}
                <input
                  v-model.number="invoice.tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  class="w-16 bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 text-ink-gray-9 rounded px-1.5 py-0.5 text-xs text-right font-semibold print:border-none"
                  @input="recalculateTotals"
                />
              </span>
              <span class="font-mono text-ink-gray-7 dark:text-ink-gray-4">+{{ currencySymbol }}{{ formatNum(invoice.tax_amount) }}</span>
            </div>

            <div class="border-t border-outline-gray-1 pt-2 flex justify-between font-bold text-lg text-ink-gray-9">
              <span>{{ __('Grand Total:') }}</span>
              <span class="font-mono">{{ currencySymbol }}{{ formatNum(invoice.total_amount) }}</span>
            </div>

            <div v-if="!isNew" class="flex justify-between font-medium">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Amount Paid:') }}</span>
              <span class="font-mono text-ink-green-7 dark:text-ink-green-4 font-semibold">{{ currencySymbol }}{{ formatNum(invoice.amount_paid) }}</span>
            </div>

            <div v-if="!isNew" class="flex justify-between font-bold text-base">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Balance Due:') }}</span>
              <span
                class="font-mono"
                :class="invoice.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-green-7 dark:text-ink-green-4'"
              >
                {{ currencySymbol }}{{ formatNum(invoice.balance_due) }}
              </span>
            </div>

            <div v-if="!isNew && (invoice.status === 'Paid' || invoice.balance_due <= 0)" class="pt-2 print:hidden">
              <div class="invoice-settled-box flex items-center justify-between px-3 py-2 rounded-lg border border-outline-green-2 bg-surface-green-2 text-xs font-semibold text-ink-green-7 dark:text-ink-green-4">
                <span class="flex items-center gap-1.5 font-bold">
                  <span class="lucide-check-circle size-4 text-ink-green-7 dark:text-ink-green-4" />
                  <span>{{ __('PAID IN FULL') }}</span>
                </span>
                <span class="invoice-settled-tag font-mono text-[11px] font-bold uppercase tracking-wider bg-surface-green-3 text-ink-green-7 dark:text-ink-green-3 px-2 py-0.5 rounded border border-outline-green-2">
                  {{ __('Settled') }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recorded Payments & Commercial Receipts Section -->
        <div
          v-if="invoice.payments && invoice.payments.length > 0"
          class="bg-surface-gray-1/60 dark:bg-surface-gray-2/30 rounded-xl border border-outline-gray-1 p-4 sm:p-5 space-y-3 print:border-none print:p-0"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="lucide-receipt size-4 text-ink-green-7 dark:text-ink-green-4" />
              <h3 class="text-xs font-bold uppercase tracking-wider text-ink-gray-9">
                {{ __('Recorded Payments & Commercial Receipts') }} ({{ invoice.payments.length }})
              </h3>
            </div>
            <span class="text-[11px] font-semibold text-ink-green-7 dark:text-ink-green-4 bg-surface-green-2 px-2.5 py-0.5 rounded-full border border-outline-green-2">
              {{ __('Total Settled: {0}', [currencySymbol + formatNum(invoice.amount_paid)]) }}
            </span>
          </div>

          <div class="overflow-x-auto border border-outline-gray-1 rounded-lg bg-surface-base">
            <table class="w-full text-xs text-left">
              <thead class="bg-surface-gray-1 border-b border-outline-gray-1 font-semibold text-ink-gray-7 dark:text-ink-gray-6 text-[11px] uppercase tracking-wider">
                <tr>
                  <th class="p-2.5">{{ __('Receipt #') }}</th>
                  <th class="p-2.5">{{ __('Date') }}</th>
                  <th class="p-2.5">{{ __('Method') }}</th>
                  <th class="p-2.5 text-right">{{ __('Amount') }}</th>
                  <th class="p-2.5 text-center">{{ __('Status') }}</th>
                  <th class="p-2.5 text-right print:hidden">{{ __('Receipt Actions') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="pay in invoice.payments" :key="pay.id" class="hover:bg-surface-gray-1 transition-colors">
                  <td class="p-2.5 font-mono font-bold text-ink-blue-7 dark:text-ink-blue-3">
                    {{ pay.receipt_number || pay.transaction_ref || 'REC-SETTLED' }}
                  </td>
                  <td class="p-2.5 text-ink-gray-7 dark:text-ink-gray-6">{{ pay.payment_date || '-' }}</td>
                  <td class="p-2.5 text-ink-gray-8 dark:text-ink-gray-6 font-medium">{{ pay.payment_method || 'Electronic' }}</td>
                  <td class="p-2.5 text-right font-mono font-bold text-ink-green-7 dark:text-ink-green-4">
                    {{ currencySymbol }}{{ formatNum(pay.amount) }}
                  </td>
                  <td class="p-2.5 text-center">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2">
                      {{ pay.status || 'Settled' }}
                    </span>
                  </td>
                  <td class="p-2.5 text-right space-x-1.5 whitespace-nowrap print:hidden">
                    <Button
                      size="sm"
                      variant="subtle"
                      :label="__('View')"
                      iconLeft="file-text"
                      @click="openReceiptModal(pay)"
                    />
                    <Button
                      size="sm"
                      variant="subtle"
                      :label="__('Print')"
                      iconLeft="printer"
                      @click="printReceipt(pay)"
                    />
                    <Button
                      size="sm"
                      variant="subtle"
                      :label="__('PDF')"
                      iconLeft="download"
                      @click="downloadReceipt(pay)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Payment Reminders & Schedule Preferences (Screen Only) -->
        <div
          v-if="!isNew"
          class="bg-surface-gray-1/50 dark:bg-surface-gray-2/20 rounded-xl border border-outline-gray-1 p-4 sm:p-5 space-y-4 print:hidden"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="lucide-bell size-4 text-ink-blue-7 dark:text-ink-blue-3" />
              <h3 class="text-xs font-bold uppercase tracking-wider text-ink-gray-9">
                {{ __('Payment Reminders & Schedule') }}
              </h3>
            </div>
            <!-- Quick Send Reminder Button -->
            <Button
              v-if="invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && Number(invoice.balance_due) > 0"
              size="sm"
              variant="subtle"
              iconLeft="bell"
              :label="__('Send Reminder Now')"
              @click="showReminderModal = true"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-ink-gray-7 dark:text-ink-gray-4 block">
                {{ __('Automated Reminders') }}
              </label>
              <label class="flex items-center gap-2 text-xs text-ink-gray-8 dark:text-ink-gray-2 cursor-pointer pt-1">
                <input
                  v-model="invoice.reminders_enabled"
                  type="checkbox"
                  class="rounded border-outline-gray-2 text-ink-blue-7 focus:ring-ink-blue-7 size-4"
                />
                <span>{{ invoice.reminders_enabled !== false ? __('Enabled for this invoice') : __('Disabled for this invoice') }}</span>
              </label>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-ink-gray-7 dark:text-ink-gray-4 block">
                {{ __('Custom Countdown Days') }}
              </label>
              <input
                v-model="invoice.custom_reminder_days"
                type="text"
                :placeholder="__('Default: {0}', [business.settings.reminder_days_before || '7, 3, 1'])"
                class="w-full bg-surface-base border border-outline-gray-2 rounded-lg px-3 py-1.5 text-xs text-ink-gray-9 placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span class="text-[10px] text-ink-gray-5 block">{{ __('Days before due date (e.g. 14, 7, 2)') }}</span>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-medium text-ink-gray-7 dark:text-ink-gray-4 block">
                {{ __('Gentle Overdue Days') }}
              </label>
              <input
                v-model="invoice.custom_overdue_days"
                type="text"
                :placeholder="__('Default: {0}', [business.settings.reminder_overdue_days || '3, 7'])"
                class="w-full bg-surface-base border border-outline-gray-2 rounded-lg px-3 py-1.5 text-xs text-ink-gray-9 placeholder:text-ink-gray-4 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span class="text-[10px] text-ink-gray-5 block">{{ __('Days after deadline for gentle follow-up') }}</span>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-outline-gray-1 text-[11px] text-ink-gray-5">
            <span>
              {{ __('Last reminder sent:') }}
              <strong class="text-ink-gray-7 dark:text-ink-gray-3">{{ invoice.last_reminder_sent_at ? new Date(invoice.last_reminder_sent_at).toLocaleString() : __('Never') }}</strong>
            </span>
            <span>
              {{ __('Total reminders sent:') }}
              <strong class="text-ink-gray-7 dark:text-ink-gray-3">{{ invoice.reminders_sent_count || 0 }}</strong>
            </span>
          </div>
        </div>

        <!-- Invoice Bottom Footer (Small Font) -->
        <div class="pt-6 border-t border-outline-gray-1 text-center space-y-1 print:pt-4">
          <p class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6">
            {{ business.settings.business_name || 'Crestara CRM' }}
            <span v-if="business.settings.legal_name && business.settings.legal_name !== business.settings.business_name">
              • {{ business.settings.legal_name }}
            </span>
          </p>
          <p v-if="business.settings.business_address || business.settings.tax_id || business.settings.business_phone" class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5">
            <span v-if="business.settings.business_address">{{ business.settings.business_address.replace(/\n/g, ', ') }}</span>
            <span v-if="business.settings.tax_id">• {{ __('Tax ID:') }} {{ business.settings.tax_id }}</span>
            <span v-if="business.settings.business_phone">• {{ business.settings.business_phone }}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Record Payment Modal Component -->
    <RecordPaymentModal
      v-model="showPaymentModal"
      :invoice="invoice"
      @paymentRecorded="onPaymentRecorded"
    />

    <!-- Vector PDF Document Preview Modal -->
    <DocumentPreviewModal
      v-model="showPreviewModal"
      :invoice="invoice"
      :payment="activePayment"
      :isReceipt="previewIsReceipt"
      @emailRequested="onEmailRequested"
    />

    <!-- Commercial Receipt Modal Component -->
    <CommercialReceiptModal
      v-model="showReceiptModal"
      :invoice="invoice"
      :payment="activePayment"
      @emailRequested="onEmailRequested"
    />

    <!-- Email Invoice / Receipt with PDF Attachment Modal -->
    <EmailInvoiceModal
      v-model="showEmailModal"
      :invoice="invoice"
      :payment="activePayment"
      :isReceipt="emailModalIsReceipt"
    />

    <!-- WhatsApp Invoice / Receipt Modal -->
    <WhatsAppInvoiceModal
      v-model="showWhatsAppModal"
      :invoice="invoice"
      :payment="activePayment"
      :isReceipt="whatsappModalIsReceipt"
    />

    <!-- Send Payment Reminder Modal -->
    <SendReminderModal
      v-model="showReminderModal"
      :invoice="invoice"
      @sent="onReminderDispatched"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import { isMobileView } from '@/composables/settings'
import LayoutHeader from '@/components/LayoutHeader.vue'
import RecordPaymentModal from '@/components/Invoices/RecordPaymentModal.vue'
import DocumentPreviewModal from '@/components/Common/DocumentPreviewModal.vue'
import CommercialReceiptModal from '@/components/Common/CommercialReceiptModal.vue'
import EmailInvoiceModal from '@/components/Invoices/EmailInvoiceModal.vue'
import WhatsAppInvoiceModal from '@/components/Invoices/WhatsAppInvoiceModal.vue'
import SendReminderModal from '@/components/Invoices/SendReminderModal.vue'
import WhatsAppIcon from '@/components/Icons/WhatsAppIcon.vue'
import { calculateCountdown } from '@/utils/reminders'
import {
  generateInvoicePdf,
  generateReceiptPdf,
  downloadInvoicePdf,
  downloadReceiptPdf,
  printDocumentPdf,
  loadImageAsBase64,
} from '@/utils/pdfGenerator'
import { Button } from 'frappe-ui'

const route = useRoute()
const router = useRouter()
const business = useBusinessStore()

const isNew = computed(() => route.params.invoiceId === 'new' || !route.params.invoiceId)
const saving = ref(false)
const showPaymentModal = ref(false)
const showPreviewModal = ref(false)
const showReceiptModal = ref(false)
const showEmailModal = ref(false)
const showWhatsAppModal = ref(false)
const showReminderModal = ref(false)
const previewIsReceipt = ref(false)
const emailModalIsReceipt = ref(false)
const whatsappModalIsReceipt = ref(false)
const activePayment = ref(null)
const selectedClientId = ref('')

// Searchable Client Dropdown State
const clientDropdownOpen = ref(false)
const clientSearchQuery = ref('')
const clientDropdownRef = ref(null)
const clientSearchInputRef = ref(null)

const availableClients = computed(() => {
  return business.customers || business.clients || []
})

const filteredClients = computed(() => {
  const query = clientSearchQuery.value.trim().toLowerCase()
  if (!query) return availableClients.value

  return availableClients.value.filter((c) => {
    const company = (c.company_name || c.legal_name || '').toLowerCase()
    const contact = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    const email = (c.billing_email || c.primary_email || '').toLowerCase()
    const tin = (c.tin || c.tax_id || '').toLowerCase()
    const phone = (c.phone || c.mobile_no || '').toLowerCase()

    return (
      company.includes(query) ||
      contact.includes(query) ||
      email.includes(query) ||
      tin.includes(query) ||
      phone.includes(query)
    )
  })
})

const selectedClientObj = computed(() => {
  if (!selectedClientId.value) return null
  return availableClients.value.find((c) => c.id === selectedClientId.value) || null
})

function toggleClientDropdown() {
  clientDropdownOpen.value = !clientDropdownOpen.value
  if (clientDropdownOpen.value) {
    clientSearchQuery.value = ''
    setTimeout(() => {
      clientSearchInputRef.value?.focus()
    }, 50)
  }
}

function selectClient(client) {
  if (!client) {
    clearSelectedClient()
    return
  }

  selectedClientId.value = client.id
  invoice.customer_id = client.id
  invoice.client_name = client.company_name || client.legal_name || ''
  invoice.client_email = client.billing_email || client.primary_email || ''
  invoice.client_phone = client.phone || client.mobile_no || ''
  invoice.contact_name = client.first_name ? `${client.first_name} ${client.last_name || ''}`.trim() : (client.job_title || '')

  if (client.default_currency || client.currency || client.preferred_currency) {
    invoice.currency = client.default_currency || client.currency || client.preferred_currency
  }
  if (client.default_payment_terms) {
    invoice.payment_terms = client.default_payment_terms.startsWith('Net')
      ? client.default_payment_terms
      : `Net ${client.default_payment_terms}`
    const days = parseInt(client.default_payment_terms.replace(/\D/g, ''), 10) || 30
    invoice.due_date = new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
  }

  clientDropdownOpen.value = false
  clientSearchQuery.value = ''
  recalculateTotals()
}

function clearSelectedClient() {
  selectedClientId.value = ''
  invoice.customer_id = null
  clientDropdownOpen.value = false
}

// Searchable Inventory Dropdown State
const inventoryDropdownOpen = ref(false)
const inventorySearchQuery = ref('')
const inventoryDropdownRef = ref(null)
const inventorySearchInputRef = ref(null)

const filteredInventoryItems = computed(() => {
  const query = inventorySearchQuery.value.trim().toLowerCase()
  const list = business.inventory || []
  if (!query) return list

  return list.filter((item) => {
    const name = (item.name || '').toLowerCase()
    const code = (item.code || '').toLowerCase()
    const category = (item.category || '').toLowerCase()
    const description = (item.description || '').toLowerCase()
    return (
      name.includes(query) ||
      code.includes(query) ||
      category.includes(query) ||
      description.includes(query)
    )
  })
})

function selectInventoryItem(prod) {
  if (!prod) return
  invoice.items.push({
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    product_id: prod.id,
    code: prod.code,
    name: prod.name,
    image_url: prod.image_url || '',
    quantity: 1,
    unit_price: Number(prod.unit_price) || 0,
    amount: Number(prod.unit_price) || 0,
  })
  recalculateTotals()
  inventorySearchQuery.value = ''
  inventoryDropdownOpen.value = false
}

function handleClickOutside(event) {
  if (clientDropdownRef.value && !clientDropdownRef.value.contains(event.target)) {
    clientDropdownOpen.value = false
  }
  if (inventoryDropdownRef.value && !inventoryDropdownRef.value.contains(event.target)) {
    inventoryDropdownOpen.value = false
  }
}

const currencySymbol = computed(() => business.getCurrencySymbol(invoice.currency))

const headerCountdownBadge = computed(() => {
  if (isNew.value || invoice.status === 'Paid' || invoice.status === 'Cancelled' || Number(invoice.balance_due) <= 0) {
    return null
  }
  const cd = calculateCountdown(invoice)
  if (cd.isDueToday) {
    return {
      label: 'Due Today',
      icon: 'lucide-bell-ring',
      classes: 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2',
    }
  }
  if (cd.isOverdue) {
    return {
      label: `${cd.daysPastDue}d overdue`,
      icon: 'lucide-alert-circle',
      classes: 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2',
    }
  }
  return {
    label: `Due in ${cd.daysUntilDue}d`,
    icon: 'lucide-clock',
    classes: 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2',
  }
})

const invoice = reactive({
  id: '',
  invoice_number: '',
  customer_id: null,
  client_name: '',
  client_email: '',
  contact_name: '',
  status: 'Issued',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  payment_terms: 'Net 30',
  currency: 'USD',
  tax_rate: 8.5,
  discount_percentage: 0,
  subtotal: 0,
  discount_amount: 0,
  tax_amount: 0,
  total_amount: 0,
  amount_paid: 0,
  balance_due: 0,
  items: [
    {
      id: 'item-1',
      product_id: null,
      code: '',
      name: '',
      quantity: 1,
      unit_price: 0,
      amount: 0,
    },
  ],
  payments: [],
  notes: '',
  reminders_enabled: true,
  custom_reminder_days: '',
  custom_overdue_days: '',
  last_reminder_sent_at: null,
  reminders_sent_count: 0,
  reminder_history: [],
})

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  try {
    await business.fetchBusinessSettingsFromSupabase()
    await business.fetchClientsFromSupabase()
    await ensureSettingsLogo()
  } catch (e) {
    // ignore
  }

  if (isNew.value) {
    if (business.settings.currency) {
      invoice.currency = business.settings.currency
    }
    if (business.settings.tax_rate) {
      invoice.tax_rate = Number(business.settings.tax_rate)
    }
    if (business.settings.default_payment_terms) {
      invoice.payment_terms = `Net ${business.settings.default_payment_terms}`
      invoice.due_date = new Date(Date.now() + Number(business.settings.default_payment_terms) * 86400000).toISOString().split('T')[0]
    }
    if (business.settings.notes_template && !invoice.notes) {
      invoice.notes = business.settings.notes_template
    }

    // Handle route query pre-fill (from Client.vue "Issue Invoice")
    if (route.query.customerId) {
      selectedClientId.value = route.query.customerId
      onClientSelect()
    } else if (route.query.customer) {
      invoice.client_name = route.query.customer
      if (route.query.email) invoice.client_email = route.query.email
      const matched = availableClients.value.find(
        (c) => c.company_name?.toLowerCase() === route.query.customer.toLowerCase()
      )
      if (matched) {
        selectedClientId.value = matched.id
        onClientSelect()
      }
    }
  } else {
    // Load existing invoice
    let existing = business.invoices.find((i) => i.id === route.params.invoiceId)
    if (!existing) {
      await business.fetchInvoicesFromSupabase()
      existing = business.invoices.find((i) => i.id === route.params.invoiceId)
    }

    if (existing) {
      Object.assign(invoice, JSON.parse(JSON.stringify(existing)))
      if (existing.customer_id) {
        selectedClientId.value = existing.customer_id
      }
    } else {
      router.replace({ path: '/invoices' })
    }
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

function onClientSelect() {
  if (!selectedClientId.value) return
  const client = availableClients.value.find((c) => c.id === selectedClientId.value)
  if (!client) return

  invoice.customer_id = client.id
  invoice.client_name = client.company_name || client.legal_name || ''
  invoice.client_email = client.billing_email || client.primary_email || ''
  invoice.client_phone = client.phone || client.mobile_no || ''
  invoice.contact_name = client.first_name ? `${client.first_name} ${client.last_name || ''}`.trim() : (client.job_title || '')

  if (client.default_currency || client.preferred_currency || client.currency) {
    invoice.currency = client.default_currency || client.preferred_currency || client.currency
  }
  if (client.default_payment_terms) {
    invoice.payment_terms = client.default_payment_terms.startsWith('Net')
      ? client.default_payment_terms
      : `Net ${client.default_payment_terms}`
    const days = parseInt(client.default_payment_terms.replace(/\D/g, ''), 10) || 30
    invoice.due_date = new Date(Date.now() + days * 86400000).toISOString().split('T')[0]
  }
  recalculateTotals()
}

function addItemFromInventory(productId) {
  const prod = business.inventory.find((p) => p.id === productId)
  if (prod) selectInventoryItem(prod)
}

function addCustomItem() {
  invoice.items.push({
    id: `item-${Date.now()}`,
    product_id: null,
    code: 'CUSTOM',
    name: 'Consulting / Professional Services',
    quantity: 1,
    unit_price: 150.0,
    amount: 150.0,
  })
  recalculateTotals()
}

function removeItem(idx) {
  invoice.items.splice(idx, 1)
  recalculateTotals()
}

function recalculateTotals() {
  const subtotal = invoice.items.reduce((acc, item) => {
    item.amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0)
    return acc + item.amount
  }, 0)
  const discountAmount = (subtotal * (Number(invoice.discount_percentage) || 0)) / 100
  const taxable = Math.max(0, subtotal - discountAmount)
  const taxAmount = (taxable * (Number(invoice.tax_rate) || 0)) / 100
  const total = taxable + taxAmount

  invoice.subtotal = Number(subtotal.toFixed(2))
  invoice.discount_amount = Number(discountAmount.toFixed(2))
  invoice.tax_amount = Number(taxAmount.toFixed(2))
  invoice.total_amount = Number(total.toFixed(2))
  invoice.balance_due = Number(Math.max(0, invoice.total_amount - (invoice.amount_paid || 0)).toFixed(2))
}

async function saveInvoice() {
  if (!invoice.client_name) {
    alert('Please enter a client or company name')
    return
  }
  saving.value = true
  recalculateTotals()

  try {
    if (isNew.value) {
      const created = await business.createInvoice(invoice)
      router.replace({ path: `/invoices/${created.id}` })
    } else {
      await business.updateInvoice(invoice.id, invoice)
      alert('Invoice updated successfully!')
    }
  } catch (err) {
    console.error('Failed to save invoice:', err)
  } finally {
    saving.value = false
  }
}

async function cancelCurrentInvoice() {
  if (confirm('Are you sure you want to cancel this invoice?')) {
    await business.cancelInvoice(invoice.id)
    invoice.status = 'Cancelled'
    invoice.balance_due = 0
  }
}

function onPaymentRecorded({ invoice: updatedInv }) {
  invoice.amount_paid = updatedInv.amount_paid
  invoice.balance_due = updatedInv.balance_due
  invoice.status = updatedInv.status
  if (Array.isArray(updatedInv.payments)) {
    invoice.payments = updatedInv.payments
  }
}

async function handleMarkAsPaid() {
  if (!confirm(`Mark invoice ${invoice.invoice_number} as PAID IN FULL for ${currencySymbol.value}${formatNum(invoice.balance_due)}?`)) {
    return
  }
  try {
    const res = await business.markInvoiceAsPaid(invoice.id)
    onPaymentRecorded(res)
    activePayment.value = res.transaction
    // Prompt to view official commercial receipt
    showReceiptModal.value = true
  } catch (err) {
    alert(err.message || 'Failed to mark invoice as paid')
  }
}

function openReceiptModal(pay) {
  activePayment.value = pay
  showReceiptModal.value = true
}

async function ensureSettingsLogo() {
  if (business.settings.logo_url) {
    if (!business.settings.logo_data_uri || business.settings._resolved_logo_url !== business.settings.logo_url) {
      const b64 = await loadImageAsBase64(business.settings.logo_url)
      if (b64) {
        business.settings.logo_data_uri = b64
        business.settings._resolved_logo_url = business.settings.logo_url
      }
    }
  }
}

async function printReceipt(pay) {
  await ensureSettingsLogo()
  const doc = generateReceiptPdf(invoice, pay, business.settings)
  printDocumentPdf(doc)
}

async function downloadReceipt(pay) {
  await ensureSettingsLogo()
  await downloadReceiptPdf(invoice, pay, business.settings)
}

function openInvoiceEmailModal() {
  emailModalIsReceipt.value = false
  showEmailModal.value = true
}

function openWhatsAppModal() {
  whatsappModalIsReceipt.value = Boolean(
    invoice.status === 'Paid' && invoice.payments && invoice.payments.length > 0
  )
  if (whatsappModalIsReceipt.value) {
    activePayment.value = invoice.payments[0]
  }
  showWhatsAppModal.value = true
}

function onEmailRequested({ payment, isReceipt }) {
  if (payment) activePayment.value = payment
  emailModalIsReceipt.value = Boolean(isReceipt)
  showEmailModal.value = true
}

function onReminderDispatched() {
  const updatedInv = business.invoices.find((i) => i.id === invoice.id)
  if (updatedInv) {
    invoice.last_reminder_sent_at = updatedInv.last_reminder_sent_at
    invoice.reminders_sent_count = updatedInv.reminders_sent_count
    invoice.reminder_history = updatedInv.reminder_history
  }
}

async function printInvoice() {
  await ensureSettingsLogo()
  const doc = generateInvoicePdf(invoice, business.settings)
  printDocumentPdf(doc)
}

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

async function downloadPdfDirect() {
  await ensureSettingsLogo()
  await downloadInvoicePdf(invoice, business.settings)
}

function getStatusClass(status) {
  switch (status) {
    case 'Paid':
      return 'status-badge-paid bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 font-semibold'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7 dark:text-ink-red-4 border border-outline-red-2 font-semibold'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-3 border border-outline-blue-2 font-semibold'
    case 'Partially paid':
    case 'Partially Paid':
      return 'bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2 font-semibold'
    case 'Draft':
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border border-outline-gray-2 font-medium'
    case 'Cancelled':
      return 'bg-surface-gray-2 text-ink-gray-5 dark:text-ink-gray-4 line-through border border-outline-gray-2 font-medium'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border border-outline-gray-2 font-medium'
  }
}
</script>

<style>
/* Dark Theme Adaptation for Invoice Indicators */
:root[data-theme='dark'] .status-badge-paid,
.dark .status-badge-paid,
:root[data-theme='dark'] .paid-in-full-pill,
.dark .paid-in-full-pill {
  background-color: rgba(16, 185, 129, 0.16) !important;
  border-color: rgba(16, 185, 129, 0.45) !important;
  color: #34d399 !important;
}

:root[data-theme='dark'] .paid-in-full-pill svg,
.dark .paid-in-full-pill svg,
:root[data-theme='dark'] .paid-in-full-pill [class*='lucide-'],
.dark .paid-in-full-pill [class*='lucide-'] {
  color: #34d399 !important;
}

:root[data-theme='dark'] .invoice-settled-box,
.dark .invoice-settled-box {
  background-color: rgba(16, 185, 129, 0.14) !important;
  border-color: rgba(16, 185, 129, 0.35) !important;
  color: #34d399 !important;
}

:root[data-theme='dark'] .invoice-settled-box svg,
.dark .invoice-settled-box svg,
:root[data-theme='dark'] .invoice-settled-box [class*='lucide-'],
.dark .invoice-settled-box [class*='lucide-'] {
  color: #34d399 !important;
}

:root[data-theme='dark'] .invoice-settled-tag,
.dark .invoice-settled-tag {
  background-color: rgba(16, 185, 129, 0.25) !important;
  border-color: rgba(16, 185, 129, 0.45) !important;
  color: #6ee7b7 !important;
}

:root[data-theme='dark'] .balance-due-zero,
.dark .balance-due-zero {
  color: #34d399 !important;
}

:root[data-theme='dark'] .balance-due-positive,
.dark .balance-due-positive {
  color: #fbbf24 !important;
}

@media print {
  body {
    background-color: #ffffff !important;
    color: #111827 !important;
  }
  header, nav, #app-header, .layout-header, button {
    display: none !important;
  }
  .invoice-sheet-container {
    padding: 0 !important;
    overflow: visible !important;
  }
  .max-w-4xl {
    max-width: 100% !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  input, select, textarea {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
    box-shadow: none !important;
  }
}
</style>
