# Dialysis PRD — Gap Review

**Reviewed:** `Dialaysis_PRD.docx` (sections 1–52)
**Compared against:** `docs/DIALYSIS_MODULE_DESIGN.md`, `backend/services/dialysis`, and common practice in
Epic and dedicated renal systems (Fresenius TDMS/TMon, NephroFlow)

Severity: **Critical** means it blocks safe go-live or causes revenue or stock errors. **High** must be in v1.
**Medium** can follow soon after go-live.

---

## 1. Summary

The PRD gets the **architecture** right. Dialysis owns the clinical workflow and reuses the hospital's shared
patient index, orders, pharmacy, stores and billing. It also has several ideas the current design and code
should adopt (section 4).

It is not yet a PRD you could build and test against. It reads as an architecture proposal. It has no goals,
scope, personas, acceptance criteria or non-functional requirements. Its clinical safety rules and India-specific
billing rules are missing or left to "configure by jurisdiction". It says little about the **order management for
supplies** you asked about: replenishment, indents and purchase orders are not covered.

**The document itself needs cleanup.** All 52 sections appear twice (the copy starts around paragraph 1644). It
opens with "Yes. For a full HMS, I would build…" and ends by offering to write "the next artifact". This is
chat-transcript wording, and it should be removed before the document is circulated.

---

## 2. Gaps in the PRD

### 2.1 Missing standard PRD sections — **Critical**

| Missing | Why it matters |
|---|---|
| Problem statement, goals, measurable success metrics | Nothing defines "done" or "good". For example: 0 unbilled treatments, walk-in wait under 30 min, stock variance under 2% |
| In scope / out of scope for v1 | Section 2 lists 35 subdomains with no priority. Section 50 has phases but no v1 cut-off |
| Personas and user stories with acceptance criteria | Section 34 lists dashboards per role, but no testable stories |
| Non-functional requirements | No availability, performance, RTO/RPO, concurrency, data retention or audit-retention targets |
| Roles and permissions matrix | Who can sign a prescription, override a safety check, cancel a charge, or co-sign a treatment |
| Document control | Owner, version, approvers, change log |
| Assumptions, dependencies, risks | For example, whether the Stores/Billing/Pharmacy APIs exist yet. The PRD assumes they do |

### 2.2 Clinical safety — **Critical**

1. **No checks before treatment starts.** Section 10 lists states but never says what must be true to move
   between them. It needs hard stops, with override only by a nephrologist and a reason recorded:
   - prescription signed and valid today;
   - serology current, and machine/station isolation matches;
   - machine disinfected since its last patient;
   - today's water test passed;
   - dialyzer reuse within limits;
   - patient identity confirmed with two identifiers.

   The starter code already implements this in `session-gates.ts`.
2. **Serology and isolation are left vague.** Section 31 says "according to jurisdiction and institutional
   policy". v1 needs concrete rules:
   - HBsAg, anti-HCV and HIV at intake, then repeat testing at a configurable interval.
   - HBsAg-positive patients get dedicated machines and stations. The scheduler must refuse to break this.
   - Walk-ins whose serology is unknown get "unknown status" machines until results arrive.
   - A workflow for a patient whose result turns positive (tracing earlier shared machines and shifts).
   - Hepatitis B vaccination and anti-HBs titre tracking.
3. **Dialyzer reuse is missing entirely.** This is the largest India-specific gap, because reuse is common. It
   needs:
   - a per-patient dialyzer ID and labelling;
   - reprocessing log (germicide, contact time, residual test);
   - volume check (discard below 80% of baseline);
   - maximum reuse count;
   - reuse banned for HBsAg-positive patients;
   - a billing difference between a new dialyzer and a reprocessed one.
4. **Adequacy is not defined.** Section 32 mentions "Treatment Adequacy" without formulas or lab timing. It needs:
   - URR and spKt/V (Daugirdas) calculated automatically;
   - rules for when pre- and post-dialysis BUN are drawn;
   - automatic monthly and quarterly lab orders (Hb, ferritin/TSAT, Ca/PO4/PTH, albumin);
   - KDIGO/KDOQI targets set as configurable thresholds.
5. **No alert rules during treatment.** Section 15 lists event types but no triggers. For example:
   - low blood pressure: SBP < 90 or a drop > 20 mmHg;
   - UF rate > 13 ml/kg/h;
   - venous pressure trend;
   - UF goal above X% of dry weight.

   Each alert needs to say who is notified and how it is escalated.
6. **No consent handling.** Dialysis consent, blood-transfusion consent, high-risk or against-advice refusal,
   and consent to share data under ABDM.
7. **No patient lifecycle states.** Active, on hold, transferred out, transplanted, renal recovery, deceased,
   lost to follow-up. These drive mortality, transplant and registry reporting.
8. **The multidisciplinary care plan is only named.** Section 35 names `CarePlan`, and the Epic table claims
   "interdisciplinary plans", but no content is defined: dietitian, social worker, transplant work-up, access
   surveillance plan, patient education.

### 2.3 The treatment state machine is inconsistent — **High**

- `BILLING_COMPLETED` is the last clinical state in section 10. That contradicts section 43, which correctly says
  clinical completion must not depend on billing. **Fix:** keep `clinical_status`, `billing_status` and
  `supply_reconciliation_status` as three separate fields.
- `ADVERSE_EVENT` is listed as a state. It should be a `DialysisEvent` recorded during `IN_PROGRESS`. An adverse
  event does not stop a treatment unless it causes `INTERRUPTED` or `ABORTED`.
- `CONNECTED`, `TREATMENT_STARTED` and `IN_PROGRESS` overlap. Say what separates them, or merge them.
- **Missing:** `DEFERRED` (not fit to dialyse today, e.g. high potassium sent to the ER), resuming after
  `INTERRUPTED`, and undoing a mistaken check-in.
- **Missing:** a table of allowed transitions, who may perform each one, and what each one triggers
  (events, charges, stock).

### 2.4 Walk-in and inpatient flows — **High**

- **Walk-in triage and money before treatment.** Sections 5 and 44 put billing *after* treatment. For
  self-pay walk-ins, Indian units usually need a cost estimate, then a deposit or an approved scheme/TPA
  pre-authorisation *before* starting. Clinically urgent cases need an emergency bypass.
- **Transient/guest patients** (for example, dialysing while travelling). Importing the referring centre's
  prescription, serology and recent treatment sheets, plus a time-limited profile.
- **Emergency walk-ins** (fluid overload, high potassium). Triage priority, and how they bump planned patients.
- **Inpatient and ICU bedside dialysis.** Portable machine and portable RO allocation, and nurse travel time.
- **CRRT does not fit the "one treatment = one session" model.** It runs continuously for days. It needs:
  - per-day charges;
  - circuit/filter change events and filter life;
  - citrate or heparin protocol with hourly charting;
  - CRRT treatments that span several days.

  Section 8 names CRRT but the data model does not support it.

### 2.5 Order management for supplies — **High** (this is what you asked for)

The PRD handles stock movement from Stores to Dialysis to the patient well (sections 18–21). It does not cover
how stock gets replenished:

| Missing | Needed |
|---|---|
| Replenishment | Minimum stock, reorder point and maximum stock per item for the dialysis sub-store. Automatic indent to the central store, which raises purchase requests/orders to vendors |
| Schedule-driven forecasting | Required stock = treatments scheduled for the next N days × kit contents − stock on hand − stock on order + safety stock |
| Kit variants | Different kits per prescription (HD vs HDF, dialyzer size, catheter vs fistula). The kit follows the prescription version |
| Batch, lot and expiry | Barcode (GS1) scanning, earliest-expiry-first picking, blocking expired or recalled batches, and a recall query ("which patients got batch X?") |
| Vendor arrangements | Rate contracts and consignment stock for dialyzers and blood lines, often vendor-managed in Indian units |
| Non-billable consumables | Acid/bicarbonate concentrate, RO water and disinfectants: tracked for cost per treatment, never charged |
| Stores outage | What the nurse does when the Stores service is down (record consumption locally and sync later) |
| Month-end reconciliation | Issued = consumed + returned + wasted + closing balance, per item, with variance alerts |

### 2.6 Billing — **High**

The PRD rightly says Billing does the pricing and that bundling rules must be configurable (sections 22–24). Gaps:

- **Indian payers are missing.** The PRD cites US CMS/ESRD PPS but not:
  - **PMNDP** (free dialysis for BPL patients);
  - **PM-JAY** dialysis package codes and pre-authorisation;
  - state schemes;
  - CGHS/ECHS rates;
  - corporate credit;
  - GST treatment of consumables.
- **Prepaid session packages** (for example, 12 sessions a month): balance going down per session, expiry, and
  whether unused sessions carry forward.
- **Aborted and cancelled treatments.** Charging rules for: aborted after starting (partial charge), aborted
  before starting (opened items only), and late cancellation or no-show fees.
- **Reversals.** How a wrong charge is reversed (a reversal event, then a new charge) instead of being edited or
  deleted.
- **Estimate API** for walk-in financial clearance.
- **Charge reconciliation.** A daily report of treatments completed vs charges posted vs kits used, to catch
  lost revenue.
- **Checking the inpatient bill at discharge.** Section 44 says discharge "later checks" dialysis charges. Define
  whether discharge is blocked when dialysis charges are pending.

### 2.7 Integration and events — **High**

- **Mismatched publishers and subscribers.** Pharmacy subscribes to `dialysis.medication.order`, which is not in
  the event list. `dialysis.supply.issued` is listed as a dialysis event, but Stores owns stock issues, so it
  should be `stores.stock.issued`, consumed by Dialysis.
- **Missing events:** `treatment.aborted`, `treatment.deferred`, `supply.returned`, `supply.wasted`,
  `charge.reversed`, `prescription.signed`, `serology.changed`, `machine.status.changed`, and events coming back
  *in* from other modules (`billing.clearance.changed`, `stores.stock.low`, `lab.result.received`).
- **Reliable publishing.** Idempotency (section 42) handles duplicates but not lost events. The PRD does not say
  how the treatment update and its event are saved together. Specify a transactional outbox, event schema
  versioning, a dead-letter queue and replay.
- **Waiting vs not waiting on other modules.** Decide which calls happen while the user waits (estimate, stock
  check, coverage check) and which happen in the background. Define timeouts and what the screen does when
  another module is down.
- **Device integration.** Sections 13 and 50 are sound, but they do not say:
  - how a machine is linked to the patient being treated (station → machine → treatment binding);
  - clock synchronisation;
  - buffering when the network drops;
  - which machine models and protocols (HL7 v2, vendor serial/TCP) are in scope for v1.

### 2.8 Scheduling — **Medium**

Section 26 has a recurrence engine. It is missing:
- isolation-aware assignment of stations and machines;
- nurse-to-patient ratio per shift;
- holiday and closure rescheduling;
- make-up sessions for missed treatments;
- waitlist;
- choosing a slot based on transport;
- patient reminders by SMS or WhatsApp. The existing notification service and patient app in this repo can do this.

### 2.9 India regulatory and data — **High**

The PRD does not mention:
- **ABHA / ABDM:** linking the patient's ABHA ID, consent manager, and sharing records with other providers.
- **Digital Personal Data Protection Act 2023:** consent, purpose limitation, patient data rights.
- **NABH dialysis standards:** which records must be kept and how they are audited.
- **Legally required retention periods** for medical records.
- **Data residency:** this repo already uses AWS Mumbai.
- **Registry reporting:** national and state dialysis programme portals (PMNDP reporting).

### 2.10 Operations — **Medium**

- **Downtime and offline working** at the chair: paper downtime forms, then back-entry once systems recover.
- **Machine disinfection per treatment**, linked to the start check. Section 29 sends everything to Asset
  Management, but disinfection between patients is a dialysis-unit task, logged per treatment.
- **Staff:** nurse and technician assignment, and credential checks (only certified staff may cannulate).
- **Moving existing patients in:** migrating current patients' prescriptions, access history and schedules.
- **Testing:** section 51 has one end-to-end test each for inpatient and walk-in, which is good. Add:
  - an abort-and-refund case;
  - a duplicate-event case;
  - a device-offline case;
  - a case where serology turns positive;
  - a month-end reconciliation case.

### 2.11 The comparison tables — **Medium**

The Epic and Fresenius tables (sections 38–39) mark "Yes" for every capability in "Your HMS target". That lists
targets, not gaps. A useful comparison would:
- mark each row *v1 / later / not planned*;
- add rows where Indian needs go beyond both products (dialyzer reuse, PMNDP/PM-JAY, deposit collection before
  treatment, ABDM);
- confirm current vendor capabilities with the vendors before any procurement or positioning decision.

---

## 3. What the PRD does well (keep these)

- A clear rule: "Dialysis owns the clinical dialysis workflow; the HMS owns shared enterprise services", backed by
  an ownership table and a "what not to do" list (sections 48–49).
- **`DialysisEpisode`** as its own record, separate from the Encounter, plus a **FinancialEpisode** so the
  inpatient bill includes dialysis (sections 3 and 6).
- Prescriptions are versioned and never overwritten (section 9).
- Observations stored as time-series records rather than a wide table. Machine data goes through an ingestion
  layer that keeps the raw event (sections 13–14).
- **Stock issued is kept separate from stock consumed**, with a `ConsumptionType` classification (sections 20–21).
- **`ChargeRule`** with SEPARATE / INCLUDED / CONDITIONAL / NON_BILLABLE, owned by Billing (section 24).
- Clinical completion kept separate from billing completion (section 43).
- A water-quality module with thresholds configurable per jurisdiction (section 30).

---

## 4. Where our current design and starter code fall short of the PRD

To be fair, the review goes both ways. These PRD ideas are missing from `DIALYSIS_MODULE_DESIGN.md` and
`backend/services/dialysis`, and should be adopted:

| PRD idea | Current state | Change |
|---|---|---|
| `DialysisEpisode` | Treatments link straight to an encounter | Add an `episode` table. Treatments belong to an episode, and the episode links to the encounter and financial episode |
| Issued ≠ consumed | `ConsumableUsage` directly triggers a stock issue from the sub-store | Stores issues to department stock. Dialysis records patient consumption with a `consumptionType` |
| `ConsumptionType` / `ChargeRule` | A yes/no `chargeable` flag, and `deriveCharges` decides package vs extra | Send every consumption with its type. Billing's ChargeRule decides INCLUDED / SEPARATE / CONDITIONAL |
| Separate billing and supply statuses | A single `status` | Add `billingStatus` and `supplyReconciliationStatus` |
| Observations as type/value rows | Fixed columns (systolic, heart rate…) | Change to `observationType, value, unit, source, deviceId`, with a raw device-event table |
| `DialysisEvent` (intradialytic events) | Not modelled | Add an event table with type, severity, action, outcome and linked observation |
| Care plan, access assessments | Not modelled | Add in phase 2 |
| Pharmacy flow (order → dispense → administer) | Medication only in the design doc | Integrate with Pharmacy. Do not keep medication stock in Dialysis |

---

## 5. Recommended next steps

1. Rewrite the document as a proper PRD:
   - remove the duplicate copy and the chat wording;
   - add goals and metrics, v1 scope, personas, user stories with acceptance criteria, NFRs and a permissions
     matrix.
2. Add the critical clinical rules: safety checks before start, serology and isolation, dialyzer reuse, adequacy,
   alert thresholds, consent.
3. Add a supply order-management section: stock levels, forecasting, indents and purchase orders, batch/expiry,
   recall, reconciliation.
4. Add an Indian payer section: PMNDP, PM-JAY, state schemes, deposits, packages, abort/no-show charging, reversals.
5. Fix the state machine (separate status fields) and the event list (who publishes and subscribes, missing
   events, outbox).
6. Update the starter service to the PRD's stronger models (section 4 above) so the code and the PRD agree.
