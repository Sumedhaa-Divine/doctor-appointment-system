import { SessionStatus as S } from '../entities/enums';

export type SessionAction =
  | 'check_in'
  | 'pre_assess'
  | 'defer'
  | 'start'
  | 'end'
  | 'complete'
  | 'verify'
  | 'abort'
  | 'cancel'
  | 'no_show'
  | 'reschedule';

const TRANSITIONS: Record<SessionAction, { from: S[]; to: S }> = {
  check_in: { from: [S.SCHEDULED], to: S.CHECKED_IN },
  pre_assess: { from: [S.CHECKED_IN], to: S.PRE_ASSESSMENT },
  defer: { from: [S.CHECKED_IN, S.PRE_ASSESSMENT], to: S.DEFERRED },
  start: { from: [S.PRE_ASSESSMENT], to: S.IN_PROGRESS },
  end: { from: [S.IN_PROGRESS], to: S.POST_ASSESSMENT },
  complete: { from: [S.POST_ASSESSMENT], to: S.COMPLETED },
  verify: { from: [S.COMPLETED], to: S.VERIFIED },
  abort: { from: [S.IN_PROGRESS], to: S.ABORTED },
  cancel: { from: [S.SCHEDULED, S.CHECKED_IN, S.DEFERRED], to: S.CANCELLED },
  no_show: { from: [S.SCHEDULED], to: S.NO_SHOW },
  reschedule: { from: [S.SCHEDULED, S.DEFERRED], to: S.SCHEDULED },
};

export class InvalidTransitionError extends Error {
  constructor(public readonly from: S, public readonly action: SessionAction) {
    super(`Cannot ${action} a session in status ${from}`);
  }
}

export function nextStatus(current: S, action: SessionAction): S {
  const t = TRANSITIONS[action];
  if (!t.from.includes(current)) {
    throw new InvalidTransitionError(current, action);
  }
  return t.to;
}

export function allowedActions(current: S): SessionAction[] {
  return (Object.keys(TRANSITIONS) as SessionAction[]).filter((a) => TRANSITIONS[a].from.includes(current));
}
