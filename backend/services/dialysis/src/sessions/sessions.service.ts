import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, In } from 'typeorm';
import {
  ConsumableUsage,
  DialysisPatientProfile,
  DialysisPrescription,
  DialysisSession,
  DialyzerReuseRecord,
  IntradialyticObservation,
  Machine,
  MachineStatus,
  OutboxEvent,
  PatientType,
  PayerRoute,
  SessionCharge,
  SessionStatus,
  WaterTest,
} from '../entities';
import {
  ChargeRequestedPayload,
  ConsumableUsedPayload,
  DialysisEvents,
  SessionLifecyclePayload,
} from '../integration/events';
import { deriveCharges } from '../integration/charge-rules';
import { InvalidTransitionError, SessionAction, nextStatus } from './session-state-machine';
import { blockingGates, evaluateStartGates, GateResult } from './session-gates';
import {
  AbortSessionDto,
  CompleteSessionDto,
  ObservationDto,
  RecordConsumablesDto,
  ScheduleSessionDto,
  StartSessionDto,
} from './dto';

export interface Actor {
  userId: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class SessionsService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async schedule(dto: ScheduleSessionDto, actor: Actor): Promise<DialysisSession> {
    return this.dataSource.transaction(async (em) => {
      const profile = await em.findOneBy(DialysisPatientProfile, { patientId: dto.patientId });
      if (!profile) throw new NotFoundException('Patient is not enrolled in dialysis');

      if (dto.stationId) await this.assertStationFree(em, dto.stationId, new Date(dto.scheduledStart));

      const session = em.create(DialysisSession, {
        sessionNo: `DS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        patientType: dto.patientType,
        payerRoute:
          dto.payerRoute ?? (dto.patientType === PatientType.INPATIENT ? PayerRoute.IPD : profile.defaultPayerRoute),
        payerRef: dto.payerRef,
        prescriptionId: dto.prescriptionId,
        stationId: dto.stationId,
        machineId: dto.machineId,
        scheduledStart: new Date(dto.scheduledStart),
        status: SessionStatus.SCHEDULED,
        nurseId: actor.userId,
      });
      await em.save(session);
      await this.emit(em, DialysisEvents.SessionScheduled, session.id, this.lifecyclePayload(session));
      return session;
    });
  }

  async checkIn(id: string, actor: Actor) {
    return this.transition(id, 'check_in', actor);
  }

  async preAssess(id: string, actor: Actor) {
    return this.transition(id, 'pre_assess', actor);
  }

  async start(id: string, dto: StartSessionDto, actor: Actor): Promise<{ session: DialysisSession; gates: GateResult[] }> {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      const status = this.next(session.status, 'start');

      const profile = await em.findOneByOrFail(DialysisPatientProfile, { patientId: session.patientId });
      const prescription = await em.findOneBy(DialysisPrescription, { id: session.prescriptionId });
      const machine = session.machineId
        ? await em.findOne(Machine, { where: { id: session.machineId }, lock: { mode: 'pessimistic_write' } })
        : null;
      const station = session.stationId ? await em.query('SELECT "unitId" FROM dialysis.stations WHERE id = $1', [session.stationId]) : [];
      const today = new Date().toISOString().slice(0, 10);
      const waterTestsToday = station[0]
        ? await em.findBy(WaterTest, { unitId: station[0].unitId, testDate: today })
        : [];
      const reuse = dto.dialyzerReuseId ? await em.findOneBy(DialyzerReuseRecord, { id: dto.dialyzerReuseId }) : null;

      const gates = evaluateStartGates({
        today,
        patientType: session.patientType,
        profile,
        prescription,
        machine,
        waterTestsToday,
        reuse,
        financiallyCleared: !!dto.financiallyCleared,
      });

      const overrides = dto.overrides ?? [];
      if (overrides.length && !actor.permissions.includes('dialysis.gate.override')) {
        throw new ForbiddenException('Only a nephrologist may override safety gates');
      }
      const blocking = blockingGates(gates, overrides.map((o) => o.gate));
      if (blocking.length) {
        throw new ConflictException({ message: 'Safety gates not satisfied', gates: blocking });
      }

      session.status = status;
      session.startedAt = new Date();
      session.preWeightKg = dto.preWeightKg;
      session.dialyzerReuseId = dto.dialyzerReuseId ?? session.dialyzerReuseId;
      session.prescriptionSnapshot = prescription ? { ...prescription } : {};
      session.gateOverrides = overrides.map((o) => ({ ...o, by: actor.userId, at: new Date().toISOString() }));
      await em.save(session);

      if (machine) {
        machine.status = MachineStatus.IN_USE;
        machine.lastUsedAt = new Date();
        await em.save(machine);
      }
      if (reuse) {
        reuse.reuseCount += 1;
        reuse.lastReprocessPassed = false; // must be reprocessed before next use
        await em.save(reuse);
      }

      await this.emit(em, DialysisEvents.SessionStarted, session.id, this.lifecyclePayload(session));
      return { session, gates };
    });
  }

  async recordObservations(id: string, observations: ObservationDto[]) {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      if (session.status !== SessionStatus.IN_PROGRESS) {
        throw new ConflictException('Observations can only be recorded during treatment');
      }
      // Upsert on client id: a retried offline batch is a no-op
      await em.upsert(
        IntradialyticObservation,
        observations.map((o) => ({ ...o, sessionId: id, observedAt: new Date(o.observedAt), source: 'MANUAL' })),
        ['id'],
      );
      return { accepted: observations.length };
    });
  }

  async recordConsumables(id: string, dto: RecordConsumablesDto) {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      if (![SessionStatus.PRE_ASSESSMENT, SessionStatus.IN_PROGRESS, SessionStatus.POST_ASSESSMENT].includes(session.status)) {
        throw new ConflictException('Consumables can only be recorded while the session is active');
      }
      const today = new Date().toISOString().slice(0, 10);
      const expired = dto.lines.filter((l) => l.expiryDate && l.expiryDate < today);
      if (expired.length) {
        throw new BadRequestException({ message: 'Expired items cannot be used', items: expired.map((l) => l.itemCode) });
      }

      const existing = await em.findBy(ConsumableUsage, { id: In(dto.lines.map((l) => l.id)) });
      const seen = new Set(existing.map((e) => e.id));
      const fresh = dto.lines.filter((l) => !seen.has(l.id));
      if (!fresh.length) return { accepted: 0 };

      await em.save(
        ConsumableUsage,
        fresh.map((l) => ({ ...l, sessionId: id, uom: l.uom ?? 'EA', chargeable: !l.isKitComponent })),
      );

      // One stock-issue event per store, keyed so a replay never double-issues
      const byStore = new Map<string, typeof fresh>();
      fresh.forEach((l) => byStore.set(l.sourceStoreId, [...(byStore.get(l.sourceStoreId) ?? []), l]));
      for (const [storeId, lines] of byStore) {
        const payload: ConsumableUsedPayload = {
          idempotencyKey: `${id}:issue:${lines.map((l) => l.id).sort().join(',')}`,
          sessionId: id,
          patientId: session.patientId,
          storeId,
          costCentre: 'DIALYSIS',
          lines: lines.map((l) => ({ itemCode: l.itemCode, batchNo: l.batchNo ?? null, qty: l.qty, uom: l.uom ?? 'EA' })),
        };
        await this.emit(em, DialysisEvents.ConsumableUsed, id, payload);
      }
      return { accepted: fresh.length };
    });
  }

  async end(id: string, actor: Actor) {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      session.status = this.next(session.status, 'end');
      session.endedAt = new Date();
      await em.save(session);
      await this.releaseMachine(em, session);
      return session;
    });
  }

  async complete(id: string, dto: CompleteSessionDto, actor: Actor) {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      session.status = this.next(session.status, 'complete');
      session.postWeightKg = dto.postWeightKg;
      session.actualUfMl = dto.actualUfMl;
      await em.save(session);
      await this.emit(em, DialysisEvents.SessionCompleted, id, this.lifecyclePayload(session));
      await this.requestCharges(em, session, actor);
      return session;
    });
  }

  async abort(id: string, dto: AbortSessionDto, actor: Actor) {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      session.status = this.next(session.status, 'abort');
      session.abortReason = dto.reason;
      session.endedAt = new Date();
      await em.save(session);
      await this.releaseMachine(em, session);
      await this.emit(em, DialysisEvents.SessionAborted, id, this.lifecyclePayload(session, dto.reason));
      await this.requestCharges(em, session, actor);
      return session;
    });
  }

  async verify(id: string, actor: Actor) {
    if (!actor.permissions.includes('dialysis.session.verify')) {
      throw new ForbiddenException('Only a nephrologist may verify sessions');
    }
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      session.status = this.next(session.status, 'verify');
      session.nephrologistId = actor.userId;
      await em.save(session);
      await this.emit(em, DialysisEvents.SessionVerified, id, this.lifecyclePayload(session));
      return session;
    });
  }

  async cancel(id: string, reason: string, actor: Actor) {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      session.status = this.next(session.status, 'cancel');
      session.abortReason = reason;
      await em.save(session);
      await this.emit(em, DialysisEvents.SessionCancelled, id, this.lifecyclePayload(session, reason));
      return session;
    });
  }

  // --- helpers ---------------------------------------------------------------

  private async transition(id: string, action: SessionAction, _actor: Actor) {
    return this.dataSource.transaction(async (em) => {
      const session = await this.load(em, id);
      session.status = this.next(session.status, action);
      await em.save(session);
      return session;
    });
  }

  private next(current: SessionStatus, action: SessionAction): SessionStatus {
    try {
      return nextStatus(current, action);
    } catch (e) {
      if (e instanceof InvalidTransitionError) throw new ConflictException(e.message);
      throw e;
    }
  }

  private async load(em: EntityManager, id: string): Promise<DialysisSession> {
    const session = await em.findOne(DialysisSession, { where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  private async assertStationFree(em: EntityManager, stationId: string, start: Date) {
    // A station runs one patient per shift; a 4h window approximates a shift here
    const windowStart = new Date(start.getTime() - 4 * 3600_000);
    const windowEnd = new Date(start.getTime() + 4 * 3600_000);
    const clash = await em
      .createQueryBuilder(DialysisSession, 's')
      .where('s.stationId = :stationId', { stationId })
      .andWhere('s.scheduledStart > :windowStart AND s.scheduledStart < :windowEnd', { windowStart, windowEnd })
      .andWhere('s.status NOT IN (:...closed)', {
        closed: [SessionStatus.CANCELLED, SessionStatus.NO_SHOW, SessionStatus.DEFERRED],
      })
      .getCount();
    if (clash) throw new ConflictException('Station already booked in this shift');
  }

  private async releaseMachine(em: EntityManager, session: DialysisSession) {
    if (!session.machineId) return;
    // Machine must be disinfected before the next start (enforced by machineGate)
    await em.update(Machine, { id: session.machineId }, { status: MachineStatus.DISINFECTING });
  }

  private async requestCharges(em: EntityManager, session: DialysisSession, actor: Actor) {
    const consumables = await em.findBy(ConsumableUsage, { sessionId: session.id });
    const lines = deriveCharges(session, consumables);
    const serviceDate = (session.startedAt ?? session.scheduledStart).toISOString().slice(0, 10);

    for (const [i, line] of lines.entries()) {
      const idempotencyKey = `${session.id}:${line.chargeCode}:${i}`;
      const exists = await em.findOneBy(SessionCharge, { idempotencyKey });
      if (exists) continue;
      await em.save(em.create(SessionCharge, { sessionId: session.id, ...line, idempotencyKey }));

      const payload: ChargeRequestedPayload = {
        idempotencyKey,
        sessionId: session.id,
        patientId: session.patientId,
        encounterId: session.encounterId ?? null,
        patientType: session.patientType,
        payerRoute: session.payerRoute,
        payerRef: session.payerRef ?? null,
        chargeCode: line.chargeCode,
        qty: line.qty,
        serviceDate,
        orderingDoctorId: (session.prescriptionSnapshot?.signedBy as string) ?? null,
      };
      await this.emit(em, DialysisEvents.ChargeRequested, session.id, payload);
    }
  }

  private lifecyclePayload(s: DialysisSession, reason?: string): SessionLifecyclePayload {
    return {
      sessionId: s.id,
      patientId: s.patientId,
      encounterId: s.encounterId ?? null,
      patientType: s.patientType,
      stationId: s.stationId ?? null,
      machineId: s.machineId ?? null,
      reason,
    };
  }

  private async emit(em: EntityManager, type: string, aggregateId: string, payload: object) {
    await em.save(
      em.create(OutboxEvent, {
        type,
        aggregateId,
        payload: {
          eventId: randomUUID(),
          type,
          version: 1,
          occurredAt: new Date().toISOString(),
          source: 'dialysis-service',
          payload,
        },
      }),
    );
  }
}
