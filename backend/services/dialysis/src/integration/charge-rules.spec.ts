import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { deriveCharges } from './charge-rules';
import { ConsumableUsage, DialysisSession } from '../entities/session.entity';
import { Modality, SessionStatus } from '../entities/enums';

const session = (o: Partial<DialysisSession>) =>
  Object.assign(new DialysisSession(), { prescriptionSnapshot: { modality: Modality.HD, durationMin: 240 }, ...o });
const item = (itemCode: string, qty: number, chargeable: boolean) =>
  Object.assign(new ConsumableUsage(), { itemCode, qty, chargeable });

test('completed session charges package, dialyzer and extras only', () => {
  const lines = deriveCharges(session({ status: SessionStatus.COMPLETED }), [
    item('AV_TUBING', 1, false),
    item('NS_1000', 1, true),
    item('NS_1000', 1, true),
  ]);
  assert.deepEqual(lines, [
    { chargeCode: 'DIAL_HD_4H', qty: 1 },
    { chargeCode: 'DIAL_DIALYZER_NEW', qty: 1 },
    { chargeCode: 'ITEM:NS_1000', qty: 2 },
  ]);
});

test('aborted session after start is a partial session with reprocessing charge', () => {
  const lines = deriveCharges(
    session({ status: SessionStatus.ABORTED, startedAt: new Date(), dialyzerReuseId: 'R1' }),
    [],
  );
  assert.deepEqual(lines, [
    { chargeCode: 'DIAL_PARTIAL_SESSION', qty: 1 },
    { chargeCode: 'DIAL_DIALYZER_REPROCESS', qty: 1 },
  ]);
});

test('CRRT is charged per day', () => {
  const s = session({ status: SessionStatus.COMPLETED, prescriptionSnapshot: { modality: Modality.CRRT_CVVHDF, durationMin: 1440 } });
  assert.equal(deriveCharges(s, [])[0].chargeCode, 'DIAL_CRRT_CVVHDF_PER_DAY');
});
