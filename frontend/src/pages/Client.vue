<template>
  <!-- Loading Skeleton State -->
  <div v-if="isLoading" class="flex flex-col flex-1 h-full overflow-hidden">
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-3 animate-pulse">
          <div class="size-8 rounded-lg bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="size-9 rounded-lg bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="space-y-1.5">
            <div class="h-4 w-32 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
            <div class="h-3 w-48 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
          </div>
        </div>
      </template>
      <template #right-header>
        <div class="flex items-center gap-2 animate-pulse">
          <div class="h-8 w-24 rounded-lg bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="h-8 w-28 rounded-lg bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="h-8 w-24 rounded-lg bg-surface-gray-2 dark:bg-surface-gray-1" />
        </div>
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-6 animate-pulse">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="h-44 rounded-xl bg-surface-base border border-outline-gray-1 p-5 space-y-3">
          <div class="h-3 w-28 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="h-4 w-40 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="h-4 w-32 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="h-4 w-36 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
        </div>
      </div>
      <div class="h-28 rounded-xl bg-surface-base border border-outline-gray-1 p-5 space-y-3">
        <div class="h-3 w-36 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
        <div class="h-4 w-64 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
      </div>
      <div class="h-64 rounded-xl bg-surface-base border border-outline-gray-1 p-5 space-y-3">
        <div class="h-4 w-48 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
        <div class="h-32 w-full rounded bg-surface-gray-2/60 dark:bg-surface-gray-1/60" />
      </div>
    </div>
  </div>

  <!-- Loaded Client Detail View -->
  <div v-else-if="client" class="flex flex-col flex-1 h-full overflow-hidden">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            iconLeft="arrow-left"
            :tooltip="__('Back to Clients')"
            @click="router.push('/clients')"
          />
          <div class="size-9 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-xs shrink-0">
            {{ (client.company_name || 'C').substring(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h1 class="text-base sm:text-xl font-bold text-ink-gray-9 leading-tight truncate max-w-[140px] sm:max-w-xs md:max-w-md lg:max-w-none">
                {{ client.company_name }}
              </h1>
              <span
                class="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0"
                :class="client.status === 'Active' ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2' : 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'"
              >
                {{ __(client.status || 'Active') }}
              </span>
            </div>
            <span class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5 block truncate">
              {{ client.legal_structure }}<span v-if="client.industry"> • {{ client.industry }}</span>
            </span>
          </div>
        </div>
      </template>

      <template #right-header>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <router-link :to="`/invoices/new?customer=${encodeURIComponent(client.company_name)}&email=${encodeURIComponent(client.billing_email || client.primary_email || '')}`">
            <Button
              variant="subtle"
              iconLeft="plus"
              :label="isMobileView ? '' : __('Issue Invoice')"
              :tooltip="__('Issue Invoice')"
            />
          </router-link>
          <Button
            variant="subtle"
            iconLeft="user-plus"
            :label="isMobileView ? '' : __('Upgrade to Staff')"
            :tooltip="__('Upgrade to Staff')"
            class="!bg-surface-amber-2 !text-ink-amber-8 dark:!bg-amber-950/50 dark:!text-amber-300 border border-outline-amber-2 dark:border-amber-800/60 hover:!bg-surface-amber-3 dark:hover:!bg-amber-900/50 transition-colors"
            @click="showUpgradeModal = true"
          />
          <Button
            variant="solid"
            iconLeft="file-edit"
            :label="isMobileView ? '' : __('Edit Client')"
            :tooltip="__('Edit Client Organization')"
            @click="openEditModal"
          />
        </div>
      </template>
    </LayoutHeader>

    <!-- Body Layout with Safe Mobile Clearance -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-6">
      <!-- Pending Verification Banner (if change request is pending) -->
      <div
        v-if="pendingChangeRequest"
        class="p-4 rounded-xl bg-surface-amber-2 dark:bg-amber-950/50 border border-outline-amber-2 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
      >
        <div class="flex items-start sm:items-center gap-2.5">
          <span class="lucide-clock size-4 text-ink-amber-8 dark:text-amber-300 mt-0.5 sm:mt-0 shrink-0" />
          <div>
            <span class="font-bold text-ink-amber-8 dark:text-amber-300 block sm:inline">
              {{ __('Profile Update Pending Verification') }}
            </span>
            <span class="text-ink-gray-7 dark:text-ink-gray-6 sm:ml-2">
              {{ __('Client requested modifications to official registry or tax details on {0}.', [pendingChangeRequest.requested_at?.split('T')[0] || 'recently']) }}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          :label="__('Review in Queue')"
          class="!text-ink-amber-8 dark:!text-amber-300 !border-outline-amber-2 dark:!border-amber-800/60 hover:!bg-surface-amber-3 shrink-0 self-start sm:self-auto"
          @click="router.push('/clients')"
        />
      </div>

      <!-- Top Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Card 1: Registration & Tax -->
        <div class="bg-surface-base border border-outline-gray-1 rounded-xl p-5 shadow-sm space-y-4">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6 flex items-center gap-1.5">
            <span class="lucide-building size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Corporate Registry') }}
          </h4>
          <div class="space-y-3 text-xs">
            <div>
              <span class="text-ink-gray-7 dark:text-ink-gray-6 block mb-1">{{ __('Company Registration No. (CRN)') }}</span>
              <div class="flex items-center gap-1.5">
                <span class="inline-flex items-center font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60">
                  {{ client.company_registration_number || '—' }}
                </span>
                <button
                  v-if="client.company_registration_number"
                  type="button"
                  class="text-ink-gray-5 hover:text-ink-gray-9 p-1 rounded hover:bg-surface-gray-2 dark:hover:bg-surface-gray-1 transition-colors"
                  :title="__('Copy CRN')"
                  @click="copyToClipboard(client.company_registration_number, 'crn')"
                >
                  <span :class="copiedField === 'crn' ? 'lucide-check text-ink-green-7 dark:text-ink-green-4' : 'lucide-copy'" class="size-3.5 inline-block" />
                </button>
              </div>
            </div>
            <div>
              <span class="text-ink-gray-7 dark:text-ink-gray-6 block mb-1">{{ __('Tax ID / TIN / EIN') }}</span>
              <div class="flex items-center gap-1.5">
                <span class="inline-flex items-center font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60">
                  {{ client.tin || client.tax_id || '—' }}
                </span>
                <button
                  v-if="client.tin || client.tax_id"
                  type="button"
                  class="text-ink-gray-5 hover:text-ink-gray-9 p-1 rounded hover:bg-surface-gray-2 dark:hover:bg-surface-gray-1 transition-colors"
                  :title="__('Copy Tax ID')"
                  @click="copyToClipboard(client.tin || client.tax_id, 'tin')"
                >
                  <span :class="copiedField === 'tin' ? 'lucide-check text-ink-green-7 dark:text-ink-green-4' : 'lucide-copy'" class="size-3.5 inline-block" />
                </button>
              </div>
            </div>
            <div v-if="client.vat_number">
              <span class="text-ink-gray-7 dark:text-ink-gray-6 block mb-1">{{ __('VAT Number') }}</span>
              <span class="font-mono font-semibold text-ink-gray-9 block">{{ client.vat_number }}</span>
            </div>
            <div v-if="client.website">
              <span class="text-ink-gray-7 dark:text-ink-gray-6 block mb-1">{{ __('Official Website') }}</span>
              <a
                :href="client.website.startsWith('http') ? client.website : 'https://' + client.website"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-ink-blue-7 dark:text-ink-blue-3 hover:underline flex items-center gap-1"
              >
                <span class="truncate max-w-[200px]">{{ client.website.replace(/^https?:\/\//, '') }}</span>
                <span class="lucide-external-link size-3 shrink-0" />
              </a>
            </div>
          </div>
        </div>

        <!-- Card 2: Primary Contact Person -->
        <div class="bg-surface-base border border-outline-gray-1 rounded-xl p-5 shadow-sm space-y-4">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6 flex items-center gap-1.5">
            <span class="lucide-user-check size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Primary Contact Person') }}
          </h4>
          <div class="space-y-2.5 text-xs">
            <div>
              <span class="text-sm font-semibold text-ink-gray-9 block">
                {{ client.first_name ? `${client.first_name} ${client.last_name || ''}`.trim() : (client.contact_name || client.primary_email || __('Primary Representative')) }}
              </span>
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ client.job_title || __('Primary Representative') }}</span>
            </div>
            <div class="pt-1 flex items-center gap-2 text-ink-gray-8 dark:text-ink-gray-7">
              <span class="lucide-mail size-3.5 text-ink-gray-5 dark:text-ink-gray-4 shrink-0" />
              <a
                v-if="client.billing_email || client.primary_email"
                :href="'mailto:' + (client.billing_email || client.primary_email)"
                class="truncate text-ink-blue-7 dark:text-ink-blue-3 hover:underline text-xs"
              >
                {{ client.billing_email || client.primary_email }}
              </a>
              <span v-else class="text-xs text-ink-gray-5">—</span>
            </div>
            <div class="flex items-center gap-2 text-ink-gray-8 dark:text-ink-gray-7">
              <span class="lucide-phone size-3.5 text-ink-gray-5 dark:text-ink-gray-4 shrink-0" />
              <a
                v-if="client.phone || client.mobile_no"
                :href="'tel:' + (client.phone || client.mobile_no)"
                class="text-xs text-ink-gray-9 dark:text-ink-gray-1 hover:text-ink-blue-7 dark:hover:text-ink-blue-3 hover:underline"
              >
                {{ client.phone || client.mobile_no }}
              </a>
              <span v-else class="text-xs text-ink-gray-5">—</span>
            </div>
            <div v-if="client.national_id_number" class="pt-0.5">
              <span class="text-ink-gray-7 dark:text-ink-gray-6 block text-[11px]">{{ __('National ID / Passport') }}</span>
              <span class="font-mono text-xs text-ink-gray-8 dark:text-ink-gray-6">{{ client.national_id_number }}</span>
            </div>
          </div>
        </div>

        <!-- Card 3: Commercial & Billing -->
        <div class="bg-surface-base border border-outline-gray-1 rounded-xl p-5 shadow-sm space-y-4">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6 flex items-center gap-1.5">
            <span class="lucide-badge-dollar-sign size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Commercial & Terms') }}
          </h4>
          <div class="space-y-2.5 text-xs">
            <div class="flex justify-between items-center">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Payment Terms') }}</span>
              <span class="font-semibold text-ink-gray-9">{{ client.default_payment_terms || 'Net 30' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Currency') }}</span>
              <span class="font-semibold text-ink-gray-9">{{ client.default_currency || 'USD' }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ __('Credit Limit') }}</span>
              <span class="font-semibold text-ink-gray-9">${{ Number(client.credit_limit || 0).toLocaleString() }}</span>
            </div>
            <div class="flex justify-between items-center pt-2 border-t border-outline-gray-1">
              <span class="text-ink-gray-7 dark:text-ink-gray-6 font-medium">{{ __('Total Outstanding') }}</span>
              <span class="font-bold font-mono text-sm" :class="clientBalance > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'">
                ${{ Number(clientBalance).toLocaleString() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Official Billing Address Card -->
      <div class="bg-surface-base border border-outline-gray-1 rounded-xl p-5 shadow-sm space-y-2">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6 flex items-center gap-1.5">
            <span class="lucide-map-pin size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Official Billing Address') }}
          </h4>
          <a
            v-if="hasAddress"
            :href="googleMapsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-ink-blue-7 dark:text-ink-blue-3 hover:underline flex items-center gap-1 font-medium"
          >
            <span>{{ __('View on Map') }}</span>
            <span class="lucide-external-link size-3" />
          </a>
        </div>
        <p class="text-sm font-medium text-ink-gray-9 whitespace-pre-line">
          {{ client.billing_address_line1 || client.address || __('No billing street address specified') }}
          <span v-if="client.billing_address_line2" class="block text-ink-gray-7 dark:text-ink-gray-6 font-normal">
            {{ client.billing_address_line2 }}
          </span>
        </p>
        <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
          {{ formattedLocation }}
        </p>
      </div>

      <!-- Invoices Issued to this Client Table & Mobile Cards -->
      <div class="bg-surface-base border border-outline-gray-1 rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-outline-gray-1 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 class="text-sm font-bold text-ink-gray-9">{{ __('Invoices & Billing History') }}</h3>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">{{ __('All invoices issued to this organization') }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs px-2 py-0.5 rounded-full bg-surface-gray-2 dark:bg-surface-gray-1 text-ink-gray-8 dark:text-ink-gray-6 font-semibold">
              {{ clientInvoices.length }} {{ __('Invoices') }}
            </span>
            <router-link :to="`/invoices/new?customer=${encodeURIComponent(client.company_name)}&email=${encodeURIComponent(client.billing_email || client.primary_email || '')}`">
              <Button size="sm" variant="subtle" iconLeft="plus" :label="__('New Invoice')" />
            </router-link>
          </div>
        </div>

        <!-- Desktop View (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-4">{{ __('Invoice #') }}</th>
                <th class="py-3 px-4">{{ __('Issue Date') }}</th>
                <th class="py-3 px-4">{{ __('Due Date') }}</th>
                <th class="py-3 px-4">{{ __('Amount') }}</th>
                <th class="py-3 px-4">{{ __('Balance') }}</th>
                <th class="py-3 px-4">{{ __('Status') }}</th>
                <th class="py-3 px-4 text-right">{{ __('Actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr
                v-for="inv in clientInvoices"
                :key="inv.id"
                class="hover:bg-surface-gray-1 transition-colors cursor-pointer group"
                @click="router.push(`/invoices/${inv.id}`)"
              >
                <td class="py-3 px-4 font-mono font-bold text-ink-blue-7 dark:text-ink-blue-3">
                  {{ inv.invoice_number }}
                </td>
                <td class="py-3 px-4 text-ink-gray-7 dark:text-ink-gray-6">{{ inv.issue_date }}</td>
                <td class="py-3 px-4 text-ink-gray-7 dark:text-ink-gray-6">{{ inv.due_date }}</td>
                <td class="py-3 px-4 font-mono font-semibold text-ink-gray-9">${{ Number(inv.total_amount).toLocaleString() }}</td>
                <td class="py-3 px-4 font-mono font-semibold" :class="Number(inv.balance_due) > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'">
                  ${{ Number(inv.balance_due).toLocaleString() }}
                </td>
                <td class="py-3 px-4">
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                    :class="getStatusBadgeClass(inv.status)"
                  >
                    {{ __(inv.status) }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                    <Button
                      v-if="Number(inv.balance_due) > 0 && inv.status !== 'Cancelled'"
                      size="xs"
                      variant="outline"
                      iconLeft="credit-card"
                      :label="__('Pay')"
                      @click="openPaymentModal(inv)"
                    />
                    <Button
                      size="xs"
                      variant="outline"
                      iconLeft="eye"
                      :label="__('View')"
                      @click="router.push(`/invoices/${inv.id}`)"
                    />
                  </div>
                </td>
              </tr>
              <tr v-if="!clientInvoices.length">
                <td colspan="7" class="py-12 text-center text-ink-gray-6 dark:text-ink-gray-5 space-y-2">
                  <span class="lucide-receipt size-8 text-ink-gray-4 mx-auto block mb-2" />
                  <p class="text-sm font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('No invoices issued to this client yet.') }}</p>
                  <p class="text-xs text-ink-gray-6 dark:text-ink-gray-5">{{ __('Generate commercial invoices to track receivables and billing.') }}</p>
                  <router-link :to="`/invoices/new?customer=${encodeURIComponent(client.company_name)}&email=${encodeURIComponent(client.billing_email || client.primary_email || '')}`" class="inline-block pt-2">
                    <Button variant="solid" size="sm" iconLeft="plus" :label="__('Issue First Invoice')" />
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-outline-gray-1">
          <div
            v-for="inv in clientInvoices"
            :key="inv.id"
            class="p-4 hover:bg-surface-gray-1 transition-colors cursor-pointer space-y-3"
            @click="router.push(`/invoices/${inv.id}`)"
          >
            <!-- Card Header: Number + Status Badge + Chevron -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-ink-blue-7 dark:text-ink-blue-3 text-sm">{{ inv.invoice_number }}</span>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                  :class="getStatusBadgeClass(inv.status)"
                >
                  {{ __(inv.status) }}
                </span>
              </div>
              <span class="lucide-chevron-right size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            </div>

            <!-- Card Grid: Dates & Amounts -->
            <div class="grid grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg">
              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Due Date') }}</span>
                <span class="font-medium text-ink-gray-8 dark:text-ink-gray-7">{{ inv.due_date || '—' }}</span>
                <span class="text-[10px] text-ink-gray-6 dark:text-ink-gray-5 block mt-0.5">Issued: {{ inv.issue_date }}</span>
              </div>
              <div class="text-right">
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Amount Due') }}</span>
                <span
                  class="font-bold font-mono text-sm block"
                  :class="Number(inv.balance_due) > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'"
                >
                  ${{ Number(inv.balance_due).toLocaleString() }}
                </span>
                <span class="text-[10px] text-ink-gray-6 dark:text-ink-gray-5">Total: ${{ Number(inv.total_amount).toLocaleString() }}</span>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-gray-1/40" @click.stop>
              <Button
                v-if="Number(inv.balance_due) > 0 && inv.status !== 'Cancelled'"
                size="sm"
                variant="outline"
                iconLeft="credit-card"
                :label="__('Record Payment')"
                @click="openPaymentModal(inv)"
              />
              <Button
                size="sm"
                variant="outline"
                iconRight="arrow-right"
                :label="__('View Invoice')"
                @click="router.push(`/invoices/${inv.id}`)"
              />
            </div>
          </div>

          <div v-if="!clientInvoices.length" class="p-8 text-center text-ink-gray-6 dark:text-ink-gray-5 space-y-2">
            <span class="lucide-receipt size-8 text-ink-gray-4 mx-auto block mb-2" />
            <p class="text-sm font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('No invoices issued to this client yet.') }}</p>
            <router-link :to="`/invoices/new?customer=${encodeURIComponent(client.company_name)}&email=${encodeURIComponent(client.billing_email || client.primary_email || '')}`" class="inline-block pt-2">
              <Button variant="solid" size="sm" iconLeft="plus" :label="__('Issue First Invoice')" />
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Client Not Found Empty State -->
  <div v-else class="flex flex-1 items-center justify-center p-8">
    <div class="bg-surface-base border border-outline-gray-1 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
      <div class="size-16 rounded-full bg-surface-gray-2 dark:bg-surface-gray-1 flex items-center justify-center mx-auto text-ink-gray-5 dark:text-ink-gray-4">
        <span class="lucide-building size-8" />
      </div>
      <div>
        <h3 class="text-lg font-bold text-ink-gray-9">{{ __('Client Organization Not Found') }}</h3>
        <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-1 leading-relaxed">
          {{ __('The client record with identifier "{0}" could not be located in your database. It may have been archived or removed.', [currentId]) }}
        </p>
      </div>
      <div class="pt-2">
        <Button variant="solid" iconLeft="arrow-left" :label="__('Back to Clients Directory')" @click="router.push('/clients')" />
      </div>
    </div>
  </div>

  <!-- ARCHETYPE A MODAL: EDIT CLIENT ORGANIZATION & CONTACTS -->
  <Dialog v-model:open="showEditModal" :size="'2xl'">
    <template #body>
      <div class="p-6 bg-surface-base text-ink-gray-9 space-y-6 max-h-[85vh] overflow-y-auto">
        <div class="border-b border-outline-gray-1 pb-3 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-ink-gray-9">
              {{ __('Edit Client Organization') }}
            </h2>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ __('Update official legal entity details, primary contact representative, and commercial terms.') }}
            </p>
          </div>
          <button
            type="button"
            class="text-ink-gray-5 dark:text-ink-gray-4 hover:text-ink-gray-9 p-1 rounded transition-colors"
            @click="showEditModal = false"
          >
            <span class="lucide-x size-5" />
          </button>
        </div>

        <form class="space-y-6" @submit.prevent="saveClient">
          <!-- Section 1: Organization Details -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-ink-blue-7 dark:text-ink-blue-3 flex items-center gap-1.5 border-b border-outline-gray-1 pb-1">
              <span class="lucide-building size-4" />
              {{ __('1. Organization Legal Entity Details') }}
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormControl
                v-model="clientForm.company_name"
                :label="__('Organization / Company Name')"
                placeholder="e.g. Acme Corporation"
                type="text"
                required
              />
              <FormControl
                v-model="clientForm.legal_structure"
                :label="__('Legal Structure')"
                type="select"
                :options="[
                  { label: 'Corporation (Inc / Corp)', value: 'Corporation' },
                  { label: 'Limited Liability Company (LLC)', value: 'LLC' },
                  { label: 'Private Limited (Ltd)', value: 'Ltd' },
                  { label: 'Public Limited Company (PLC)', value: 'PLC' },
                  { label: 'Partnership', value: 'Partnership' },
                  { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
                  { label: 'Non-Profit / NGO', value: 'Non-Profit' },
                ]"
              />
              <FormControl
                v-model="clientForm.company_registration_number"
                :label="__('Company Registration Number (CRN)')"
                placeholder="e.g. CRN-881920-CA"
                type="text"
              />
              <FormControl
                v-model="clientForm.tin"
                :label="__('Tax ID / TIN / EIN')"
                placeholder="e.g. US-882-99120"
                type="text"
              />
              <FormControl
                v-model="clientForm.vat_number"
                :label="__('VAT Number')"
                placeholder="e.g. GB-992-120-11"
                type="text"
              />
              <FormControl
                v-model="clientForm.industry"
                :label="__('Industry Sector')"
                placeholder="e.g. Technology & SaaS"
                type="text"
              />
              <div class="sm:col-span-2">
                <FormControl
                  v-model="clientForm.website"
                  :label="__('Official Website URL')"
                  placeholder="e.g. https://acme.corp"
                  type="text"
                />
              </div>
            </div>

            <!-- Billing Address -->
            <div class="space-y-2 pt-2">
              <FormControl
                v-model="clientForm.billing_address_line1"
                :label="__('Official Billing Street Address')"
                placeholder="e.g. 450 Mission Street, Floor 14"
                type="text"
              />
              <FormControl
                v-model="clientForm.billing_address_line2"
                :label="__('Address Line 2 (Suite, Unit, Bldg)')"
                placeholder="e.g. Suite 500"
                type="text"
              />
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormControl
                  v-model="clientForm.billing_city"
                  :label="__('City')"
                  placeholder="e.g. San Francisco"
                  type="text"
                />
                <FormControl
                  v-model="clientForm.billing_state_province"
                  :label="__('State / Province')"
                  placeholder="e.g. CA"
                  type="text"
                />
                <FormControl
                  v-model="clientForm.billing_postal_code"
                  :label="__('Postal / ZIP Code')"
                  placeholder="e.g. 94105"
                  type="text"
                />
              </div>
              <FormControl
                v-model="clientForm.billing_country"
                :label="__('Country')"
                placeholder="e.g. United States"
                type="text"
              />
            </div>
          </div>

          <!-- Section 2: Primary Contact Person -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-ink-green-7 dark:text-ink-green-4 flex items-center gap-1.5 border-b border-outline-gray-1 pb-1">
              <span class="lucide-user-check size-4" />
              {{ __('2. Primary Contact Person & Representative') }}
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormControl
                v-model="clientForm.first_name"
                :label="__('First Name')"
                placeholder="e.g. Sarah"
                type="text"
                required
              />
              <FormControl
                v-model="clientForm.last_name"
                :label="__('Last Name')"
                placeholder="e.g. Connor"
                type="text"
              />
              <FormControl
                v-model="clientForm.primary_email"
                :label="__('Contact / Billing Email')"
                placeholder="e.g. client@acme.corp"
                type="email"
                required
              />
              <FormControl
                v-model="clientForm.phone"
                :label="__('Contact Phone / Mobile')"
                placeholder="e.g. +1 (555) 789-0123"
                type="text"
              />
              <FormControl
                v-model="clientForm.job_title"
                :label="__('Job Title / Role')"
                placeholder="e.g. Chief Technology Officer"
                type="text"
              />
              <FormControl
                v-model="clientForm.national_id_number"
                :label="__('National ID / Passport Number')"
                placeholder="e.g. NAT-992-184-77"
                type="text"
              />
            </div>
          </div>

          <!-- Section 3: Commercial Terms & Defaults -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-ink-gray-8 dark:text-ink-gray-7 flex items-center gap-1.5 border-b border-outline-gray-1 pb-1">
              <span class="lucide-badge-dollar-sign size-4" />
              {{ __('3. Commercial Defaults & Credit Settings') }}
            </h4>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormControl
                v-model="clientForm.default_currency"
                :label="__('Currency')"
                type="select"
                :options="[
                  { label: 'USD ($)', value: 'USD' },
                  { label: 'EUR (€)', value: 'EUR' },
                  { label: 'GBP (£)', value: 'GBP' },
                  { label: 'CAD ($)', value: 'CAD' },
                  { label: 'AUD ($)', value: 'AUD' },
                ]"
              />
              <FormControl
                v-model="clientForm.default_payment_terms"
                :label="__('Payment Terms')"
                type="select"
                :options="[
                  { label: 'Due on Receipt', value: 'Due on Receipt' },
                  { label: 'Net 15 Days', value: 'Net 15' },
                  { label: 'Net 30 Days', value: 'Net 30' },
                  { label: 'Net 60 Days', value: 'Net 60' },
                ]"
              />
              <FormControl
                v-model="clientForm.credit_limit"
                :label="__('Credit Limit ($)')"
                type="number"
              />
            </div>
          </div>

          <!-- Modal Footer Actions -->
          <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
            <Button variant="outline" :label="__('Cancel')" @click="showEditModal = false" />
            <Button
              variant="solid"
              type="submit"
              :label="__('Save Changes')"
              :loading="saving"
            />
          </div>
        </form>
      </div>
    </template>
  </Dialog>

  <!-- ARCHETYPE B MODAL: UPGRADE CLIENT TO STAFF -->
  <Dialog v-model:open="showUpgradeModal" :size="'sm'">
    <template #body>
      <div class="p-6 bg-surface-base space-y-4">
        <div class="flex items-center gap-2 border-b border-outline-gray-1 pb-3">
          <span class="lucide-arrow-up-circle size-5 text-ink-amber-8 dark:text-amber-300" />
          <h2 class="text-base font-bold text-ink-gray-9">
            {{ __('Upgrade Client to Staff Member') }}
          </h2>
        </div>
        <p class="text-xs text-ink-gray-8 dark:text-ink-gray-7 leading-relaxed">
          Are you sure you want to upgrade <strong>{{ client?.company_name || client?.first_name }}</strong> ({{ client?.billing_email || client?.primary_email }}) to an internal <strong>Staff</strong> member?
        </p>
        <div class="p-3 bg-surface-amber-2 dark:bg-amber-950/50 border border-outline-amber-2 dark:border-amber-800/60 rounded-lg text-xs space-y-1 text-ink-amber-8 dark:text-amber-300">
          <span class="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
            <span class="lucide-shield-check size-3.5" />
            {{ __('Permission Elevation') }}
          </span>
          <p class="text-[11px] text-ink-gray-7 dark:text-ink-gray-6">
            {{ __('This will elevate their account to CRM staff access, permitting internal pipeline management.') }}
          </p>
        </div>
        <div class="flex justify-end gap-2 pt-3 border-t border-outline-gray-1">
          <Button variant="subtle" :label="__('Cancel')" @click="showUpgradeModal = false" />
          <Button
            variant="solid"
            iconLeft="arrow-up-right"
            :label="__('Confirm Upgrade')"
            class="!bg-amber-600 hover:!bg-amber-500 active:!bg-amber-700 !text-white dark:!bg-amber-500 dark:hover:!bg-amber-400 dark:!text-gray-950 font-bold shadow-sm"
            @click="confirmUpgradeClient"
          />
        </div>
      </div>
    </template>
  </Dialog>

  <!-- RECORD PAYMENT MODAL -->
  <RecordPaymentModal
    v-model="showPaymentModal"
    :invoice="selectedInvoice"
  />
</template>

<script setup>
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, Dialog, FormControl } from 'frappe-ui'
import LayoutHeader from '@/components/LayoutHeader.vue'
import RecordPaymentModal from '@/components/Invoices/RecordPaymentModal.vue'
import { isMobileView } from '@/composables/settings'
import { useBusinessStore } from '@/stores/business'

const props = defineProps({
  clientId: {
    type: String,
    default: '',
  },
})

const route = useRoute()
const router = useRouter()
const business = useBusinessStore()

const currentId = computed(() => props.clientId || route.params.clientId || route.params.organizationId)
const isLoading = ref(true)
const showEditModal = ref(false)
const showUpgradeModal = ref(false)
const showPaymentModal = ref(false)
const selectedInvoice = ref(null)
const saving = ref(false)
const copiedField = ref(null)

const clientForm = reactive({
  company_name: '',
  legal_structure: 'Corporation',
  company_registration_number: '',
  tin: '',
  vat_number: '',
  industry: 'Technology',
  website: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_city: '',
  billing_state_province: '',
  billing_postal_code: '',
  billing_country: 'United States',
  first_name: '',
  last_name: '',
  primary_email: '',
  phone: '',
  job_title: 'Primary Contact',
  national_id_number: '',
  default_currency: 'USD',
  default_payment_terms: 'Net 30',
  credit_limit: 25000,
  status: 'Active',
})

async function loadData() {
  isLoading.value = true
  try {
    if (!business.customers.length) {
      await business.fetchClientsFromSupabase()
    }
    if (currentId.value) {
      await business.fetchCustomerFromSupabase(currentId.value)
    }
    await business.fetchChangeRequestsFromSupabase()
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})

watch(() => currentId.value, (newId) => {
  if (newId) {
    loadData()
  }
})

const client = computed(() => {
  if (!currentId.value) return null
  return business.customers.find((c) => c.id === currentId.value) || null
})

const pendingChangeRequest = computed(() => {
  if (!client.value) return null
  return business.changeRequests.find(
    (r) => r.customer_id === client.value.id && r.status === 'Pending'
  )
})

const clientInvoices = computed(() => {
  if (!client.value) return []
  const name = client.value.company_name?.toLowerCase()
  const email = (client.value.billing_email || client.value.primary_email)?.toLowerCase()

  return business.invoices.filter((inv) => {
    return (
      inv.customer_id === client.value.id ||
      (name && inv.client_name?.toLowerCase().includes(name)) ||
      (name && inv.organization_name?.toLowerCase().includes(name)) ||
      (email && inv.client_email?.toLowerCase() === email)
    )
  })
})

const clientBalance = computed(() => {
  return clientInvoices.value
    .filter((inv) => inv.status !== 'Cancelled')
    .reduce((acc, inv) => acc + Number(inv.balance_due || 0), 0)
})

const hasAddress = computed(() => {
  if (!client.value) return false
  return Boolean(
    client.value.billing_address_line1 ||
    client.value.address ||
    client.value.billing_city ||
    client.value.city
  )
})

const formattedLocation = computed(() => {
  if (!client.value) return ''
  const c = client.value
  const parts = []
  const city = c.billing_city || c.city
  const state = c.billing_state_province || c.state
  const zip = c.billing_postal_code || c.zip
  const country = c.billing_country || 'United States'

  if (city && state) parts.push(`${city}, ${state} ${zip || ''}`.trim())
  else if (city) parts.push(`${city} ${zip || ''}`.trim())
  else if (state) parts.push(`${state} ${zip || ''}`.trim())

  if (country) parts.push(country)
  return parts.length ? parts.join(' • ') : 'United States'
})

const googleMapsUrl = computed(() => {
  if (!client.value) return '#'
  const c = client.value
  const addr = [
    c.billing_address_line1 || c.address || '',
    c.billing_city || c.city || '',
    c.billing_state_province || c.state || '',
    c.billing_postal_code || c.zip || '',
    c.billing_country || '',
  ].filter(Boolean).join(', ')
  return `https://maps.google.com/?q=${encodeURIComponent(addr)}`
})

function copyToClipboard(text, fieldName) {
  if (!text) return
  navigator.clipboard.writeText(text)
  copiedField.value = fieldName
  setTimeout(() => {
    if (copiedField.value === fieldName) copiedField.value = null
  }, 2000)
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Paid':
      return 'bg-surface-green-2 text-ink-green-7 border border-outline-green-2'
    case 'Overdue':
      return 'bg-surface-red-2 text-ink-red-7 border border-outline-red-2'
    case 'Issued':
      return 'bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2'
    case 'Partially paid':
      return 'bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2'
    case 'Draft':
      return 'bg-surface-gray-2 text-ink-gray-7 border border-outline-gray-2'
    case 'Cancelled':
      return 'bg-surface-gray-2 text-ink-gray-5 border border-outline-gray-2'
    default:
      return 'bg-surface-gray-2 text-ink-gray-7 border border-outline-gray-2'
  }
}

function openEditModal() {
  if (!client.value) return
  const c = client.value
  Object.assign(clientForm, {
    company_name: c.company_name || '',
    legal_structure: c.legal_structure || 'Corporation',
    company_registration_number: c.company_registration_number || '',
    tin: c.tin || c.tax_id || '',
    vat_number: c.vat_number || '',
    industry: c.industry || 'Technology',
    website: c.website || '',
    billing_address_line1: c.billing_address_line1 || c.address || '',
    billing_address_line2: c.billing_address_line2 || '',
    billing_city: c.billing_city || c.city || '',
    billing_state_province: c.billing_state_province || c.state || '',
    billing_postal_code: c.billing_postal_code || c.zip || '',
    billing_country: c.billing_country || 'United States',
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    primary_email: c.billing_email || c.primary_email || '',
    phone: c.phone || c.mobile_no || '',
    job_title: c.job_title || 'Primary Contact',
    national_id_number: c.national_id_number || '',
    default_currency: c.default_currency || 'USD',
    default_payment_terms: c.default_payment_terms || 'Net 30',
    credit_limit: Number(c.credit_limit) || 25000,
    status: c.status || 'Active',
  })
  showEditModal.value = true
}

async function saveClient() {
  if (!client.value) return
  saving.value = true
  try {
    await business.updateClient(client.value.id, { ...clientForm })
    showEditModal.value = false
  } finally {
    saving.value = false
  }
}

function openPaymentModal(inv) {
  selectedInvoice.value = inv
  showPaymentModal.value = true
}

async function confirmUpgradeClient() {
  if (!client.value) return
  const c = client.value

  await business.updateUserRole(c.id, 'Staff')

  // Update in business.users
  const userEmail = c.billing_email || c.primary_email
  const userIdx = business.users.findIndex(
    (u) => u.id === c.id || (userEmail && u.email?.toLowerCase() === userEmail.toLowerCase())
  )
  if (userIdx !== -1) {
    business.users[userIdx].role = 'Staff'
  } else {
    business.users.push({
      id: c.id,
      email: userEmail,
      full_name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.company_name,
      role: 'Staff',
      avatar: null,
    })
  }

  // Remove from customers list
  business.customers = business.customers.filter((item) => item.id !== c.id)

  localStorage.setItem('crestara_users', JSON.stringify(business.users))
  localStorage.setItem('crestara_customers', JSON.stringify(business.customers))

  showUpgradeModal.value = false
  router.push('/business-settings')
}
</script>
