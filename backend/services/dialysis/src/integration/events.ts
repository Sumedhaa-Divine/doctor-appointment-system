import { PatientType, PayerRoute } from '../entities/enums';

/** Envelope shared by every dialysis event. Consumers de-duplicate on eventId. */
export interface EventEnvelope<T extends string, P> {
  eventId: string;
  type: T;
  version: 1;
  occurredAt: string;
  source: 'dialysis-service';
  payload: P;
}

export const DialysisEvents = {
  SessionScheduled: 'dialysis.session.scheduled',
  SessionStarted: 'dialysis.session.started',
  SessionCompleted: 'dialysis.session.completed',
  SessionAborted: 'dialysis.session.aborted',
  SessionCancelled: 'dialysis.session.cancelled',
  SessionVerified: 'dialysis.session.verified',
  ConsumableUsed: 'dialysis.consumable.used',
  ConsumableReturned: 'dialysis.consumable.returned',
  ChargeRequested: 'dialysis.charge.requested',
  ChargeReversalRequested: 'dialysis.charge.reversal_requested',
} as const;

/** Consumed by Billing. Dialysis sends codes and quantities; Billing resolves prices by payer. */
export interface ChargeRequestedPayload {
  idempotencyKey: string;
  sessionId: string;
  patientId: string;
  encounterId: string | null;
  patientType: PatientType;
  payerRoute: PayerRoute;
  payerRef: string | null;
  chargeCode: string;
  qty: number;
  serviceDate: string;
  orderingDoctorId: string | null;
}

/** Consumed by Inventory: issues stock from the dialysis sub-store against the session. */
export interface ConsumableUsedPayload {
  idempotencyKey: string;
  sessionId: string;
  patientId: string;
  storeId: string;
  costCentre: 'DIALYSIS';
  lines: { itemCode: string; batchNo: string | null; qty: number; uom: string }[];
}

export interface SessionLifecyclePayload {
  sessionId: string;
  patientId: string;
  encounterId: string | null;
  patientType: PatientType;
  stationId: string | null;
  machineId: string | null;
  reason?: string;
}
