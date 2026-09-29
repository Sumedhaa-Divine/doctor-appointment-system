import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PatientType, PayerRoute } from '../entities/enums';
import { GateCode } from './session-gates';

export class ScheduleSessionDto {
  @IsString() patientId: string;
  @IsOptional() @IsString() encounterId?: string;
  @IsEnum(PatientType) patientType: PatientType;
  @IsOptional() @IsEnum(PayerRoute) payerRoute?: PayerRoute;
  @IsOptional() @IsString() payerRef?: string;
  @IsUUID() prescriptionId: string;
  @IsOptional() @IsUUID() stationId?: string;
  @IsOptional() @IsUUID() machineId?: string;
  @IsDateString() scheduledStart: string;
}

export class GateOverrideDto {
  @IsIn(['PRESCRIPTION', 'SEROLOGY', 'ISOLATION', 'MACHINE', 'WATER', 'DIALYZER_REUSE', 'FINANCIAL_CLEARANCE'])
  gate: GateCode;
  @IsString() reason: string;
}

export class StartSessionDto {
  @IsNumber() preWeightKg: number;
  @IsOptional() @IsUUID() dialyzerReuseId?: string;
  @IsOptional() @IsBoolean() financiallyCleared?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => GateOverrideDto)
  overrides?: GateOverrideDto[];
}

export class ObservationDto {
  @IsUUID() id: string; // client-generated for idempotent retries
  @IsDateString() observedAt: string;
  @IsOptional() @IsNumber() systolic?: number;
  @IsOptional() @IsNumber() diastolic?: number;
  @IsOptional() @IsNumber() heartRate?: number;
  @IsOptional() @IsNumber() bloodFlowMlMin?: number;
  @IsOptional() @IsNumber() venousPressure?: number;
  @IsOptional() @IsNumber() arterialPressure?: number;
  @IsOptional() @IsNumber() tmp?: number;
  @IsOptional() @IsNumber() cumulativeUfMl?: number;
  @IsOptional() @IsString() note?: string;
}

export class ConsumableLineDto {
  @IsUUID() id: string;
  @IsString() itemCode: string;
  @IsOptional() @IsString() batchNo?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsNumber() qty: number;
  @IsOptional() @IsString() uom?: string;
  @IsBoolean() isKitComponent: boolean;
  @IsString() sourceStoreId: string;
}

export class RecordConsumablesDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => ConsumableLineDto)
  lines: ConsumableLineDto[];
}

export class CompleteSessionDto {
  @IsNumber() postWeightKg: number;
  @IsNumber() actualUfMl: number;
}

export class AbortSessionDto {
  @IsString() reason: string;
}
