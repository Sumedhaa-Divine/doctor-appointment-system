import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Modality, PrescriptionStatus } from './enums';

export interface DialysateSpec {
  naMmol: number;
  kMmol: number;
  caMmol: number;
  hco3Mmol: number;
  tempC: number;
}

export interface AnticoagulationSpec {
  type: 'HEPARIN' | 'LMWH' | 'CITRATE' | 'NONE';
  bolusIU?: number;
  hourlyIU?: number;
  stopBeforeEndMin?: number;
}

// Versioned: a change creates a new row and supersedes the previous ACTIVE one.
@Entity({ schema: 'dialysis', name: 'prescriptions' })
@Index(['patientId', 'status'])
export class DialysisPrescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientId: string;

  @Column({ default: 1 })
  version: number;

  @Column({ type: 'enum', enum: Modality })
  modality: Modality;

  @Column()
  durationMin: number;

  @Column({ default: 3 })
  frequencyPerWeek: number;

  @Column({ nullable: true })
  dialyzerModel: string;

  @Column({ default: false })
  reuseAllowed: boolean;

  @Column({ default: 0 })
  maxReuse: number;

  @Column({ nullable: true })
  bloodFlowMlMin: number;

  @Column({ nullable: true })
  dialysateFlowMlMin: number;

  @Column({ type: 'jsonb', nullable: true })
  dialysate: DialysateSpec;

  @Column({ type: 'jsonb' })
  anticoagulation: AnticoagulationSpec;

  @Column({ nullable: true })
  targetUfMl: number;

  @Column({ nullable: true })
  accessId: string;

  // Supply kit BOM code, drives consumable auto-fill and charges
  @Column()
  kitCode: string;

  @Column({ type: 'date' })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validTo: string;

  @Column({ type: 'enum', enum: PrescriptionStatus, default: PrescriptionStatus.DRAFT })
  status: PrescriptionStatus;

  @Column({ nullable: true })
  signedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
