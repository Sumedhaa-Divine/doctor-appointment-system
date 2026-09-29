import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ChargeStatus, PatientType, PayerRoute, SessionStatus } from './enums';

@Entity({ schema: 'dialysis', name: 'sessions' })
@Index(['stationId', 'scheduledStart'])
export class DialysisSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  sessionNo: string;

  @Index()
  @Column()
  patientId: string;

  // IP admission encounter for inpatients; OP dialysis encounter otherwise
  @Column({ nullable: true })
  encounterId: string;

  @Column({ type: 'enum', enum: PatientType })
  patientType: PatientType;

  @Column({ type: 'enum', enum: PayerRoute })
  payerRoute: PayerRoute;

  @Column({ nullable: true })
  payerRef: string; // pre-auth no., package id, scheme beneficiary id

  @Column()
  prescriptionId: string;

  // Snapshot of the prescription at start time, so later edits never rewrite history
  @Column({ type: 'jsonb', nullable: true })
  prescriptionSnapshot: Record<string, unknown>;

  @Column({ nullable: true })
  stationId: string;

  @Column({ nullable: true })
  machineId: string;

  @Column({ nullable: true })
  dialyzerReuseId: string;

  @Column({ type: 'timestamptz' })
  scheduledStart: Date;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  preWeightKg: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  postWeightKg: number;

  @Column({ nullable: true })
  actualUfMl: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date;

  @Column({ nullable: true })
  abortReason: string;

  @Column({ type: 'jsonb', nullable: true })
  gateOverrides: { gate: string; by: string; reason: string; at: string }[];

  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true })
  ktv: number;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  urr: number;

  @Column({ nullable: true })
  nurseId: string;

  @Column({ nullable: true })
  nephrologistId: string;

  @OneToMany(() => IntradialyticObservation, (o) => o.session)
  observations: IntradialyticObservation[];

  @OneToMany(() => ConsumableUsage, (c) => c.session)
  consumables: ConsumableUsage[];

  @VersionColumn()
  rowVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ schema: 'dialysis', name: 'intradialytic_observations' })
export class IntradialyticObservation {
  // Client-generated UUID so offline chair-side retries are idempotent
  @Column({ primary: true, type: 'uuid' })
  id: string;

  @Index()
  @Column()
  sessionId: string;

  @ManyToOne(() => DialysisSession, (s) => s.observations)
  @JoinColumn({ name: 'sessionId' })
  session: DialysisSession;

  @Column({ type: 'timestamptz' })
  observedAt: Date;

  @Column({ nullable: true }) systolic: number;
  @Column({ nullable: true }) diastolic: number;
  @Column({ nullable: true }) heartRate: number;
  @Column({ nullable: true }) bloodFlowMlMin: number;
  @Column({ nullable: true }) venousPressure: number;
  @Column({ nullable: true }) arterialPressure: number;
  @Column({ nullable: true }) tmp: number;
  @Column({ nullable: true }) cumulativeUfMl: number;

  @Column({ default: 'MANUAL' })
  source: string; // MANUAL | DEVICE

  @Column({ nullable: true })
  note: string;
}

@Entity({ schema: 'dialysis', name: 'consumable_usage' })
export class ConsumableUsage {
  @Column({ primary: true, type: 'uuid' })
  id: string;

  @Index()
  @Column()
  sessionId: string;

  @ManyToOne(() => DialysisSession, (s) => s.consumables)
  @JoinColumn({ name: 'sessionId' })
  session: DialysisSession;

  @Column()
  itemCode: string;

  @Column({ nullable: true })
  batchNo: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: string;

  @Column({ type: 'numeric' })
  qty: number;

  @Column({ default: 'EA' })
  uom: string;

  @Column({ default: true })
  isKitComponent: boolean;

  // Kit components are covered by the session package; extras are billed separately
  @Column({ default: false })
  chargeable: boolean;

  @Column()
  sourceStoreId: string;

  @Column({ nullable: true })
  stockIssueRef: string;
}

@Entity({ schema: 'dialysis', name: 'session_charges' })
@Index(['idempotencyKey'], { unique: true })
export class SessionCharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  sessionId: string;

  @Column()
  chargeCode: string;

  @Column({ type: 'numeric' })
  qty: number;

  @Column({ type: 'enum', enum: ChargeStatus, default: ChargeStatus.PENDING })
  status: ChargeStatus;

  @Column({ nullable: true })
  billingRef: string;

  @Column()
  idempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;
}
