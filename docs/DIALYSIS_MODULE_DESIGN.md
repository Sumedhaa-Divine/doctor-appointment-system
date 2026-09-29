# Dialysis Department Module — Design & Build Guide

**Status:** Proposed design · **Service:** `dialysis-service` (port 3007) · **Route prefix:** `/dialysis/*`

This document describes how to build a Dialysis (Nephrology / Renal Replacement Therapy) department module
for the HMS. It covers inpatient and walk-in (outpatient / transient) patients, integration with Billing and
with Supply Order Management, how the design compares with established renal information systems, and a
phased build plan. A starter implementation lives in `backend/services/dialysis`.

---

## 1. Goals and scope

| In scope | Out of scope (owned by other modules) |
|---|---|
| Dialysis patient registry (chronic, acute, transient) | Master patient index / registration (MPI / ADT) |
| Dialysis prescription (HD, HDF, SLED, CRRT, PD) | General pharmacy dispensing, central lab (LIS) |
| Chair / machine / shift scheduling, isolation rules | Hospital-wide appointment engine (reused) |
| Treatment session charting (pre / intra / post) | Tariff master, invoicing, receipts, claims (Billing) |
| Vascular access registry and events | Purchase orders, GRN, vendor payments (Procurement) |
| Dialyzer reuse tracking | Central store stock ledger (Inventory) |
| Consumable usage at chair side → charge + stock issue | |
| Machine maintenance, disinfection, water-treatment logs | |
| Adequacy (Kt/V, URR), monthly labs, quality dashboard | |

**Design principles**

1. **Dialysis is its own bounded context.** It owns clinical and operational dialysis data and publishes
   events. It never writes directly into the billing or inventory databases.
2. **The session is the unit of work.** Everything (charges, stock issue, nursing notes, machine usage,
   adequacy) is anchored to a `DialysisSession`.
3. **One workflow for every patient type.** Inpatients, OPD maintenance patients and walk-ins go through the same
   session lifecycle. What differs is the *encounter* the session belongs to and the *payer/billing route*.
4. **Safety gates are enforced by the system, not by habit** (serology before first session, isolation
   machine for HBsAg+, a signed prescription before starting, dialyzer reuse limits).
5. **Integration is event-driven and idempotent** (transactional outbox, idempotency keys, compensating
   events for reversals).

---

## 2. How established systems approach it

These are the systems a dialysis module is usually measured against. The comparison is at the capability level.
Vendor feature sets change between releases, so check current details with each vendor before relying on them
for procurement decisions.

| Capability | Epic (Nephrology / dialysis workflows) | Oracle Health (Cerner) | Specialised renal systems (e.g. Fresenius TDMS/Therapy Monitor, NephroFlow, DaVita-lineage EMRs) | **This design** |
|---|---|---|---|---|
| Positioning | Module inside an enterprise EHR, so a single patient chart across IP, OP and dialysis | Enterprise EHR with nephrology content | Dialysis-centric, used heavily by dialysis chains and standalone units | Dialysis bounded context inside the HMS, sharing MPI, billing and inventory |
| Recurring chair scheduling | Yes | Yes | Strong: shift/chair boards, chronic recurring patterns | Yes: recurring patterns + chair/machine board + isolation constraints |
| Machine data capture | Via device integration middleware | Via device integration | Often native, straight from vendor machines | Device gateway (HL7 v2 / vendor protocol → FHIR Observation), manual entry fallback |
| Intradialytic flowsheet | Yes | Yes | Yes, very detailed | Yes: 15–30 min vitals, pressures, UF, alarms |
| Adequacy & quality (Kt/V, URR, anaemia, CKD-MBD) | Yes, with registry reporting (US: CMS/CROWNWeb/EQRS) | Yes | Strong, quality programs built in | Yes: KDIGO/KDOQI targets, monthly dashboards, national-programme reporting |
| Vascular access registry | Yes | Yes | Yes | Yes |
| Dialyzer reuse | Limited (reuse is uncommon in US practice today) | Limited | Some | **First-class**: reuse is common in India, so it must be tracked |
| Consumable-driven billing | Charge capture through the EHR's revenue cycle | Yes | Often bundled, with PPS-style composite rates | Kit-based charge capture + package/scheme billing (self-pay, IPD, TPA, PM-JAY, PMNDP) |
| Supply chain | Via ERP integration (e.g. Lawson/Infor/SAP) | Via ERP | Some have inventory built in | Kit BOM → consumption events → par-level replenishment → indent/PO |
| Offline chair-side charting | Downtime procedures | Downtime procedures | Varies | Chair-side PWA with local queue and later sync |
| Standards | HL7 v2, FHIR, CCD | HL7 v2, FHIR | HL7 v2, vendor | FHIR R4 + ABDM (ABHA), HL7 v2 for devices/LIS |

**What we copy from the best systems**

- **Epic:** one longitudinal chart. Dialysis notes, labs and meds are visible to the ward team and vice versa,
  and inpatient dialysis orders originate from the admitting team's order entry.
- **Specialised renal systems:** the chair board, recurring schedules, machine integration, detailed
  intradialytic flowsheets, monthly quality rounds and dialyzer reuse.
- **Chain operators:** kit-based costing (cost per treatment), standard protocols and templated
  prescriptions, and quality dashboards that compare units.

**Where we go further for the Indian context**

- ABHA / ABDM linking, and the consent-based sharing of dialysis summaries.
- Payer routing across self-pay walk-ins, insurance/TPA pre-auth, PM-JAY packages and the
  Pradhan Mantri National Dialysis Programme (PMNDP, free dialysis for BPL patients), plus session packages and
  advance deposits.
- Dialyzer reuse, which covers count limits, TCV/priming-volume checks, and reprocessing logs.
- Isolation rules for HBsAg+, HCV+ and HIV+ patients enforced in scheduling.

---

## 3. Patient types and entry routes

```
                        ┌───────────────────────────────────────────┐
                        │            MPI / Registration             │
                        │  (UHID, ABHA, demographics, payer info)   │
                        └──────────────┬────────────────────────────┘
          ┌────────────────────────────┼─────────────────────────────┐
          ▼                            ▼                             ▼
  INPATIENT (IPD/ICU)         CHRONIC OUTPATIENT              WALK-IN / TRANSIENT
  Order from ward/ICU         (maintenance HD, 2–3x/wk)       (no prior slot, guest pt
  consultant (CPOE)           Recurring schedule              from another centre)
  Encounter = IP admission    Encounter = OP dialysis visit   Encounter = OP dialysis visit
  Bed-side or unit chair      Unit chair                      First free compatible chair
  Bill → IP interim bill      Bill → OP bill / package        Bill → pay-before-service,
                               / scheme / TPA                  deposit, or scheme
```

| Aspect | Inpatient | Chronic OP | Walk-in / Transient |
|---|---|---|---|
| Order source | Ward/ICU CPOE `ServiceRequest` → dialysis worklist | Standing prescription (valid N months) | Nephrologist creates prescription on arrival, or imports a referral prescription |
| Encounter | Existing IP encounter | New OP encounter per session (or monthly episode) | New OP encounter |
| Location | Unit chair, ICU bedside (portable HD, CRRT, SLED) | Unit chair | Unit chair (isolation if serology unknown/positive) |
| Serology gate | Required. If unknown, use a dedicated "unknown status" machine | Valid within policy window (e.g. 3–6 months) | Must present recent report, or is treated as unknown/isolated |
| Billing | Charges post to the IP bill, with no collection at the unit | Package / per-session / scheme / TPA | Collect deposit before starting; settle after the session |
| Priority | Emergent (hyperkalaemia, fluid overload) can pre-empt | Planned | Fitted into gaps; urgent triage possible |

**Walk-in flow (the one most systems handle badly):**

1. Front desk searches the MPI and registers the patient (quick registration with an ABHA scan) if they are new.
2. Triage by a dialysis nurse records vitals, the last dialysis date, access type, serology report and the reason
   for the visit.
3. The system proposes compatible chairs, respecting serology isolation and free machines in the current or next
   shift. It checks consumable availability for the required kit.
4. Financial clearance: the billing estimate is based on the prescription and kit. The patient pays a deposit, an
   eligible scheme is verified (PMNDP/PM-JAY), or TPA pre-auth is requested.
5. A nephrologist signs the prescription (or approves the referral prescription).
6. The session runs through the standard lifecycle (section 5).
7. On completion, final charges post, and the deposit is adjusted and a receipt issued.

---

## 4. Domain model

```
DialysisPatientProfile 1───* VascularAccess
        │ 1                    │
        │                      └──* AccessEvent (cannulation issue, infection, thrombosis, surgery)
        ├──* DialysisPrescription (versioned; one ACTIVE per modality)
        ├──* RecurringSchedule (e.g. MWF shift-2 chair-7)
        ├──* SerologyResult (HBsAg, anti-HCV, HIV, anti-HBs titre)
        ├──* DialyzerReuseRecord (per physical dialyzer)
        └──* DialysisSession ──┬── PreAssessment
                               ├──* IntradialyticObservation (q15–30 min)
                               ├── PostAssessment
                               ├──* MedicationAdministration (EPO, iron, heparin, ...)
                               ├──* ConsumableUsage  ───► stock issue + charge
                               ├──* SessionCharge    ───► billing
                               └── Complication / Alarm log

DialysisUnit 1──* Station(chair/bed) 1──0..1 Machine
Machine 1──* MaintenanceLog / DisinfectionLog
DialysisUnit 1──* Shift ; 1──* WaterTreatmentLog (chlorine, conductivity, culture, endotoxin)
SupplyKit (BOM) 1──* KitItem ; DialysisUnit 1──* ParLevel ; 1──* SupplyIndent
```

**Key entities (fields that matter)**

- **DialysisPatientProfile:** `patientId` (MPI/UHID), `abhaId`, `category` (CHRONIC | ACUTE | TRANSIENT),
  `primaryRenalDiagnosis` (ICD-10 N18.x), `dialysisStartDate`, `dryWeightKg`, `serologyStatus` (derived),
  `isolationRequirement` (NONE | HBV | HCV | HIV | UNKNOWN), `defaultPayerRoute`, `transplantWorkupStatus`.
- **DialysisPrescription:** `modality` (HD | HDF | SLED | CRRT_CVVH | CRRT_CVVHD | CRRT_CVVHDF | PD_CAPD | PD_APD),
  `durationMin`, `frequencyPerWeek`, `dialyzerModel`, `reuseAllowed`, `maxReuse`, `bloodFlowMlMin` (Qb),
  `dialysateFlowMlMin` (Qd), dialysate `{na, k, ca, hco3, tempC}`, `targetUfMl` / `ufProfile`,
  anticoagulation `{type: HEPARIN|LMWH|CITRATE|NONE, bolusIU, hourlyIU, stopBeforeEndMin}`, `accessId`,
  `kitCode`, `validFrom`, `validTo`, `signedBy`, `signedAt`, `version`, `status`.
- **DialysisSession:** `sessionNo`, `patientId`, `encounterId`, `encounterType` (IP | OP),
  `patientType` (INPATIENT | CHRONIC_OP | WALK_IN), `prescriptionId` + `prescriptionVersion` (snapshot),
  `stationId`, `machineId`, `shiftId`, `scheduledStart`, `status`, `payerRoute`, `preWeightKg`, `postWeightKg`,
  `actualUfMl`, `startedAt`, `endedAt`, `abortReason`, `ktv`, `urr`, `dialyzerReuseId`, `nurseId`,
  `nephrologistId`, `idempotencyKey`.
- **ConsumableUsage:** `sessionId`, `itemCode`, `batchNo`, `expiryDate`, `qty`, `uom`, `isKitComponent`,
  `chargeable`, `sourceStoreId`, `stockIssueRef`.
- **SessionCharge:** `sessionId`, `chargeCode` (tariff master), `qty`, `unitPrice` (resolved by Billing),
  `status` (PENDING | POSTED | REVERSED), `billingRef`, `idempotencyKey`.

The full DDL is in the starter entities (`backend/services/dialysis/src/entities`).

---

## 5. Session lifecycle (state machine)

```
             schedule()                check_in()               pre_assess()
 [SCHEDULED] ─────────► [CHECKED_IN] ───────────► [PRE_ASSESSMENT] ───────────┐
     │  ▲                    │                        │                       │ start()  (gates)
     │  └── reschedule()     │ no_show()/cancel()     │ defer()               ▼
     │                       ▼                        ▼               [IN_PROGRESS] ──► record_observation()*
     └── cancel() ──► [CANCELLED]                [DEFERRED]                  │
                                                                             ├── abort(reason) ──► [ABORTED]
                                                                             ▼ end()
                                                                    [POST_ASSESSMENT]
                                                                             │ complete() (nurse sign)
                                                                             ▼
                                                                       [COMPLETED] ── verify() ──► [VERIFIED]
                                                                                        (nephrologist co-sign)
```

**Gates checked on `start()`** (hard stops unless overridden by a nephrologist, and every override is audited):

1. There is an active, signed prescription that is valid today, and its version is snapshotted on the session.
2. Serology is valid (within the policy window), and the machine's isolation class matches the patient's
   isolation requirement.
3. The machine is `AVAILABLE`, disinfection was logged after the previous session, and preventive maintenance is not
   overdue.
4. The unit's water-treatment log for the day passes (chlorine/chloramine check done).
5. For a reused dialyzer, it belongs to this patient, `reuseCount < maxReuse`, and the TCV check passed after
   reprocessing. Patient identity is verified by two identifiers.
6. Financial clearance: IP needs nothing extra. OP/walk-in needs a deposit, an active package balance,
   scheme eligibility, or pre-auth. This is a *soft* gate: the unit can override for clinical emergencies.
7. The required kit items are available in the unit sub-store. A shortage is a warning, not a stop.

**Events emitted** (via the outbox): `dialysis.session.scheduled`, `.checked_in`, `.started`,
`.observation_recorded`, `.completed`, `.aborted`, `.cancelled`, `.verified`,
`dialysis.consumable.used`, `dialysis.consumable.returned`, `dialysis.charge.requested`,
`dialysis.charge.reversal_requested`.

---

## 6. Integration architecture

```
             ┌──────────────┐     REST (sync, reads)      ┌──────────────┐
             │   MPI / ADT  │◄────────────────────────────│              │
             └──────────────┘                             │              │
             ┌──────────────┐  ServiceRequest (IP orders) │              │
             │ CPOE / Wards │────────────────────────────►│   DIALYSIS   │
             └──────────────┘                             │   SERVICE    │
             ┌──────────────┐  results (HL7 ORU / FHIR)   │              │
             │     LIS      │────────────────────────────►│  PostgreSQL  │
             └──────────────┘                             │  + outbox    │
             ┌──────────────┐  machine data (HL7 v2 /    │              │
             │Device gateway│  vendor protocol → FHIR)   │              │
             └──────────────┘────────────────────────────►│              │
                                                          └──────┬───────┘
                                                   outbox relay  │  events (Kafka / Redis Streams)
                               ┌──────────────────────────────────┼──────────────────────────┐
                               ▼                                  ▼                          ▼
                        ┌─────────────┐                   ┌──────────────┐           ┌──────────────┐
                        │   BILLING   │                   │  INVENTORY / │           │ NOTIFICATION │
                        │ charge cap- │                   │ ORDER MGMT   │           │ (SMS/WhatsApp│
                        │ ture, bills │                   │ stock issue, │           │  reminders)  │
                        └──────┬──────┘                   │ par, indent, │           └──────────────┘
                               │ billing.charge.posted     │ PO           │
                               │ billing.clearance.changed └──────┬───────┘
                               └──────────► DIALYSIS ◄────────────┘ inventory.stock.low / issued
```

**Rules**

- **Transactional outbox:** the session state change and the outbox row are written in the *same* DB transaction.
  A relay (Bull job or Debezium) publishes them. This rules out "charged but not completed" and "completed but
  never charged" inconsistencies.
- **Idempotency:** each event carries an `eventId`, and each charge/stock line carries a deterministic
  `idempotencyKey` (`{sessionId}:{chargeCode}:{lineNo}`). Consumers de-duplicate on it.
- **Compensation, not deletion:** if a session is aborted after the kit was opened, consumed items stay charged
  according to policy, and unused items raise `consumable.returned`. A charge correction becomes a
  `charge.reversal_requested` followed by a new charge.
- **Sync calls only for reads** that the user waits on: price estimate, deposit balance, stock availability.
  These use short timeouts and a degraded mode that shows a warning and lets the user proceed.

### 6.1 Billing integration

| Trigger | Billing action |
|---|---|
| Walk-in triage done | `GET /billing/estimate` (prescription + kit + payer) → collect deposit |
| Session `started` | Optional: post the package/session charge early (for IP interim bills) |
| Session `completed` | Post the session charge + extra consumables + drugs + procedures |
| Session `aborted` | Post partial-session charge per policy; return unused items |
| Monthly (chronic) | Package reconciliation; scheme claim batch (PMNDP/PM-JAY) |

**Charge composition for one HD session**

```
HD_SESSION (package, per modality/duration)       → 1
DIALYZER_NEW or DIALYZER_REUSE_PROCESSING         → 1
Items outside the kit (extra saline, extra needle) → qty used
Drugs (EPO, iron sucrose, IV antibiotics)          → from MedicationAdministration
Procedures (catheter insertion, AVF cannulation)   → per event
Isolation surcharge (if policy)                    → 1
```

**Payer routing** (`payerRoute` on the session, defaulted from the profile, confirmed at check-in):

- `IPD`: the charge posts to the IP encounter. Nothing is collected at the unit.
- `SELF_PAY`: deposit or pay-before-service, settled on completion.
- `PACKAGE`: decrements a prepaid package (e.g. 12 sessions/month), and extras are billed separately.
- `TPA_INSURANCE`: needs a pre-auth number. Charges accumulate on a claim.
- `GOVT_SCHEME`: PM-JAY / PMNDP / state scheme. Session is priced at the scheme package rate. The claim is
  submitted from Billing with documents (session sheets, lab reports) pulled from Dialysis via API.
- `CORPORATE`: credit bill to the employer.

Dialysis **never computes prices**. It sends codes and quantities, and Billing resolves the tariff by payer,
package and scheme.

### 6.2 Supply order management

**Kit-based consumption.** Each prescription references a `kitCode`. A kit is a BOM:

| Kit `HD_STD_4H` | Qty |
|---|---|
| Dialyzer (per prescription; skipped when reusing) | 1 |
| AV blood tubing set | 1 |
| AV fistula needles 16G | 2 |
| NS 0.9% 1000 ml | 1 |
| Heparin 5000 IU/ml vial | 1 |
| Acid concentrate / bicarbonate cartridge | 1 / 1 |
| Dressing pack, gloves, syringes, gauze | 1 set |

**Flow**

1. **At start:** the nurse scans the kit or item barcodes (GS1: GTIN + batch + expiry). The system auto-fills the
   kit and the nurse adjusts actual quantities. FEFO is enforced and expired or recalled batches are blocked.
2. **`dialysis.consumable.used`** → Inventory issues stock from the **dialysis sub-store** (a stock ledger
   entry against a cost centre) and Billing charges the lines flagged `chargeable`.
3. **Replenishment:** Inventory evaluates the par levels of the dialysis sub-store. Below the reorder point it
   raises an **indent** to the central store. The central store below its own reorder point raises a **PR → PO**
   to the vendor (rate contracts for dialyzers and tubing).
4. **Schedule-driven forecasting** (better than par alone):
   `required(item, next N days) = Σ sessions scheduled × kit qty − on-hand − in-transit + safety stock`.
   This runs nightly and suggests indents, which a coordinator approves.
5. **Traceability:** batch numbers on `ConsumableUsage` allow a recall query ("which patients received dialyzer
   batch X?").
6. **Non-stock items:** dialysate concentrate and RO water are tracked by consumption per session for costing
   and are not billed.

**Cost per treatment** = Σ (issued qty × weighted average cost) + reprocessing cost + staff time share. This is
reported per modality, per payer and per month.

---

## 7. Clinical safety & quality features

- **Serology & isolation:** HBsAg+ patients get dedicated machines and stations (a hard constraint). HCV+ are
  cohorted per unit policy. Unknown serology gets an "unknown" machine until results are back. The scheduler refuses
  any assignment that violates these rules.
- **Dialyzer reuse:** reuse is labelled per patient (name + UHID + barcode). The record holds the reprocessing log
  (germicide, contact time, residual germicide test), TCV/fibre bundle volume (discard below 80% of the baseline),
  and a max reuse count. Reuse is not allowed for HBsAg+ patients, per common policy.
- **Intradialytic monitoring:** alerts fire on SBP < 90 or a drop > 20 mmHg, on HR outside range, on UF rate
  > 13 ml/kg/h, on venous pressure trends and on machine alarms. Complications are coded (hypotension, cramps,
  clotting, access bleeding, arrhythmia, reaction).
- **Adequacy:** URR = (pre BUN − post BUN) / pre BUN, with a target ≥ 65%. spKt/V uses the Daugirdas II formula,
  with a target ≥ 1.2 for thrice-weekly HD. Both are computed automatically when BUN results arrive.
- **Monthly quality board** (KDIGO/KDOQI-aligned): Hb, ferritin/TSAT, albumin, Ca/PO4/PTH, Kt/V, interdialytic
  weight gain, AVF prevalence vs catheter, catheter-related bloodstream infections per 1000 catheter-days,
  hospitalisation, mortality, and missed/shortened sessions.
- **Water treatment:** daily chlorine/chloramine and conductivity checks, plus monthly microbiology
  (e.g. ISO 23500 limits for bacteria and endotoxin). A failed test blocks session start for the unit until it is
  resolved or overridden.
- **Machines:** preventive maintenance schedule, post-session disinfection (heat/chemical) logs, and a
  downtime register.

---

## 8. Roles & permissions (extends existing RBAC)

| Role | Key permissions |
|---|---|
| `NEPHROLOGIST` | `dialysis.prescription.sign`, `dialysis.session.verify`, `dialysis.gate.override` |
| `DIALYSIS_NURSE` | `dialysis.session.checkin`, `.start`, `.observe`, `.complete`, `dialysis.consumable.record` |
| `DIALYSIS_TECHNICIAN` | `dialysis.machine.maintain`, `dialysis.reuse.process`, `dialysis.water.log` |
| `DIALYSIS_COORDINATOR` | `dialysis.schedule.manage`, `dialysis.supply.indent.approve`, reports |
| `FRONT_DESK` | `dialysis.walkin.register`, `dialysis.schedule.view` |
| `FINANCE` (existing) | `dialysis.charge.view`, `dialysis.package.manage` |

All clinical writes go to `audit_logs`. Prescription changes are versioned, never updated in place.

---

## 9. API surface (REST, behind the API gateway at `/dialysis/*`)

```
# Patients & prescriptions
POST   /dialysis/patients                          enrol patient (link MPI patientId)
GET    /dialysis/patients/:id                      profile + access + serology + active Rx
POST   /dialysis/patients/:id/prescriptions        new version (draft)
POST   /dialysis/prescriptions/:id/sign            nephrologist signs → ACTIVE
POST   /dialysis/patients/:id/access               add vascular access
POST   /dialysis/patients/:id/serology             record serology result

# Scheduling
GET    /dialysis/board?date=&unitId=               chair board (shifts × stations)
POST   /dialysis/schedules/recurring               MWF/TTS pattern → sessions generated N weeks ahead
POST   /dialysis/walk-ins                          triage + chair suggestion + financial estimate
POST   /dialysis/inpatient-orders                  from CPOE (FHIR ServiceRequest)

# Session lifecycle
POST   /dialysis/sessions                          schedule a single session
POST   /dialysis/sessions/:id/check-in
POST   /dialysis/sessions/:id/pre-assessment
POST   /dialysis/sessions/:id/start                runs safety gates
POST   /dialysis/sessions/:id/observations         intradialytic entry (or device feed)
POST   /dialysis/sessions/:id/consumables          record usage (barcode scan)
POST   /dialysis/sessions/:id/end
POST   /dialysis/sessions/:id/complete             post-assessment + nurse sign
POST   /dialysis/sessions/:id/abort
POST   /dialysis/sessions/:id/verify               nephrologist co-sign

# Operations
POST   /dialysis/machines/:id/disinfection
POST   /dialysis/machines/:id/maintenance
POST   /dialysis/water-tests
POST   /dialysis/dialyzers/:id/reprocess
GET    /dialysis/supply/forecast?days=7            schedule-driven requirement
GET    /dialysis/reports/quality?month=
GET    /dialysis/fhir/Procedure?patient=           FHIR read facade for ABDM / other modules
```

All `POST` endpoints accept an `Idempotency-Key` header, because chair-side tablets retry on flaky Wi-Fi.

---

## 10. Interoperability mapping (FHIR R4)

| Dialysis concept | FHIR resource |
|---|---|
| Dialysis order (IP) / prescription | `ServiceRequest` (+ `DeviceRequest` for dialyzer) |
| Session | `Encounter` (OP) or sub-encounter + `Procedure` (SNOMED CT "Hemodialysis") |
| Intradialytic vitals / machine params | `Observation` (LOINC vitals; device params) |
| Machine | `Device`, `DeviceMetric` |
| Drugs given | `MedicationAdministration` |
| Consumables | `SupplyDelivery` (issue), `SupplyRequest` (indent) |
| Charges | `ChargeItem` |
| Access | `Procedure` (creation) + `Condition`/`Observation` (status) |
| Summary to ABDM | `Composition` (discharge / OP consult note bundle) |

---

## 11. Technology fit with this repository

- **New NestJS microservice** `backend/services/dialysis` (TypeORM + PostgreSQL), same as the other services.
- **Separate schema** `dialysis` in the shared Postgres cluster (a separate DB in production).
- **Events:** start with Bull/Redis (already in the stack) for the outbox relay and consumers. Move to
  Kafka/MSK when more modules subscribe, keeping the same envelope.
- **Chair-side UI:** a tablet PWA (or Flutter tablet app) with offline queueing of observations and consumables,
  keyed by client-generated UUIDs so a retry never duplicates.
- **Device gateway:** a small edge service in the unit LAN that talks to the machines (serial/TCP, vendor
  protocol, or HL7 v2 via an interface engine such as Mirth/NextGen Connect) and posts observations.
- **Reporting:** read replica + materialised views for the quality board and cost per treatment.

---

## 12. Build plan

| Phase | Weeks | Deliverables | Exit criteria |
|---|---|---|---|
| **0. Discovery** | 2 | Unit SOPs, tariff and scheme mapping, kit BOMs, machine inventory, isolation policy | Signed-off requirements; kit list priced |
| **1. Core clinical** | 6 | Profiles, serology, access, versioned prescriptions, session lifecycle with gates, flowsheet, audit | One unit runs paper-parallel for 2 weeks |
| **2. Scheduling** | 3 | Chair board, recurring schedules, walk-in triage + chair suggestion, IP order intake | No double-booking; isolation never violated in tests |
| **3. Billing** | 4 | Outbox, charge events, estimate API, deposits, packages, IPD posting, scheme/TPA routing | 100% of sessions reconciled with bills for 1 month |
| **4. Supply** | 4 | Kit BOM, barcode capture, sub-store issue, par levels, forecast, indents | Stock variance < 2% at month-end count |
| **5. Quality & devices** | 4 | Adequacy calc, monthly board, device gateway for primary machine model, water/machine logs | Kt/V auto-computed for > 95% of sessions |
| **6. Hardening** | 3 | Offline mode, performance, DR, security review, training, go-live | Go-live checklist; downtime procedure drilled |

**Testing strategy**

- Unit tests for the state machine and every gate, with an isolation-violation property test.
- Contract tests (Pact) between Dialysis ↔ Billing and Dialysis ↔ Inventory for every event schema.
- End-to-end walk-in scenario: register → triage → deposit → session → abort → partial charge → refund.
- Month-end reconciliation job: sessions completed = charges posted = kits issued. Any mismatch raises an alert.

**KPIs to track after go-live:** chair utilisation per shift, walk-in wait time, missed/shortened sessions,
revenue leakage (sessions without charges), consumable variance, cost per treatment, and the KDIGO quality
indicators.

---

## 13. Starter implementation

`backend/services/dialysis` contains:

- `src/entities/*`: TypeORM entities for profile, prescription, session, observations, consumables, charges,
  stations/machines and the outbox.
- `src/sessions/session-state-machine.ts`: an explicit transition table.
- `src/sessions/session-gates.ts`: the safety gates as pure functions, so they are easy to unit test.
- `src/sessions/sessions.service.ts`: the lifecycle service. It writes state + outbox in one transaction and
  derives charges and consumable events on completion/abort.
- `src/integration/events.ts`: versioned event contracts consumed by Billing and Inventory.
- `src/integration/outbox.relay.ts`: polls the outbox and publishes to a Bull queue.

The API gateway routes `/dialysis/*` to the service, and `docker-compose.dev.yml` runs it on port 3007.
