# Crestara CRM — UI/UX Design System & Architectural Blueprint

> **Reference Specification for UI/UX Duplication across Features & Portals**  
> Complete documentation analyzing patterns across **Calendar**, **Clients**, **Dashboard**, **Notifications**, **Invoices**, the **Mobile Adaptability Architecture**, and the full **Modal & Core Component System**.

---

## 1. Design Philosophy & Foundations

Crestara CRM combines **Vue 3**, **Frappe UI 1.0 (beta)**, and **Tailwind CSS**, supplemented by **Lucide Icons** and **OKLCH dynamic color token math**.

### Core Tenets
1. **High Information Density with Zero Clutter**: B2B workflows require rapid data ingestion. Whitespace follows an intentional 4px/8px modular scale.
2. **Dual-Persona Architecture**:
   - **Internal Staff Portal (`/crm/*`)**: Operation-centric, telemetry-rich, keyboard-navigable (`LayoutHeader`, teleported action controls, side-panel flyouts, dense data tables).
   - **External Customer Portal (`/portal/*`)**: Client-facing, onboarding-guided, clear summary balances, self-service invoices, and automated renewal timelines.
3. **True Dark Mode Adaptation**: Never use hardcoded black/white hex codes. Always leverage Frappe UI semantic tokens (`surface-*`, `ink-*`, `outline-*`) or explicit `dark:` variants to prevent washed-out text or inverted sunken surfaces.
4. **Adaptive Responsiveness (768px Standard)**: Desktop leverages multi-column dense data tables; viewports `< 768px` automatically adapt into structured, high-touch cards with minimum 48px touch targets and integrated tap-to-call / tap-to-email actions.

---

## 2. Color System & Semantic Tokens

Frappe UI generates themed CSS custom properties mapped via OKLCH color spaces. All components must adhere to these tokens:

### Surface Tokens (`bg-surface-*`)
| Token | Light Mode Value | Dark Mode Value | Intended Usage |
|---|---|---|---|
| `bg-surface-base` | `#ffffff` (white) | `oklch(0.205)` (`gray-950`) | Primary page canvas, card backgrounds, dialog shells |
| `bg-surface-gray-1` | `gray-50` (`oklch(0.985)`) | `gray-900` (`oklch(0.26)`) | Page outer background, table header fills, sidebar fill |
| `bg-surface-gray-2` | `gray-100` (`oklch(0.967)`) | `gray-700` (`oklch(0.37)`) | Tab pill track, inactive badge background, neutral pill |
| `bg-surface-gray-3` | `gray-200` | `gray-600` | Active elevated tab pill in dark mode, hover fills |
| `bg-surface-blue-2` | `blue-100` | `blue-800` | Entity avatar badges, info banners, requested diff tags |
| `bg-surface-green-2` | `green-100` | `green-800` | Paid status pills, revenue metric icon container |
| `bg-surface-amber-2` | `amber-100` | `amber-800` | Pending verification pills, outstanding balance badges |
| `bg-surface-red-2` | `red-100` | `red-800` | Overdue invoice badges, rejection alerts, danger items |

### Ink Tokens (`text-ink-*`)
| Token | Light Mode Value | Dark Mode Value | Intended Usage |
|---|---|---|---|
| `text-ink-gray-9` | `gray-900` (deep charcoal) | `gray-50` (crisp white) | Main page titles, entity/company names, card numbers |
| `text-ink-gray-8` | `gray-800` | `gray-100` | High-contrast body text, primary contact names |
| `text-ink-gray-7` | `gray-700` | `gray-200` | Secondary metadata, subtitles, table headers, breadcrumbs |
| `text-ink-gray-6` | `gray-600` | `gray-300` | Tertiary labels, timestamps, due dates, helper hints |
| `text-ink-gray-5` | `gray-500` | `gray-400` | Decorative icons, subtle field hints |
| `text-ink-gray-4` | `gray-400` | `gray-400` | Disabled placeholders (avoid for small body text in dark mode) |
| `text-ink-blue-7` / `dark:text-ink-blue-3` | `blue-700` | `blue-300` | Active links, primary avatar text, interactive entity hovers |
| `text-ink-green-7` / `dark:text-ink-green-4` | `green-700` | `green-300` | Paid status badges, positive financial indicators |
| `text-ink-amber-8` / `dark:text-amber-300` | `amber-800` | `amber-300` | Warnings, pending verification, upgrade to staff alerts |
| `text-ink-red-7` / `dark:text-ink-red-4` | `red-700` | `red-300` | Overdue balances, error states, rejection tags |

### Outline / Border Tokens (`border-outline-*`)
- `border-outline-gray-1`: Structural dividers, table borders, card perimeters.
- `border-outline-gray-2`: Input borders, neutral badges.
- `border-outline-blue-2`, `border-outline-green-2`, `border-outline-amber-2`, `border-outline-red-2`: Semantic badge outlines (critical in dark mode to delineate pills from dark row backgrounds).

### 2.4. Cross-Page Color Uniformity & Canvas Inheritance Rules

To guarantee that all pages (Clients, Calendar, Dashboard, Invoices, Detail views) seamlessly match across light and dark themes:

1. **Root Canvas Inheritance Rule**:
   - `DesktopLayout.vue` and `MobileLayout.vue` establish `bg-surface-base` (`#ffffff` in light mode, `oklch(0.205)` in dark mode) globally for the application canvas.
   - **Mandatory Rule**: Page root containers must **NEVER** declare explicit background classes (such as `bg-surface-gray-1` or `bg-surface-gray-2`).
   - *Why this matters*: Applying an explicit background to a page root creates jarring color seams against the `AppHeader` and `AppSidebar`, and in dark mode causes cards (`bg-surface-base` `oklch(0.205)`) to appear as sunken black cutouts on a lighter grey canvas (`oklch(0.26)` / `oklch(0.37)`).
   - *Correct Page Root Pattern*:
     ```vue
     <template>
       <div class="flex flex-col h-full overflow-hidden">
         <!-- LayoutHeader and page content -->
       </div>
     </template>
     ```

2. **Card & Section Header Uniformity**:
   - Section and card header icons must use neutral tokens (`size-4 text-ink-gray-5 dark:text-ink-gray-4`), **NOT** saturated rainbow colors (avoid blue, green, or amber header icons on standard card titles).
   - Card title typography must consistently use: `text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6`.

3. **Table Header Backgrounds are Strictly `bg-surface-gray-1`**:
   - All data table headers must use: `<tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">`.
   - Never use `bg-surface-gray-2` for table headers; `bg-surface-gray-2` is reserved strictly for tab tracks and inactive badge backgrounds.

4. **Status Badge Palette Standardization**:
   - Always adhere to the canonical status badge dictionary established in `Invoices.vue` and `Clients.vue`:
     - **Paid**: `bg-surface-green-2 text-ink-green-7 border border-outline-green-2`
     - **Issued**: `bg-surface-blue-2 text-ink-blue-7 border border-outline-blue-2` *(Blue, never amber!)*
     - **Partially Paid**: `bg-surface-amber-2 text-ink-amber-7 border border-outline-amber-2`
     - **Overdue**: `bg-surface-red-2 text-ink-red-7 border border-outline-red-2`
     - **Draft**: `bg-surface-gray-2 text-ink-gray-7 border border-outline-gray-2`
     - **Cancelled**: `bg-surface-gray-2 text-ink-gray-5 border border-outline-gray-2`
     - **Active Client**: `bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border border-outline-green-2`
     - **Pending Verification**: `bg-surface-amber-2 text-ink-amber-7 dark:text-ink-amber-4 border border-outline-amber-2`

5. **Financial Metrics & Balances Due**:
   - Balances due / outstanding receivables must use `text-ink-amber-3` when positive, and `text-ink-gray-9` or `text-ink-green-3` when settled. Avoid arbitrary hardcoded Tailwind colors (`text-amber-600`, `text-emerald-600`).

6. **Table Row Action Buttons (Calibrated Low-Dominance)**:
   - Row action buttons inside tables and cards must use `<Button size="xs" variant="outline" ... />` or `variant="ghost"`.
   - Never place bright solid amber/colored buttons inside table rows to preserve visual hierarchy and avoid visual clutter.

7. **Monospace Badges (CRN / TIN / Tax IDs)**:
   - Registry and tax numbers must use the rounded pill badge from `Clients.vue`:
     ```vue
     <span class="inline-flex items-center font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60">
       {{ number || '—' }}
     </span>
     ```

8. **Header Amber Callout Buttons**:
   - In the top `LayoutHeader`, amber action buttons must use `variant="subtle"` with:
     `class="!bg-surface-amber-2 !text-ink-amber-8 dark:!bg-amber-950/50 dark:!text-amber-300 border border-outline-amber-2 dark:border-amber-800/60 hover:!bg-surface-amber-3 dark:hover:!bg-amber-900/50 transition-colors"`.

---

## 3. Typography & Spatial Rhythm

- **Primary Font**: `Inter, system-ui, -apple-system, sans-serif`.
- **Monospace Font**: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.
  - Applied to: IDs (`INV-2026-0042`), Registration Numbers (`CRN`, `TIN`, `VAT`), currency values, financial tables.
- **Hierarchy Standard**:
  - `text-2xl font-bold text-ink-gray-9 tracking-tight`: Top-level page titles, hero stat values.
  - `text-xl font-bold text-ink-gray-9`: LayoutHeader module titles, primary KPI numbers.
  - `text-lg font-bold text-ink-gray-9`: Detail page hero headers, modal titles.
  - `text-base font-bold / font-semibold`: Card headers, section titles.
  - `text-sm font-semibold text-ink-gray-9`: Table row titles, company names.
  - `text-xs uppercase font-semibold text-ink-gray-7 tracking-wider`: Table column headers, stat category labels.
  - `text-xs text-ink-gray-7 dark:text-ink-gray-6`: Secondary labels, emails, descriptions.
  - `text-[11px] / text-[10px]`: Phone numbers, badge text, relative timestamps (`timeAgo()`).

---

## 4. Layout Architecture & Dual-Persona Shells

```
┌────────────────────────────────────────────────────────────────────────┐
│ AppHeader (#app-header)                                                │
│  ├─ Left: Teleported LayoutHeader (#left-header: Breadcrumbs/Title)    │
│  └─ Right: Teleported LayoutHeader (#right-header: Action Buttons)     │
├───────────────┬────────────────────────────────────────────────────────┤
│ AppSidebar    │ Main Content Canvas (flex-1 overflow-y-auto p-6)       │
│               │                                                        │
│ (Desktop)     │ ├─ KPI Summary Stat Cards Grid (1 to 4 cols)           │
│ Collapsible   │ ├─ Filter Toolbar (Status Tabs + Search Bar)           │
│ 260px wide    │ └─ Data Surface:                                       │
│               │    ├─ Desktop Table (hidden md:block)                  │
│               │    └─ Mobile Adaptive Cards (md:hidden)                │
└───────────────┴────────────────────────────────────────────────────────┘
│ (Mobile < 768px) MobileBottomNav: Top 4 Dynamic Items + [More] Drawer  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Comprehensive Mobile Adaptability Architecture

The mobile experience in Crestara CRM is an engineered, touch-first responsive system designed for single-hand ergonomics, low-latency navigation, and rapid operational workflows.

### 5.1. The 768px Breakpoint Standard & Dynamic Layout Switching

- **Threshold Standard**: Exactly **`768px` (`md:`)**.
- **Implementation Mechanism**: Managed centrally in [`frontend/src/composables/settings.js`](file:///E:/crestara%20CRM/frontend/src/composables/settings.js) using `@vueuse/core`'s reactive `useWindowSize()`:
  ```javascript
  import { useWindowSize } from '@vueuse/core'
  import { computed, ref } from 'vue'

  const { width } = useWindowSize()
  export const isMobileView = computed(() => width.value < 768)
  export const mobileSidebarOpened = ref(false)
  ```
- **Dynamic Asynchronous Layout Mounting**:
  In [`frontend/src/App.vue`](file:///E:/crestara%20CRM/frontend/src/App.vue), layout shells switch reactively without requiring a page refresh or losing component state:
  ```javascript
  const MobileLayout = defineAsyncComponent(() => import('./components/Layouts/MobileLayout.vue'))
  const DesktopLayout = defineAsyncComponent(() => import('./components/Layouts/DesktopLayout.vue'))
  const Layout = computed(() => (isMobileView.value ? MobileLayout : DesktopLayout))
  ```
  - Resizing windows across 768px or rotating mobile devices dynamically switches between Desktop and Mobile layouts instantaneously.

---

### 5.2. Dynamic Click-Count-Based Bottom Navigation

Mobile users navigate with thumbs in the bottom 30% of the screen. Crestara CRM uses an adaptive 5-slot bottom bar for both Staff and Customer portals.

#### 5.2.1. The 5-Slot Architecture
- **Slots 1–4**: The user's **Top 4 most-clicked CRM modules**, dynamically sorted by real navigation frequency.
- **Slot 5**: Always permanently locked to **"More"**, opening the slide-over drawer containing secondary and administrative links.

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│  #1 Ranked   │  #2 Ranked   │  #3 Ranked   │  #4 Ranked   │    [More]    │
│  Dynamic Tab │  Dynamic Tab │  Dynamic Tab │  Dynamic Tab │ (Drawer Open)│
│  (e.g. Deals)│(e.g. Clients)│ (e.g. Invoices│ (e.g. Tasks) │  (Fixed #5)  │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

#### 5.2.2. Persistent Tracking Engine ([`navFrequency.js`](file:///E:/crestara%20CRM/frontend/src/utils/navFrequency.js))
- Pure utility functions (`getStoredCounts`, `incrementClickCount`, `rankNavItems`).
- Stored per workspace in `localStorage` (`crm_staff_nav_clicks` and `crm_client_nav_clicks`).
- Every navigation click inside the bottom bar **or inside the slide-over drawer** calls `recordClick(item.key)`. As a user works frequently with `Inventory` or `Transactions`, those modules naturally bubble up into the primary bottom bar automatically!

```javascript
// Storage keys
export const STAFF_NAV_STORAGE_KEY = 'crm_staff_nav_clicks'
export const CLIENT_NAV_STORAGE_KEY = 'crm_client_nav_clicks'

// Default seed frequencies ensure clean layout on first run
export const DEFAULT_STAFF_COUNTS = {
  Deals: 100,
  Leads: 80,
  Clients: 60,
  Invoices: 40,
  Tasks: 20,
  Inventory: 10,
  Transactions: 10,
  Calendar: 10,
}
```

#### 5.2.3. Active State & Sub-Route Highlighting
- Active tabs feature a top accent pill:
  ```vue
  <span
    v-if="isItemActive(item)"
    class="absolute top-0 w-6 h-0.5 rounded-full bg-surface-blue-6"
  />
  ```
- **Secondary View Fallback**: If a staff member navigates to a module currently *not* in their top 4 (e.g. `Reminders` or `Business Settings`), the **"More"** button automatically highlights as active (`isMoreActive`), clearly indicating to the user that they are in an extended sub-view.

#### 5.2.4. Ergonomics & Safe Area Insets
- Minimum touch target: `min-h-[48px]` per button to prevent mis-taps.
- Bottom safe-area clearance for modern borderless phones (iPhone Home Indicator, Android gesture bar):
  ```html
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-base/95 backdrop-blur border-t border-outline-gray-1 px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg flex items-center justify-around">
  ```

---

### 5.3. Bottom Nav Clearance & Scroll Padding Rules

> [!IMPORTANT]
> **Mandatory Scroll Padding Rule**  
> Because the mobile navigation bar is `fixed` at the bottom (`z-40`), any page scroll container that fails to provide bottom padding will have its bottom-most records, pagination, or floating CTAs permanently hidden behind the bar!

- **Staff Portal Containers**: Must specify `pb-20` on [`MobileLayout.vue`](file:///E:/crestara%20CRM/frontend/src/components/Layouts/MobileLayout.vue#L5) and page canvas.
- **Client Portal Containers**: Must specify `pb-24 md:pb-6` on [`CustomerLayout.vue`](file:///E:/crestara%20CRM/frontend/src/components/Layouts/CustomerLayout.vue#L32) and [`CustomerDashboard.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Portal/CustomerDashboard.vue).

---

### 5.4. Slide-Over Mobile Drawer System ([`MobileSidebar.vue`](file:///E:/crestara%20CRM/frontend/src/components/Mobile/MobileSidebar.vue))

- Built using Headless UI `@headlessui/vue` (`TransitionRoot`, `TransitionChild`, `Dialog`, `DialogOverlay`).
- **Smooth 200ms slide-and-fade animation**:
  - Panel: `enter="transition ease-in-out duration-200 transform" enter-from="-translate-x-full" enter-to="translate-x-0"`
  - Backdrop: `bg-surface-gray-8 bg-opacity-50 backdrop-blur-sm`
- **Route Auto-Dismiss**: A Vue watcher observes `() => route.fullPath` and automatically sets `mobileSidebarOpened.value = false` on navigation.
- **W-fit Panel Constraint**: The drawer wrapper uses `w-fit` so it only occupies the sidebar width (260px). Without `w-fit`, block elements swallow clicks meant for the overlay, breaking the "tap outside to dismiss" interaction.

---

### 5.5. Responsive Header Adaptation

Screen space above the fold on mobile is scarce. The header adapts via `LayoutHeader.vue`:
1. **Collapsed Action Buttons (< 640px)**:
   ```vue
   <Button
     variant="solid"
     :label="isMobileView ? '' : __('Add Client')"
     iconLeft="plus"
     @click="openAddClientModal"
   />
   ```
   Button labels disappear, reducing button width from ~120px to 36px icon buttons, preventing multi-row button collision with the hamburger menu trigger.
2. **Compact Module Titles**:
   Breadcrumbs collapse to simple bold title + pill counter (`filteredClients.length`).

---

### 5.6. Universal Table-to-Card Responsive Transformation

Every table in the CRM uses a standardized dual-mode pattern:
- **Desktop (>= 768px)**: Standard multi-column tabular grid with column headers, monospace IDs, and right-aligned actions.
- **Mobile (< 768px)**: High-touch cards with full information preservation.

```
┌────────────────────────────────────────────────────────┐
│ [C] Acme Corporation                        [Active] > │
│     Corporation • Technology                           │
├────────────────────────────────────────────────────────┤
│ ┌───────────────────────────┬────────────────────────┐ │
│ │ CONTACT                   │ BILLING & TERMS        │ │
│ │ Sarah Connor              │ San Francisco, US      │ │
│ │ sarah@acme.corp (tap)     │ USD • Net 30           │ │
│ │ +1 (555) 789-0123 (tap)   │ Limit: $25,000         │ │
│ └───────────────────────────┴────────────────────────┘ │
├────────────────────────────────────────────────────────┤
│                             [Edit]  [Upgrade]  [View]  │
└────────────────────────────────────────────────────────┘
```

#### Anatomy of an Adaptive Mobile Card
1. **Row 1: Entity Header**:
   - 40px Icon/Initials Avatar: `size-10 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 text-xs`.
   - Title & Subtitle: `font-bold text-ink-gray-9 text-sm truncate` with secondary industry/type in `text-xs text-ink-gray-7 dark:text-ink-gray-6`.
   - Status Badge: `px-2 py-0.5 rounded-full text-[11px] font-semibold border`.
   - Chevron: `lucide-chevron-right size-4 text-ink-gray-5 dark:text-ink-gray-4`.
2. **Row 2: 2-Column Structured Data Grid**:
   - Container: `grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg`.
   - Tap-to-call: `<a :href="'tel:' + phone" class="hover:underline" @click.stop>{{ phone }}</a>`.
   - Tap-to-email: `<a :href="'mailto:' + email" class="text-ink-blue-7 dark:text-ink-blue-3 hover:underline" @click.stop>{{ email }}</a>`.
   - Monospace financial metrics: Amounts, balances, and SKU codes.
3. **Row 3: Touch Action Footer**:
   - Top border divide: `pt-1 border-t border-outline-gray-1/40 flex items-center justify-end gap-2`.
   - All button clicks have `@click.stop` to prevent triggering card row navigation.

#### Summary of Adapted Modules:
| Module | Desktop Layout (>= 768px) | Mobile Adaptation (< 768px) | Special Mobile Features |
|---|---|---|---|
| **Clients** | 7-column table | Adaptive cards with contact grid | Direct `tel:` and `mailto:` links, Upgrade button |
| **Invoices** | 8-column ledger | Adaptive cards with balance callout | Amber highlighted balance due, "Record Payment" solid action |
| **Inventory** | 7-column stock table | Adaptive cards with SKU & type | Red "Low Stock" alert pill, quick Edit/Delete actions |
| **Transactions** | 8-column ledger | Adaptive cards with status & invoice ref | Bold green `+$Amount`, "View Receipt" touch button |
| **Customer Purchases** | 8-column purchase history | Adaptive cards with total vs balance | Full-width "View Receipt / Invoice" button |
| **Payment Reminders** | 8-column rule table | Adaptive cards with delivery status | "Send Now" one-tap reminder trigger |
| **Business Settings** | 4-column staff table | Adaptive cards with role assignment | In-card role select, Amber upgrade detection banner |

---

## 6. Modals & Dialog System Architecture

Modals in Crestara CRM provide focused, context-retaining experiences for forms, high-consequence confirmations, and verification workflows.

### 6.1. Dialog Component Specifications (`frappe-ui`)

- **Component**: `<Dialog v-model:open="isOpen" :size="size" />`
- **Supported Size Props**:
  - `'sm'`: 384px (`max-w-sm`) — Ideal for simple confirmations, permission elevation, single-input prompts.
  - `'md'`: 448px (`max-w-md`) — Reason inputs, simple dropdown selectors, status change dialogs.
  - `'lg'`: 512px (`max-w-lg`) — Medium forms with 4–6 fields.
  - `'xl'`: 576px (`max-w-xl`) — Form dialogs, assignments, customer guides.
  - `'2xl'`: 672px (`max-w-2xl`) — Multi-section complex entity creation (e.g. `Add Client`, `LeadModal`, `DealModal`).
  - `'3xl'` / `'4xl'`: Full-featured line-item builders, custom document inspectors.
- **Slots**:
  - `#body`: Main content container. Typically framed with `p-6 bg-surface-base text-ink-gray-9 space-y-6 max-h-[85vh] overflow-y-auto`.
  - `#actions`: Action buttons footer. Alternatively placed inside `#body` with `pt-4 border-t border-outline-gray-1 flex justify-end gap-2`.

---

### 6.2. The 4 Modal Archetypes in Crestara CRM

#### Archetype A: Multi-Section Complex Form Modal
*Example: Add / Edit Client Organization ([`Clients.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Clients.vue#L491-L705))*
- **Size**: `:size="'2xl'"`.
- **Header**: Large bold title (`text-lg font-bold text-ink-gray-9`), subtitle description (`text-xs text-ink-gray-7 dark:text-ink-gray-6`), and close button `X` with hover transition.
- **Section Dividers**:
  ```vue
  <h4 class="text-xs font-bold uppercase tracking-wider text-ink-blue-7 dark:text-ink-blue-3 flex items-center gap-1.5 border-b border-outline-gray-1 pb-1">
    <span class="lucide-building size-4" />
    {{ __('1. Organization Legal Entity Details') }}
  </h4>
  ```
- **Grid Layout**: 2-column or 3-column responsive fields (`grid grid-cols-1 sm:grid-cols-2 gap-4`).
- **Footer**: `flex justify-end gap-2 pt-4 border-t border-outline-gray-1` with Cancel outline button and Save solid button with `:loading="saving"`.

#### Archetype B: High-Consequence Confirmation Dialog
*Example: Upgrade Client to Staff Member ([`Clients.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Clients.vue#L741-L775) & [`Client.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Client.vue#L218-L252))*
- **Size**: `:size="'sm'"`.
- **Visual Alert**: Prominent warning icon in header (`lucide-arrow-up-circle size-5 text-amber-600 dark:text-amber-400`).
- **Exploratory Copy**: Clean explanation highlighting the entity name in bold.
- **Context Callout Box**:
  ```vue
  <div class="p-3 bg-surface-amber-2/60 dark:bg-amber-950/40 border border-outline-amber-2 dark:border-amber-800/60 rounded-lg text-xs space-y-1 text-ink-amber-8 dark:text-amber-300">
    <span class="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
      <span class="lucide-shield-check size-3.5" />
      {{ __('Permission Elevation') }}
    </span>
    <p class="text-[11px] text-ink-gray-7 dark:text-ink-gray-6">
      {{ __('This will elevate their account to CRM staff access, permitting internal pipeline management.') }}
    </p>
  </div>
  ```
- **Actions**: `<Button variant="subtle" :label="__('Cancel')" />` alongside `<Button variant="solid" class="!bg-amber-600 ... !text-white font-bold" :label="__('Confirm Upgrade')" />`.

#### Archetype C: Prompt / Decision Dialog
*Example: Reject Change Request ([`Clients.vue`](file:///E:/crestara%20CRM/frontend/src/pages/Clients.vue#L707-L739))*
- **Size**: `:size="'md'"`.
- **Form**: Contains mandatory explanation textarea:
  ```vue
  <FormControl
    v-model="rejectionReason"
    :label="__('Rejection Notes')"
    type="textarea"
    rows="3"
    placeholder="e.g. Official tax documents required before updating registered company name..."
    required
  />
  ```
- **Validation-Locked Action**: `:disabled="!rejectionReason.trim()"` prevents empty rejections.

#### Archetype D: Programmatic Form Dialog (`formDialog()`)
*Implemented via [`renderFieldLayoutDialog.js`](file:///E:/crestara%20CRM/frontend/src/utils/renderFieldLayoutDialog.js) and [`FieldLayoutDialog.vue`](file:///E:/crestara%20CRM/frontend/src/components/Modals/FieldLayoutDialog.vue)*
- Allows opening a complete modal form programmatically anywhere without declaring template `<Dialog>` tags!
- Returns a Promise resolving to the validated payload on submit or `null` on cancel.
- Three Usage Patterns:
  ```javascript
  // 1. Sequential Promise workflow
  const data = await formDialog({
    title: 'Quick Contact',
    fields: [
      { fieldname: 'first_name', label: 'First Name', fieldtype: 'Data', reqd: 1 },
      { fieldname: 'email', label: 'Email Address', fieldtype: 'Data' },
    ],
    defaults: { first_name: 'Alex' },
  })
  if (data) console.log('Saved:', data)

  // 2. Direct onSubmit callback
  formDialog({
    title: 'Assign Agent',
    doctype: 'CRM Deal',
    fieldnames: ['assigned_to', 'priority'],
    onSubmit(data) {
      saveAssignment(data)
    },
  })

  // 3. Custom actions array
  formDialog({
    title: 'Custom Workflow',
    fields: [...],
    actions: [
      { label: 'Save Draft', variant: 'outline', onClick({ data, close }) { close(data) } },
      { label: 'Publish', variant: 'solid', theme: 'blue', onClick({ data, close }) { close(data) } },
    ],
  })
  ```

---

## 7. Core Component Library & Usage Guide

Below is the verified API and styling specification for foundational components in Crestara CRM.

### 7.1. `<Button>` ([`Button.vue`](file:///E:/crestara%20CRM/frontend/node_modules/frappe-ui/src/components/Button/Button.vue))
- **Props**:
  - `variant`: `'solid'` | `'subtle'` | `'outline'` | `'ghost'` (default: `'subtle'`).
  - `size`: `'xs'` | `'sm'` | `'md'` | `'lg'` (default: `'sm'`).
  - `theme`: **STRICT CONSTRAINT**: only `'gray'` | `'blue'` | `'green'` | `'red'` (default: `'gray'`).
  - `label`: Button string label.
  - `iconLeft` / `iconRight`: Icon name string (e.g. `'plus'`, `'arrow-right'`) or lucide class.
  - `icon`: For single icon buttons (adds `isIconButton` styling).
  - `tooltip`: Tooltip string automatically rendered on hover.
  - `loading`: Boolean showing spinner.
  - `disabled`: Boolean disabling interaction.
- **Styling Rules**:
  - Primary CTA: `<Button variant="solid" :label="__('Save')" />` (or `theme="blue"`).
  - Secondary Action: `<Button variant="outline" :label="__('Edit')" />`.
  - Icon-only Row Action: `<Button size="sm" variant="ghost" iconLeft="file-edit" :tooltip="__('Edit')" />`.
  - Amber / Warning Button: Omit `theme` and pass explicit Tailwind utility classes:
    `class="!bg-amber-600 hover:!bg-amber-500 active:!bg-amber-700 !text-white dark:!bg-amber-500 dark:hover:!bg-amber-400 dark:!text-gray-950 font-bold shadow-sm"`.

---

### 7.2. `<FormControl>`
- Renders standard inputs, select dropdowns, textareas, or checkboxes with automated labels and validation states.
- **Props**:
  - `label`: String label placed above input.
  - `type`: `'text'` | `'number'` | `'email'` | `'search'` | `'select'` | `'textarea'` | `'date'`.
  - `modelValue` / `v-model`: Bound reactive state.
  - `placeholder`: Input placeholder.
  - `required`: Boolean adding red asterisk and HTML validation.
  - `options`: Array of `{ label: string, value: any }` when `type="select"`.
  - `rows`: Number of rows when `type="textarea"`.
- **Usage Example**:
  ```vue
  <FormControl
    v-model="clientForm.legal_structure"
    :label="__('Legal Structure')"
    type="select"
    :options="[
      { label: 'Corporation (Inc / Corp)', value: 'Corporation' },
      { label: 'Limited Liability Company (LLC)', value: 'LLC' },
    ]"
  />
  ```

---

### 7.3. `<TextInput>`
- Standalone sleek single-line input.
- **Props**:
  - `v-model`: Bound string.
  - `type`: `'text'` | `'search'` | `'email'` | `'number'`.
  - `iconLeft`: Prefix icon name (e.g. `'search'`).
  - `placeholder`: Placeholder string.
- **Usage**:
  ```vue
  <TextInput
    v-model="searchQuery"
    type="search"
    :placeholder="__('Search clients or contacts...')"
    iconLeft="search"
  />
  ```

---

### 7.4. `<DatePicker>` & `<DateRangePicker>`
- Popover date selection backed by `dayjs`.
- Custom target slots allow binding to buttons:
  ```vue
  <DatePicker :modelValue="selectedDate" @update:modelValue="onDateChange">
    <template #target="{ togglePopover }">
      <Button variant="ghost" :label="formattedDate" iconRight="chevron-down" @click="togglePopover" />
    </template>
  </DatePicker>
  ```

---

### 7.5. `<Badge>`
- Semantic counter or category pill.
- **Props**:
  - `label`: String or number.
  - `variant`: `'solid'` | `'subtle'` | `'outline'`.
  - `theme`: `'gray'` | `'blue'` | `'green'` | `'red'` | `'amber'`.
- **Usage**:
  ```vue
  <Badge v-if="pendingCount" :label="pendingCount" variant="subtle" theme="amber" />
  ```

---

### 7.6. `<UserAvatar>` & `<MultipleAvatar>`
- Generates colored avatar bubbles from user ID or email, displaying image or initials.
- **Props**:
  - `user`: User email or object with avatar/name.
  - `size`: `'xs'` (16px), `'sm'` (20px), `'md'` (28px), `'lg'` (36px).
- `<MultipleAvatar>` renders an overlapping cluster of avatars with `+N` overflow badge for participants.

---

### 7.7. `<Tooltip>` & `<ShortcutTooltip>`
- Hover tooltip popup with automatic collision detection.
- `<ShortcutTooltip>` renders keyboard shortcut badges:
  ```vue
  <ShortcutTooltip :label="__('Create Event')" combo="Mod+E">
    <Button variant="solid" :label="__('Create')" />
  </ShortcutTooltip>
  ```

---

### 7.8. `<EmptyState>`
- Centered zero-data presentation.
- **Props**: `title`, `description`, `icon` (Component), `width` (`'sm'`, `'md'`, `'lg'`).
  ```vue
  <EmptyState
    :title="__('No Clients Found')"
    :description="__('Try adjusting your search criteria or register a new client.')"
    :icon="BuildingIcon"
  />
  ```

---

## 8. Complete Component Recipes for Duplication

### Recipe 1: Multi-Section Form Modal Shell
```vue
<template>
  <Dialog v-model:open="isOpen" :size="'2xl'">
    <template #body>
      <div class="p-6 bg-surface-base text-ink-gray-9 space-y-6 max-h-[85vh] overflow-y-auto">
        <!-- Header -->
        <div class="border-b border-outline-gray-1 pb-3 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-ink-gray-9">{{ __('Create Record') }}</h2>
            <p class="text-xs text-ink-gray-7 dark:text-ink-gray-6 mt-0.5">
              {{ __('Fill out the required legal and operational details') }}
            </p>
          </div>
          <button
            type="button"
            class="text-ink-gray-5 dark:text-ink-gray-4 hover:text-ink-gray-9 transition-colors"
            @click="isOpen = false"
          >
            <span class="lucide-x size-5" />
          </button>
        </div>

        <form class="space-y-6" @submit.prevent="handleSave">
          <!-- Section 1 -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-ink-blue-7 dark:text-ink-blue-3 flex items-center gap-1.5 border-b border-outline-gray-1 pb-1">
              <span class="lucide-building size-4" />
              {{ __('1. Entity Details') }}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormControl v-model="form.name" :label="__('Name')" type="text" required />
              <FormControl v-model="form.type" :label="__('Type')" type="select" :options="typeOptions" />
            </div>
          </div>

          <!-- Section 2 -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-ink-green-7 dark:text-ink-green-4 flex items-center gap-1.5 border-b border-outline-gray-1 pb-1">
              <span class="lucide-user-check size-4" />
              {{ __('2. Primary Representative') }}
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormControl v-model="form.email" :label="__('Email')" type="email" required />
              <FormControl v-model="form.phone" :label="__('Phone')" type="text" />
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex justify-end gap-2 pt-4 border-t border-outline-gray-1">
            <Button variant="outline" :label="__('Cancel')" @click="isOpen = false" />
            <Button variant="solid" type="submit" :label="__('Save Record')" :loading="saving" />
          </div>
        </form>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Dialog, FormControl, Button } from 'frappe-ui'

const isOpen = ref(false)
const saving = ref(false)
const form = reactive({ name: '', type: 'Standard', email: '', phone: '' })
const typeOptions = [
  { label: 'Standard', value: 'Standard' },
  { label: 'Enterprise', value: 'Enterprise' },
]

function handleSave() {
  saving.value = true
  // API Call...
  saving.value = false
  isOpen.value = false
}
</script>
```

---

### Recipe 2: High-Consequence Confirmation Dialog
```vue
<template>
  <Dialog v-model:open="isOpen" :size="'sm'">
    <template #body>
      <div class="p-6 bg-surface-base space-y-4">
        <!-- Header -->
        <div class="flex items-center gap-2 border-b border-outline-gray-1 pb-3">
          <span class="lucide-arrow-up-circle size-5 text-amber-600 dark:text-amber-400" />
          <h2 class="text-base font-bold text-ink-gray-9">{{ title }}</h2>
        </div>

        <p class="text-xs text-ink-gray-8 dark:text-ink-gray-7 leading-relaxed">
          {{ description }}
        </p>

        <!-- Warning Callout Box -->
        <div class="p-3 bg-surface-amber-2/60 dark:bg-amber-950/40 border border-outline-amber-2 dark:border-amber-800/60 rounded-lg text-xs space-y-1 text-ink-amber-8 dark:text-amber-300">
          <span class="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
            <span class="lucide-shield-check size-3.5" />
            {{ calloutTitle }}
          </span>
          <p class="text-[11px] text-ink-gray-7 dark:text-ink-gray-6">
            {{ calloutText }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-3 border-t border-outline-gray-1">
          <Button variant="subtle" :label="__('Cancel')" @click="isOpen = false" />
          <Button
            variant="solid"
            iconLeft="arrow-up-right"
            :label="confirmLabel"
            class="!bg-amber-600 hover:!bg-amber-500 active:!bg-amber-700 !text-white dark:!bg-amber-500 dark:hover:!bg-amber-400 dark:!text-gray-950 font-bold shadow-sm"
            @click="handleConfirm"
          />
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref } from 'vue'
import { Dialog, Button } from 'frappe-ui'

defineProps({
  title: { type: String, default: 'Confirm Action' },
  description: { type: String, default: '' },
  calloutTitle: { type: String, default: 'Important Notice' },
  calloutText: { type: String, default: '' },
  confirmLabel: { type: String, default: 'Confirm' },
})
const emit = defineEmits(['confirm'])
const isOpen = ref(false)

function handleConfirm() {
  emit('confirm')
  isOpen.value = false
}
</script>
```

---

### Recipe 3: Complete Responsive Adaptive Table (Desktop Table + Mobile Cards)
```vue
<div class="bg-surface-base rounded-xl border border-outline-gray-1 overflow-hidden shadow-sm">
  <!-- Desktop Table (>= 768px) -->
  <div class="hidden md:block overflow-x-auto">
    <table class="w-full text-left border-collapse text-sm">
      <thead>
        <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
          <th class="py-3 px-6">{{ __('Name / Entity') }}</th>
          <th class="py-3 px-6">{{ __('Primary Contact') }}</th>
          <th class="py-3 px-6">{{ __('Status') }}</th>
          <th class="py-3 px-6 text-right">{{ __('Actions') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-outline-gray-1">
        <tr
          v-for="row in items"
          :key="row.id"
          class="hover:bg-surface-gray-1 transition-colors cursor-pointer"
          @click="router.push(`/items/${row.id}`)"
        >
          <td class="py-4 px-6 font-semibold text-ink-gray-9">{{ row.name }}</td>
          <td class="py-4 px-6 text-xs text-ink-gray-7 dark:text-ink-gray-6">
            {{ row.contact_email }}
          </td>
          <td class="py-4 px-6">
            <span
              class="px-2.5 py-1 rounded-full text-xs font-semibold border"
              :class="row.status === 'Active'
                ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2'
                : 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'"
            >
              {{ row.status }}
            </span>
          </td>
          <td class="py-4 px-6 text-right" @click.stop>
            <Button size="sm" variant="ghost" iconLeft="file-edit" @click="editItem(row)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Mobile Adaptive Cards (< 768px) -->
  <div class="md:hidden divide-y divide-outline-gray-1">
    <div
      v-for="row in items"
      :key="row.id"
      class="p-4 hover:bg-surface-gray-1 transition-colors cursor-pointer space-y-3"
      @click="router.push(`/items/${row.id}`)"
    >
      <!-- Top Row: Title, Status & Chevron -->
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <div class="size-10 rounded-lg bg-surface-blue-2 border border-outline-blue-2 flex items-center justify-center font-bold text-ink-blue-7 dark:text-ink-blue-3 text-xs shrink-0">
            {{ (row.name || 'I').substring(0, 2).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-ink-gray-9 text-sm truncate">{{ row.name }}</div>
            <div class="text-xs text-ink-gray-7 dark:text-ink-gray-6 truncate">{{ row.category }}</div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span
            class="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
            :class="row.status === 'Active'
              ? 'bg-surface-green-2 text-ink-green-7 dark:text-ink-green-4 border-outline-green-2'
              : 'bg-surface-gray-2 text-ink-gray-7 dark:text-ink-gray-6 border-outline-gray-2'"
          >
            {{ row.status }}
          </span>
          <span class="lucide-chevron-right size-4 text-ink-gray-5 dark:text-ink-gray-4" />
        </div>
      </div>

      <!-- 2-Column Data Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-surface-gray-1/80 border border-outline-gray-1/60 p-2.5 rounded-lg">
        <div>
          <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Contact') }}</span>
          <span class="font-medium text-ink-gray-9">{{ row.contact_name }}</span>
          <div class="truncate mt-0.5">
            <a :href="'mailto:' + row.contact_email" class="text-ink-blue-7 dark:text-ink-blue-3 hover:underline" @click.stop>
              {{ row.contact_email }}
            </a>
          </div>
        </div>
        <div>
          <span class="text-[10px] uppercase font-semibold text-ink-gray-6 dark:text-ink-gray-5 block">{{ __('Commercial') }}</span>
          <div class="font-medium text-ink-gray-9">{{ row.currency }} • Net 30</div>
          <div class="text-[11px] text-ink-gray-6 dark:text-ink-gray-5">Balance: ${{ row.balance }}</div>
        </div>
      </div>

      <!-- Mobile Quick Actions Footer -->
      <div class="flex items-center justify-end gap-2 pt-1 border-t border-outline-gray-1/40" @click.stop>
        <Button size="sm" variant="outline" :label="__('Edit')" @click="editItem(row)" />
        <Button size="sm" variant="solid" :label="__('View')" @click="router.push(`/items/${row.id}`)" />
      </div>
    </div>
  </div>
</div>
```

#### Recipe 6: Entity Detail & Overview Page (`Client.vue` Pattern)

```vue
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
    </LayoutHeader>
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 space-y-6 animate-pulse">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="i in 3" :key="i" class="h-44 rounded-xl bg-surface-base border border-outline-gray-1 p-5 space-y-3">
          <div class="h-3 w-28 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
          <div class="h-4 w-40 rounded bg-surface-gray-2 dark:bg-surface-gray-1" />
        </div>
      </div>
    </div>
  </div>

  <!-- Loaded Entity Detail View -->
  <div v-else-if="client" class="flex flex-col flex-1 h-full overflow-hidden">
    <!-- Header -->
    <LayoutHeader>
      <template #left-header>
        <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            iconLeft="arrow-left"
            :tooltip="__('Back to Directory')"
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
          <router-link :to="`/invoices/new?customer=${encodeURIComponent(client.company_name)}`">
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
      <!-- 3-Column Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Card 1: Corporate Registry -->
        <div class="bg-surface-base border border-outline-gray-1 rounded-xl p-5 shadow-sm space-y-4">
          <h4 class="text-xs font-semibold uppercase tracking-wider text-ink-gray-7 dark:text-ink-gray-6 flex items-center gap-1.5">
            <span class="lucide-building size-4 text-ink-gray-5 dark:text-ink-gray-4" />
            {{ __('Corporate Registry') }}
          </h4>
          <div class="space-y-3 text-xs">
            <div>
              <span class="text-ink-gray-7 dark:text-ink-gray-6 block mb-1">{{ __('Company Registration No. (CRN)') }}</span>
              <span class="inline-flex items-center font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60">
                {{ client.company_registration_number || '—' }}
              </span>
            </div>
            <div>
              <span class="text-ink-gray-7 dark:text-ink-gray-6 block mb-1">{{ __('Tax ID / TIN / EIN') }}</span>
              <span class="inline-flex items-center font-mono font-semibold text-ink-gray-9 text-xs bg-surface-gray-2 dark:bg-surface-gray-1 px-2.5 py-1 rounded-md border border-outline-gray-2/60">
                {{ client.tin || client.tax_id || '—' }}
              </span>
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
              <span class="text-sm font-semibold text-ink-gray-9 block">{{ client.first_name }} {{ client.last_name }}</span>
              <span class="text-ink-gray-7 dark:text-ink-gray-6">{{ client.job_title || __('Representative') }}</span>
            </div>
            <div class="pt-1 flex items-center gap-2 text-ink-gray-8 dark:text-ink-gray-7">
              <span class="lucide-mail size-3.5 text-ink-gray-5 dark:text-ink-gray-4 shrink-0" />
              <a :href="'mailto:' + client.primary_email" class="truncate text-ink-blue-7 dark:text-ink-blue-3 hover:underline text-xs">
                {{ client.primary_email }}
              </a>
            </div>
            <div class="flex items-center gap-2 text-ink-gray-8 dark:text-ink-gray-7">
              <span class="lucide-phone size-3.5 text-ink-gray-5 dark:text-ink-gray-4 shrink-0" />
              <a :href="'tel:' + client.phone" class="text-xs hover:underline">
                {{ client.phone }}
              </a>
            </div>
          </div>
        </div>

        <!-- Card 3: Commercial & Terms -->
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
            <div class="flex justify-between items-center pt-2 border-t border-outline-gray-1">
              <span class="text-ink-gray-7 dark:text-ink-gray-6 font-medium">{{ __('Total Outstanding') }}</span>
              <span class="font-bold font-mono text-sm" :class="clientBalance > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'">
                ${{ Number(clientBalance).toLocaleString() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Child Ledger: Dual Mode Table -->
      <div class="bg-surface-base border border-outline-gray-1 rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-outline-gray-1 flex items-center justify-between">
          <h3 class="text-sm font-bold text-ink-gray-9">{{ __('Invoices & Billing History') }}</h3>
          <span class="text-xs px-2 py-0.5 rounded-full bg-surface-gray-2 dark:bg-surface-gray-1 text-ink-gray-8 dark:text-ink-gray-6 font-semibold">
            {{ clientInvoices.length }} {{ __('Invoices') }}
          </span>
        </div>

        <!-- Desktop View (>= 768px) -->
        <div class="hidden md:block overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-surface-gray-1 border-b border-outline-gray-1 text-xs font-semibold text-ink-gray-7 dark:text-ink-gray-6 uppercase tracking-wider">
                <th class="py-3 px-4">{{ __('Invoice #') }}</th>
                <th class="py-3 px-4">{{ __('Issue Date') }}</th>
                <th class="py-3 px-4">{{ __('Amount') }}</th>
                <th class="py-3 px-4">{{ __('Balance') }}</th>
                <th class="py-3 px-4">{{ __('Status') }}</th>
                <th class="py-3 px-4 text-right">{{ __('Actions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-gray-1">
              <tr v-for="inv in clientInvoices" :key="inv.id" class="hover:bg-surface-gray-1 transition-colors cursor-pointer" @click="router.push(`/invoices/${inv.id}`)">
                <td class="py-3 px-4 font-mono font-bold text-ink-blue-7 dark:text-ink-blue-3">{{ inv.invoice_number }}</td>
                <td class="py-3 px-4 text-ink-gray-7 dark:text-ink-gray-6">{{ inv.issue_date }}</td>
                <td class="py-3 px-4 font-mono font-semibold text-ink-gray-9">${{ Number(inv.total_amount).toLocaleString() }}</td>
                <td class="py-3 px-4 font-mono font-semibold" :class="Number(inv.balance_due) > 0 ? 'text-ink-amber-3' : 'text-ink-gray-9'">${{ Number(inv.balance_due).toLocaleString() }}</td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border" :class="getStatusBadgeClass(inv.status)">
                    {{ inv.status }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right" @click.stop>
                  <Button size="xs" variant="outline" :label="__('View')" @click="router.push(`/invoices/${inv.id}`)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
```
```

---

## 9. Checklist for New Page Duplication

When creating a new page or view, verify:
- [ ] Root div uses `flex flex-col h-full overflow-hidden`.
- [ ] Uses `<LayoutHeader>` with `#left-header` (title + counter pill or breadcrumbs) and `#right-header` (primary solid CTA).
- [ ] **Mobile Bottom Nav Clearance**: Content canvas specifies `pb-24 md:pb-6` (or `pb-20`).
- [ ] All action button labels in header collapse on mobile (`isMobileView ? '' : __('Add Client')`).
- [ ] All tables implement the dual Desktop Table (`hidden md:block`) and Mobile Adaptive Cards (`md:hidden`) pattern.
- [ ] Monospace font (`font-mono`) is applied to IDs, codes, registration numbers, and currency values.
- [ ] All status badges include explicit outline borders (`border border-outline-*`) to remain crisp in dark mode.
- [ ] Secondary text uses `text-ink-gray-7 dark:text-ink-gray-6` (never dim `text-ink-gray-4` or raw `text-ink-gray-5` on small sizes).
- [ ] Active tabs inside pill containers use `bg-surface-base dark:bg-surface-gray-3 text-ink-gray-9 font-bold shadow-sm`.
- [ ] Mobile card contacts use `tel:` links and emails use `mailto:` links with `@click.stop`.
- [ ] Card action buttons have `@click.stop` to prevent triggering row navigation.
- [ ] Modals use responsive widths (`size="2xl"` or `size="sm"`), contain scrollable bodies (`max-h-[85vh] overflow-y-auto`), and have accessible Cancel/Confirm footers.
- [ ] Button themes adhere to `'gray' | 'blue' | 'green' | 'red'`; custom colors (like amber) use explicit Tailwind utility classes.
