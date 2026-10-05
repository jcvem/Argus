# ARGUS Control Plane: Design System Specification

This document codifies the modern AI operations workspace design system for the Argus control plane in `ArgusBC`, establishing the visual foundation, typographic hierarchy, color token architecture, sidebar dimensions, card treatment, tabs, badges, responsive rules, and safety states derived from the visual reference (`UI_concept.png`).

---

## 1. Aesthetic Philosophy: Modern AI Operations Workspace

Argus is an enterprise privacy-preserving gateway positioned between raw data repositories and AI consumers (autonomous agents, LLMs, automated pipelines, and compliance operators).

Rather than an editorial paper security ledger, the interface embodies a **polished, friendly, modern AI operations workspace**:
- **Light Cool Gray Canvas**: Crisp, breathable background (`#f4f5f7`) that grounds content without visual fatigue.
- **Pure White Elevated Surfaces**: Primary cards, navigation sidebar, and inspection panels use `#ffffff` with subtle borders (`#e5e7eb`) and restrained soft shadows (`shadow-xs` / `shadow-card`).
- **Disciplined Functional Palette**:
  - **Brand Accent (Zinc / Neutral Slate)**: `#18181b` (hover `#27272a`, surface `#f4f4f5`, border `#e4e4e7`), reserved for active navigation links, brand identity, and selected states.
  - **Positive Action Accent (Green / Teal)**: `#10b981` (hover `#059669`, surface `#ecfdf5`), used for primary add actions (the circular `+` button) and verified safety states.
  - **Warning & Blocked Signals (Red / Coral)**: `#ef4444` (hover `#dc2626`, surface `#fef2f2`), reserved strictly for blocked worksheets, fail-closed boundaries, and critical errors.
  - **Review Signal (Amber / Ochre)**: `#f59e0b` (surface `#fffbeb`), used for review-required findings.
- **Zero AI Cliché Patterns**:
  - Zero multi-color rainbow gradients, zero glowing button shadows, zero glassmorphism blur-soup.
  - Zero decorative emojis; all symbols use consistent Lucide line icons.

---

## 2. Sidebar Architecture & Dimensions

The desktop navigation sidebar is a fixed, non-scrolling or independent-scrolling white column:
- **Width**: `252px` (`w-[252px]`).
- **Surface**: Pure white (`#ffffff`) with a hairline right boundary (`border-r border-gray-200/80`).
- **Brand Header**:
  - Argus Eye/Iris Mark: Black squircle (`w-9 h-9 rounded-lg bg-black`) containing an orbital contour, zinc iris circle (`#27272a`), and cyan reflection dot.
  - Wordmark: `ARGUS` in bold uppercase typography, accompanied by the dynamic active workspace selector (`selectedWorkspace.name`) with chevron affordance.
- **Search Bar**:
  - Compact rounded search input (`rounded-lg border border-gray-200 bg-white px-2.5 py-1.5`) with magnifying glass icon and keyboard shortcut badge (`/`).
  - Interactive filtering: filters the timeline feed in real time.
- **Navigation Sections**:
  - **Data Protection Section**: Label `DATA PROTECTION` in muted uppercase text.
    - `Overview` (`/dashboard`): Active state features zinc text (`#18181b`), zinc icon stroke, and soft zinc tinted background (`#f4f4f5`).
    - `Users & Agents` (`/sandbox`): Users icon with circular count badge (`13`).
    - `Policies` (`/policies`): ShieldCheck icon for RedactCore rule matrices.
    - `Files` (`/documents`): FileText icon for immutable source ledger.
  - **AI Agents Section**: Parallel section directly below `Files` for custom agent creation and management.
    - `Agent Studio` (`/agents`): Bot icon with custom agent count badge.
    - `Create Agent` (`/agents/new`): PlusCircle icon with `New` badge.
  - **Roles Section**: Label `ROLES` in muted uppercase text with status dots and circular badges:
    - `Developer`: Emerald status dot (`#10b981`) &middot; Badge `2`
    - `Designer`: Amber status dot (`#f59e0b`) &middot; Badge `9`
    - `Partner`: Pink status dot (`#ec4899`) &middot; Badge `3`
    - `Marketing`: Blue status dot (`#3b82f6`) &middot; Badge `1`
    - `Marketing`: Blue status dot (`#3b82f6`) &middot; Badge `1`
    - Role filtering: Clicking any role filters the timeline cards to agents matching that domain.
- **Sidebar Footer**:
  - Circular user avatar with initials or portrait (`w-8 h-8 rounded-full`).
  - User details: Operator name (e.g. `Melia Iasus`) and email (`melia@argus.com`).
  - Dropdown affordance for session switching, authentication status, and sign-out.

---

## 3. Timeline Cards & Activity Feed Architecture

The workspace feed presents AI agent activity entries structured as white elevated cards:
- **Geometry**: `rounded-xl` (`12px` border-radius), `border border-gray-200/80`, `shadow-xs`, and `p-5 sm:p-6` padding.
- **Card Header**:
  - Circular agent avatar (`w-10 h-10 rounded-full bg-gray-900 text-white`).
  - Agent Name: Bold title (e.g. `AVA`).
  - Role Subtitle: Muted gray label (e.g. `Marketing AI Agent`).
  - Action Search Icon: Ghost round button (`w-8 h-8 text-gray-400`).
  - Prominent Add Button: Circular vibrant green/teal button (`w-8 h-8 rounded-full bg-[#10b981] text-white`) with crisp `+` icon.
- **Segmented Tabs Bar**:
  - Segmented control container with pale gray background (`bg-gray-100/90 rounded-lg p-1`).
  - Tabs: `Reason`, `Raw Data`, `Guarded View`.
  - Active tab uses pure white surface (`bg-white`), dark text (`text-gray-900`), and soft shadow (`shadow-xs`).
  - Right-aligned controls:
    - `Compact View` toggle switch with iOS-style track and animated thumb.
    - List / Grid view switcher with Lucide `List` and `LayoutGrid` icons.
- **Activity Sentence & Policy Telemetry**:
  - Action narrative: Avatar + sentence referencing target files with brand purple links (e.g. `Sep_Sells.xls`).
  - Structured logs:
    - `[ARGUS Policy check] <Agent (Role)>`
    - `[ARGUS Policy confirmed] <Allowed access to file>, but blocked for <customer detail lists sheet>` (highlighted in red `#ef4444`).
    - `[ARGUS View Generate] Generates <Sep_Sells_Marketing_AVA.xls> with correct reduction (63ms).`

---

## 4. Guarded View Document Previews

When the `Guarded View` tab is active, the card displays an authentic privacy-preserved document preview:
- **Spreadsheet Preview (`Sep_Sells_Marketing_AVA.xls`)**:
  - Green Excel-style ribbon with formula bar and sheet tabs.
  - Column headers: Order ID, Date, Customer Name, Customer Email, Phone Number, Product/Service, Qty, Unit Price, Total, Payment Status.
  - **Redaction Treatment**: Sensitive columns (`Customer Name`, `Customer Email`, `Phone Number`) are permanently rendered as solid black redaction bars (`████████`), demonstrating zero-raw-PII leakage while maintaining business utility.
- **PDF Audit Record Preview (`September_2026_Sales_Records.pdf`)**:
  - Dark PDF viewer ribbon with page counter (`Page 3 of 12`) and zoom controls.
  - Paper sheet with red `CONFIDENTIAL` watermark and table layout with blackened customer columns.
- **Toggle Controls**: Allows switching between Split View, Excel Sheet view, and PDF Audit Record view.

---

## 5. Color Tokens & Semantic State Architecture

| Token | Hex Value | Role |
| :--- | :--- | :--- |
| `argus-canvas` | `#f4f5f7` | Root app background |
| `argus-surface` | `#ffffff` | Primary cards, sidebar, inspection panels |
| `argus-subtle` | `#f9fafb` | Table headers, secondary wells |
| `argus-border` | `#e5e7eb` | Standard 1px boundaries |
| `argus-ink` | `#111827` | Primary text and headlines |
| `argus-ink-secondary` | `#4b5563` | Subtitles and explanatory copy |
| `argus-ink-muted` | `#9ca3af` | Metadata, hashes, timestamps |
| `argus-brand` | `#18181b` | Refined zinc brand accent |
| `argus-brand-surface` | `#f4f4f5` | Active nav and selected pill background (zinc-100) |
| `argus-brand-border` | `#e4e4e7` | Active boundary border (zinc-200) |
| `argus-action` | `#10b981` | Green/teal add buttons & positive actions |
| `argus-blocked` | `#ef4444` | Red/coral blocked items & fail-closed alerts |
| `argus-review` | `#f59e0b` | Amber review-required badges |

### Safety States
- **Verified (`#10b981` / bg `#ecfdf5`)**: Post-transform leak check passed; source SHA-256 byte-identical.
- **Review Required (`#f59e0b` / bg `#fffbeb`)**: Figures or candidates requiring compliance review.
- **Blocked Fail-Closed (`#ef4444` / bg `#fef2f2`)**: Scanned document without OCR consent; verification failure.
- **Ready (`#4b5563` / bg `#f3f4f6`)**: Normalized parse complete, awaiting policy directive.

---

## 6. Typography & Responsive Geometry

- **Type Scale**:
  - Body & Display: Clean system font stack (`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif`).
  - Monospace: Mechanical clarity (`ui-monospace, "SF Mono", Menlo, monospace`).
- **Responsive Rules**:
  - Desktop (`lg` &ge; 1024px): 252px fixed white sidebar with right workspace feed.
  - Mobile & Tablet (`< 1024px`): Top bar with ArgusLogo, status pill, and hamburger toggle. Mobile slide-out drawer with touch-sized targets (&ge; 44px) and backdrop dismissal.
  - Zero horizontal overflow (`overflow-x: clip`).
