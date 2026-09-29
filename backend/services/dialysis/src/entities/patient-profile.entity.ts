import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { IsolationClass, PatientCategory, PayerRoute } from './enums';

@Entity({ schema: 'dialysis', name: 'patient_profiles' })
export class DialysisPatientProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // MPI / UHID owned by the registration module
  @Index({ unique: true })
  @Column()
  patientId: string;

  @Column({ nullable: true })
  abhaId: string;

  @Column({ type: 'enum', enum: PatientCategory })
  category: PatientCategory;

  @Column({ nullable: true })
  primaryRenalDiagnosis: string; // ICD-10, e.g. N18.6

  @Column({ type: 'date', nullable: true })
  dialysisStartDate: string;

  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  dryWeightKg: number;

  @Column({ type: 'enum', enum: IsolationClass, default: IsolationClass.UNKNOWN })
  isolationClass: IsolationClass;

  @Column({ type: 'date', nullable: true })
  serologyValidUntil: string;

  @Column({ type: 'enum', enum: PayerRoute, default: PayerRoute.SELF_PAY })
  defaultPayerRoute: PayerRoute;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity({ schema: 'dialysis', name: 'serology_results' })
export class SerologyResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  test: string; // HBsAg | ANTI_HCV | HIV | ANTI_HBS

  @Column()
  result: string; // POSITIVE | NEGATIVE | titre value

  @Column({ type: 'date' })
  collectedOn: string;

  @Column({ nullable: true })
  labReportRef: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity({ schema: 'dialysis', name: 'vascular_access' })
export class VascularAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  patientId: string;

  @Column()
  type: string; // AVF | AVG | TUNNELED_CVC | NON_TUNNELED_CVC | PD_CATHETER

  @Column()
  site: string; // e.g. LEFT_RADIOCEPHALIC

  @Column({ type: 'date', nullable: true })
  createdOn: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  notes: Record<string, unknown>;
}
