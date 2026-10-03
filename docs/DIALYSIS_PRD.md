# Dialysis Department Module — Product Requirements Document

## Document control

| Field | Value |
|---|---|
| Product | Hospital Management System (HMS), Dialysis Department module |
| Document | Product Requirements Document (PRD) |
| Version | 2.0 (Draft for review) |
| Supersedes | Dialaysis_PRD.docx (v1, architecture proposal) |
| Owner | HMS Product Management (to be named) |
| Reviewers | Head of Nephrology, Dialysis Nursing Lead, Billing/RCM Lead, Stores & Procurement Lead, Pharmacy Lead, Biomedical Engineering, Quality (NABH), IT Architecture |
| Status | Draft. Not yet approved |

**Change log**

| Version | Date | Change |
|---|---|---|
| 1.0 | — | Original architecture proposal (Dialaysis_PRD.docx) |
| 2.0 | 3 Oct 2026 | Converted to a PRD. Duplicate content removed. Added goals, scope, personas, numbered requirements with priorities, clinical safety rules, dialyzer reuse, supply order management, Indian payer rules, event catalogue, non-functional requirements, compliance, acceptance tests, risks and open questions |

**How to read the requirements.** Each requirement has an ID (for example `FR-TRT-05`) and a priority:

| Priority | Meaning |
|---|---|
| **Must** | Required for v1 go-live |
| **Should** | Expected in v1. Can slip to the first update after go-live with sign-off |
| **Could** | Planned for later phases |

---

## 1. Purpose and background

The hospital needs a Dialysis Department module inside the HMS. It must handle:
- hospital inpatients (ward and ICU);
- regular outpatients on maintenance dialysis;
- walk-in and visiting patients.

It must also integrate with Billing and with Stores/Order Management for supplies.

Dialysis is a high-volume, high-risk and high-consumable service. A typical patient has 2–3 treatments a week, each about 4 hours. Each treatment uses a dialyzer, blood lines, needles, fluids and drugs. Each treatment must be:
- clinically safe (infection isolation, prescription adherence, machine and water safety);
- fully documented;
- charged correctly to the right payer;
- matched by the right stock movements.

Today these steps are often spread across paper charts, spreadsheets and generic HMS screens. The result is missed charges, stock that doesn't reconcile, and safety checks that depend on habit.

**Key principle: Dialysis owns the clinical dialysis workflow. The HMS owns shared enterprise services.** Dialysis
orchestrates patient registration, orders, pharmacy, stores, billing, lab and asset management. It never duplicates them.

---

## 2. Goals, non-goals and success metrics

### 2.1 Goals

1. **One dialysis workflow for every patient type.** Inpatient, outpatient and walk-in treatments run on the same engine. Only the surrounding visit, admission and payer context differs.
2. **Safety enforced by the system.** Infection isolation, prescription validity, machine disinfection, water quality and dialyzer reuse limits are hard checks, not reminders.
3. **No lost revenue.** Every treatment produces the correct charges for the correct payer, and every charge can be traced back to the treatment.
4. **Accurate stock.** Stock issued, consumed, returned and wasted reconcile at month end. Replenishment is driven by the schedule.
5. **Quality you can measure.** Adequacy, anaemia, mineral bone disease, vascular access and infection indicators are tracked against configurable targets.

### 2.2 Non-goals for v1

- A separate dialysis patient database, billing engine, inventory or pharmacy. Dialysis uses the enterprise modules.
- Home haemodialysis and peritoneal dialysis workflows. The data model supports them, but the screens come in a later phase.
- Building a full Asset Management or Procurement system. Dialysis uses the enterprise ones.
- Patient self-service beyond appointment reminders.

### 2.3 Success metrics (measured 3 months after go-live)

| Metric | Target |
|---|---|
| Completed treatments without a posted charge (lost revenue) | 0 at month-end close |
| Treatments started without passing all mandatory safety checks (excluding recorded overrides) | 0 |
| Isolation violations (patient on a machine of the wrong isolation class) | 0 |
| Month-end stock variance for dialysis consumables | Under 2% by value |
| Walk-in time from arrival to start of treatment (non-emergency) | Median under 45 minutes |
| Treatments with Kt/V or URR calculated automatically | Over 95% of eligible treatments |
| Chair utilisation per shift | Reported daily. Baseline set in month 1 |
| Nurse documentation time per treatment | At least 30% lower than the paper baseline |

---

## 3. Scope

| Area | v1 | Later | Not planned |
|---|---|---|---|
| Haemodialysis (HD), haemodiafiltration (HDF) | ✓ | | |
| SLED, CRRT (ICU bedside) | ✓ (basic) | Full CRRT protocols | |
| Peritoneal dialysis (CAPD/APD), home HD | | ✓ | |
| Inpatient, outpatient, walk-in and visiting patients | ✓ | | |
| Recurring scheduling, station board | ✓ | | |
| Manual charting, chair-side tablet | ✓ | | |
| Machine data integration (device gateway) | Primary machine model | Other models | |
| Dialyzer reuse | ✓ | | |
| Supply consumption, replenishment, forecasting | ✓ | Vendor-managed inventory portal | |
| Billing: self-pay, packages, inpatient, TPA, PM-JAY, PMNDP, corporate | ✓ | | |
| Quality dashboard | ✓ | Registry submission automation | |
| Multi-facility | Data model | Screens and cross-centre reporting | |
| Patient app reminders | Should | Patient-facing records | |
| AI (e.g. predicting low blood pressure during treatment) | | ✓ | |

---

## 4. Personas and roles

| Persona | Main goals | Main screens |
|---|---|---|
| **Nephrologist** | Prescribe safely, review treatments, adjust care, monitor quality | Patient summary, prescription, trends, treatment review, care plan, quality |
| **Dialysis nurse** | Run treatments safely and quickly; document without duplicate entry | My station, today's patients, pre/during/post charting, medicines, supplies |
| **Dialysis technician** | Machines ready, disinfected and maintained; reprocess dialyzers; log water tests | Machine board, disinfection, reuse, water log |
| **Dialysis coordinator / in-charge** | Fill chairs, manage walk-ins, approve indents, run the unit | Schedule board, walk-in queue, capacity, supply forecast, reports |
| **Front desk** | Register and check in patients, collect deposits | Registration, check-in, estimate, deposit |
| **Billing / RCM** | Accurate charges, packages, claims, reconciliation | Charge review, package balances, claim status, reconciliation |
| **Stores** | Keep the dialysis sub-store stocked; trace batches | Indents, issues, consumption vs issue, expiry |
| **Quality / infection control** | Monitor indicators, isolation, outbreaks, water quality | Quality board, infection events, water results |
| **Hospital administration** | Capacity, revenue, margin, quality | Management dashboard |

### 4.1 Permissions matrix

| Action | Nephrologist | Nurse | Technician | Coordinator | Front desk | Billing | Stores |
|---|---|---|---|---|---|---|---|
| Create or sign prescription | ✓ | | | | | | |
| Override a hard safety check | ✓ | | | | | | |
| Schedule or reschedule | ✓ | ✓ | | ✓ | ✓ | | |
| Check in, pre-assessment, start, chart, complete | | ✓ | | | Check-in only | | |
| Co-sign (verify) treatment | ✓ | | | | | | |
| Record supplies used | | ✓ | ✓ | | | | |
| Log disinfection, reuse, water test | | ✓ | ✓ | | | | |
| Approve indent | | | | ✓ | | | ✓ |
| Collect deposit, issue estimate | | | | | ✓ | ✓ | |
| Reverse or correct a charge | | | | | | ✓ | |
| View quality dashboard | ✓ | ✓ | | ✓ | | | |

Every role sees only the patients and facilities it is assigned to. Every access to clinical data is audited.

---

## 5. Architecture principles and module boundaries

### 5.1 Position in the HMS

Dialysis is a top-level clinical department alongside IP, OP, ER, ICU, OT, Radiology, Laboratory, Physiotherapy and Pharmacy.

```
                    FULL HMS
                       │
 ┌─────────────────────┼──────────────────────┐
 │                     │                      │
FOUNDATION          CLINICAL              ENTERPRISE
MPI / Patient       IP  OP  ER  ICU       Billing / Packages
Provider            OT  Radiology         Claims / Insurance
Encounter           Lab  Physio           Payments / Finance / GL
Organisation        Pharmacy              Audit
Orders              ► DIALYSIS ◄
                       │
                SHARED SERVICES
   Stores / Inventory / Procurement · Pharmacy / MAR
   Asset Management · Integration (HL7 / FHIR / Device)
```

### 5.2 Ownership

| Domain | Owns | Dialysis relationship |
|---|---|---|
| MPI / Registration | Patient identity, demographics, ABHA | Reads. Never creates a second patient record |
| Encounter / ADT | Admissions, OP visits, financial episode | Links each treatment to an encounter |
| Orders | Enterprise orders (CPOE) | Receives dialysis orders for inpatients. Places lab and medicine orders |
| **Dialysis** | Profile, episode, prescription, schedule, treatment, observations, events, access, reuse, machine use, water tests, care plan | System of record |
| Pharmacy | Medicine dispensing and medicine stock | Sends medicine orders. Records administration |
| Stores / Inventory | Stock ledger, issues, returns, procurement | Sends supply requests and patient consumption. Stores is the inventory authority |
| Billing / RCM | Pricing, packages, invoices, claims, payments | Sends charge events. Never computes prices or creates invoices |
| Asset Management | Machine assets, preventive maintenance, calibration, repair | Reads status. Logs disinfection between patients |
| Laboratory | Lab workflow and results | Sends orders. Receives results |
| Device Integration | Machine communications | Receives normalised observations |
| IAM / Audit | Users, roles, audit trail | Uses |

### 5.3 What not to build

- ❌ A separate dialysis patient database. Use the MPI.
- ❌ A separate dialysis billing engine. Use enterprise Billing, Packages and ChargeRules.
- ❌ A separate dialysis inventory or pharmacy.
- ❌ Every treatment parameter in one wide table. Use treatment + observations + events.
- ❌ Machines writing directly into patient tables. Use the device gateway and ingestion layer.
- ❌ Treating supplies issued as supplies consumed. They are different events.
- ❌ Creating invoices from the treatment screen. Send charge events to Billing.
- ❌ Hard-coded packages, insurance rules or regulatory thresholds. Make them configurable.
- ❌ Overwriting prescriptions or clinical records. Version them and keep history.

---

## 6. Core concepts

```
Patient (MPI)
   │
   ├── DialysisPatientProfile (1:1)
   │       ├── Diagnoses, Infection/serology status, Vaccinations
   │       ├── VascularAccess (1..n) ── AccessAssessments, AccessEvents
   │       ├── Prescription (versioned)
   │       ├── RecurringSchedule
   │       ├── DialyzerReuseRecords
   │       └── CarePlan
   │
   ├── Encounter (IP admission / OP dialysis visit)  ── owned by ADT
   │
   ├── FinancialEpisode (bill context)               ── owned by Billing
   │
   └── DialysisEpisode
           ├── DialysisOrder (inpatient) / Enrolment (outpatient)
           └── DialysisTreatment (1..n)
                   ├── PreAssessment, PostAssessment
                   ├── Observations (time series), MachineObservations (raw + normalised)
                   ├── DialysisEvents (problems during treatment)
                   ├── MedicationAdministrations
                   ├── SupplyConsumption
                   ├── ChargeEvents
                   └── TreatmentSummary
```

| Concept | Definition |
|---|---|
| **DialysisPatientProfile** | The dialysis-specific record, linked one-to-one with the enterprise patient. Holds dialysis number, status, start date, renal diagnosis, modality, dry weight, residual urine, infection status, isolation class, transplant status, primary nephrologist, home centre and default payer |
| **DialysisEpisode** | A period of dialysis care with one purpose. For example, "AKI dialysis during admission 123" or "Maintenance HD at this centre from Jan 2026". It does not replace the encounter |
| **Encounter** | The visit or admission the treatment belongs to. Inpatients: the existing admission. Outpatients and walk-ins: an OP dialysis visit for each treatment, or a monthly visit if the hospital configures that |
| **FinancialEpisode** | The billing context. An inpatient's dialysis charges join the admission bill. Outpatients get their own bill, package or claim |
| **DialysisTreatment** | One dialysis treatment, the unit of work. CRRT treatments can span several days (see 7.8) |

### 6.1 Patient lifecycle status

`REFERRED → ACTIVE → (ON_HOLD) → TRANSFERRED_OUT | TRANSPLANTED | RENAL_RECOVERY | DECEASED | LOST_TO_FOLLOW_UP | DISCONTINUED`

| ID | Requirement | Priority |
|---|---|---|
| FR-PAT-01 | The system shall keep a dialysis status for each patient with the states above. Every change records date, reason and user | Must |
| FR-PAT-02 | Status changes to TRANSFERRED_OUT, TRANSPLANTED, DECEASED or DISCONTINUED shall end the recurring schedule and cancel future appointments, after confirmation | Must |
| FR-PAT-03 | Mortality, transplant and transfer counts shall feed the quality dashboard and registry reports | Should |

---

## 7. Functional requirements

### 7.1 Registration, enrolment and patient routes

The same treatment engine serves all patient types. What differs is where the order comes from, the encounter, the location and the billing route.

| | Inpatient (ward/ICU) | Regular outpatient | Walk-in | Visiting (transient) |
|---|---|---|---|---|
| Order source | Ward/ICU doctor's order | Standing prescription | Nephrologist on arrival | Referral prescription, approved by our nephrologist |
| Encounter | Existing admission | OP dialysis visit | OP dialysis visit | OP dialysis visit |
| Location | Unit chair or ICU bedside | Unit chair | First suitable chair | Unit chair (isolation if serology unknown) |
| Billing | Admission bill. Nothing collected at the unit | Package, scheme, TPA or per treatment | Estimate and deposit before starting | Estimate and deposit before starting |

**Inpatient flow:** Admission → ward/ICU → nephrology order → dialysis worklist → schedule (unit or bedside) → treatment → return to ward/ICU. Charges post to the admission bill. Discharge checks that dialysis charges are complete.

**Walk-in flow:** Search or register the patient → triage → suggested chair → financial clearance → nephrologist prescription → treatment → final bill, deposit adjusted → checkout.

**Regular outpatient flow:** Enrol (profile, access, serology, prescription, payer, package) → recurring schedule → appointments generated → each visit: check-in → treatment → charges against package, scheme or claim.

| ID | Requirement | Priority |
|---|---|---|
| FR-REG-01 | Dialysis shall find patients in the enterprise MPI. If none is found, it shall launch quick registration (name, age, sex, phone, ABHA scan) without leaving the dialysis workflow | Must |
| FR-REG-02 | The system shall never create a second patient record for a patient who already exists in the MPI | Must |
| FR-REG-03 | Enrolment shall capture renal diagnosis (ICD-10), modality, dialysis start date, dry weight, residual urine, access, serology, primary nephrologist, home centre, default payer and emergency contact | Must |
| FR-REG-04 | Inpatient dialysis orders from CPOE shall appear on the dialysis worklist with priority (routine, urgent, emergency) and location (unit or bedside) | Must |
| FR-REG-05 | Walk-in triage shall record vitals, last dialysis date, reason for visit, access type and serology report (or "unknown"). It shall assign a triage priority | Must |
| FR-REG-06 | After triage, the system shall suggest suitable chairs for the current and next shift. Chairs must match isolation class, have a free machine, and have the kit in stock | Must |
| FR-REG-07 | Visiting patients: the system shall let staff import or attach the referring centre's prescription, serology report (with date) and last 3 treatment sheets. A time-limited profile shall be created, valid for a configurable number of days | Should |
| FR-REG-08 | Emergency walk-ins (e.g. high potassium, fluid overload) shall be flagged. The coordinator can bump a planned patient, and the bumped patient is offered a make-up slot | Must |
| FR-REG-09 | Patients shall be linked to their ABHA ID where available. With patient consent, dialysis summaries shall be shareable through ABDM | Should |

### 7.2 Serology, infection control and isolation

| ID | Requirement | Priority |
|---|---|---|
| FR-INF-01 | The system shall record serology results (HBsAg, anti-HCV, HIV, anti-HBs titre) with collection date, lab reference and source (in-house lab or external report) | Must |
| FR-INF-02 | Each patient shall have a derived **isolation class**: NONE, HBV, HCV, HIV or UNKNOWN. UNKNOWN applies when serology is missing or older than the configured validity | Must |
| FR-INF-03 | Retest intervals shall be configurable per test and per patient category (for example, intake and then every 3 months for HBsAg and anti-HCV). Values must be confirmed by Infection Control before go-live | Must |
| FR-INF-04 | Stations and machines shall have an isolation class. The scheduler and the start check shall refuse to put a patient on a station or machine of a different class. A dedicated HBV machine is never used for any other class | Must |
| FR-INF-05 | Patients with UNKNOWN status shall only be placed on an UNKNOWN-class machine until results are available | Must |
| FR-INF-06 | **Seroconversion workflow.** When a patient's result changes from negative to positive, the system shall: alert Infection Control and the nephrologist; change the isolation class; list the machines, stations and shifts the patient shared during the look-back period; and create a screening task list for exposed patients | Must |
| FR-INF-07 | Hepatitis B vaccination doses and anti-HBs titres shall be tracked, with reminders for due doses and boosters | Should |
| FR-INF-08 | Infection-control events (exposure, catheter-related bloodstream infection, exit-site infection, outbreak) shall be recorded with type, date, organism, action and outcome | Must |
| FR-INF-09 | Infection alerts shall appear as structured banners on every dialysis screen for the patient, not as free text | Must |

### 7.3 Vascular access

| ID | Requirement | Priority |
|---|---|---|
| FR-ACC-01 | Each patient may have several accesses, each with: type (AV fistula, AV graft, tunnelled catheter, non-tunnelled catheter, PD catheter, other), site, side, creation date, surgeon, maturity date, status (maturing, in use, failed, abandoned, removed) and complications | Must |
| FR-ACC-02 | Every treatment shall record the access used. For fistulas and grafts it records needle sites and gauge. For catheters it records lock solution and dressing | Must |
| FR-ACC-03 | Access assessments (thrill, bruit, signs of infection, flow problems) shall be recorded during pre-assessment and kept as history | Must |
| FR-ACC-04 | Access events (cannulation difficulty, infiltration, thrombosis, infection, intervention or surgery) shall be recorded and shown on an access timeline | Should |
| FR-ACC-05 | The quality dashboard shall report the fistula vs catheter split and catheter-related infection rate per 1,000 catheter-days | Should |

### 7.4 Prescription engine

| ID | Requirement | Priority |
|---|---|---|
| FR-RX-01 | Prescriptions shall be structured. Fields: modality; frequency and days; duration; blood flow (Qb); dialysate flow (Qd); dialyzer (model, type, surface area); reuse allowed and maximum reuse; dialysate (Na, K, Ca, HCO3, temperature); UF target and maximum UF rate; UF/sodium profile; anticoagulation (type, bolus, hourly dose, stop time); access; machine parameters; standing medicines; supply kit; special instructions | Must |
| FR-RX-02 | Prescriptions shall be versioned (v1, v2, …) with effective-from and effective-to dates, created by, approved (signed) by, approval time, status (DRAFT, ACTIVE, SUPERSEDED, CANCELLED) and reason for change. A signed version is never edited. A change creates a new version | Must |
| FR-RX-03 | Only one ACTIVE prescription per modality per patient at a time. Signing a new version supersedes the previous one | Must |
| FR-RX-04 | Each treatment shall keep a copy of the prescription version it used at start time | Must |
| FR-RX-05 | Prescription templates (for example "Standard HD 4h, AVF, heparin") shall speed up entry. Templates are configurable per unit | Should |
| FR-RX-06 | The system shall warn when an entered value is outside configurable limits (for example K < 2 mmol/L, Qb > 450 ml/min, UF goal > X% of body weight) | Must |
| FR-RX-07 | Each prescription shall reference a supply kit. The kit follows the prescription (HD vs HDF, dialyzer size, fistula vs catheter) | Must |

### 7.5 Scheduling and station board

| ID | Requirement | Priority |
|---|---|---|
| FR-SCH-01 | Units, stations (chair or bed, isolation class, bedside flag), shifts (start and end times per weekday) and unit holidays shall be configurable | Must |
| FR-SCH-02 | A recurring schedule shall have: patient, modality, days (for example Mon/Wed/Fri), shift, preferred station, duration, start and end dates, nephrologist and location. It generates individual appointments a configurable number of weeks ahead | Must |
| FR-SCH-03 | The scheduler shall prevent double-booking of a station or machine within a shift | Must |
| FR-SCH-04 | The scheduler shall enforce isolation class (FR-INF-04) when assigning stations and machines | Must |
| FR-SCH-05 | **Daily board:** a time × station grid with appointment status (scheduled, confirmed, arrived, in treatment, completed, no-show, cancelled) and capacity (total, available, occupied, maintenance, isolation) | Must |
| FR-SCH-06 | **Live unit board:** for each station, show machine, machine status, patient, nurse, start time, expected end, current UF, latest BP and active alerts. It refreshes automatically | Must |
| FR-SCH-07 | No-shows shall be recorded with a reason. The system shall offer a make-up slot within a configurable window and notify the nephrologist after a configurable number of missed treatments | Must |
| FR-SCH-08 | Holiday or closure rescheduling shall move affected appointments in bulk, with conflict resolution | Should |
| FR-SCH-09 | A waitlist shall hold patients wanting a slot. Staff are notified when a matching slot frees up | Should |
| FR-SCH-10 | The system shall warn when the planned number of patients per nurse in a shift exceeds the configured ratio | Should |
| FR-SCH-11 | Patients shall receive reminders by SMS, WhatsApp or app notification before each appointment, and a message when it is rescheduled, using the HMS notification service | Should |

### 7.6 Treatment workflow and state machine

A treatment has **three separate status fields**. Clinical work never waits on billing or stock reconciliation.

| Field | Values |
|---|---|
| `clinical_status` | SCHEDULED, ARRIVED, PRE_ASSESSMENT, READY, IN_PROGRESS, INTERRUPTED, POST_ASSESSMENT, CLINICALLY_COMPLETED, VERIFIED; and the exception states DEFERRED, CANCELLED, NO_SHOW, ABORTED, TRANSFERRED |
| `billing_status` | NOT_APPLICABLE, PENDING, CHARGES_SENT, CHARGES_POSTED, PARTIALLY_POSTED, ERROR |
| `supply_status` | PENDING, RECORDED, RECONCILED, VARIANCE |

```
SCHEDULED ─arrive─► ARRIVED ─start pre-assessment─► PRE_ASSESSMENT ─sign─► READY
    │                  │                                  │                  │ start (safety checks)
    ├─cancel─► CANCELLED  ├─defer─► DEFERRED ◄─────────────┘                  ▼
    └─no-show─► NO_SHOW                                              IN_PROGRESS ◄──resume──┐
                                                                         │   └─interrupt─► INTERRUPTED
                                                                         ├─abort─► ABORTED       │
                                                                         ▼ end                   └─abort─► ABORTED
                                                                  POST_ASSESSMENT
                                                                         │ nurse sign
                                                                         ▼
                                                               CLINICALLY_COMPLETED ─nephrologist co-sign─► VERIFIED
```

Problems during treatment, such as low blood pressure, are recorded as **DialysisEvents**. They are not states. An event only changes the state if it leads to INTERRUPTED or ABORTED. Connecting and disconnecting are recorded as timestamps within IN_PROGRESS.

**Allowed transitions**

| Action | From | To | Who | Triggers |
|---|---|---|---|---|
| Arrive | SCHEDULED | ARRIVED | Front desk, nurse | `dialysis.patient.arrived` |
| Start pre-assessment | ARRIVED | PRE_ASSESSMENT | Nurse | — |
| Sign pre-assessment | PRE_ASSESSMENT | READY | Nurse | `dialysis.preassessment.completed`; kit reservation request |
| Defer | ARRIVED, PRE_ASSESSMENT, READY | DEFERRED | Nurse with nephrologist | Reason required; release reservation |
| Start | READY | IN_PROGRESS | Nurse | Safety checks (7.6.1); `dialysis.treatment.started` |
| Interrupt / resume | IN_PROGRESS ⇄ INTERRUPTED | | Nurse | Reason, duration |
| Abort | IN_PROGRESS, INTERRUPTED | ABORTED | Nurse (nephrologist informed) | Reason; `dialysis.treatment.aborted`; abort charge rules |
| End | IN_PROGRESS | POST_ASSESSMENT | Nurse | Machine set to CLEANING |
| Complete | POST_ASSESSMENT | CLINICALLY_COMPLETED | Nurse | `dialysis.treatment.completed`; charge events |
| Verify | CLINICALLY_COMPLETED | VERIFIED | Nephrologist | `dialysis.treatment.verified` |
| Cancel | SCHEDULED, ARRIVED, DEFERRED | CANCELLED | Coordinator, front desk | Reason; cancellation fee rule |
| No-show | SCHEDULED | NO_SHOW | Automatic after grace period, or coordinator | `dialysis.patient.no_show` |
| Undo arrival | ARRIVED | SCHEDULED | Front desk, within a configurable time | Audit |
| Transfer | Any before IN_PROGRESS | TRANSFERRED | Coordinator | For patients moved to another unit or the ICU |

| ID | Requirement | Priority |
|---|---|---|
| FR-TRT-01 | The system shall enforce the transitions in the table above and reject anything else | Must |
| FR-TRT-02 | `billing_status` and `supply_status` shall be updated from Billing and Stores events. They shall never block clinical transitions | Must |
| FR-TRT-03 | Each treatment shall reference: patient, encounter, episode, prescription version, appointment, station, machine, access used, dialyzer (new or reuse record), nurse and nephrologist | Must |

#### 7.6.1 Safety checks before start

| Check | Rule | Type |
|---|---|---|
| Prescription | An ACTIVE, signed prescription exists and is valid today | Hard |
| Serology | Serology is within validity. If not, the patient must be on an UNKNOWN-class machine | Hard |
| Isolation | Machine and station isolation class equals the patient's class | Hard |
| Machine | Machine is AVAILABLE; disinfected after its last use; preventive maintenance and calibration not overdue | Hard |
| Water | Today's mandatory water tests are recorded and none failed | Hard |
| Dialyzer reuse | If reusing: same patient, not discarded, under maximum reuse, last reprocessing passed, volume check ≥ 80% of baseline, patient not HBV | Hard |
| Identity | Patient identity confirmed with two identifiers (name + UHID or photo), and the dialyzer label matches | Hard |
| Consent | Valid dialysis consent on file | Hard |
| Financial clearance | Inpatient; or deposit, package balance, scheme eligibility or pre-auth confirmed | Soft |
| Supplies | Kit items available in the dialysis sub-store | Soft |

| ID | Requirement | Priority |
|---|---|---|
| FR-TRT-04 | The system shall run all checks when a nurse starts a treatment, and show each result | Must |
| FR-TRT-05 | A failed hard check shall block the start. Only a user with the override permission (nephrologist) can override it, with a reason. Each override is stored on the treatment and in the audit log | Must |
| FR-TRT-06 | A failed soft check shall show a warning. The nurse can proceed after acknowledging it | Must |
| FR-TRT-07 | Overrides shall be reported weekly to the unit in-charge and to Quality | Should |

### 7.7 Assessments, monitoring and events during treatment

| ID | Requirement | Priority |
|---|---|---|
| FR-MON-01 | **Pre-assessment (one screen).** A header shows name, UHID, age, allergies, infection banner, modality, prescription version, dry weight, today's UF target, access and the last treatment summary. Fields: arrival weight, BP (sitting/standing), pulse, temperature, respiratory rate, SpO2, symptoms, oedema, fluid status, access assessment, recent labs, medication review and fall risk. Signed by the nurse | Must |
| FR-MON-02 | The system shall calculate weight gain since the last treatment and suggest a UF goal. The nurse confirms it | Must |
| FR-MON-03 | Observations during treatment shall be stored as time-series rows: treatment, timestamp, type, value, unit, source (manual or device), device ID, entered by, verified by. Default charting interval is 30 minutes (configurable). The system shall remind the nurse when a reading is overdue | Must |
| FR-MON-04 | **Alert rules (configurable).** Defaults: systolic BP < 90 mmHg or a drop > 20 mmHg from pre-dialysis; heart rate < 50 or > 120; UF rate > 13 ml/kg/h; venous or arterial pressure outside limits; temperature ≥ 38 °C; SpO2 < 92%. Each rule has a severity and an escalation path (nurse → in-charge → nephrologist) | Must |
| FR-MON-05 | **DialysisEvent.** Problems during treatment shall be recorded with time, type (hypotension, cramps, nausea/vomiting, chest pain, fever/rigors, bleeding, access problem, machine alarm, clotting, air alarm, dialyzer reaction, arrhythmia, UF adjustment, physician intervention, emergency), severity, description, action, medicine given, provider, outcome and linked observation | Must |
| FR-MON-06 | **Post-assessment.** Records post weight, BP, pulse, temperature, actual UF, blood volume processed, actual duration, access haemostasis time, condition at discharge from the unit, and destination (home, ward, ICU, ER). Signed by the nurse | Must |
| FR-MON-07 | A treatment summary shall be generated automatically: prescribed vs delivered, events, medicines, supplies and adequacy when available. It is printable and shareable through ABDM | Must |
| FR-MON-08 | The chair-side app shall keep working during network outages. It queues entries locally with client-generated IDs and syncs without creating duplicates | Must |

### 7.8 SLED and CRRT (ICU)

| ID | Requirement | Priority |
|---|---|---|
| FR-CRT-01 | CRRT treatments may span several days. Each calendar day is a billing day, and the treatment stays open until stopped | Must |
| FR-CRT-02 | CRRT prescriptions shall support modality (CVVH, CVVHD, CVVHDF), effluent dose (ml/kg/h), replacement and dialysate rates, pre/post dilution and anticoagulation protocol (citrate or heparin) | Must |
| FR-CRT-03 | Hourly charting shall be supported, including fluid balance, pressures and anticoagulation monitoring | Must |
| FR-CRT-04 | Filter/circuit changes shall be recorded with reason (clotting, scheduled, other) and circuit life in hours. Each change consumes a circuit kit | Must |
| FR-CRT-05 | Bedside treatments shall record the portable machine and portable RO unit used, and the nurse's travel time | Should |

### 7.9 Dialyzer reuse

| ID | Requirement | Priority |
|---|---|---|
| FR-REU-01 | Reuse shall be allowed only if the prescription allows it and the patient is not HBV positive | Must |
| FR-REU-02 | Each reusable dialyzer shall get a unique ID and a label (patient name, UHID, barcode) at first use | Must |
| FR-REU-03 | Each reprocessing shall record: date, technician, germicide, concentration, contact time, residual germicide test result, volume measurement (TCV/fibre bundle volume) and pass/fail | Must |
| FR-REU-04 | The dialyzer shall be discarded automatically when the volume is below 80% of baseline, the maximum reuse count is reached, or a check fails. The maximum reuse count is configurable and must be confirmed by the nephrology lead | Must |
| FR-REU-05 | At start, the dialyzer barcode shall be scanned and matched to the patient (FR-TRT-04) | Must |
| FR-REU-06 | Reports shall show average reuse, discard reasons, and reactions linked to reuse | Should |
| FR-REU-07 | Charges shall distinguish a new dialyzer from reprocessing a reused one. Billing decides the price (FR-BIL-03) | Must |

### 7.10 Medicines

Dialysis does not own Pharmacy. The flow is: medicine order → pharmacy dispense → administration (charted in Dialysis) → charge.

| ID | Requirement | Priority |
|---|---|---|
| FR-MED-01 | Nephrologists shall order medicines from the dialysis screens using the enterprise medication order service. Standing orders on the prescription (e.g. ESA, IV iron, vitamin D, heparin) create orders for each treatment | Must |
| FR-MED-02 | Administration during treatment shall be charted on the medication administration record (drug, dose, route, time, batch, nurse, witness for high-alert drugs). The medicine is either issued per patient by Pharmacy or taken from dialysis ward stock | Must |
| FR-MED-03 | Allergy and interaction checks shall use the enterprise drug database | Must |
| FR-MED-04 | ESA and iron protocols (dose by Hb and ferritin/TSAT) shall be supported as decision support for the nephrologist | Could |

### 7.11 Supplies and order management

Stores is the inventory authority. Dialysis records demand and patient consumption, and never deducts stock itself.

```
Prescription ─► Supply Kit (BOM) ─► Treatment demand
                                         │
            ┌────────────────────────────┼────────────────────────────┐
            ▼                            ▼                            ▼
   Schedule forecast           Kit reservation (READY)       Patient consumption (scan)
   (next N days)                         │                            │
            │                            ▼                            ▼
            ▼                     Stores: pick/issue to       ConsumptionType classifies:
   Indent to central store        dialysis sub-store          billable / package / departmental /
            │                                                 wastage / return
            ▼                                                         │
   Central store below reorder ─► Purchase request ─► PO ─► GRN       ▼
                                                              Charge events (Billing)
```

**Issued vs consumed.** Stores issues stock to the dialysis department stock (sub-store). Consumption by a patient is a separate event linked to a treatment. The ledger therefore shows stock issued, consumed per patient, returned, wasted and expired.

**ConsumptionType**

| Type | Meaning | Example |
|---|---|---|
| PATIENT_BILLABLE | Charged to the patient separately | Extra saline, special dialyzer, extra needles |
| PACKAGE_INCLUDED | Used by the patient, covered by the package | Standard dialyzer, blood lines in a package |
| PATIENT_NON_BILLABLE | Used by the patient, never billed | Items the tariff marks non-billable |
| DEPARTMENTAL | Used by the unit, not one patient | Gloves from bulk, disinfectants |
| WASTAGE | Damaged or contaminated during use | Dropped or contaminated item |
| EXPIRED | Expired in the sub-store | Expired saline |
| RETURN | Unused, returned to stock | Unopened kit after an abort before start |

| ID | Requirement | Priority |
|---|---|---|
| FR-SUP-01 | Supply kits (bill of materials) shall be configurable per modality and prescription type, with item, quantity, unit and default ConsumptionType | Must |
| FR-SUP-02 | When a treatment becomes READY, the system shall send a reservation request to Stores for the kit. Reservations are released if the treatment is deferred, cancelled or a no-show | Should |
| FR-SUP-03 | The nurse shall record consumption by scanning barcodes (GS1: item, batch, expiry). The kit pre-fills and the nurse adjusts quantities | Must |
| FR-SUP-04 | Expired or recalled batches shall be blocked at scan time. Earliest-expiry-first shall be suggested | Must |
| FR-SUP-05 | Each consumption line shall carry a ConsumptionType. Billing decides price and inclusion using ChargeRules (FR-BIL-03) | Must |
| FR-SUP-06 | **Replenishment.** For each dialysis sub-store item, Stores shall hold a minimum, reorder point and maximum level. Below the reorder point, an indent to the central store is suggested. The central store raises purchase requests and orders to vendors through Procurement | Must |
| FR-SUP-07 | **Forecast.** Nightly, the system shall calculate required quantity per item: scheduled treatments for the next N days × kit quantity − sub-store stock − stock on order + safety stock. The coordinator reviews and approves the suggested indent | Must |
| FR-SUP-08 | Vendor rate contracts and consignment stock (for dialyzers and blood lines) shall be supported through Procurement. Consignment items are invoiced by the vendor when consumed | Should |
| FR-SUP-09 | Non-billable consumables used per treatment (concentrate, RO water, disinfectant) shall be recorded for costing only | Should |
| FR-SUP-10 | **Recall.** Given an item and batch, the system shall list all patients and treatments that used it | Must |
| FR-SUP-11 | **Month-end reconciliation.** Per item: opening + issued − consumed − returned − wasted − expired = closing. Variances above a threshold are flagged for the in-charge and Stores | Must |
| FR-SUP-12 | **Stores outage.** If Stores is unavailable, consumption is recorded locally and synced later. Treatment is never blocked | Must |
| FR-SUP-13 | Cost per treatment shall be calculated (consumed quantity × weighted average cost + reprocessing cost) by modality, payer and month | Should |

### 7.12 Billing

Dialysis sends **charge events**. Billing owns pricing, packages, coverage, invoices and claims. There is no separate dialysis billing engine.

Flow: treatment completed (or aborted) → charge events → pricing engine → package and coverage allocation → invoice line or claim line.

**Possible charge components:** dialysis treatment (by modality and duration), dialyzer (new or reprocessing), consumables, access procedures (catheter insertion, cannulation), medicines, lab, physician consultation, emergency intervention, isolation surcharge, CRRT per day, other services.

**ChargeRule (owned by Billing)** decides, for each component, payer and package:

| Rule | Meaning | Example (standard package) |
|---|---|---|
| INCLUDED | Covered by the package | Treatment, standard dialyzer, standard supplies |
| SEPARATE | Billed as its own line | Blood transfusion, special procedure |
| CONDITIONAL | Included up to a limit or under conditions | ESA up to X units per treatment |
| NON_BILLABLE | Never billed | Departmental items |

| ID | Requirement | Priority |
|---|---|---|
| FR-BIL-01 | On CLINICALLY_COMPLETED, the system shall send charge events (code, quantity, service date, treatment, encounter, payer route, ordering doctor) with a unique key each. Dialysis never sends prices | Must |
| FR-BIL-02 | Inpatient charges shall post to the admission's financial episode. Hospital discharge shall check for dialysis treatments with `billing_status` other than CHARGES_POSTED and warn. Whether this blocks discharge is configurable | Must |
| FR-BIL-03 | Package, inclusion and exclusion decisions shall use enterprise ChargeRules and Packages, configured per payer and contract. Nothing is hard-coded in Dialysis | Must |
| FR-BIL-04 | **Estimate.** For walk-ins and visiting patients, the system shall request an estimate from Billing based on prescription, kit and payer, and show it before treatment | Must |
| FR-BIL-05 | **Deposit.** For self-pay outpatients, the system shall show the deposit status. Financial clearance is a soft check (FR-TRT-06); an emergency start without clearance is allowed and flagged | Must |
| FR-BIL-06 | **Prepaid packages** (e.g. 12 treatments a month): the balance goes down per completed treatment. Expiry, carry-forward and extras are handled by Billing package rules. The balance is shown at check-in | Must |
| FR-BIL-07 | **Abort and cancellation charging (configurable).** Aborted after start: partial treatment charge plus consumables used. Aborted before blood contact: only opened, used items; unopened items returned. Late cancellation or no-show: fee per payer policy (may be zero) | Must |
| FR-BIL-08 | **Corrections.** A wrong charge is fixed with a reversal event and a new charge event. Charges are never edited or deleted | Must |
| FR-BIL-09 | **Daily reconciliation report.** Treatments completed vs charge events sent vs charges posted vs kits consumed. Any mismatch raises an alert to Billing and the coordinator | Must |
| FR-BIL-10 | The dialysis screen shall show billing status for each treatment: coverage, authorisation number, approved and remaining treatments, package balance, copay, claim status and denial status (read-only, from Billing) | Should |
| FR-BIL-11 | GST shall be applied by Billing per item classification. Dialysis sends only item and service codes | Must |

### 7.13 Insurance, TPA and government schemes

Flow: coverage → eligibility → pre-authorisation → treatment → charge capture → claim → adjudication → remittance → payment allocation → patient balance. The claim engine belongs to enterprise Revenue Cycle.

| Payer route | v1 handling |
|---|---|
| Inpatient | Charges post to the admission bill |
| Self-pay | Estimate, deposit, final bill and receipt |
| Prepaid package | Balance goes down per treatment. Extras billed separately |
| TPA / private insurance | Pre-auth number required; treatments counted against the approved number; claim built from treatment documents |
| **PM-JAY** | Dialysis package codes and rates set in Billing; pre-auth captured; treatment sheets attached to claims |
| **PMNDP** (free dialysis for BPL patients) | Eligibility verified and recorded. Zero patient liability. Programme reporting (FR-QUA-05) |
| State schemes, CGHS / ECHS | Configured as payers with their own rates and rules |
| Corporate | Credit bill to the employer |

| ID | Requirement | Priority |
|---|---|---|
| FR-INS-01 | For scheme and TPA patients, the system shall warn when approved treatments are nearly used up or the authorisation is about to expire | Must |
| FR-INS-02 | Billing shall be able to fetch claim documents for a treatment through an API: treatment summary, signed treatment sheet, relevant labs | Must |
| FR-INS-03 | The scheme or plan shall be recorded on each treatment at check-in and cannot be changed after completion except by Billing | Must |

### 7.14 Machines, disinfection and maintenance

| ID | Requirement | Priority |
|---|---|---|
| FR-MAC-01 | Each dialysis machine shall link to its enterprise asset: manufacturer, model, serial number, facility, station, isolation class, installation date, software version and water system | Must |
| FR-MAC-02 | Machine status: AVAILABLE, IN_USE, CLEANING, MAINTENANCE, QUARANTINED, DECOMMISSIONED. Statuses are set by treatment events and by Asset Management | Must |
| FR-MAC-03 | **Disinfection after every treatment** (heat or chemical, programme, start and end time, technician) shall be logged in Dialysis. A machine cannot start a new treatment until it is logged (FR-TRT-04) | Must |
| FR-MAC-04 | Preventive maintenance, calibration, service, repair and downtime are managed in Asset Management. Dialysis shows status and due dates and blocks use when overdue | Must |
| FR-MAC-05 | Machine downtime and utilisation shall be reported per machine and per unit | Should |

### 7.15 Water quality

| ID | Requirement | Priority |
|---|---|---|
| FR-WAT-01 | RO/water systems shall be registered per unit, with their sample points | Must |
| FR-WAT-02 | Test results shall record: system, sample point, date/time, parameter (e.g. total chlorine, conductivity, bacterial count, endotoxin), result, unit, reference limit, pass/fail, performed by, verified by and corrective action | Must |
| FR-WAT-03 | Test types, frequencies and limits shall be configurable per jurisdiction and standard (e.g. ISO 23500 series, local regulation). No limits are hard-coded | Must |
| FR-WAT-04 | Missing or failed mandatory daily tests shall block treatment starts in that unit (FR-TRT-04) until a passing test is recorded or a nephrologist overrides | Must |
| FR-WAT-05 | Monthly microbiology due dates shall create reminders. Overdue tests shall show on the unit board | Should |

### 7.16 Labs and adequacy

| ID | Requirement | Priority |
|---|---|---|
| FR-LAB-01 | A configurable lab protocol shall create orders automatically. For example, monthly: Hb, pre/post BUN, electrolytes, Ca, PO4, albumin. Quarterly: ferritin, TSAT, PTH. Serology per FR-INF-03 | Must |
| FR-LAB-02 | Pre- and post-dialysis BUN shall be linked to the treatment where they were drawn, with draw times. The post sample uses the unit's standard slow-flow technique | Must |
| FR-LAB-03 | The system shall calculate URR = (pre BUN − post BUN) / pre BUN, and spKt/V using the Daugirdas second-generation formula (pre/post BUN, duration, UF volume, post weight). Results are stored on the treatment | Must |
| FR-LAB-04 | Targets shall be configurable (default from KDOQI/KDIGO: URR ≥ 65%, spKt/V ≥ 1.2 for thrice-weekly HD). Results below target shall be flagged to the nephrologist | Must |
| FR-LAB-05 | The nephrologist dashboard shall show trends: weight and weight gain, BP, Hb, Kt/V, albumin, Ca/PO4/PTH, ferritin/TSAT | Must |

### 7.17 Care plan and multidisciplinary team

| ID | Requirement | Priority |
|---|---|---|
| FR-CPL-01 | Each patient shall have a care plan with problems, goals, interventions, owner and review date, reviewed at a configurable frequency (e.g. monthly) | Should |
| FR-CPL-02 | The care plan shall support input from dietitian (diet, fluid limits), social worker (finance, transport), access surveillance, patient education and transplant work-up status | Should |
| FR-CPL-03 | Monthly team review: the system shall produce a review list with each patient's trends, missed treatments, events and labs outside target | Should |

### 7.18 Consent and documents

| ID | Requirement | Priority |
|---|---|---|
| FR-CON-01 | Dialysis consent shall be recorded (form version, date, signer, witness, validity) and checked before start (FR-TRT-04) | Must |
| FR-CON-02 | Procedure-specific consents (catheter insertion, blood transfusion) and refusals against medical advice shall be recorded | Must |
| FR-CON-03 | ABDM data-sharing consent shall be captured through the ABDM consent flow | Should |
| FR-CON-04 | External documents (referral letters, outside lab reports, treatment sheets from other centres) shall be stored against the patient with type and date | Must |

### 7.19 Role dashboards

The same underlying data serves different workflows.

| Role | Dashboard |
|---|---|
| Nephrologist | Today's patients → patient summary (history, current prescription, labs, weight/BP trends, adequacy, access history, medicines, events, care plan). Actions: create, modify and approve prescriptions; review treatments, events, labs and trends; care plan; order medicines and labs; document assessment; verify treatments |
| Nurse | My station → today's patients → check-in → pre-assessment → access assessment → machine check → start → monitoring → medicines → events → end → post-assessment → complete. No unrelated HMS screens |
| Technician | Machine and station board; disinfection queue; reuse queue; water tests |
| Billing | Treatment charge status, unposted charges, package balances, claim status |
| Stores | Demand forecast, indents, consumption vs issue, expiry, variance |
| Administration | Capacity, utilisation, revenue, margin, quality |

| ID | Requirement | Priority |
|---|---|---|
| FR-DSH-01 | Role dashboards shall be provided as listed above | Must |
| FR-DSH-02 | The nurse workflow shall need no more than one screen per step and no duplicate data entry | Must |

### 7.20 Quality, reports and analytics

Quality loop: indicator → measurement → threshold → alert → intervention → follow-up.

| Dashboard | Contents |
|---|---|
| Operational | Patients and treatments today, completed, cancelled, no-show, current treatments, available stations, machine downtime, average duration, walk-in waiting time, utilisation per shift |
| Clinical | Adequacy, weight and BP trends, access complications, events during treatment, hospitalisations, infections, mortality, vaccination coverage |
| Financial | Treatments, gross charges, package revenue, insurance, self-pay, outstanding, denials, refunds, supply cost, margin per treatment, lost revenue (unbilled treatments) |
| Inventory | Dialyzers, tubing, needles, saline and medicines consumed; stock availability; expiry; wastage; variance |

| ID | Requirement | Priority |
|---|---|---|
| FR-QUA-01 | Quality indicators, thresholds and reporting periods shall be configurable. No single country's reporting rules are hard-coded | Must |
| FR-QUA-02 | Default indicators: % URR ≥ 65%; % spKt/V ≥ 1.2; % Hb in target range; % albumin ≥ target; % PO4 in range; fistula vs catheter split; catheter infections per 1,000 catheter-days; missed and shortened treatments; hospitalisation; mortality; seroconversions | Must |
| FR-QUA-03 | Indicators below threshold shall create a quality alert with owner, action and follow-up date | Should |
| FR-QUA-04 | Dashboards shall be filterable by unit, facility, modality, payer, nephrologist and period | Must |
| FR-QUA-05 | Reports shall be produced for national and state dialysis programmes (e.g. PMNDP) in the required formats | Should |
| FR-QUA-06 | Records shall be organised so NABH dialysis-related audits can be answered from the system | Must |

### 7.21 Transfer and external dialysis

| ID | Requirement | Priority |
|---|---|---|
| FR-TRF-01 | A transfer summary shall be produced for patients leaving: demographics, prescription, access, serology with dates, last 3 treatments, labs, medicines and vaccinations | Must |
| FR-TRF-02 | Treatments a patient received at another centre may be recorded as external treatments, which keeps the history complete | Should |

### 7.22 Audit

| ID | Requirement | Priority |
|---|---|---|
| FR-AUD-01 | Every important action shall record who, what, when, where (facility, station, device), before and after values, reason, source (user, device, integration) and context (IP/OP, encounter) | Must |
| FR-AUD-02 | Signed clinical records shall never be overwritten. A correction is an addendum that references the original | Must |
| FR-AUD-03 | Read access to dialysis records shall be logged | Must |

---

## 8. Integration and events

### 8.1 Rules

1. **Transactional outbox.** A state change and the events it produces are saved in the same database transaction. A relay then publishes them, so an event is never lost and never published for a change that didn't happen.
2. **Idempotency.** Every event has `event_id`, `source_system`, `source_event_id`, `event_timestamp`, `idempotency_key` and `schema_version`. Every consumer ignores duplicates. For example, a machine sending "treatment completed" twice must not create 2 treatments, 2 charges or 2 invoices.
3. **Corrections are new events.** Reversals and returns are events of their own. Nothing is edited or deleted downstream.
4. **Versioned schemas.** Event schemas are versioned and checked with contract tests. Breaking changes need a new version.
5. **Failure handling.** Failed deliveries are retried with backoff, then sent to a dead-letter queue that is monitored. Events can be replayed.
6. **Waiting vs not waiting.** The user waits only on reads: estimate, deposit or package balance, coverage check, stock availability. These have short timeouts. If the other module is down, the screen shows a warning and lets the user continue. Everything else is sent in the background.

### 8.2 Event catalogue

| Event | Publisher | Subscribers |
|---|---|---|
| `dialysis.patient.enrolled` / `.status.changed` | Dialysis | Analytics, Notification |
| `dialysis.prescription.signed` | Dialysis | Pharmacy (standing orders), Stores (kit for forecast) |
| `dialysis.appointment.created` / `.rescheduled` / `.cancelled` | Dialysis | Notification, Stores (forecast) |
| `dialysis.patient.arrived` / `dialysis.patient.no_show` | Dialysis | Billing (no-show fee rule), Analytics |
| `dialysis.preassessment.completed` | Dialysis | Analytics |
| `dialysis.supply.requested` (reservation) / `.reservation_released` | Dialysis | Stores |
| `dialysis.treatment.started` / `.interrupted` / `.resumed` | Dialysis | Analytics, Asset (machine in use) |
| `dialysis.treatment.observation.recorded` | Dialysis | Analytics |
| `dialysis.treatment.event.recorded` | Dialysis | Quality, Analytics |
| `dialysis.medication.ordered` | Dialysis | Pharmacy |
| `dialysis.medication.administered` | Dialysis | Pharmacy, Billing |
| `dialysis.supply.consumed` / `.returned` / `.wasted` | Dialysis | Stores, Billing |
| `dialysis.treatment.completed` / `.aborted` / `.deferred` / `.verified` | Dialysis | Billing, Analytics, Quality |
| `dialysis.charge.generated` / `dialysis.charge.reversed` | Dialysis | Billing |
| `dialysis.serology.changed` | Dialysis | Infection Control, Scheduling |
| `dialysis.machine.status.changed` / `.disinfected` | Dialysis | Asset Management |
| `dialysis.water.test.failed` | Dialysis | Quality, Biomedical |
| `stores.stock.issued` / `.reserved` / `.low` | Stores | Dialysis |
| `pharmacy.medication.dispensed` | Pharmacy | Dialysis |
| `billing.charge.posted` / `.rejected`, `billing.clearance.changed` | Billing | Dialysis |
| `lab.result.received` | Laboratory | Dialysis (serology, BUN, protocol labs) |
| `adt.admitted` / `.transferred` / `.discharged` | ADT | Dialysis |
| `asset.machine.status.changed` | Asset Management | Dialysis |

### 8.3 Interoperability (FHIR R4 mapping)

| Dialysis concept | FHIR resource |
|---|---|
| Inpatient dialysis order, prescription | ServiceRequest (+ DeviceRequest for the dialyzer) |
| Treatment | Encounter + Procedure |
| Observations, machine parameters | Observation |
| Machine | Device, DeviceMetric |
| Medicine order / dispense / administration | MedicationRequest / MedicationDispense / MedicationAdministration |
| Supply reservation and consumption | SupplyRequest / SupplyDelivery |
| Lab results | DiagnosticReport, Observation |
| Care plan | CarePlan |
| Charges, claims | ChargeItem, Claim, ExplanationOfBenefit |
| Summary for ABDM | Composition (bundle) |

---

## 9. Device integration

```
Dialysis machine / BP monitor / weighing scale
          │ (HL7 v2, vendor serial/TCP protocol)
          ▼
Device gateway (in the unit's network; buffers when offline)
          ▼
Device integration service: validate → match device to station to treatment → normalise → store raw event → store clinical observation
          ▼
Dialysis treatment: observations, alarms, machine parameters, events, summary
```

| ID | Requirement | Priority |
|---|---|---|
| FR-DEV-01 | Device data shall never be written straight into patient tables. Raw messages are stored first, then normalised observations | Must |
| FR-DEV-02 | Device data shall be matched to a treatment through station → machine → active treatment, confirmed by the nurse at start. Unmatched data goes to a review queue | Must |
| FR-DEV-03 | Device clocks shall be synchronised (NTP), and each message keeps both device time and received time | Must |
| FR-DEV-04 | The gateway shall buffer data during network outages and resend it without creating duplicates | Must |
| FR-DEV-05 | Device values are shown as "device" and can be verified or corrected by the nurse. A correction keeps the original | Must |
| FR-DEV-06 | v1 supports the hospital's primary machine model (to be confirmed in discovery). Others come later | Must |
| FR-DEV-07 | Automatic capture from weighing scales and BP monitors | Should |

---

## 10. Data model (minimum tables)

| Group | Tables |
|---|---|
| Patient | dialysis_patient_profile, dialysis_patient_status_history, dialysis_diagnosis, dialysis_serology_result, dialysis_vaccination, dialysis_infection_event, dialysis_access, dialysis_access_assessment, dialysis_access_event, dialysis_consent, dialysis_document, dialysis_care_plan, dialysis_referral, dialysis_transfer |
| Episode and prescription | dialysis_episode, dialysis_order, dialysis_prescription (versioned), dialysis_prescription_template, dialysis_supply_kit, dialysis_supply_kit_item |
| Scheduling | dialysis_unit, dialysis_station, dialysis_shift, dialysis_holiday, dialysis_schedule (recurring), dialysis_appointment, dialysis_waitlist |
| Treatment | dialysis_treatment, dialysis_treatment_status_history, dialysis_safety_check_result, dialysis_pre_assessment, dialysis_observation, dialysis_machine_observation_raw, dialysis_event, dialysis_medication_administration (or a link to the enterprise MAR), dialysis_supply_consumption, dialysis_post_assessment, dialysis_treatment_summary, dialysis_charge_event, dialysis_crrt_circuit |
| Equipment | dialysis_machine (asset link), dialysis_machine_assignment, dialysis_disinfection_log, dialysis_dialyzer_reuse, dialysis_reprocessing_log, dialysis_water_system, dialysis_water_test |
| Quality and platform | dialysis_quality_indicator, dialysis_quality_measure, dialysis_quality_alert, dialysis_outbox, dialysis_audit_event |

Treatments store observations as rows (type, value, unit, source), not one column per parameter.

---

## 11. Non-functional requirements

| ID | Area | Requirement |
|---|---|---|
| NFR-01 | Availability | 99.9% during unit operating hours. Planned maintenance only outside shifts |
| NFR-02 | Offline working | Chair-side charting and supply capture keep working through network outages of at least 4 hours, then sync without duplicates. A printable downtime form and back-entry process exist |
| NFR-03 | Performance | Unit board refresh ≤ 5 s. Screen actions ≤ 2 s at 95th percentile. Safety checks ≤ 1 s |
| NFR-04 | Scale | At least 50 stations per unit, 4 shifts a day, 20 units per installation, 5 years of online history |
| NFR-05 | Recovery | RPO ≤ 5 minutes, RTO ≤ 1 hour. Backups tested every quarter |
| NFR-06 | Security | Role-based access by facility, TLS in transit, encryption at rest, MFA for privileged roles, session timeout on shared chair-side devices |
| NFR-07 | Audit | Per FR-AUD. Audit logs are tamper-evident and kept for at least the medical-record retention period |
| NFR-08 | Data residency | All data stored in India |
| NFR-09 | Usability | Tablet-friendly chair-side screens. Main actions reachable within 2 taps. Usable with gloves (large touch targets) |
| NFR-10 | Localisation | English at launch. Patient-facing printouts and messages support regional languages |
| NFR-11 | Configurability | Thresholds, intervals, protocols, kits, ChargeRules and quality indicators are configurable without code changes, and changes are audited |
| NFR-12 | Observability | Event lag, dead-letter count, device feed health and reconciliation mismatches are monitored with alerts |

---

## 12. Regulatory and compliance (India)

| Area | Requirement |
|---|---|
| ABDM | ABHA linking, health-information exchange, consent manager integration (Should for v1) |
| DPDP Act 2023 | Consent and notice for personal data; purpose limitation; patient data rights; breach process. Coordinated with the hospital's privacy officer |
| NABH | Dialysis records, infection control, water quality, equipment and consent documentation available for audit |
| Medical records | Retention per applicable law and hospital policy, to be confirmed by Legal |
| PMNDP / PM-JAY / state schemes | Eligibility, package codes, documentation and reporting as configured in Billing |
| Biomedical | Machine and water standards configurable per jurisdiction (FR-WAT-03) |
| GST | Applied by Billing per item and service classification |

---

## 13. Comparison with established systems

The comparison is at the capability level, based on public vendor material. Confirm current capabilities with vendors before any procurement or positioning decision.

| Capability | Epic (nephrology/dialysis) | Fresenius TDMS / TMon | Our v1 | Later |
|---|---|---|---|---|
| Enterprise patient record across IP/OP/dialysis | ✓ | Through HIS integration | ✓ (shared MPI) | |
| Dialysis treatment workflow and documentation | ✓ | ✓ | ✓ | |
| Treatment plans, interdisciplinary care plans | ✓ | Partial | Basic care plan | Full MDT |
| Structured, versioned prescription | ✓ | ✓ | ✓ | |
| Recurring scheduling and unit board | ✓ | ✓ | ✓ | |
| Bedside documentation | ✓ | ✓ | ✓ (offline-capable tablet) | |
| Machine integration, automatic data capture | Through integrations | ✓ (native) | Primary model | Other models |
| Weight and BP device capture | Through integrations | ✓ | Should | ✓ |
| Pharmacy, lab, stores, billing | Enterprise | Through HIS | Native HMS services | |
| Quality reporting | ✓ | ✓ | ✓ (configurable) | Registry automation |
| Multi-facility | ✓ | ✓ | Data model | Screens |
| **Dialyzer reuse tracking** | Limited | Limited | ✓ | |
| **Indian payers (PMNDP, PM-JAY, state schemes)** | — | — | ✓ | |
| **Deposit and estimate before walk-in treatment** | Through enterprise billing | — | ✓ | |
| **ABDM / ABHA** | — | — | Should | ✓ |
| Home HD and PD | ✓ | ✓ | | ✓ |

**Approach:** combine Epic-style enterprise integration (one patient, encounter and revenue cycle) with Fresenius-style dialysis bedside and device workflow, and add Indian requirements that neither covers natively.

---

## 14. Release plan

| Phase | Weeks | Scope | Exit criteria |
|---|---|---|---|
| 0. Discovery | 2 | Unit SOPs, isolation and reuse policy, tariff and scheme mapping, kit BOMs, machine models, water test schedule, open questions closed | Signed-off configuration workbook |
| 1. Foundation | 4 | Profile, enrolment, episode, lifecycle status, serology and isolation, access, versioned prescription, consent | Pilot patients enrolled; prescriptions signed in system |
| 2. Scheduling | 3 | Units, stations, shifts, recurring schedule, appointments, boards, walk-in triage, inpatient orders, no-show and make-up | No double-booking or isolation violation in test |
| 3. Treatment | 5 | State machine, safety checks, pre/during/post charting, alerts, events, machine and disinfection, water tests, reuse, CRRT basics, offline chair-side | 2 weeks running alongside paper in one unit |
| 4. Pharmacy | 2 | Medicine orders, standing orders, administration, dispense link | MAR matches pharmacy dispense |
| 5. Stores | 4 | Kits, reservations, consumption scanning, ConsumptionType, replenishment, forecast, recall, reconciliation | Stock variance < 2% at a month-end count |
| 6. Billing | 4 | Charge events, ChargeRules, estimate, deposit, packages, inpatient posting, TPA/PM-JAY/PMNDP, reversals, daily reconciliation | 100% of treatments reconciled to charges for 1 month |
| 7. Device integration | 4 | Gateway for primary machine model, raw and normalised data, matching, buffering | > 90% of observations captured automatically |
| 8. Quality | 3 | Adequacy calculations, indicators, dashboards, alerts, programme reports | Monthly quality review run from the system |
| 9. Hardening and go-live | 3 | Performance, DR, security review, training, downtime drill | Go-live checklist signed |
| 10. Enterprise | Later | Multi-facility screens, home HD, PD, full CRRT, external dialysis, analytics, AI | — |

---

## 15. Acceptance test scenarios

| # | Scenario | Pass condition |
|---|---|---|
| AT-01 | **Inpatient, end to end.** Admission → ICU → nephrology order → prescription → schedule → station → arrive → pre-assessment → machine → start → device observations → events → medicine given (pharmacy dispense) → supplies consumed → complete → post-assessment → charge events → package and itemised pricing → insurance allocation → back to ICU → discharge → final invoice → claim → payment → GL | All records linked to the admission. Charges on the admission bill. No duplicate charges. Stock reconciled |
| AT-02 | **Walk-in self-pay.** Register → triage → chair suggested → estimate → deposit → prescription → treatment → final bill → deposit adjusted → checkout | Treatment started within target time. Bill correct |
| AT-03 | **Regular outpatient with a package.** Mon/Wed/Fri schedule generated; 12 treatments complete | Package balance goes from 12 to 0; extras billed separately |
| AT-04 | **Abort and refund.** Walk-in aborted at 30 min for low BP | Partial charge applied by rule; unused items returned; deposit refunded correctly |
| AT-05 | **Isolation.** Try to put an HBsAg-positive patient on a clean machine; try a clean patient on an HBV machine | Both blocked by scheduler and start check |
| AT-06 | **Seroconversion.** A patient's anti-HCV result changes to positive | Isolation class updated; exposure list and tasks created; alerts sent |
| AT-07 | **Reuse limits.** Dialyzer at maximum reuse; volume at 78% of baseline; HBV patient | All three blocked |
| AT-08 | **Duplicate device and charge events.** The same "completed" message is sent twice | One treatment and one set of charges |
| AT-09 | **Offline chair-side.** Network down for 2 hours during a shift | All entries synced afterwards, no duplicates |
| AT-10 | **Water test failure.** Morning chlorine test fails | Treatment starts blocked in that unit until a pass or an override |
| AT-11 | **PM-JAY / PMNDP.** Scheme patient with pre-auth for N treatments | Treatments counted against the approval; claim documents fetchable; zero patient liability for PMNDP |
| AT-12 | **Month-end reconciliation.** One month of activity | Issued = consumed + returned + wasted + closing (within threshold); treatments = posted charges |
| AT-13 | **CRRT over 3 days with 2 filter changes** | 3 per-day charges, 3 circuit kits consumed, hourly fluid balance charted |
| AT-14 | **Recall.** Dialyzer batch X recalled | List of affected patients and treatments produced |

---

## 16. Assumptions, dependencies and risks

**Assumptions**
- The enterprise MPI, Encounter/ADT, Orders, Pharmacy, Stores, Billing (with Packages and ChargeRules), Laboratory and Asset Management modules exist, or are delivered before the dialysis phases that need them.
- The unit has Wi-Fi coverage at every station, and tablets for nurses.

**Dependencies**

| Dependency | Needed by |
|---|---|
| Billing ChargeRules, Packages, estimate API, scheme payers | Phase 6 (estimate API by phase 2 for walk-ins) |
| Stores reservation, issue and consumption APIs; reorder levels | Phase 5 |
| Pharmacy order, dispense and MAR APIs | Phase 4 |
| Lab order/result interface (serology, BUN) | Phases 1 and 8 |
| Machine vendor interface specification and test unit | Phase 7 |
| ABDM sandbox and production approval | Later phase |

**Risks**

| Risk | Impact | Mitigation |
|---|---|---|
| Enterprise Billing/Stores APIs not ready | Dialysis cannot go live with integration | Agree interface contracts in phase 0; build consumer stubs; contract tests |
| Machine vendor won't share its protocol | No automatic data capture | Start with manual entry (designed for it); push it into the procurement contract |
| Nurses resist tablet charting | Low adoption, paper continues | Co-design with nurses; minimise taps; run alongside paper; nurse champions |
| Wrong ChargeRules configuration | Revenue loss or overbilling | Billing sign-off of the configuration; daily reconciliation report from day 1 |
| Isolation or reuse policy not agreed | Go-live delayed | Decide in phase 0 (see open questions) |
| Network outages in the unit | Lost data or stopped work | Offline-first chair-side app; downtime procedure |

---

## 17. Open questions (to be decided in Discovery)

| # | Question | Owner |
|---|---|---|
| Q1 | Serology retest intervals per test and patient category | Infection Control, Nephrology |
| Q2 | Is dialyzer reuse allowed? Maximum reuse count, germicide and reprocessing standard | Nephrology, Biomedical |
| Q3 | Is there one OP encounter per treatment or one per month for regular outpatients? | Billing, Medical Records |
| Q4 | Charging policy for aborted treatments, late cancellations and no-shows, per payer | Billing |
| Q5 | Do pending dialysis charges block inpatient discharge, or only warn? | Billing, Operations |
| Q6 | Which machine models are in the units, and which are in scope for v1 integration? | Biomedical, IT |
| Q7 | Water test types, frequencies and limits to configure | Biomedical, Quality |
| Q8 | Package definitions (inclusions, conditional items, expiry, carry-forward) | Billing, Management |
| Q9 | Nurse-to-patient ratio per shift to warn on | Nursing |
| Q10 | Medical-record retention period and legal requirements | Legal |
| Q11 | Whether medicines given during treatment come from patient-specific issue or dialysis ward stock | Pharmacy |

---

## Appendix A. Glossary

| Term | Meaning |
|---|---|
| ABHA / ABDM | Ayushman Bharat Health Account / Ayushman Bharat Digital Mission |
| AVF / AVG | Arteriovenous fistula / arteriovenous graft |
| BOM | Bill of materials (the items in a kit) |
| CRRT | Continuous renal replacement therapy (CVVH, CVVHD, CVVHDF) |
| Dry weight | The patient's target weight after dialysis |
| ESA | Erythropoiesis-stimulating agent (e.g. erythropoietin) |
| GRN | Goods received note |
| HD / HDF | Haemodialysis / haemodiafiltration |
| Kt/V | Measure of dialysis dose (urea clearance × time / volume) |
| MAR | Medication administration record |
| MPI | Master patient index |
| PMNDP | Pradhan Mantri National Dialysis Programme |
| PM-JAY | Pradhan Mantri Jan Arogya Yojana |
| Qb / Qd | Blood flow rate / dialysate flow rate |
| RO | Reverse osmosis (water treatment) |
| SLED | Sustained low-efficiency dialysis |
| TCV | Total cell volume (fibre bundle volume) of a dialyzer, used to check if it can be reused |
| TPA | Third-party administrator (insurance) |
| UF | Ultrafiltration (fluid removed) |
| URR | Urea reduction ratio |
