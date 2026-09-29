import { ConsumableUsage, DialysisSession } from '../entities/session.entity';
import { Modality, SessionStatus } from '../entities/enums';

export interface ChargeLine {
  chargeCode: string;
  qty: number;
}

/** Tariff codes are owned by Billing; these are the codes dialysis emits. */
function sessionChargeCode(modality: Modality, durationMin: number): string {
  if (modality.startsWith('CRRT')) return `DIAL_${modality}_PER_DAY`;
  return `DIAL_${modality}_${Math.ceil(durationMin / 60)}H`;
}

/**
 * Derives charge lines when a session completes or is aborted.
 * Aborted sessions: charged as a partial session only if blood was on the circuit
 * (startedAt is set), otherwise only chargeable consumables already opened are billed.
 */
export function deriveCharges(session: DialysisSession, consumables: ConsumableUsage[]): ChargeLine[] {
  const rx = (session.prescriptionSnapshot ?? {}) as { modality?: Modality; durationMin?: number };
  const lines: ChargeLine[] = [];

  if (session.status === SessionStatus.COMPLETED && rx.modality) {
    lines.push({ chargeCode: sessionChargeCode(rx.modality, rx.durationMin ?? 240), qty: 1 });
  } else if (session.status === SessionStatus.ABORTED && session.startedAt) {
    lines.push({ chargeCode: 'DIAL_PARTIAL_SESSION', qty: 1 });
  }

  lines.push({ chargeCode: session.dialyzerReuseId ? 'DIAL_DIALYZER_REPROCESS' : 'DIAL_DIALYZER_NEW', qty: 1 });

  // Items outside the kit are billed per unit, grouped by item code
  const extras = new Map<string, number>();
  for (const c of consumables.filter((c) => c.chargeable)) {
    extras.set(c.itemCode, (extras.get(c.itemCode) ?? 0) + Number(c.qty));
  }
  extras.forEach((qty, itemCode) => lines.push({ chargeCode: `ITEM:${itemCode}`, qty }));

  return lines;
}
