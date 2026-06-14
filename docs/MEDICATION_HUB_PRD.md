# Medication Hub — Product Requirements Document


| Field             | Value                                           |
| ----------------- | ----------------------------------------------- |
| **Status**        | Draft                                           |
| **Product area**  | Caregiver / clinical — per-resident medications |
| **Stack context** | Laravel API + React SPA (see repo rules)        |


## 1. Summary

Deliver a **resident-scoped Medication Hub**: one place where staff can find **all medication-related information and workflows** for a single resident—orders, active medications, administration (MAR), history, PRN, pharmacy/refills, deliveries, controlled-substance counts, and physician orders—without hunting across disconnected screens.

**Entry pattern:** A **residence-style listing** (resident cards with optional facility/branch/floor filters) lets admins and authorized staff **open a resident’s Medication Hub** in one click.

**Relationship to existing resident hub:** The general `**ResidentHubPage`** remains the **whole-person record** (full Overview, full Profile, appointments, charts, care plan, general documents). The **Medication Hub** is a **dedicated sub-surface** focused on medication workflows, including its own **medication Overview** tab.

## 2. Problem

- Medication data and actions are spread across clinical routes, resident tabs, and deliveries.
- Admins need a **single mental model**: “pick resident → everything about meds is here.”
- Risk of inconsistency or missed steps (refills, deliveries, orders) when navigation is fragmented.

## 3. Goals

1. **Consolidate** per-resident medication information and primary actions under one hub with clear sub-sections (tabs).
2. **Reduce navigation cost** from resident list to “what meds, what’s due, what’s on order, what was given.”
3. **Enforce permissions** so sensitive workflows (controlled counts, adding meds, MAR sign-off) are **admin-only** unless extended later.
4. **Preserve a single source of truth** for the full resident profile on `**ResidentHubPage`**; the hub shows **med-context profile slice** where needed.

## 4. Non-goals (initial release)

- Replacing the entire `**ResidentHubPage`** or duplicating whole-person Overview content.
- Building a literal architectural floor-plan SVG unless product later requests it (phase 1 uses **filters + cards**, not blueprint graphics).
- Full pharmacy EHR integration scope (define per phase based on vendor/API availability).

## 5. Primary users


| Role                    | Needs                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Administrator**       | Full hub access including add med, MAR sign-off, narc counts; oversight across residents.                                               |
| **Caregiver / staff**   | View and perform **non-admin** tasks as allowed by future policy (explicitly **not** narc / add med / MAR sign-off in v1 per this PRD). |
| **Clinical leadership** | Reporting and audit trails (may use admin capabilities or read-only views—align with existing roles).                                   |


## 6. Key user journeys

### 6.1 Resident list → Medication Hub

1. User opens **resident listing** (e.g. `/my-residents`; optional query params for branch/floor when data exists).
2. User scans **cards** (photo/initials, name, room, **optional med badges**: new order, refill due, delivery today).
3. User clicks a card → lands on **Medication Hub** for that `residentId`.

### 6.2 Deep link from general resident record

1. User is on `**ResidentHubPage`** (`/my-residents/:residentId`).
2. User chooses **Medications** (or equivalent) → navigates to **Medication Hub** for the same resident.
3. Hub provides **link back** to full resident record / full Profile.

### 6.3 Operational workflow (illustrative)

1. Open **Overview** → see alerts, active med summary, recent orders, delivery status.
2. Open **Med pass / MAR** for the shift (admin signs/administers per rules).
3. Open **Refills & deliveries** to confirm receipt.
4. Open **Phys. orders** to verify against active list.

## 7. Information architecture

### 7.1 Proposed URL shape (implementation detail)

Prefer **nested routes** under the resident for bookmarking and clarity, for example:

- `/my-residents/:residentId/medications` — hub shell + default tab (e.g. Overview)
- `/my-residents/:residentId/medications/overview`, `.../mar`, `.../log`, etc.

(Exact path strings can match existing router conventions during implementation.)

### 7.2 Medication Hub tabs (product scope)


| Tab                      | Purpose                                                                                                                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**             | Medication-centric snapshot: active meds summary, alerts, physician order thumbnails/links, refill/delivery cues, quick actions (subject to permission). **Not** a duplicate of whole-person Overview on `ResidentHubPage`. |
| **Medications**          | Authoritative active medication list; schedules, routes, start/stop; **add/edit** (admin).                                                                                                                                  |
| **Med pass / MAR**       | Scheduled administrations for a time window; pass/skip/defer with audit; **sign MAR** (admin).                                                                                                                              |
| **Med log**              | Historical administrations and related notes (resident-scoped; aligns with medication history concepts).                                                                                                                    |
| **PRN**                  | As-needed medications: limits, indications, last given, PRN-specific logging.                                                                                                                                               |
| **Pharmacy / orders**    | Order pipeline, pending fills, pharmacy-facing status (as data allows).                                                                                                                                                     |
| **Refills & deliveries** | Refill status and delivery tracking for this resident (align with `medication-deliveries` domain).                                                                                                                          |
| **Narc. count**          | Controlled substance counts and discrepancy workflow (admin).                                                                                                                                                               |
| **Phys. orders**         | Uploaded or scanned orders; thumbnails/list; open/download.                                                                                                                                                                 |
| **Profile (med slice)**  | Read-only or limited fields needed at point of care: e.g. allergies, relevant diagnoses, code status, weight. **Full Profile** remains on `ResidentHubPage`.                                                                |


### 7.3 Optional: Tasks & ADLs

Include **only** if product requires med-adjacent tasks inside this hub; otherwise **link out** to existing task/care surfaces to avoid duplication.

## 8. Functional requirements

### 8.1 Resident listing (hall)

- **FR-H1:** Display a grid or list of residents authorized for the current user.
- **FR-H2:** Support search (name, room) and filters (branch; floor/wing when available in data model).
- **FR-H3:** Each card navigates to **Medication Hub** for that resident.
- **FR-H4 (optional):** Surface **badge(s)** on cards for actionable med states (configurable in later iteration).

### 8.2 Hub shell

- **FR-S1:** Persistent **resident identity** in the hub header (name, photo/initials, DOB, room, facility context as applicable).
- **FR-S2:** Tab navigation across sections in §7.2; preserve `residentId` across tabs.
- **FR-S3:** **Timezone / facility context** warnings when viewer timezone differs from facility (if product supports it).
- **FR-S4:** Actions: **Add medication**, **Print**, **Send** — visible only per §9.

### 8.3 Tab-level (high level)

- **FR-T1 Overview:** Aggregate widgets from medications, orders/docs, deliveries; respect permissions.
- **FR-T2 Medications:** CRUD for active med list as defined by backend; audit trail on changes.
- **FR-T3 MAR:** Shift- or day-based schedule view; immutable or audited corrections per policy.
- **FR-T4 Med log:** Filterable history for the resident.
- **FR-T5 PRN:** Distinct UX from scheduled meds; enforce limits where configured.
- **FR-T6 Pharmacy:** Reflect order status from system of record.
- **FR-T7 Refills & deliveries:** Resident-scoped list/detail for deliveries/refills.
- **FR-T8 Narc. count:** Count sessions, witnesses, variance reporting as required by policy.
- **FR-T9 Phys. orders:** Document list tied to resident; virus-scan and access control per existing document policies.
- **FR-T10 Profile slice:** Read from same resident API as main profile; no second source of truth for master data.

## 9. Permissions and roles

**Policy (v1):** The following are **administrator-only**:


| Capability                                                          | Admin |
| ------------------------------------------------------------------- | ----- |
| **Narc. count** (view and workflows)                                | Yes   |
| **Add medication** (and related clinical med management if grouped) | Yes   |
| **Sign MAR** (administration sign-off / witness rules as defined)   | Yes   |


**Implementation note:** Map “admin” to existing Evergreen roles (`super_admin`, `administrator` / `admin`, or explicit permissions). `**super_admin`** should inherit all admin capabilities unless product decides otherwise.

**Caregivers:** Default v1: **no** narc, **no** add med, **no** MAR sign-off. Future: optional granular permissions (e.g. licensed nurse) via separate ticket.

## 10. Data and integrations

- **Single source of truth:** Resident master data and **full Profile** remain on `**ResidentHubPage`** / resident APIs; hub consumes read models and writes through existing or new medication endpoints.
- **Deliveries:** Align with **medication deliveries** feature and APIs.
- **Documents / orders:** Reuse **resident documents** patterns with a clear **document type** or tag for physician orders where useful.
- **Clinical section:** Facility-wide screens (`/medications`, `/medication-deliveries`) remain; hub is **per-resident** consolidation.

## 11. Acceptance criteria (release-ready)

1. From **resident listing**, user can open **Medication Hub** for a resident and see **Overview** without errors.
2. Tabs in §7.2 are reachable; broken or unimplemented tabs show **clear “coming soon”** or are hidden per phase (product decision).
3. **Admin** users can access **Narc. count**, **Add medication**, and **MAR sign** where implemented; **non-admin** users cannot (UI hidden + API enforced).
4. **Profile (med slice)** does not allow divergent master data; edits to full profile happen only via `**ResidentHubPage`** (unless explicitly extended).
5. **Deep link** from `**ResidentHubPage`** to hub and **return link** to full resident record work for the same `residentId`.

## 12. Phasing


| Phase   | Scope                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MVP** | Hub shell + **Overview** + **Medications** (read; admin write) + **Phys. orders** (documents) + **Refills & deliveries** (read) + permissions skeleton. |
| **1**   | **MAR** + **Med log** + print/send flows.                                                                                                               |
| **2**   | **PRN** depth + **Pharmacy** status + card badges on listing.                                                                                           |
| **3**   | **Narc. count** full workflow + advanced reporting/audit.                                                                                               |


Phasing can be adjusted based on regulatory priority.

## 13. Success metrics (optional)

- Time from “open resident” to “view active meds + today’s schedule” (task-based usability).
- Reduction in support questions about “where is delivery / MAR / orders.”
- Audit completeness: % administrations with required sign-off (admin).

## 14. Open questions

1. Exact role matrix for **caregiver** read vs write on MAR (if any) after v1.
2. Whether **Print** / **Send** targets MAR, current med list, or both (per action menu).
3. Floor/wing: field availability on resident/room models and timeline for filters.
4. Integration depth with external pharmacy vs manual order entry.

## 15. References

- Existing routes (illustrative): `ResidentHubPage`, `/medications`, `/medication-deliveries`, `/my-residents`.
- Design reference: Synkwise-style Medication Hub (screenshot discussion, 2026).

---

*End of PRD.*