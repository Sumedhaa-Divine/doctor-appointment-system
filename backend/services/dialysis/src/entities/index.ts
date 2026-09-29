export * from './enums';
export * from './patient-profile.entity';
export * from './prescription.entity';
export * from './unit.entity';
export * from './session.entity';
export * from './outbox.entity';

import { DialysisPatientProfile, SerologyResult, VascularAccess } from './patient-profile.entity';
import { DialysisPrescription } from './prescription.entity';
import { DialyzerReuseRecord, Machine, Station, WaterTest } from './unit.entity';
import { ConsumableUsage, DialysisSession, IntradialyticObservation, SessionCharge } from './session.entity';
import { OutboxEvent } from './outbox.entity';

export const DIALYSIS_ENTITIES = [
  DialysisPatientProfile,
  SerologyResult,
  VascularAccess,
  DialysisPrescription,
  Station,
  Machine,
  WaterTest,
  DialyzerReuseRecord,
  DialysisSession,
  IntradialyticObservation,
  ConsumableUsage,
  SessionCharge,
  OutboxEvent,
];
