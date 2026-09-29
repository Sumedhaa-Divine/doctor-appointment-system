import { DialysisPatientProfile } from '../entities/patient-profile.entity';
import { DialysisPrescription } from '../entities/prescription.entity';
import { DialyzerReuseRecord, Machine, WaterTest } from '../entities/unit.entity';
import { IsolationClass, MachineStatus, PatientType, PrescriptionStatus } from '../entities/enums';

export type GateCode =
  | 'PRESCRIPTION'
  | 'SEROLOGY'
  | 'ISOLATION'
  | 'MACHINE'
  | 'WATER'
  | 'DIALYZER_REUSE'
  | 'FINANCIAL_CLEARANCE';

export interface GateResult {
  gate: GateCode;
  passed: boolean;
  // Hard gates need a nephrologist override; soft gates only warn
  severity: 'HARD' | 'SOFT';
  message?: string;
}

export interface GateContext {
  today: string; // YYYY-MM-DD
  patientType: PatientType;
  profile: DialysisPatientProfile;
  prescription: DialysisPrescription | null;
  machine: Machine | null;
  waterTestsToday: WaterTest[];
  reuse: DialyzerReuseRecord | null;
  financiallyCleared: boolean;
}

const pass = (gate: GateCode, severity: 'HARD' | 'SOFT' = 'HARD'): GateResult => ({ gate, passed: true, severity });
const fail = (gate: GateCode, message: string, severity: 'HARD' | 'SOFT' = 'HARD'): GateResult => ({
  gate,
  passed: false,
  severity,
  message,
});

export function prescriptionGate(ctx: GateContext): GateResult {
  const rx = ctx.prescription;
  if (!rx || rx.status !== PrescriptionStatus.ACTIVE || !rx.signedBy) {
    return fail('PRESCRIPTION', 'No active signed prescription');
  }
  if (rx.validFrom > ctx.today || (rx.validTo && rx.validTo < ctx.today)) {
    return fail('PRESCRIPTION', 'Prescription is not valid today');
  }
  return pass('PRESCRIPTION');
}

export function serologyGate(ctx: GateContext): GateResult {
  const until = ctx.profile.serologyValidUntil;
  if (!until || until < ctx.today) {
    // Allowed only on an UNKNOWN-class machine, which the isolation gate enforces
    return ctx.machine?.isolationClass === IsolationClass.UNKNOWN
      ? pass('SEROLOGY')
      : fail('SEROLOGY', 'Serology missing or expired; use an unknown-status machine');
  }
  return pass('SEROLOGY');
}

/**
 * Machine isolation class must match the patient's. HBV is strictly dedicated.
 * A clean (NONE) patient may never use a machine reserved for a positive or unknown class.
 */
export function isolationGate(ctx: GateContext): GateResult {
  if (!ctx.machine) return fail('ISOLATION', 'No machine assigned');
  const serologyExpired = !ctx.profile.serologyValidUntil || ctx.profile.serologyValidUntil < ctx.today;
  const patientClass = serologyExpired ? IsolationClass.UNKNOWN : ctx.profile.isolationClass;
  if (ctx.machine.isolationClass !== patientClass) {
    return fail(
      'ISOLATION',
      `Patient isolation ${patientClass} does not match machine ${ctx.machine.isolationClass}`,
    );
  }
  return pass('ISOLATION');
}

export function machineGate(ctx: GateContext): GateResult {
  const m = ctx.machine;
  if (!m) return fail('MACHINE', 'No machine assigned');
  if (m.status !== MachineStatus.AVAILABLE) return fail('MACHINE', `Machine is ${m.status}`);
  if (m.lastUsedAt && (!m.lastDisinfectedAt || m.lastDisinfectedAt < m.lastUsedAt)) {
    return fail('MACHINE', 'Machine not disinfected since last use');
  }
  if (m.nextPreventiveMaintenanceDue && m.nextPreventiveMaintenanceDue < ctx.today) {
    return fail('MACHINE', 'Preventive maintenance overdue');
  }
  return pass('MACHINE');
}

export function waterGate(ctx: GateContext): GateResult {
  const chlorine = ctx.waterTestsToday.filter((t) => t.testType === 'TOTAL_CHLORINE');
  if (chlorine.length === 0) return fail('WATER', 'Daily chlorine test not recorded');
  if (ctx.waterTestsToday.some((t) => !t.passed)) return fail('WATER', 'A water test failed today');
  return pass('WATER');
}

export function reuseGate(ctx: GateContext): GateResult {
  const r = ctx.reuse;
  if (!r) return pass('DIALYZER_REUSE'); // new dialyzer
  const rx = ctx.prescription;
  if (!rx?.reuseAllowed) return fail('DIALYZER_REUSE', 'Prescription does not allow reuse');
  if (ctx.profile.isolationClass === IsolationClass.HBV) {
    return fail('DIALYZER_REUSE', 'Reuse not permitted for HBsAg-positive patients');
  }
  if (r.patientId !== ctx.profile.patientId) return fail('DIALYZER_REUSE', 'Dialyzer belongs to another patient');
  if (r.discarded) return fail('DIALYZER_REUSE', 'Dialyzer has been discarded');
  if (r.reuseCount >= rx.maxReuse) return fail('DIALYZER_REUSE', 'Maximum reuse count reached');
  if (!r.lastReprocessPassed) return fail('DIALYZER_REUSE', 'Last reprocessing did not pass');
  if (r.lastTcvMl != null && Number(r.lastTcvMl) < 0.8 * Number(r.baselineTcvMl)) {
    return fail('DIALYZER_REUSE', 'Total cell volume below 80% of baseline');
  }
  return pass('DIALYZER_REUSE');
}

export function financialGate(ctx: GateContext): GateResult {
  if (ctx.patientType === PatientType.INPATIENT || ctx.financiallyCleared) {
    return pass('FINANCIAL_CLEARANCE', 'SOFT');
  }
  return fail('FINANCIAL_CLEARANCE', 'Deposit / package / scheme / pre-auth not confirmed', 'SOFT');
}

export function evaluateStartGates(ctx: GateContext): GateResult[] {
  return [
    prescriptionGate(ctx),
    serologyGate(ctx),
    isolationGate(ctx),
    machineGate(ctx),
    waterGate(ctx),
    reuseGate(ctx),
    financialGate(ctx),
  ];
}

/** Returns failing hard gates that are not covered by an override. */
export function blockingGates(results: GateResult[], overriddenGates: GateCode[]): GateResult[] {
  return results.filter((r) => !r.passed && r.severity === 'HARD' && !overriddenGates.includes(r.gate));
}
