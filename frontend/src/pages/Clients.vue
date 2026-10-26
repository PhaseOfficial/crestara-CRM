<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2">
          <h1 class="text-xl font-bold text-ink-gray-9">{{ __('Clients') }}</h1>
          <span class="text-xs px-2 py-0.5 rounded-full bg-surface-gray-2 dark:bg-surface-gray-1 text-ink-gray-8 dark:text-ink-gray-6 font-semibold">
            {{ filteredClients.length }}
          </span>
        </div>
      </template>
      <template #right-header>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <Button
            v-if="business.pendingChangeRequests.length"
            variant="subtle"
            iconLeft="clock"
            :label="isMobileView ? `${business.pendingChangeRequests.length}` : __('{0} Pending Approvals', [business.pendingChangeRequests.length])"
            class="!bg-surface-amber-2 !text-ink-amber-8 dark:!bg-amber-950/50 dark:!text-amber-300 border border-outline-amber-2 dark:border-amber-800/60 hover:!bg-surface-amber-3 dark:hover:!bg-amber-900/50 transition-colors"
            @click="activeTab = 'pending'"
          />
          <Button
            variant="solid"
            :label="isMobileView ? '' : __('Add Client')"
            iconLeft="plus"
            @click="openAddClientModal"
          />
        </div>
      </template>
    </LayoutHeader>

    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- Filters & Status Tabs -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <!-- Status Tabs -->
        <div class="flex flex-wrap gap-1 bg-surface-gray-2 dark:bg-surface-gray-1 p-1 rounded-lg text-xs font-medium">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'all' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
            @click="activeTab = 'all'"
          >
            {{ __('All Clients') }}
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            :class="activeTab === 'pending' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
            @click="activeTab = 'pending'"
          >
            <span>{{ __('Pending Approvals') }}</span>
            <span
              v-if="business.pendingChangeRequests.length"
              class="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2"
            >
              {{ business.pendingChangeRequests.length }}
            </span>
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-md transition-colors"
            :class="activeTab === 'history' ? 'bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm' : 'text-ink-gray-7 dark:text-ink-gray-6 hover:text-ink-gray-9'"
            @click="activeTab = 'history'"
          >
            {{ __('Change Request History') }}
          </button>
        </div>

        <!-- Search Bar -->
        <div class="w-full sm:w-64">
          <TextInput
            v-model="searchQuery"
            type="search"
            :placeholder="__('Search clients or contacts...')"
            iconLeft="search"
          />
        </div>
      </div>

      <!-- TAB 1: ALL CLIENTS DATA TABLE & ADAPTIVE CARDS -->
      <div v-if="activeTab === 'all'" class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
        <!-- Desktop Table (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-6">{{ __('Organization / Entity') }}</th>
                <th class="py-3 px-6">{{ __('Primary Contact') }}</th>
                <th class="py-3 px-6">{{ __('CRN / Tax ID') }}</th>
                <th class="py-3 px-6">{{ __('Location') }}</th>
                <th class="py-3 px-6">{{ __('Payment Terms') }}</th>
                <th class="py-3 px-6">{{ __('Status') }}</th>
                <th class="py-3 px-6 text-right">{{ __('Actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr
                v-for="c in filteredClients"
                :key="c.id"
                class="hover:bg-surface-gray-1 transition-colors cursor-pointer"
                @click="router.push(`/clients/${c.id}`)"
              >
                <!-- Organization with Avatar & Subtitle -->
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="size-9 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-xs shrink-0">
                      {{ (c.company_name || 'C').substring(0, 2).toUpperCase() }}
                    </div>
                    <div>
                      <div class="font-semibold text-ink-gray-9 text-sm hover:text-ink-blue-7 dark:hover:text-ink-blue-3 transition-colors">
                        {{ c.company_name }}
                      </div>
                      <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
                        {{ c.legal_structure }}<span v-if="c.industry"> • {{ c.industry }}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Primary Contact -->
                <td class="py-4 px-6">
                  <div class="font-medium text-ink-gray-9 text-sm">
                    {{ c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : (c.contact_name || c.company_name) }}
                  </div>
                  <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
                    {{ c.primary_email || c.billing_email || '—' }}
                  </div>
                  <div v-if="c.phone" class="text-[11px] text-ink-gray-6 dark:text-ink-gray-5">
                    {{ c.phone }}
                  </div>
                </td>

                <!-- Registry Details -->
                <td class="py-4 px-6 text-xs text-ink-gray-9 dark:text-ink-gray-8 font-mono">
                  <div v-if="c.company_registration_number">
                    <span class="text-ink-gray-6 dark:text-ink-gray-5 text-[10px] uppercase font-sans font-medium">CRN:</span> {{ c.company_registration_number }}
                  </div>
                  <div v-if="c.tin || c.tax_id">
                    <span class="text-ink-gray-6 dark:text-ink-gray-5 text-[10px] uppercase font-sans font-medium">TIN:</span> {{ c.tin || c.tax_id }}
                  </div>
                  <div v-if="!c.company_registration_number && !c.tin && !c.tax_id" class="text-ink-gray-5 dark:text-ink-gray-5 font-sans">
                    —
                  </div>
                </td>

                <!-- Location -->
                <td class="py-4 px-6 text-xs text-ink-gray-9 dark:text-ink-gray-8">
                  <div>{{ c.billing_city || '—' }}</div>
                  <div class="text-[11px] text-ink-gray-6 dark:text-ink-gray-5">{{ c.billing_country || '' }}</div>
                </td>

                <!-- Terms -->
                <td class="py-4 px-6 text-xs text-ink-gray-9 dark:text-ink-gray-8">
                  <div class="font-medium">{{ c.default_currency || 'USD' }} • {{ c.default_payment_terms || 'Net 30' }}</div>
                  <div v-if="c.credit_limit" class="text-[11px] text-ink-gray-6 dark:text-ink-gray-5">
                    Limit: ${{ Number(c.credit_limit).toLocaleString() }}
                  </div>
                </td>

                <!-- Status -->
                <td class="py-4 px-6">
                  <span
                    class="px-2.5 py-1 rounded-full text-xs font-semibold border"
                    :class="c.status === 'Active' ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2' : 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'"
                  >
                    {{ __(c.status || 'Active') }}
                  </span>
                </td>

                <!-- Actions -->
                <td class="py-4 px-6 text-right" @click.stop>
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft="file-edit"
                      :tooltip="__('Edit Client')"
                      @click="openEditClientModal(c)"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft="user-plus"
                      :tooltip="__('Upgrade to Staff')"
                      class="!text-amber-600 dark:!text-amber-400 hover:!text-amber-700 dark:hover:!text-amber-300 hover:!bg-amber-50 dark:hover:!bg-amber-950/60 transition-colors"
                      @click="promptUpgradeClient(c)"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      iconLeft="chevron-right"
                      @click="router.push(`/clients/${c.id}`)"
                    />
                  </div>
                </td>
              </tr>

              <!-- Clean Empty Row -->
              <tr v-if="!filteredClients.length">
                <td colspan="7" class="py-12 text-center text-ink-gray-6 dark:text-ink-gray-5">
                  <div class="space-y-2">
                    <span class="lucide-building-2 size-8 text-ink-gray-5 dark:text-ink-gray-4 mx-auto block" />
                    <h4 class="text-sm font-bold text-ink-gray-9">{{ __('No Clients Found') }}</h4>
                    <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">{{ __('Try adjusting your search query or click "Add Client" to register a new organization.') }}</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Adaptive Cards View (< 768px) -->
        <div class="md:hidden divide-y divide-outline-gray-1">
          <div
            v-for="c in filteredClients"
            :key="c.id"
            class="p-4 hover:bg-surface-gray-1 transition-colors cursor-pointer space-y-3"
            @click="router.push(`/clients/${c.id}`)"
          >
            <!-- Top Row: Avatar, Title, Status & Chevron -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3 min-w-0">
                <div class="size-10 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-xs shrink-0">
                  {{ (c.company_name || 'C').substring(0, 2).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-ink-gray-9 text-sm truncate hover:text-ink-blue-7 dark:hover:text-ink-blue-3 transition-colors">
                    {{ c.company_name }}
                  </div>
                  <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6 truncate">
                    {{ c.legal_structure }}<span v-if="c.industry"> • {{ c.industry }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <span
                  class="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                  :class="c.status === 'Active' ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2' : 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'"
                >
                  {{ __(c.status || 'Active') }}
                </span>
                <span class="lucide-chevron-right size-4 text-ink-gray-5 dark:text-ink-gray-4" />
              </div>
            </div>

            <!-- Primary Contact & Details Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg">
              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Contact') }}</span>
                <span class="font-medium text-ink-gray-9">
                  {{ c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : (c.contact_name || '—') }}
                </span>
                <div class="text-ink-gray-7 dark:text-ink-gray-6 truncate">
                  <a v-if="c.primary_email || c.billing_email" :href="`mailto:${c.primary_email || c.billing_email}`" class="text-ink-blue-7 dark:text-ink-blue-3 hover:underline" @click.stop>
                    {{ c.primary_email || c.billing_email }}
                  </a>
                  <span v-else>—</span>
                </div>
                <div v-if="c.phone" class="text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
                  <a :href="`tel:${c.phone}`" class="hover:underline" @click.stop>{{ c.phone }}</a>
                </div>
              </div>

              <div>
                <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Billing & Terms') }}</span>
                <div class="text-ink-gray-9 dark:text-ink-gray-8">
                  {{ c.billing_city || '—' }}<span v-if="c.billing_country">, {{ c.billing_country }}</span>
                </div>
                <div class="text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
                  {{ c.default_currency || 'USD' }} • {{ c.default_payment_terms || 'Net 30' }}
                </div>
                <div v-if="c.credit_limit" class="text-ink-gray-6 dark:text-ink-gray-5 text-[11px]">
                  Limit: ${{ Number(c.credit_limit).toLocaleString() }}
                </div>
              </div>
            </div>

            <!-- Mobile Quick Actions -->
            <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-gray-1/40" @click.stop>
              <Button
                size="sm"
                variant="outline"
                iconLeft="file-edit"
                :label="__('Edit')"
                @click="openEditClientModal(c)"
              />
              <Button
                size="sm"
                variant="subtle"
                iconLeft="user-plus"
                :label="__('Upgrade')"
                class="!bg-surface-amber-2 !text-ink-amber-8 dark:!bg-amber-950/50 dark:!text-amber-300 border border-outline-amber-2 dark:border-amber-800/60 hover:!bg-surface-amber-3 dark:hover:!bg-amber-900/50 transition-colors"
                @click="promptUpgradeClient(c)"
              />
              <Button
                size="sm"
                variant="solid"
                :label="__('View')"
                iconRight="arrow-right"
                @click="router.push(`/clients/${c.id}`)"
              />
            </div>
          </div>

          <div v-if="!filteredClients.length" class="py-12 text-center text-ink-gray-5">
            <span class="lucide-building-2 size-8 text-ink-gray-5 dark:text-ink-gray-4 mx-auto block mb-2" />
            <p class="text-base font-semibold text-ink-gray-9">{{ __('No clients found') }}</p>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-1">{{ __('Try adjusting your search criteria or add a client above.') }}</p>
          </div>
        </div>
      </div>

      <!-- TAB 2: PENDING APPROVALS QUEUE -->
      <div v-if="activeTab === 'pending'" class="flex-1 overflow-y-auto space-y-4">
        <div v-if="business.pendingChangeRequests.length" class="space-y-4">
          <div
            v-for="req in business.pendingChangeRequests"
            :key="req.id"
            class="bg-surface-base border border-outline-amber-2 rounded-xl p-5 shadow-sm space-y-4"
          >
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-gray-1 pb-3">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-ink-gray-9">{{ req.organization }}</h3>
                  <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2">
                    {{ __('Pending Verification') }}
                  </span>
                </div>
                <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
                  {{ __('Submitted by {0} ({1}) on {2}', [req.client_name, req.client_email, req.requested_date]) }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="subtle"
                  theme="red"
                  iconLeft="x"
                  :label="__('Reject')"
                  @click="openRejectModal(req)"
                />
                <Button
                  size="sm"
                  variant="solid"
                  theme="green"
                  iconLeft="check"
                  :label="__('Approve Updates')"
                  @click="approveRequest(req.id)"
                />
              </div>
            </div>

            <!-- Client Reason -->
            <div class="bg-surface-gray-1 border border-outline-gray-1/60 p-3 rounded-lg text-xs text-ink-gray-8 dark:text-ink-gray-7">
              <span class="font-bold text-ink-gray-9 block">{{ __('Client Reason for Request:') }}</span>
              <p class="mt-0.5">{{ req.reason }}</p>
            </div>

            <!-- Comparison Table: Current vs Requested -->
            <div class="border border-outline-gray-1 rounded-lg overflow-hidden">
              <table class="w-full text-left text-xs border-collapse">
                <thead class="bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider font-semibold border-b border-outline-gray-1">
                  <tr>
                    <th class="py-2.5 px-4 w-1/4">{{ __('Field') }}</th>
                    <th class="py-2.5 px-4 w-3/8">{{ __('Current Verified Record') }}</th>
                    <th class="py-2.5 px-4 w-3/8 bg-surface-blue-1/50 dark:bg-surface-blue-2/30 text-ink-blue-8 dark:text-ink-blue-3">{{ __('Requested New Value') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-gray-1">
                  <tr v-if="req.requested_details.company && req.requested_details.company !== req.current_details.company">
                    <td class="py-2 px-4 font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('Company Name') }}</td>
                    <td class="py-2 px-4 text-ink-gray-6 dark:text-ink-gray-5 line-through">{{ req.current_details.company || '—' }}</td>
                    <td class="py-2 px-4 font-bold text-ink-blue-7 dark:text-ink-blue-3 bg-surface-blue-1/30 dark:bg-surface-blue-2/20">{{ req.requested_details.company }}</td>
                  </tr>

                  <tr v-if="req.requested_details.company_registration_number && req.requested_details.company_registration_number !== req.current_details.company_registration_number">
                    <td class="py-2 px-4 font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('Company Reg. Number (CRN)') }}</td>
                    <td class="py-2 px-4 text-ink-gray-6 dark:text-ink-gray-5 line-through">{{ req.current_details.company_registration_number || '—' }}</td>
                    <td class="py-2 px-4 font-bold text-ink-blue-7 dark:text-ink-blue-3 bg-surface-blue-1/30 dark:bg-surface-blue-2/20">{{ req.requested_details.company_registration_number }}</td>
                  </tr>

                  <tr v-if="req.requested_details.tax_id && req.requested_details.tax_id !== req.current_details.tax_id">
                    <td class="py-2 px-4 font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('Tax ID / TIN / VAT') }}</td>
                    <td class="py-2 px-4 text-ink-gray-6 dark:text-ink-gray-5 line-through">{{ req.current_details.tax_id || '—' }}</td>
                    <td class="py-2 px-4 font-bold text-ink-blue-7 dark:text-ink-blue-3 bg-surface-blue-1/30 dark:bg-surface-blue-2/20">{{ req.requested_details.tax_id }}</td>
                  </tr>

                  <tr v-if="req.requested_details.full_name && req.requested_details.full_name !== req.current_details.full_name">
                    <td class="py-2 px-4 font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('Contact Full Name') }}</td>
                    <td class="py-2 px-4 text-ink-gray-6 dark:text-ink-gray-5 line-through">{{ req.current_details.full_name || '—' }}</td>
                    <td class="py-2 px-4 font-bold text-ink-blue-7 dark:text-ink-blue-3 bg-surface-blue-1/30 dark:bg-surface-blue-2/20">{{ req.requested_details.full_name }}</td>
                  </tr>

                  <tr v-if="req.requested_details.phone && req.requested_details.phone !== req.current_details.phone">
                    <td class="py-2 px-4 font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('Phone Number') }}</td>
                    <td class="py-2 px-4 text-ink-gray-6 dark:text-ink-gray-5 line-through">{{ req.current_details.phone || '—' }}</td>
                    <td class="py-2 px-4 font-bold text-ink-blue-7 dark:text-ink-blue-3 bg-surface-blue-1/30 dark:bg-surface-blue-2/20">{{ req.requested_details.phone }}</td>
                  </tr>

                  <tr v-if="req.requested_details.address && req.requested_details.address !== req.current_details.address">
                    <td class="py-2 px-4 font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('Billing Address') }}</td>
                    <td class="py-2 px-4 text-ink-gray-6 dark:text-ink-gray-5 line-through">{{ req.current_details.address || '—' }}</td>
                    <td class="py-2 px-4 font-bold text-ink-blue-7 dark:text-ink-blue-3 bg-surface-blue-1/30 dark:bg-surface-blue-2/20">{{ req.requested_details.address }}</td>
                  </tr>

                  <tr v-if="req.requested_details.city && req.requested_details.city !== req.current_details.city">
                    <td class="py-2 px-4 font-semibold text-ink-gray-8 dark:text-ink-gray-7">{{ __('City / Postal Code') }}</td>
                    <td class="py-2 px-4 text-ink-gray-6 dark:text-ink-gray-5 line-through">{{ req.current_details.city }} {{ req.current_details.zip }}</td>
                    <td class="py-2 px-4 font-bold text-ink-blue-7 dark:text-ink-blue-3 bg-surface-blue-1/30 dark:bg-surface-blue-2/20">{{ req.requested_details.city }} {{ req.requested_details.zip }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-else class="bg-surface-base border border-outline-gray-1 rounded-xl p-12 text-center text-ink-gray-6 dark:text-ink-gray-5 space-y-2">
          <span class="lucide-check-circle-2 size-8 text-emerald-500 mx-auto" />
          <h4 class="text-sm font-bold text-ink-gray-9">{{ __('All Caught Up!') }}</h4>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">{{ __('There are no pending client profile change requests waiting for approval.') }}</p>
        </div>
      </div>

      <!-- TAB 3: CHANGE REQUEST HISTORY -->
      <div v-if="activeTab === 'history'" class="flex-1 overflow-y-auto">
        <div class="bg-surface-base border border-outline-gray-1 rounded-xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead class="bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider font-semibold border-b border-outline-gray-1">
                <tr>
                  <th class="py-3 px-4">{{ __('Date') }}</th>
                  <th class="py-3 px-4">{{ __('Client Organization') }}</th>
                  <th class="py-3 px-4">{{ __('Requested Updates') }}</th>
                  <th class="py-3 px-4">{{ __('Status') }}</th>
                  <th class="py-3 px-4">{{ __('Reviewer & Notes') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-gray-1">
                <tr v-for="req in business.changeRequests" :key="req.id" class="hover:bg-surface-gray-1">
                  <td class="py-3 px-4 text-ink-gray-7 dark:text-ink-gray-6 whitespace-nowrap">{{ req.requested_date }}</td>
                  <td class="py-3 px-4">
                    <span class="font-bold text-ink-gray-9 block">{{ req.organization }}</span>
                    <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ req.client_name }}</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="space-y-0.5 text-ink-gray-8 dark:text-ink-gray-7">
                      <span v-if="req.requested_details.company !== req.current_details.company" class="block">
                        Company: <strong class="text-ink-gray-9">{{ req.requested_details.company }}</strong>
                      </span>
                      <span v-if="req.requested_details.company_registration_number !== req.current_details.company_registration_number" class="block">
                        CRN: <strong class="text-ink-gray-9">{{ req.requested_details.company_registration_number }}</strong>
                      </span>
                      <span v-if="req.requested_details.tax_id !== req.current_details.tax_id" class="block">
                        TIN: <strong class="text-ink-gray-9">{{ req.requested_details.tax_id }}</strong>
                      </span>
                      <span v-if="req.requested_details.address !== req.current_details.address" class="block">
                        Address: <strong class="text-ink-gray-9">{{ req.requested_details.address }}</strong>
                      </span>
                    </div>
                  </td>
                  <td class="py-3 px-4 whitespace-nowrap">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-bold"
                      :class="{
                        'bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2': req.status === 'Pending',
                        'bg-surface-green-2 text-ink-green-7 border border-outline-green-2': req.status === 'Approved',
                        'bg-surface-red-2 text-ink-red-7 border border-outline-red-2': req.status === 'Rejected',
                      }"
                    >
                      {{ __(req.status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-ink-gray-7 dark:text-ink-gray-6">
                    <span v-if="req.reviewed_by" class="block font-semibold text-ink-gray-9">
                      {{ req.reviewed_by }} ({{ req.reviewed_date }})
                    </span>
                    <span>{{ req.review_notes || '—' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: ADD / EDIT CLIENT ORGANIZATION & CONTACT -->
    <Dialog v-model:open="showClientModal" :size="'2xl'">
      <template #body>
        <div class="p-6 bg-surface-base text-ink-gray-9 space-y-6 max-h-[85vh] overflow-y-auto">
          <div class="border-b border-outline-gray-1 pb-3 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-bold text-ink-gray-9">
                {{ isEditing ? __('Edit Client Organization & Contacts') : __('Add New Client Organization') }}
              </h2>
              <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
                {{ __('Create the legal entity organization and assign their primary contact representative') }}
              </p>
            </div>
            <button
              type="button"
              class="text-ink-gray-5 dark:text-ink-gray-4 hover:text-ink-gray-9 transition-colors"
              @click="showClientModal = false"
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
                  v-model="clientForm.industry"
                  :label="__('Industry Sector')"
                  placeholder="e.g. Technology & SaaS"
                  type="text"
                />
                <FormControl
                  v-model="clientForm.website"
                  :label="__('Website URL')"
                  placeholder="e.g. https://acme.corp"
                  type="text"
                />
              </div>

              <!-- Billing Address -->
              <div class="space-y-2 pt-2">
                <FormControl
                  v-model="clientForm.billing_address_line1"
                  :label="__('Official Billing Street Address')"
                  placeholder="e.g. 450 Mission Street, Floor 14"
                  type="text"
                  required
                />
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <FormControl
                    v-model="clientForm.billing_city"
                    :label="__('City')"
                    placeholder="e.g. San Francisco"
                    type="text"
                    required
                  />
                  <FormControl
                    v-model="clientForm.billing_state_province"
                    :label="__('State / Province')"
                    placeholder="e.g. CA"
                    type="text"
                    required
                  />
                  <FormControl
                    v-model="clientForm.billing_postal_code"
                    :label="__('Postal / ZIP Code')"
                    placeholder="e.g. 94105"
                    type="text"
                    required
                  />
                </div>
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
                  required
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
              <Button variant="outline" :label="__('Cancel')" @click="showClientModal = false" />
              <Button
                variant="solid"
                type="submit"
                :label="isEditing ? __('Save Changes') : __('Create Client Organization')"
                :loading="saving"
              />
            </div>
          </form>
        </div>
      </template>
    </Dialog>

    <!-- REJECT REQUEST MODAL -->
    <Dialog v-model:open="showRejectDialog" :size="'md'">
      <template #body>
        <div class="p-6 bg-surface-base text-ink-gray-9 space-y-4">
          <h3 class="text-base font-bold text-ink-gray-9">
            {{ __('Reject Detail Change Request') }}
          </h3>
          <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6">
            {{ __('Provide an official reason for the rejection that will be recorded in the client’s audit history.') }}
          </p>

          <FormControl
            v-model="rejectionReason"
            :label="__('Rejection Notes')"
            type="textarea"
            rows="3"
            placeholder="e.g. Official tax documents required before updating registered company name..."
            required
          />

          <div class="flex justify-end gap-2 pt-3 border-t border-outline-gray-1">
            <Button variant="outline" :label="__('Cancel')" @click="showRejectDialog = false" />
            <Button
              variant="solid"
              theme="red"
              :label="__('Confirm Rejection')"
              :disabled="!rejectionReason.trim()"
              @click="confirmRejection"
            />
          </div>
        </div>
      </template>
    </Dialog>

    <!-- Upgrade Client to Staff Modal -->
    <Dialog v-model:open="showUpgradeDialog" :size="'sm'">
      <template #body>
        <div class="p-6 bg-surface-base space-y-4">
          <div class="flex items-center gap-2 border-b border-outline-gray-1 pb-3">
            <span class="lucide-arrow-up-circle size-5 text-amber-600 dark:text-amber-400" />
            <h2 class="text-base font-bold text-ink-gray-9">
              {{ __('Upgrade Client to Staff Member') }}
            </h2>
          </div>
          <p class="text-xs text-ink-gray-8 dark:text-ink-gray-7 leading-relaxed">
            Are you sure you want to upgrade <strong>{{ clientToUpgrade?.first_name ? `${clientToUpgrade.first_name} ${clientToUpgrade.last_name || ''}` : (clientToUpgrade?.contact_name || clientToUpgrade?.company_name) }}</strong> ({{ clientToUpgrade?.primary_email }}) to an internal <strong>Staff</strong> member?
          </p>
          <div class="p-3 bg-surface-amber-2/60 dark:bg-amber-950/40 border border-outline-amber-2 dark:border-amber-800/60 rounded-lg text-xs space-y-1 text-ink-amber-8 dark:text-amber-300">
            <span class="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
              <span class="lucide-shield-check size-3.5" />
              {{ __('Permission Elevation') }}
            </span>
            <p class="text-[11px] text-ink-gray-7 dark:text-ink-gray-6">
              {{ __('This will elevate their account to CRM staff access, permitting internal pipeline management.') }}
            </p>
          </div>
          <div class="flex justify-end gap-2 pt-3 border-t border-outline-gray-1">
            <Button variant="subtle" :label="__('Cancel')" @click="showUpgradeDialog = false" />
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Button, TextInput, Dialog, FormControl } from 'frappe-ui'
import LayoutHeader from '@/components/LayoutHeader.vue'
import { isMobileView } from '@/composables/settings'
import { useBusinessStore } from '@/stores/business'

const router = useRouter()
const business = useBusinessStore()

onMounted(async () => {
  await Promise.all([
    business.fetchClientsFromSupabase(),
    business.fetchChangeRequestsFromSupabase(),
  ])
})

async function refreshData() {
  await Promise.all([
    business.fetchClientsFromSupabase(),
    business.fetchChangeRequestsFromSupabase(),
  ])
}

const activeTab = ref('all') // 'all' | 'pending' | 'history'
const searchQuery = ref('')
const showClientModal = ref(false)
const isEditing = ref(false)
const editingClientId = ref(null)
const saving = ref(false)

const showRejectDialog = ref(false)
const selectedReqToReject = ref(null)
const rejectionReason = ref('')

const clientForm = reactive({
  company_name: '',
  legal_structure: 'Corporation',
  company_registration_number: '',
  tin: '',
  industry: '',
  website: '',
  billing_address_line1: '',
  billing_city: '',
  billing_state_province: '',
  billing_postal_code: '',
  billing_country: 'United States',
  first_name: '',
  last_name: '',
  primary_email: '',
  phone: '',
  job_title: '',
  national_id_number: '',
  default_currency: 'USD',
  default_payment_terms: 'Net 30',
  credit_limit: 25000,
})

const filteredClients = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return business.customers

  return business.customers.filter((c) => {
    return (
      c.company_name?.toLowerCase().includes(query) ||
      c.first_name?.toLowerCase().includes(query) ||
      c.last_name?.toLowerCase().includes(query) ||
      c.primary_email?.toLowerCase().includes(query) ||
      c.company_registration_number?.toLowerCase().includes(query) ||
      c.tin?.toLowerCase().includes(query)
    )
  })
})

function openAddClientModal() {
  isEditing.value = false
  editingClientId.value = null
  Object.assign(clientForm, {
    company_name: '',
    legal_structure: 'Corporation',
    company_registration_number: '',
    tin: '',
    industry: '',
    website: '',
    billing_address_line1: '',
    billing_city: '',
    billing_state_province: '',
    billing_postal_code: '',
    billing_country: 'United States',
    first_name: '',
    last_name: '',
    primary_email: '',
    phone: '',
    job_title: 'Primary Representative',
    national_id_number: '',
    default_currency: 'USD',
    default_payment_terms: 'Net 30',
    credit_limit: 25000,
  })
  showClientModal.value = true
}

function openEditClientModal(c) {
  isEditing.value = true
  editingClientId.value = c.id
  Object.assign(clientForm, {
    company_name: c.company_name || '',
    legal_structure: c.legal_structure || 'Corporation',
    company_registration_number: c.company_registration_number || '',
    tin: c.tin || c.tax_id || '',
    industry: c.industry || '',
    website: c.website || '',
    billing_address_line1: c.billing_address_line1 || c.address || '',
    billing_city: c.billing_city || c.city || '',
    billing_state_province: c.billing_state_province || c.state || '',
    billing_postal_code: c.billing_postal_code || c.zip || '',
    billing_country: c.billing_country || 'United States',
    first_name: c.first_name || '',
    last_name: c.last_name || '',
    primary_email: c.billing_email || c.primary_email || '',
    phone: c.phone || '',
    job_title: c.job_title || '',
    national_id_number: c.national_id_number || '',
    default_currency: c.default_currency || 'USD',
    default_payment_terms: c.default_payment_terms || 'Net 30',
    credit_limit: c.credit_limit || 25000,
  })
  showClientModal.value = true
}

async function saveClient() {
  if (!clientForm.company_name.trim()) return

  saving.value = true
  if (isEditing.value && editingClientId.value) {
    await business.updateClient(editingClientId.value, { ...clientForm })
  } else {
    await business.addClient({ ...clientForm })
  }
  saving.value = false
  showClientModal.value = false
}

async function approveRequest(reqId) {
  await business.approveChangeRequest(reqId, business.currentUser?.full_name || 'Staff')
}

function openRejectModal(req) {
  selectedReqToReject.value = req
  rejectionReason.value = ''
  showRejectDialog.value = true
}

async function confirmRejection() {
  if (!selectedReqToReject.value || !rejectionReason.value.trim()) return
  await business.rejectChangeRequest(
    selectedReqToReject.value.id,
    rejectionReason.value.trim(),
    business.currentUser?.full_name || 'Staff'
  )
  showRejectDialog.value = false
  selectedReqToReject.value = null
}

const showUpgradeDialog = ref(false)
const clientToUpgrade = ref(null)

function promptUpgradeClient(c) {
  clientToUpgrade.value = c
  showUpgradeDialog.value = true
}

async function confirmUpgradeClient() {
  if (!clientToUpgrade.value) return
  const c = clientToUpgrade.value

  // Elevate their role to Staff in Supabase and store
  await business.updateUserRole(c.id, 'Staff')

  // Update in business.users
  const userIdx = business.users.findIndex(
    (u) => u.id === c.id || (c.primary_email && u.email?.toLowerCase() === c.primary_email.toLowerCase())
  )
  if (userIdx !== -1) {
    business.users[userIdx].role = 'Staff'
  } else {
    business.users.push({
      id: c.id,
      email: c.primary_email,
      full_name: c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.company_name,
      role: 'Staff',
      avatar: null,
    })
  }

  // Remove from clients list
  business.customers = business.customers.filter((item) => item.id !== c.id)

  localStorage.setItem('crestara_users', JSON.stringify(business.users))
  localStorage.setItem('crestara_customers', JSON.stringify(business.customers))

  showUpgradeDialog.value = false
  clientToUpgrade.value = null
}
</script>
