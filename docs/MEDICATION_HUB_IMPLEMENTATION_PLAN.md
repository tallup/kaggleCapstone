# Medication Hub — Implementation Plan

| Field | Value |
|--------|--------|
| **Status** | Draft |
| **PRD** | [MEDICATION_HUB_PRD.md](./MEDICATION_HUB_PRD.md) |

This plan maps the PRD to **concrete work** in the Evergreen repo (Laravel API + React SPA). It assumes phased delivery; adjust sprint boundaries to team capacity.

---

## 1. Current state (baseline)

### 1.1 Frontend

| Asset | Role |
|--------|------|
| `resources/js/Root.jsx` | `MedResidentRedirect`: `/medications/residents/:residentId` → `/my-residents/:id?tab=medications`. |
| `resources/js/pages/caregiver/ResidentHubPage.jsx` | Whole-person hub; **Medications** tab renders `ResidentMedicationsPage` embedded. |
| `resources/js/pages/caregiver/ResidentMedicationsPage.jsx` | Large resident-scoped med UI (schedule, administration, safety strip). |
| `resources/js/pages/caregiver/MyResidentsPage.jsx` | Card/list directory; primary click **scopes** resident in UI; **View profile** → `/my-residents/:id`. |
| `resources/js/pages/Medications.jsx` | Facility-wide administration workspace (not resident-scoped). |
| `resources/js/pages/MedicationDeliveries.jsx` | Deliveries (filterable; uses `/medications`, `/medication-deliveries`). |
| `resources/js/pages/MedicationHistory.jsx` | Administration history (global filters). |
| `resources/js/pages/caregiver/MedicationHubPage.jsx` | Clinical **section landing** (`SectionHub` links)—not the per-resident hub. |
| `resources/js/pages/caregiver/ClinicalSectionLayout.jsx` | Clinical tab bar. |

### 1.2 Backend (representative)

| Area | Location |
|------|-----------|
| Medications CRUD + filters | `routes/api.php` → `MedicationController`, `MedicationService` |
| Administrations | `MedicationAdministrationController`, `medication-administrations` routes |
| Deliveries | `MedicationDeliveryController`, `medication-deliveries` routes |
| Resident-scoped report | `GET /residents/{resident}/reports/medication-log`, `MedicationLogReportController` |

Authorization today is **mixed** (role/branch checks and permission strings in JSX); the PRD’s **admin-only** rules for narc / add med / MAR sign require **explicit API enforcement** (see §5).

---

## 2. Target architecture

### 2.1 Routing (recommended)

Introduce **nested routes** under the resident for the Medication Hub shell:

| Route pattern | Purpose |
|----------------|---------|
| `/my-residents/:residentId/medications` | Default → **Overview** (or redirect to `.../overview`) |
| `/my-residents/:residentId/medications/overview` | Med-centric overview |
| `/my-residents/:residentId/medications/medications` | Active med list / schedules (may embed or reuse `ResidentMedicationsPage` body) |
| `/my-residents/:residentId/medications/mar` | MAR / pass view (phase 1b) |
| `/my-residents/:residentId/medications/log` | History for this resident |
| `/my-residents/:residentId/medications/prn` | PRN-focused view (phase 2) |
| `/my-residents/:residentId/medications/pharmacy` | Orders pipeline (phase 2) |
| `/my-residents/:residentId/medications/deliveries` | Resident-filtered deliveries |
| `/my-residents/:residentId/medications/narcotics` | Narc count (phase 3; admin-only) |
| `/my-residents/:residentId/medications/orders` | Physician orders (documents) |
| `/my-residents/:residentId/medications/context` | Profile “med slice” |

**Implementation detail:** Use a layout route component (e.g. `ResidentMedicationHubLayout.jsx`) that loads resident once, renders shared header + tab bar, and `<Outlet />` for child routes.

### 2.2 Redirects and backward compatibility

| From | To |
|------|-----|
| `/medications/residents/:residentId` | `/my-residents/:residentId/medications` (replace current redirect to `?tab=medications` once hub ships) |
| `ResidentHubPage` tab **Medications** | Navigate to `/my-residents/:id/medications` (keeps one medications “home”; avoids maintaining two full UIs) |

Optional: keep `?tab=medications` as a **legacy redirect** to the new path for bookmarked URLs.

### 2.3 Naming collision

The file `MedicationHubPage.jsx` today is the **clinical landing hub** (`SectionHub`). When adding the per-resident hub, prefer names like **`ResidentMedicationHubLayout`** / **`ResidentMedicationHubPage`** to avoid confusion. Optionally rename the clinical page in a follow-up PR (pure rename + import updates).

---

## 3. Work breakdown by phase

### Phase 0 — Foundations (1 sprint or less)

| ID | Task | Owner hint |
|----|------|------------|
| P0-1 | Add `ResidentMedicationHubLayout` + child routes in `Root.jsx`; lazy-load children. | Frontend |
| P0-2 | Shared hub header: avatar, name, DOB, room, branch, link **Back to resident record** (`/my-residents/:id`). | Frontend |
| P0-3 | Tab component aligned with `SectionLayout` / existing tab patterns (icons + `NavLink` active state). | Frontend |
| P0-4 | Update `MedResidentRedirect` target to new medications path. | Frontend |
| P0-5 | Update `ResidentHubPage` medications tab to **link out** to hub (or single “Open medication hub” CTA) so content is not duplicated. | Frontend |
| P0-6 | Add `useMedicationHubPermissions()` (or extend existing user/role utils): `canAddMedication`, `canSignMar`, `canAccessNarcotics` → **admin roles only** for v1 per PRD. | Frontend |
| P0-7 | Register hub routes in `headerResidentSwitcher.js` / `moduleAccess.js` if the header should treat hub as “medications” context for resident switcher. | Frontend |

**Exit criteria:** Deep-linking works; empty placeholder tabs can show “Coming soon” without 404.

---

### Phase 1 — MVP (PRD §12)

| ID | Task | Notes |
|----|------|--------|
| P1-1 | **Overview** tab: compose widgets from existing queries (`/medications?resident_id=&active_only=true`, resident detail if needed, deliveries summary). | Reuse patterns from `ResidentHubPage` overview stat cards where sensible. |
| P1-2 | **Medications** tab: embed or refactor `ResidentMedicationsPage` so it renders **inside hub layout** (drop duplicate breadcrumbs if layout provides context). | Large file—prefer **composition** over copy-paste. |
| P1-3 | **Phys. orders** tab: reuse `ResidentDocuments` (or subset) with filter/tag for order type if model supports it; otherwise “all documents” with section heading. | Align with `ResidentHubPage` documents tab behavior. |
| P1-4 | **Refills & deliveries** tab: resident-scoped list using `/medication-deliveries` with `resident_id` (or equivalent) query param; if API lacks filter, add backend filter (see §5). | Mirror `MedicationDeliveries.jsx` table row patterns in a slimmer view. |
| P1-5 | **Profile (med slice)** tab: read-only fields from same `/residents/:id` payload used elsewhere (allergies, code status, weight, etc.—confirm field availability on API resource). | No duplicate edit forms. |
| P1-6 | **Residence hall:** add primary action **Medication hub** on `MyResidentsPage` cards (e.g. pill icon) → `/my-residents/:id/medications`; optional: keep card click as focus vs navigate (product choice). | PRD journey §6.1 |

**Exit criteria:** Admin can open hub from listing and complete core med review for one resident without leaving hub (overview + meds + docs + deliveries + slice).

---

### Phase 1b — MAR alignment

| ID | Task | Notes |
|----|------|--------|
| P1b-1 | **MAR** tab: resident-scoped “today” schedule view; wire to existing administration APIs (`for_administration`, `medication-administrations`). | Reuse logic from `Medications.jsx` / `ResidentMedicationsPage` where possible. |
| P1b-2 | **Sign MAR** actions visible only when `canSignMar`; backend must reject non-admin writes (§5). | |

---

### Phase 2 — PRN, pharmacy, listing badges

| ID | Task |
|----|------|
| P2-1 | **PRN** tab: filter active meds with PRN schedule / instruction; PRN administration log snippet. |
| P2-2 | **Pharmacy** tab: placeholder or order status if data model exists; else hide tab until backend ready. |
| P2-3 | Optional **card badges** on `MyResidentsPage`: prefetch lightweight counts (e.g. open deliveries); guard performance (batch endpoint preferred). |

---

### Phase 3 — Narcotics

| ID | Task |
|----|------|
| P3-1 | Data model for count sessions (if not present): migration, model, Filament optional. |
| P3-2 | API: create/read count events; enforce **admin-only** on mutating routes. |
| P3-3 | **Narcotics** tab UI; hidden for non-admin. |

---

## 4. File / module checklist (expected touch list)

**New (typical)**

- `resources/js/pages/caregiver/medication-hub/ResidentMedicationHubLayout.jsx` (or parallel path)
- `resources/js/pages/caregiver/medication-hub/OverviewTab.jsx`
- `resources/js/pages/caregiver/medication-hub/DeliveriesTab.jsx`
- `resources/js/pages/caregiver/medication-hub/PhysicianOrdersTab.jsx`
- `resources/js/pages/caregiver/medication-hub/ProfileMedSliceTab.jsx`
- (Later) `MarTab.jsx`, `MedLogTab.jsx`, `PrnTab.jsx`, `NarcoticsTab.jsx`

**Modify**

- `resources/js/Root.jsx` — nested routes, lazy imports
- `resources/js/pages/caregiver/ResidentHubPage.jsx` — medications tab behavior + deep link
- `resources/js/pages/caregiver/ResidentMedicationsPage.jsx` — props for layout/breadcrumbs when embedded in hub
- `resources/js/pages/caregiver/MyResidentsPage.jsx` — Medication hub entry
- `resources/js/pages/caregiver/ResidentDetailPage.jsx` — update `Link` targets if still pointing to `/medications/residents/:id`
- `resources/js/utils/headerResidentSwitcher.js` — path detection for medications context
- `docs/MEDICATION_HUB_PRD.md` — link to this plan (optional cross-link)

**Backend (as needed)**

- `app/Http/Controllers/Api/MedicationDeliveryController.php` — `resident_id` filter on index
- `app/Http/Controllers/Api/MedicationAdministrationController.php` — policy checks for PRD admin-only actions
- `app/Http/Controllers/Api/MedicationController.php` — tighten `store`/`update` if caregivers must not add meds
- New `NarcoticCount*` controller + routes (phase 3)
- Feature tests in `tests/Feature/` for new authorization rules

---

## 5. Authorization and API enforcement

**PRD rule:** Narc count, add medication, MAR sign-off → **admins** (v1).

| Capability | Frontend | Backend |
|------------|----------|---------|
| Add / edit medication | Hide UI for non-admin | `MedicationController@store/update`: reject if not admin/super_admin (or explicit permission); **do not rely on caregiver branch logic alone** |
| MAR sign / administration mutations | Hide or read-only for non-admin | `MedicationAdministrationController`: same gate for `store`, `bulkStore`, and any “sign” endpoint |
| Narcotics | Tab hidden | All mutating routes return 403 for non-admin |
| Read-only med list / log | Allow per existing policy | Preserve caregiver read access if currently allowed |

**Concrete steps**

1. Document current permission matrix in a short comment or `docs/` appendix after audit.
2. Introduce a **single** helper on the backend (e.g. `User::canManageMedicationClinical()` or Laravel Gate) used by medication + administration controllers.
3. Add **Feature tests** for caregiver POST → 403 on restricted endpoints.

---

## 6. Data and performance

- **Resident payload:** Hub layout should fetch resident once (`/residents/:id` or existing hook); pass via context to tabs to avoid N+1.
- **Overview aggregates:** Consider one **hub summary** API endpoint later (`GET /residents/:id/medication-hub/summary`) to reduce waterfall requests; not required for MVP if TanStack Query parallel queries suffice.
- **Deliveries:** Confirm index supports `resident_id`; add compound index if filtering becomes hot.

---

## 7. Testing strategy

| Layer | Scope |
|--------|--------|
| **PHPUnit** | Authorization on medication + administration + delivery filters; any new summary endpoint. |
| **React** | Smoke: routing renders layout; tab active states; redirect from old `/medications/residents/:id`. |
| **Manual** | Admin vs caregiver login; hub from `MyResidentsPage`; back link to `ResidentHubPage`. |

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| `ResidentMedicationsPage` size / coupling | Extract presentational sections; hub imports subcomponents. |
| Duplicating `Medications.jsx` MAR logic | Shared hooks (`useResidentMedicationsForMar`) or utility module. |
| Breaking caregivers if API tightened | Ship backend gates with **clear release note**; confirm org expectations. |
| Tab explosion | Hide unfinished tabs via feature flags or `enabled` checks. |

---

## 9. Rollout

1. Merge behind optional **feature flag** (config or user flag) if risk is high; otherwise ship MVP tabs only.
2. Update internal wiki / training: **Medication Hub** URL vs old `?tab=medications`.
3. Monitor 403 rates and support tickets after admin-only enforcement.

---

## 10. References

- PRD: [MEDICATION_HUB_PRD.md](./MEDICATION_HUB_PRD.md)
- API routes: `routes/api.php` (medications, administrations, deliveries)
- Related UI: `ResidentHubPage.jsx`, `ResidentMedicationsPage.jsx`, `MedicationDeliveries.jsx`

---

*End of implementation plan.*
