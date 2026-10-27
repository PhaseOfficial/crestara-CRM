<template>
  <div class="flex flex-col h-full overflow-hidden print:bg-white print:overflow-visible">
    <!-- Header (Hidden when printing) -->
    <LayoutHeader class="print:hidden">
      <template #left-header>
        <div class="flex items-center gap-3">
          <router-link to="/invoices" class="p-1.5 rounded-md hover:bg-surface-gray-2 text-ink-gray-6">
            <span class="lucide-arrow-left size-5" />
          </router-link>
          <div>
            <h1 class="text-lg font-bold text-ink-gray-9">
              {{ isNew ? __('New Invoice') : invoice.invoice_number }}
            </h1>
            <span
              v-if="!isNew"
              class="text-xs px-2.5 py-0.5 rounded-full font-semibold border"
              :class="getStatusClass(invoice.status)"
            >
              {{ invoice.status }}
            </span>
          </div>
        </div>
      </template>

      <template #right-header>
        <div class="flex items-center gap-2">
          <Button
            v-if="!isNew && invoice.balance_due > 0 && invoice.status !== 'Cancelled'"
            variant="solid"
            :label="__('Record Payment')"
            iconLeft="credit-card"
            @click="showPaymentModal = true"
          />
          <Button
            v-if="!isNew"
            variant="outline"
            :label="__('Print / PDF')"
            iconLeft="printer"
            @click="printInvoice"
          />
          <Button
            v-if="!isNew && invoice.status !== 'Cancelled' && invoice.status !== 'Paid'"
            size="sm"
            variant="outline"
            theme="red"
            :label="__('Cancel Invoice')"
            @click="cancelCurrentInvoice"
          />
          <Button
            variant="solid"
            :label="isNew ? __('Create & Issue') : __('Save Changes')"
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
            <p v-if="business.settings.legal_name" class="text-xs font-semibold text-ink-gray-7 mt-1.5">{{ business.settings.legal_name }}</p>
            <p v-if="business.settings.business_address" class="text-xs text-ink-gray-5 mt-1 whitespace-pre-line">{{ business.settings.business_address }}</p>
            <div class="text-xs text-ink-gray-5 mt-1 space-x-3">
              <span v-if="business.settings.tax_id">{{ __('Tax ID:') }} {{ business.settings.tax_id }}</span>
              <span v-if="business.settings.business_phone">{{ business.settings.business_phone }}</span>
            </div>
          </div>

          <div class="space-y-3 sm:text-right min-w-[260px]">
            <h2 class="text-2xl font-bold text-ink-gray-9 tracking-tight font-mono">
              {{ isNew ? __('DRAFT INVOICE') : invoice.invoice_number }}
            </h2>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <span class="text-ink-gray-5 sm:text-right font-medium self-center">{{ __('Issue Date:') }}</span>
              <input
                v-model="invoice.issue_date"
                type="date"
                class="bg-surface-gray-1 dark:bg-surface-gray-2 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none print:border-none"
              />
              <span class="text-ink-gray-5 sm:text-right font-medium self-center">{{ __('Due Date:') }}</span>
              <input
                v-model="invoice.due_date"
                type="date"
                class="bg-surface-gray-1 dark:bg-surface-gray-2 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none print:border-none"
              />
              <span class="text-ink-gray-5 sm:text-right font-medium self-center">{{ __('Terms:') }}</span>
              <select
                v-model="invoice.payment_terms"
                class="bg-surface-gray-1 dark:bg-surface-gray-2 rounded px-2 py-1 text-xs border border-outline-gray-2 text-ink-gray-9 focus:outline-none print:border-none"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
              <span class="text-ink-gray-5 sm:text-right font-medium self-center">{{ __('Currency:') }}</span>
              <select
                v-model="invoice.currency"
                class="bg-surface-base font-bold text-xs text-ink-gray-9 border border-outline-gray-2 rounded px-2 py-1 focus:outline-none ring-1 ring-blue-500/20 print:border-none"
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
              <h3 class="text-xs font-bold uppercase tracking-wider text-ink-gray-5">{{ __('Billed To Client') }}</h3>
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
                    class="p-1 rounded text-ink-gray-5 hover:text-ink-red-7 hover:bg-surface-red-2 transition-colors"
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
                class="w-full flex items-center justify-between bg-surface-base border border-outline-gray-2 rounded-lg px-3 py-2 text-xs text-ink-gray-7 hover:text-ink-gray-9 hover:border-outline-gray-3 transition-colors shadow-xs text-left"
                @click="toggleClientDropdown"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="lucide-search size-3.5 text-ink-gray-5 shrink-0" />
                  <span class="truncate">{{ __('Select client') }}</span>
                </div>
                <span
                  class="lucide-chevron-down size-3.5 text-ink-gray-5 transition-transform duration-150"
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
                      <span class="lucide-search size-3.5 text-ink-gray-5 absolute left-2.5 pointer-events-none" />
                      <input
                        ref="clientSearchInputRef"
                        v-model="clientSearchQuery"
                        type="text"
                        :placeholder="__('Search client...')"
                        class="w-full bg-surface-base border border-outline-gray-2 rounded-md pl-8 pr-7 py-1.5 text-xs text-ink-gray-9 placeholder:text-ink-gray-5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        v-if="clientSearchQuery"
                        type="button"
                        class="absolute right-2 text-ink-gray-4 hover:text-ink-gray-7 p-0.5"
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
                        <span class="text-[10px] font-semibold text-ink-gray-5">
                          {{ c.default_currency || 'USD' }}
                        </span>
                        <span
                          v-if="selectedClientId === c.id"
                          class="lucide-check size-4 text-ink-blue-7 dark:text-ink-blue-3"
                        />
                      </div>
                    </div>

                    <!-- Empty Search State -->
                    <div v-if="!filteredClients.length" class="p-6 text-center text-xs text-ink-gray-5 space-y-1">
                      <div class="font-semibold text-ink-gray-7">{{ __('No registered clients found') }}</div>
                      <p class="text-[11px] text-ink-gray-5">
                        {{ clientSearchQuery ? __('No client matches "{0}".', [clientSearchQuery]) : __('No clients registered yet in the system.') }}
                      </p>
                    </div>
                  </div>

                  <!-- Footer: Enter Manually -->
                  <div class="p-2 border-t border-outline-gray-1 bg-surface-gray-1/30 dark:bg-surface-gray-2/30 flex items-center justify-between text-xs">
                    <span class="text-[11px] text-ink-gray-5">{{ __('Total: {0} client(s)', [availableClients.length]) }}</span>
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
              <input
                v-model="invoice.client_name"
                type="text"
                :placeholder="__('Client or Company Name')"
                class="w-full bg-surface-base rounded-md px-3 py-1.5 text-sm border border-outline-gray-2 text-ink-gray-9 font-semibold focus:outline-none print:border-none print:px-0"
                required
              />
              <input
                v-model="invoice.contact_name"
                type="text"
                :placeholder="__('Primary Contact Person')"
                class="w-full bg-surface-base rounded-md px-3 py-1.5 text-xs border border-outline-gray-2 text-ink-gray-8 focus:outline-none print:border-none print:px-0"
              />
              <input
                v-model="invoice.client_email"
                type="email"
                :placeholder="__('Billing Email Address')"
                class="w-full bg-surface-base rounded-md px-3 py-1.5 text-xs border border-outline-gray-2 text-ink-gray-8 focus:outline-none print:border-none print:px-0"
              />
            </div>
          </div>

          <!-- Quick Fill from Inventory (Hidden on print) -->
          <div class="print:hidden space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold uppercase tracking-wider text-ink-gray-5">{{ __('Select item') }}</label>
              <span class="text-[11px] text-ink-gray-5 font-medium">
                {{ business.inventory.length }} {{ __('items') }}
              </span>
            </div>

            <!-- Searchable Inventory Combobox -->
            <div ref="inventoryDropdownRef" class="relative">
              <div class="relative flex items-center">
                <span class="lucide-search size-3.5 text-ink-gray-5 absolute left-3 pointer-events-none" />
                <input
                  ref="inventorySearchInputRef"
                  v-model="inventorySearchQuery"
                  type="text"
                  :placeholder="__('Select item')"
                  class="w-full bg-surface-base border border-outline-gray-2 rounded-lg pl-9 pr-8 py-2 text-xs text-ink-gray-9 placeholder:text-ink-gray-5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  @focus="inventoryDropdownOpen = true"
                  @click="inventoryDropdownOpen = true"
                />
                <button
                  v-if="inventorySearchQuery"
                  type="button"
                  class="absolute right-2.5 text-ink-gray-4 hover:text-ink-gray-7 p-0.5"
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
                        <div class="size-8 rounded-lg overflow-hidden shrink-0 border border-outline-gray-2 bg-surface-gray-2 flex items-center justify-center font-bold text-ink-gray-6 text-xs">
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
                            <span class="font-mono text-[10px] text-ink-gray-5 font-normal">({{ prod.code }})</span>
                          </div>
                          <div class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4 truncate flex items-center gap-1.5 mt-0.5">
                            <span class="px-1.5 py-0.2 rounded text-[10px] bg-surface-gray-2 font-medium">
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
                              :class="prod.quantity_in_stock <= prod.low_stock_threshold ? 'bg-surface-red-2 text-ink-red-7' : 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4'"
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
                    <div v-if="!filteredInventoryItems.length" class="py-8 text-center text-ink-gray-4">
                      <span class="lucide-package-open size-6 text-ink-gray-4 mx-auto block mb-1.5" />
                      <p class="text-xs font-semibold text-ink-gray-7">{{ __('No matching products or services') }}</p>
                      <p class="text-[11px] mt-0.5">{{ __('Try searching with another keyword or code.') }}</p>
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
              <thead class="bg-surface-gray-1 dark:bg-surface-gray-2 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
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
                          class="w-full bg-transparent font-medium text-ink-gray-9 focus:outline-none print:border-none"
                        />
                        <input
                          v-model="item.code"
                          type="text"
                          :placeholder="__('Item code/SKU')"
                          class="w-full bg-transparent text-xs text-ink-gray-5 font-mono focus:outline-none mt-0.5 print:border-none"
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
                      class="p-1 rounded text-ink-gray-4 hover:text-red-600"
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
                      class="w-full bg-surface-base rounded px-2 py-0.5 text-xs text-ink-gray-5 font-mono border border-outline-gray-2 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  v-if="invoice.items.length > 1"
                  class="p-1.5 rounded text-ink-gray-4 hover:text-red-600 shrink-0"
                  @click="removeItem(idx)"
                >
                  <span class="lucide-trash-2 size-4" />
                </button>
              </div>

              <div class="grid grid-cols-3 gap-2 items-center text-xs">
                <div>
                  <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Qty') }}</span>
                  <input
                    v-model.number="item.quantity"
                    type="number"
                    min="1"
                    class="w-full bg-surface-base rounded px-2 py-1 text-sm font-semibold text-center border border-outline-gray-2 text-ink-gray-9 focus:outline-none mt-0.5"
                    @input="recalculateTotals"
                  />
                </div>
                <div>
                  <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Price ({0})', [currencySymbol]) }}</span>
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
                  <span class="text-[10px] uppercase font-semibold text-ink-gray-5 block">{{ __('Total') }}</span>
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
              <label class="text-xs font-bold uppercase tracking-wider text-ink-gray-5">{{ __('Notes / Instructions') }}</label>
              <textarea
                v-model="invoice.notes"
                rows="3"
                class="w-full bg-surface-gray-1 dark:bg-surface-gray-2/40 border border-outline-gray-2 rounded-lg p-3 text-xs text-ink-gray-8 focus:outline-none print:border-none print:p-0"
                placeholder="Payment instructions or terms..."
              />
            </div>

            <!-- Bank Wire Settlement Information Box -->
            <div
              v-if="business.settings.bank_name || business.settings.bank_account_number"
              class="p-3 bg-surface-gray-1 dark:bg-surface-gray-2/40 rounded-lg border border-outline-gray-2 text-xs space-y-1"
            >
              <div class="font-bold text-ink-gray-9 flex items-center gap-1.5">
                <span class="lucide-landmark size-3.5 text-ink-gray-5" />
                {{ __('Remittance Settlement Details') }}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-ink-gray-7 dark:text-ink-gray-6 pt-1">
                <div v-if="business.settings.bank_name">
                  <span class="font-medium text-ink-gray-5">{{ __('Bank:') }}</span> {{ business.settings.bank_name }}
                </div>
                <div v-if="business.settings.bank_account_name">
                  <span class="font-medium text-ink-gray-5">{{ __('Account Name:') }}</span> {{ business.settings.bank_account_name }}
                </div>
                <div v-if="business.settings.bank_account_number">
                  <span class="font-medium text-ink-gray-5">{{ __('Account / IBAN:') }}</span> {{ business.settings.bank_account_number }}
                </div>
                <div v-if="business.settings.swift_bic">
                  <span class="font-medium text-ink-gray-5">{{ __('SWIFT / BIC:') }}</span> {{ business.settings.swift_bic }}
                </div>
              </div>
              <div v-if="business.settings.payment_instructions" class="text-[11px] text-ink-gray-5 pt-1 italic">
                {{ business.settings.payment_instructions }}
              </div>
            </div>
          </div>

          <!-- Financial Calculation Box -->
          <div class="w-full sm:w-80 space-y-2.5 text-sm">
            <div class="flex justify-between text-ink-gray-6">
              <span>{{ __('Subtotal:') }}</span>
              <span class="font-mono font-medium text-ink-gray-9">{{ currencySymbol }}{{ formatNum(invoice.subtotal) }}</span>
            </div>

            <div class="flex items-center justify-between text-ink-gray-6">
              <span class="flex items-center gap-1.5">
                {{ __('Discount (%):') }}
                <input
                  v-model.number="invoice.discount_percentage"
                  type="number"
                  min="0"
                  max="100"
                  class="w-16 bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 rounded px-1.5 py-0.5 text-xs text-right font-semibold print:border-none"
                  @input="recalculateTotals"
                />
              </span>
              <span class="font-mono text-ink-gray-7">-{{ currencySymbol }}{{ formatNum(invoice.discount_amount) }}</span>
            </div>

            <div class="flex items-center justify-between text-ink-gray-6">
              <span class="flex items-center gap-1.5">
                {{ __('Tax (%):') }}
                <input
                  v-model.number="invoice.tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  class="w-16 bg-surface-gray-1 dark:bg-surface-gray-2 border border-outline-gray-2 rounded px-1.5 py-0.5 text-xs text-right font-semibold print:border-none"
                  @input="recalculateTotals"
                />
              </span>
              <span class="font-mono text-ink-gray-7">+{{ currencySymbol }}{{ formatNum(invoice.tax_amount) }}</span>
            </div>

            <div class="border-t border-outline-gray-1 pt-2 flex justify-between font-bold text-lg text-ink-gray-9">
              <span>{{ __('Grand Total:') }}</span>
              <span class="font-mono">{{ currencySymbol }}{{ formatNum(invoice.total_amount) }}</span>
            </div>

            <div v-if="!isNew" class="flex justify-between text-ink-green-3 font-medium">
              <span>{{ __('Amount Paid:') }}</span>
              <span class="font-mono">{{ currencySymbol }}{{ formatNum(invoice.amount_paid) }}</span>
            </div>

            <div v-if="!isNew" class="flex justify-between font-bold text-base" :class="invoice.balance_due > 0 ? 'text-ink-amber-3' : 'text-ink-gray-6'">
              <span>{{ __('Balance Due:') }}</span>
              <span class="font-mono">{{ currencySymbol }}{{ formatNum(invoice.balance_due) }}</span>
            </div>
          </div>
        </div>

        <!-- Invoice Bottom Footer (Small Font) -->
        <div class="pt-6 border-t border-outline-gray-1 text-center space-y-1 print:pt-4">
          <p class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-3">
            {{ business.settings.business_name || 'Crestara CRM' }}
            <span v-if="business.settings.legal_name && business.settings.legal_name !== business.settings.business_name">
              • {{ business.settings.legal_name }}
            </span>
          </p>
          <p v-if="business.settings.business_address || business.settings.tax_id || business.settings.business_phone" class="text-[11px] text-ink-gray-5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5">
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import RecordPaymentModal from '@/components/Invoices/RecordPaymentModal.vue'
import { Button } from 'frappe-ui'

const route = useRoute()
const router = useRouter()
const business = useBusinessStore()

const isNew = computed(() => route.params.invoiceId === 'new' || !route.params.invoiceId)
const saving = ref(false)
const showPaymentModal = ref(false)
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
})

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  try {
    await business.fetchBusinessSettingsFromSupabase()
    await business.fetchClientsFromSupabase()
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

function printInvoice() {
  window.print()
}

function formatNum(num) {
  return Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getStatusClass(status) {
  switch (status) {
    case 'Paid':
      return 'bg-surface-green-2 text-ink-green-7 border-outline-green-2'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7 border-outline-red-2'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7 border-outline-blue-2'
    case 'Partially paid':
      return 'bg-surface-amber-2 text-ink-amber-7 border-outline-amber-2'
    case 'Draft':
      return 'bg-surface-gray-2 text-ink-gray-7 border-outline-gray-2'
    case 'Cancelled':
      return 'bg-surface-gray-2 text-ink-gray-4 line-through border-outline-gray-2'
    default:
      return 'bg-surface-gray-2 text-ink-gray-6 border-outline-gray-2'
  }
}
</script>

<style>
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
