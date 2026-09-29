import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { blockingGates, evaluateStartGates, GateContext } from './session-gates';
import { allowedActions, nextStatus } from './session-state-machine';
import { DialysisPatientProfile } from '../entities/patient-profile.entity';
import { DialysisPrescription } from '../entities/prescription.entity';
import { DialyzerReuseRecord, Machine, WaterTest } from '../entities/unit.entity';
import { IsolationClass, MachineStatus, PatientType, PrescriptionStatus, SessionStatus } from '../entities/enums';

function ctx(overrides: Partial<GateContext> = {}): GateContext {
  const profile = Object.assign(new DialysisPatientProfile(), {
    patientId: 'P1',
    isolationClass: IsolationClass.NONE,
    serologyValidUntil: '2026-12-31',
  });
  const prescription = Object.assign(new DialysisPrescription(), {
    status: PrescriptionStatus.ACTIVE,
    signedBy: 'DR1',
    validFrom: '2026-01-01',
    reuseAllowed: true,
    maxReuse: 10,
  });
  const machine = Object.assign(new Machine(), {
    isolationClass: IsolationClass.NONE,
    status: MachineStatus.AVAILABLE,
    lastUsedAt: new Date('2026-09-28T10:00:00Z'),
    lastDisinfectedAt: new Date('2026-09-28T11:00:00Z'),
  });
  const water = [Object.assign(new WaterTest(), { testType: 'TOTAL_CHLORINE', passed: true })];
  return {
    today: '2026-09-29',
    patientType: PatientType.CHRONIC_OP,
    profile,
    prescription,
    machine,
    waterTestsToday: water,
    reuse: null,
    financiallyCleared: true,
    ...overrides,
  };
}

const failing = (c: GateContext) => evaluateStartGates(c).filter((r) => !r.passed).map((r) => r.gate);

test('all gates pass for a compliant session', () => {
  assert.deepEqual(failing(ctx()), []);
});

test('HBV patient cannot use a clean machine', () => {
  const c = ctx();
  c.profile.isolationClass = IsolationClass.HBV;
  assert.ok(failing(c).includes('ISOLATION'));
});

test('clean patient cannot use an HBV machine', () => {
  const c = ctx();
  c.machine!.isolationClass = IsolationClass.HBV;
  assert.ok(failing(c).includes('ISOLATION'));
});

test('expired serology requires an unknown-status machine', () => {
  const c = ctx();
  c.profile.serologyValidUntil = '2026-01-01';
  assert.deepEqual(failing(c).sort(), ['ISOLATION', 'SEROLOGY']);
  c.machine!.isolationClass = IsolationClass.UNKNOWN;
  assert.deepEqual(failing(c), []);
});

test('machine not disinfected since last use blocks start', () => {
  const c = ctx();
  c.machine!.lastDisinfectedAt = new Date('2026-09-28T09:00:00Z');
  assert.ok(failing(c).includes('MACHINE'));
});

test('dialyzer reuse limits are enforced', () => {
  const reuse = Object.assign(new DialyzerReuseRecord(), {
    patientId: 'P1',
    reuseCount: 10,
    lastReprocessPassed: true,
    baselineTcvMl: 100,
    lastTcvMl: 90,
    discarded: false,
  });
  assert.ok(failing(ctx({ reuse })).includes('DIALYZER_REUSE'));
  reuse.reuseCount = 3;
  reuse.lastTcvMl = 75;
  assert.ok(failing(ctx({ reuse })).includes('DIALYZER_REUSE'));
  reuse.lastTcvMl = 85;
  assert.deepEqual(failing(ctx({ reuse })), []);
});

test('financial clearance is soft and skipped for inpatients', () => {
  const walkIn = evaluateStartGates(ctx({ patientType: PatientType.WALK_IN, financiallyCleared: false }));
  assert.deepEqual(blockingGates(walkIn, []), []);
  assert.ok(walkIn.some((r) => r.gate === 'FINANCIAL_CLEARANCE' && !r.passed));
  const ip = evaluateStartGates(ctx({ patientType: PatientType.INPATIENT, financiallyCleared: false }));
  assert.ok(ip.every((r) => r.passed));
});

test('overrides unblock hard gates', () => {
  const c = ctx({ waterTestsToday: [] });
  const results = evaluateStartGates(c);
  assert.equal(blockingGates(results, []).length, 1);
  assert.equal(blockingGates(results, ['WATER']).length, 0);
});

test('state machine enforces lifecycle order', () => {
  assert.equal(nextStatus(SessionStatus.PRE_ASSESSMENT, 'start'), SessionStatus.IN_PROGRESS);
  assert.throws(() => nextStatus(SessionStatus.SCHEDULED, 'start'));
  assert.throws(() => nextStatus(SessionStatus.COMPLETED, 'abort'));
  assert.deepEqual(allowedActions(SessionStatus.IN_PROGRESS).sort(), ['abort', 'end']);
});
