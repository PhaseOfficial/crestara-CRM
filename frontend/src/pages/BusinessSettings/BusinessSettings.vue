<template>
  <div class="flex flex-col flex-1 h-full w-full overflow-hidden">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-base sm:text-xl font-bold text-ink-gray-9">{{ __('Business Settings') }}</h1>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-4 border border-outline-purple-2">
            {{ __('Administrator Only') }}
          </span>
        </div>
      </template>
      <template #right-header>
        <div class="flex items-center gap-2">
          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <span
              v-if="savedSuccess"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2 text-xs font-semibold shadow-xs"
            >
              <span class="lucide-check size-3.5" />
              {{ __('Settings saved!') }}
            </span>
          </transition>
          <Button
            variant="solid"
            iconLeft="check"
            :label="isMobileView ? '' : __('Save Settings')"
            :tooltip="__('Save Settings')"
            :loading="saving"
            @click="save"
          />
        </div>
      </template>
    </LayoutHeader>

    <!-- Canvas with Safe Mobile Bottom Nav Clearance -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-6 max-w-5xl w-full mx-auto">
      <!-- Company Information Card -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
            <span class="lucide-building-2 size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Company & Contact Information') }}
          </h2>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
            {{ __('These details will appear on all outgoing customer invoices and receipts.') }}
          </p>
        </div>

        <!-- Company CRM Logo Uploader -->
        <div class="py-3 border-y border-outline-gray-1/60">
          <CrmImageUploader
            v-model="form.logo_url"
            folder="company"
            shape="rounded"
            size="rect"
            :label="__('Company CRM Logo')"
            :description="__('Recommended: Transparent PNG, SVG, or WebP (max 5MB). Globally reflected on invoices, customer portal, app header, and sidebar.')"
            fallback-text="CRM"
            @dataUri="onLogoDataUri"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormControl
            v-model="form.business_name"
            :label="__('Trade / Display Name')"
            type="text"
            required
          />
          <FormControl
            v-model="form.legal_name"
            :label="__('Company Legal Name')"
            type="text"
            placeholder="e.g. Crestara Technologies Inc."
          />
          <FormControl
            v-model="form.business_email"
            :label="__('Billing Email Address')"
            type="email"
            required
          />
          <FormControl
            v-model="form.business_phone"
            :label="__('Billing Phone')"
            type="text"
            required
          />
          <FormControl
            v-model="form.tax_id"
            :label="__('Tax ID / VAT Number')"
            type="text"
            placeholder="e.g. US-94-8829103"
          />
          <FormControl
            v-model="form.website"
            :label="__('Company Website')"
            type="url"
            placeholder="https://crestara.com"
          />
        </div>

        <FormControl
          v-model="form.business_address"
          :label="__('Official Street Address')"
          type="textarea"
          rows="3"
        />
      </div>

      <!-- Invoicing & Currency Rules -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
            <span class="lucide-receipt size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Invoice Numbering & Financial Defaults') }}
          </h2>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
            {{ __('Configure sequential document prefixes, default commercial terms, and statutory tax rates.') }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <FormControl
            v-model="form.invoice_prefix"
            :label="__('Invoice Prefix')"
            type="text"
            placeholder="INV-2026-"
            required
          />
          <FormControl
            v-model.number="form.next_invoice_number"
            :label="__('Next Invoice Sequence')"
            type="number"
            min="1"
            required
          />
          <FormControl
            v-model="form.receipt_prefix"
            :label="__('Receipt Prefix')"
            type="text"
            placeholder="REC-2026-"
            required
          />
          <FormControl
            v-model.number="form.next_receipt_number"
            :label="__('Next Receipt Sequence')"
            type="number"
            min="1"
            required
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <FormControl
            v-model="form.currency"
            :label="__('Currency')"
            type="select"
            :options="['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ZAR', 'ZWG']"
            required
          />
          <FormControl
            v-model.number="form.default_payment_terms"
            :label="__('Default Terms (Days)')"
            type="number"
            min="0"
          />
          <FormControl
            v-model.number="form.tax_rate"
            :label="__('Default Tax Rate (%)')"
            type="number"
            step="0.1"
            min="0"
          />
          <FormControl
            v-model.number="form.late_fee_percentage"
            :label="__('Late Fee (% per month)')"
            type="number"
            step="0.5"
            min="0"
          />
        </div>

        <FormControl
          v-model="form.notes_template"
          :label="__('Default Footer / Remittance Notes')"
          type="textarea"
          rows="2"
        />
      </div>

      <!-- Bank Wire & Remittance Settlement Card -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
            <span class="lucide-landmark size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Bank & Wire Remittance Settlement') }}
          </h2>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
            {{ __('Banking, IBAN, and wire settlement instructions printed on customer invoices.') }}
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormControl
            v-model="form.bank_name"
            :label="__('Bank / Financial Institution')"
            type="text"
            placeholder="e.g. JPMorgan Chase Bank, N.A."
          />
          <FormControl
            v-model="form.bank_account_name"
            :label="__('Account Holder Legal Name')"
            type="text"
            placeholder="e.g. Crestara Technologies Inc."
          />
          <FormControl
            v-model="form.bank_account_number"
            :label="__('Account Number / IBAN')"
            type="text"
            placeholder="e.g. US12CHAS00000012345678"
          />
          <FormControl
            v-model="form.swift_bic"
            :label="__('SWIFT / BIC Code')"
            type="text"
            placeholder="e.g. CHASUS33XXX"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormControl
            v-model="form.bank_routing_iban"
            :label="__('Routing / Sort Code (ABA / Clearing)')"
            type="text"
            placeholder="e.g. 021000021"
          />
          <FormControl
            v-model="form.payment_instructions"
            :label="__('Wire Instructions / Remittance Notes')"
            type="textarea"
            rows="2"
            placeholder="e.g. Include invoice number in memo. Remitter is responsible for wire fees."
          />
        </div>
      </div>

      <!-- Inventory & Stock Management Settings -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
            <span class="lucide-package-check size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Inventory & Stock Management Settings') }}
          </h2>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
            {{ __('Define automated stock decrements on invoicing and default physical inventory thresholds. Services and non-tracked items are exempt.') }}
          </p>
        </div>

        <div class="space-y-4 pt-1">
          <!-- Auto-Deduct Inventory Switch -->
          <div class="flex items-start justify-between gap-4 p-3 rounded-lg border border-outline-gray-2 bg-surface-gray-1/50 dark:bg-surface-gray-2/30">
            <div class="space-y-0.5">
              <label class="text-xs font-bold text-ink-gray-9 cursor-pointer flex items-center gap-2" for="auto-deduct-checkbox">
                <span>{{ __('Automatically deduct stock on invoice issuance') }}</span>
              </label>
              <p class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4">
                {{ __('When enabled, issuing or marking an invoice as paid automatically decrements the quantity in stock for physical products. (Note: Most items like services and retainers never track stock and are unaffected).') }}
              </p>
            </div>
            <input
              id="auto-deduct-checkbox"
              v-model="form.auto_deduct_inventory"
              type="checkbox"
              class="mt-1 size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <!-- Allow Negative Stock Switch -->
          <div class="flex items-start justify-between gap-4 p-3 rounded-lg border border-outline-gray-2 bg-surface-gray-1/50 dark:bg-surface-gray-2/30">
            <div class="space-y-0.5">
              <label class="text-xs font-bold text-ink-gray-9 cursor-pointer flex items-center gap-2" for="negative-stock-checkbox">
                <span>{{ __('Allow sales with negative stock') }}</span>
              </label>
              <p class="text-[11px] text-ink-gray-6 dark:text-ink-gray-4">
                {{ __('Permit invoicing physical tracked products even when available on-hand stock is 0 units.') }}
              </p>
            </div>
            <input
              id="negative-stock-checkbox"
              v-model="form.allow_negative_stock"
              type="checkbox"
              class="mt-1 size-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>

          <!-- Default Low Stock Threshold -->
          <div class="max-w-xs">
            <FormControl
              v-model.number="form.default_low_stock_threshold"
              :label="__('Default Low-Stock Alert Threshold')"
              type="number"
              min="0"
              :description="__('Default minimum stock level before triggering warning badges on products.')"
            />
          </div>
        </div>
      </div>

      <!-- cPanel Server-Side Email Delivery Configuration -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
              <span class="lucide-mail size-4 text-ink-gray-5 dark:text-ink-gray-4" />
              {{ __('Email Delivery & cPanel Webmail Integration') }}
            </h2>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ __('Automated invoice & commercial receipt dispatch with vector PDF attachments via cPanel.') }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft="send"
              :label="__('Test Email Delivery')"
              :loading="testingEmail"
              @click="handleTestEmail"
            />
          </div>
        </div>

        <!-- Security & Server Notice -->
        <div class="p-3.5 rounded-xl bg-surface-blue-2/60 dark:bg-blue-950/40 border border-outline-blue-2 dark:border-blue-800/50 text-xs text-ink-blue-7 dark:text-blue-200 flex items-start gap-2.5">
          <span class="lucide-shield-check size-4 shrink-0 mt-0.5 text-ink-blue-6 dark:text-blue-400" />
          <div class="space-y-1">
            <p class="font-semibold">{{ __('Server-Side Security Enabled') }}</p>
            <p class="text-[11px] opacity-90">
              {{ __('Sensitive SMTP credentials and email server options are managed securely on your cPanel server in /api/send_email.php. Passwords are never sent across or stored in the browser.') }}
            </p>
          </div>
        </div>

        <!-- Test Feedback Banner -->
        <div
          v-if="testResult"
          class="p-3 rounded-xl text-xs flex items-center gap-2 border"
          :class="testResult.success ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2' : 'bg-surface-red-2 text-ink-red-7 border-outline-red-2'"
        >
          <span :class="testResult.success ? 'lucide-check-circle size-4' : 'lucide-alert-circle size-4'" />
          <span class="font-medium">{{ testResult.message }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormControl
            v-model="form.from_name"
            :label="__('Default Sender Name (From Name)')"
            type="text"
            placeholder="Crestara Billing Accounts"
          />
          <FormControl
            v-model="form.from_email"
            :label="__('Default Sender Email (From Email)')"
            type="email"
            placeholder="billing@crestara.com"
          />
        </div>
      </div>

      <!-- Staff Management & Role Permissions -->
      <div class="bg-surface-base rounded-xl border border-outline-gray-1 p-5 sm:p-6 shadow-sm space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
              <span class="lucide-users size-4 text-ink-gray-5 dark:text-ink-gray-4" />
              {{ __('Staff Accounts & Role Assignments') }}
            </h2>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ __('Manage internal CRM staff members and system administrator permissions.') }}
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Role Filter Tabs (Design System Elevated Pattern) -->
            <div class="flex items-center bg-surface-gray-2 dark:bg-surface-gray-1 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="selectedRoleFilter === 'Staff' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
                @click="selectedRoleFilter = 'Staff'"
              >
                {{ __('Staff') }} ({{ staffCount }})
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="selectedRoleFilter === 'All' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
                @click="selectedRoleFilter = 'All'"
              >
                {{ __('All Team') }} ({{ totalInternalCount }})
              </button>
              <button
                type="button"
                class="px-2.5 py-1 rounded-md transition-colors"
                :class="selectedRoleFilter === 'Administrator' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
                @click="selectedRoleFilter = 'Administrator'"
              >
                {{ __('Admins') }} ({{ adminCount }})
              </button>
            </div>
            <Button size="sm" variant="outline" :label="__('Invite Staff')" iconLeft="user-plus" @click="showInvite = true" />
          </div>
        </div>

        <!-- Desktop Staff Table (>= 768px) -->
        <div class="hidden md:block border border-outline-gray-1 rounded-lg overflow-hidden overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-4">{{ __('Staff Member') }}</th>
                <th class="py-3 px-4">{{ __('Email') }}</th>
                <th class="py-3 px-4">{{ __('Assigned Role') }}</th>
                <th class="py-3 px-4 text-right">{{ __('Access Area') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr v-for="user in filteredStaffUsers" :key="user.id" class="hover:bg-surface-gray-1 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2.5">
                    <button
                      type="button"
                      class="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/40 shrink-0"
                      :title="__('Click to change avatar')"
                      @click="openAvatarModal(user)"
                    >
                      <Avatar size="sm" :label="user.full_name" :image="user.avatar" />
                      <span class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span class="lucide-camera size-3 text-white" />
                      </span>
                    </button>
                    <span class="font-semibold text-ink-gray-9">{{ user.full_name }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 text-ink-gray-7 dark:text-ink-gray-6">{{ user.email }}</td>
                <td class="py-3 px-4">
                  <select
                    v-model="user.role"
                    class="bg-surface-base dark:bg-surface-gray-2 border border-outline-gray-2 rounded-md px-2.5 py-1 text-xs font-semibold text-ink-gray-9 focus:outline-none focus:ring-1 focus:ring-outline-gray-3"
                    @change="onRoleChanged(user)"
                  >
                    <option value="Staff">{{ __('Staff') }}</option>
                    <option value="Administrator">{{ __('Administrator') }}</option>
                  </select>
                </td>
                <td class="py-3 px-4 text-right text-xs">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
                    :class="
                      user.role === 'Administrator'
                        ? 'bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-4 border-outline-purple-2'
                        : 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-4 border-outline-blue-2'
                    "
                  >
                    {{ user.role === 'Administrator' ? __('Full System Access (Admin)') : __('CRM Staff Access (/dashboard)') }}
                  </span>
                </td>
              </tr>
              <tr v-if="!filteredStaffUsers.length">
                <td colspan="4" class="py-10 text-center text-xs text-ink-gray-6 dark:text-ink-gray-5">
                  {{ __('No staff members found matching this filter.') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden border border-outline-gray-1 rounded-lg divide-y divide-outline-gray-1 overflow-hidden">
          <div
            v-for="user in filteredStaffUsers"
            :key="user.id"
            class="p-4 bg-surface-base hover:bg-surface-gray-1 transition-colors space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  class="relative group rounded-full focus:outline-none shrink-0"
                  :title="__('Click to change avatar')"
                  @click="openAvatarModal(user)"
                >
                  <Avatar size="md" :label="user.full_name" :image="user.avatar" />
                  <span class="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span class="lucide-camera size-3.5 text-white" />
                  </span>
                </button>
                <div class="min-w-0">
                  <div class="font-semibold text-ink-gray-9 text-sm truncate">{{ user.full_name }}</div>
                  <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6 truncate">{{ user.email }}</div>
                </div>
              </div>
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0"
                :class="
                  user.role === 'Administrator'
                    ? 'bg-surface-purple-2 text-ink-purple-7 dark:text-ink-purple-4 border-outline-purple-2'
                    : 'bg-surface-blue-2 text-ink-blue-7 dark:text-ink-blue-4 border-outline-blue-2'
                "
              >
                {{ user.role }}
              </span>
            </div>

            <div class="flex items-center justify-between gap-3 pt-2 border-t border-outline-gray-1/60 text-xs">
              <span class="text-ink-gray-6 dark:text-ink-gray-5 font-medium">{{ __('Role Assignment:') }}</span>
              <select
                v-model="user.role"
                class="bg-surface-base dark:bg-surface-gray-2 border border-outline-gray-2 rounded-md px-2.5 py-1 text-xs font-semibold text-ink-gray-9 focus:outline-none"
                @change="onRoleChanged(user)"
              >
                <option value="Staff">{{ __('Staff') }}</option>
                <option value="Administrator">{{ __('Administrator') }}</option>
              </select>
            </div>
          </div>

          <div v-if="!filteredStaffUsers.length" class="p-8 text-center text-xs text-ink-gray-6 dark:text-ink-gray-5">
            {{ __('No staff members found matching this filter.') }}
          </div>
        </div>
      </div>
    </div>

    <!-- Invite / Add Staff Modal (Archetype B Alignment) -->
    <Dialog v-model:open="showInvite" :size="'md'">
      <template #body>
        <div class="p-6 bg-surface-base text-ink-gray-9 space-y-4">
          <div class="flex items-center justify-between border-b border-outline-gray-1 pb-3">
            <h2 class="text-lg font-bold text-ink-gray-9 flex items-center gap-2">
              <span class="lucide-user-plus size-5 text-ink-gray-7 dark:text-ink-gray-5" />
              {{ __('Invite Staff Member') }}
            </h2>
            <span
              v-if="existingClientAccount"
              class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-amber-2 text-ink-amber-8 dark:text-amber-300 border border-outline-amber-2 dark:border-amber-800/60"
            >
              {{ __('Client Account Found') }}
            </span>
          </div>

          <!-- Existing Client Upgrade Detection Banner -->
          <div
            v-if="existingClientAccount"
            class="p-3.5 bg-surface-amber-2 dark:bg-amber-950/50 border border-outline-amber-2 dark:border-amber-800/60 rounded-xl text-xs space-y-2 animate-fadeIn"
          >
            <div class="flex items-center gap-2 font-bold text-ink-amber-8 dark:text-amber-300">
              <span class="lucide-arrow-up-circle size-4 text-amber-600 dark:text-amber-400" />
              {{ __('Existing Client Account Detected') }}
            </div>
            <p class="text-ink-gray-8 dark:text-ink-gray-7 leading-relaxed">
              <strong>{{ existingClientAccount.full_name || existingClientAccount.company }}</strong> ({{ existingClientAccount.email }})
              is registered as a client organization. Adding them here will upgrade their account to an internal <strong>{{ __(newMember.role) }}</strong>, granting them full CRM access.
            </p>
            <div class="flex items-center gap-2 text-[11px] text-ink-amber-8 dark:text-amber-300 font-medium pt-0.5">
              <span class="lucide-check-circle size-3.5 text-amber-600 dark:text-amber-400" />
              {{ __('Their client portal record will be converted automatically.') }}
            </div>
          </div>

          <!-- Optional Quick-Select from Registered Clients -->
          <div v-if="clientAccountsList.length && !existingClientAccount" class="space-y-1">
            <label class="text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6">
              {{ __('Or select an existing client to upgrade:') }}
            </label>
            <select
              class="w-full bg-surface-base dark:bg-surface-gray-2 border border-outline-gray-2 rounded-lg px-3 py-2 text-xs text-ink-gray-9 focus:outline-none focus:ring-1 focus:ring-outline-gray-3"
              @change="selectClientToUpgrade($event.target.value)"
            >
              <option value="">{{ __('— Choose a registered client —') }}</option>
              <option
                v-for="cl in clientAccountsList"
                :key="cl.id"
                :value="cl.email"
              >
                {{ cl.full_name }} ({{ cl.company ? cl.company + ' • ' : '' }}{{ cl.email }})
              </option>
            </select>
          </div>

          <div class="space-y-4">
            <div class="flex justify-center pb-1">
              <CrmImageUploader
                v-model="newMember.avatar_url"
                folder="avatars"
                shape="circle"
                size="md"
                :label="__('Profile Avatar (Optional)')"
                :fallback-text="newMember.full_name?.charAt(0) || 'U'"
              />
            </div>
            <FormControl
              v-model="newMember.email"
              :label="__('Email Address')"
              type="email"
              placeholder="jane@crestara.com"
              required
            />
            <FormControl
              v-model="newMember.full_name"
              :label="__('Full Name')"
              type="text"
              placeholder="Jane Doe"
              required
            />
            <FormControl
              v-model="newMember.role"
              :label="__('Assigned Role')"
              type="select"
              :options="['Staff', 'Administrator']"
              required
            />
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
            <Button variant="subtle" :label="__('Cancel')" @click="closeInviteModal" />
            <Button
              variant="solid"
              :iconLeft="existingClientAccount ? 'arrow-up-right' : 'user-plus'"
              :label="existingClientAccount ? __('Upgrade to {0}', [__(newMember.role)]) : __('Add Member')"
              :disabled="!newMember.email || !newMember.full_name"
              :class="existingClientAccount ? '!bg-amber-600 hover:!bg-amber-500 active:!bg-amber-700 !text-white dark:!bg-amber-500 dark:hover:!bg-amber-400 dark:!text-gray-950 font-bold shadow-sm' : ''"
              @click="addTeamMember"
            />
          </div>
        </div>
      </template>
    </Dialog>

    <!-- Staff Avatar Management Modal -->
    <Dialog v-model:open="showAvatarModal" :size="'sm'">
      <template #body>
        <div class="p-6 bg-surface-base text-ink-gray-9 space-y-4">
          <div class="border-b border-outline-gray-1 pb-3">
            <h2 class="text-base font-bold text-ink-gray-9 flex items-center gap-2">
              <span class="lucide-camera size-4 text-ink-blue-7" />
              {{ __('Update Staff Avatar') }}
            </h2>
            <p class="text-xs text-ink-gray-6 mt-0.5">
              {{ selectedUserForAvatar?.full_name }} ({{ selectedUserForAvatar?.email }})
            </p>
          </div>

          <div class="flex justify-center py-2">
            <CrmImageUploader
              v-model="tempAvatarUrl"
              folder="avatars"
              shape="circle"
              size="lg"
              :label="__('Upload Staff Photo')"
              :fallback-text="selectedUserForAvatar?.full_name?.charAt(0) || 'U'"
            />
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-outline-gray-1">
            <Button variant="subtle" :label="__('Cancel')" @click="showAvatarModal = false" />
            <Button
              variant="solid"
              :label="__('Save Avatar')"
              :loading="savingAvatar"
              @click="saveStaffAvatar"
            />
          </div>
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { useBusinessStore } from '@/stores/business'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { isMobileView } from '@/composables/settings'
import { FormControl, Button, Avatar, Dialog } from 'frappe-ui'
import CrmImageUploader from '@/components/Common/CrmImageUploader.vue'
import { sendTestEmail } from '@/utils/mailer'
import { loadImageAsBase64 } from '@/utils/pdfGenerator'

const business = useBusinessStore()
const saving = ref(false)
const savedSuccess = ref(false)
const showInvite = ref(false)

// State for Invite / Upgrade Member Modal
const newMember = reactive({
  full_name: '',
  email: '',
  role: 'Staff',
  avatar_url: '',
})

// State for updating staff avatar
const showAvatarModal = ref(false)
const selectedUserForAvatar = ref(null)
const tempAvatarUrl = ref('')
const savingAvatar = ref(false)

function openAvatarModal(user) {
  selectedUserForAvatar.value = user
  tempAvatarUrl.value = user?.avatar || ''
  showAvatarModal.value = true
}

async function saveStaffAvatar() {
  if (!selectedUserForAvatar.value) return
  savingAvatar.value = true
  try {
    await business.updateUserAvatar(selectedUserForAvatar.value.id, tempAvatarUrl.value)
    showAvatarModal.value = false
    savedSuccess.value = true
    setTimeout(() => {
      savedSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to update staff avatar:', err)
  } finally {
    savingAvatar.value = false
  }
}

// Business Settings Form with fallback defaults
const form = reactive({
  business_name: '',
  legal_name: '',
  business_email: '',
  business_phone: '',
  business_address: '',
  tax_id: '',
  website: '',
  logo_url: '',
  logo_data_uri: '',
  currency: 'USD',
  currency_symbol: '$',
  invoice_prefix: 'INV-2026-',
  next_invoice_number: 1045,
  receipt_prefix: 'REC-2026-',
  next_receipt_number: 5001,
  default_payment_terms: 30,
  tax_rate: 8.5,
  late_fee_percentage: 2.0,
  notes_template: '',
  bank_name: '',
  bank_account_name: '',
  bank_account_number: '',
  bank_routing_iban: '',
  swift_bic: '',
  payment_instructions: '',
  auto_deduct_inventory: false,
  allow_negative_stock: false,
  default_low_stock_threshold: 5,
  from_email: '',
  from_name: '',
  ...(business.settings || {}),
})

const testingEmail = ref(false)
const testResult = ref(null)

async function handleTestEmail() {
  const targetEmail = prompt('Enter recipient email address to send test dispatch:', form.business_email || form.from_email || '')
  if (!targetEmail) return

  testingEmail.value = true
  testResult.value = null

  try {
    // Persist current settings first
    await business.updateBusinessSettings(form)
    await sendTestEmail({
      recipientEmail: targetEmail.trim(),
      businessSettings: form,
    })
    testResult.value = {
      success: true,
      message: `Test email successfully dispatched to ${targetEmail} via cPanel mailer!`,
    }
  } catch (err) {
    testResult.value = {
      success: false,
      message: err.message || 'Failed to dispatch test email. Please verify cPanel SMTP credentials or server logs.',
    }
  } finally {
    testingEmail.value = false
    setTimeout(() => {
      testResult.value = null
    }, 8000)
  }
}

watch(
  () => business.settings,
  (val) => {
    if (val && typeof val === 'object') {
      Object.assign(form, val)
    }
  },
  { immediate: true, deep: true }
)

// Automatically sync currency symbol when currency code changes
watch(
  () => form.currency,
  (newCur) => {
    if (newCur && business.CURRENCY_SYMBOLS?.[newCur]) {
      form.currency_symbol = business.CURRENCY_SYMBOLS[newCur]
    }
  }
)

// Role filter for staff table: 'Staff' | 'All' | 'Administrator'
const selectedRoleFilter = ref('Staff')

const staffCount = computed(() => (business.users || []).filter((u) => u?.role === 'Staff').length)
const adminCount = computed(() => (business.users || []).filter((u) => u?.role === 'Administrator').length)
const totalInternalCount = computed(() => (business.users || []).filter((u) => u?.role === 'Staff' || u?.role === 'Administrator').length)

const filteredStaffUsers = computed(() => {
  const users = business.users || []
  if (selectedRoleFilter.value === 'Staff') {
    return users.filter((u) => u?.role === 'Staff')
  }
  if (selectedRoleFilter.value === 'Administrator') {
    return users.filter((u) => u?.role === 'Administrator')
  }
  return users.filter((u) => u?.role === 'Staff' || u?.role === 'Administrator')
})

const clientAccountsList = computed(() => {
  const list = []
  const users = business.users || []
  const customers = business.customers || []

  // Registered users with Customer role
  users
    .filter((u) => u?.role === 'Customer')
    .forEach((u) => {
      if (u?.email && !list.some((item) => item.email.toLowerCase() === u.email.toLowerCase())) {
        list.push({
          id: u.id,
          email: u.email,
          full_name: u.full_name || u.email.split('@')[0],
          company: u.company || u.client_name || '',
        })
      }
    })

  // Registered customers
  customers.forEach((c) => {
    const email = c?.primary_email || c?.billing_email
    if (email && !list.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      const name = c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.company_name
      list.push({
        id: c.id,
        email: email,
        full_name: name || email.split('@')[0],
        company: c.company_name || '',
      })
    }
  })
  return list
})

const existingClientAccount = computed(() => {
  const email = newMember.email?.trim().toLowerCase()
  if (!email) return null
  return clientAccountsList.value.find((c) => c.email && c.email.toLowerCase() === email) || null
})

// Auto-populate full_name when an existing client account is recognized
watch(existingClientAccount, (client) => {
  if (client && !newMember.full_name) {
    newMember.full_name = client.full_name
  }
})

function selectClientToUpgrade(email) {
  if (!email) return
  const found = clientAccountsList.value.find((c) => c.email && c.email.toLowerCase() === email.toLowerCase())
  if (found) {
    newMember.email = found.email
    newMember.full_name = found.full_name
    newMember.role = 'Staff'
  }
}

onMounted(async () => {
  await Promise.all([
    business.fetchBusinessSettingsFromSupabase(),
    business.fetchUsersFromSupabase(),
  ])
})

function onRoleChanged(user) {
  business.updateUserRole(user.id, user.role)
}

async function addTeamMember() {
  if (!newMember.email || !newMember.full_name) return

  try {
    await business.inviteStaffMember({
      email: newMember.email,
      full_name: newMember.full_name,
      role: newMember.role,
      avatar_url: newMember.avatar_url || null,
    })

    selectedRoleFilter.value = newMember.role
    savedSuccess.value = true
    setTimeout(() => {
      savedSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to add team member:', err)
  } finally {
    closeInviteModal()
  }
}

function closeInviteModal() {
  newMember.full_name = ''
  newMember.email = ''
  newMember.role = 'Staff'
  newMember.avatar_url = ''
  showInvite.value = false
}

function onLogoDataUri(dataUri) {
  form.logo_data_uri = dataUri
  business.settings.logo_data_uri = dataUri
  business.settings._resolved_logo_url = form.logo_url || dataUri
}

async function save() {
  saving.value = true
  try {
    if (form.logo_url && !form.logo_data_uri) {
      try {
        const b64 = await loadImageAsBase64(form.logo_url)
        if (b64) {
          form.logo_data_uri = b64
          business.settings.logo_data_uri = b64
          business.settings._resolved_logo_url = form.logo_url
        }
      } catch (e) {
        // ignore
      }
    }
    await business.updateBusinessSettings(form)
    savedSuccess.value = true
    setTimeout(() => {
      savedSuccess.value = false
    }, 3000)
  } catch (err) {
    console.error('Failed to save business settings:', err)
  } finally {
    saving.value = false
  }
}
</script>
