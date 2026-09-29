import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { IsolationClass, MachineStatus } from './enums';

@Entity({ schema: 'dialysis', name: 'stations' })
export class Station {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  unitId: string;

  @Column()
  code: string; // e.g. CHAIR-07, ICU-BED-3

  @Column({ default: false })
  isBedside: boolean;

  @Column({ type: 'enum', enum: IsolationClass, default: IsolationClass.NONE })
  isolationClass: IsolationClass;

  @Column({ default: true })
  isActive: boolean;
}

@Entity({ schema: 'dialysis', name: 'machines' })
export class Machine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  assetTag: string;

  @Column()
  model: string;

  @Column({ nullable: true })
  stationId: string;

  @Column({ type: 'enum', enum: IsolationClass, default: IsolationClass.NONE })
  isolationClass: IsolationClass;

  @Column({ type: 'enum', enum: MachineStatus, default: MachineStatus.AVAILABLE })
  status: MachineStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastDisinfectedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'date', nullable: true })
  nextPreventiveMaintenanceDue: string;
}

@Entity({ schema: 'dialysis', name: 'water_tests' })
export class WaterTest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  unitId: string;

  @Column({ type: 'date' })
  testDate: string;

  @Column()
  testType: string; // TOTAL_CHLORINE | CONDUCTIVITY | BACTERIA_CFU | ENDOTOXIN

  @Column({ type: 'numeric' })
  value: number;

  @Column()
  passed: boolean;

  @Column()
  recordedBy: string;
}

@Entity({ schema: 'dialysis', name: 'dialyzer_reuse' })
export class DialyzerReuseRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  dialyzerModel: string;

  @Column()
  batchNo: string;

  @Column({ type: 'numeric' })
  baselineTcvMl: number;

  @Column({ type: 'numeric', nullable: true })
  lastTcvMl: number;

  @Column({ default: 0 })
  reuseCount: number;

  @Column({ default: false })
  lastReprocessPassed: boolean;

  @Column({ default: false })
  discarded: boolean;
}
