// Bloqueio progressivo de conta após tentativas de login falhas.

export const MAX_FAILED_ATTEMPTS = 5;
export const BASE_LOCK_MINUTES = 15;
export const MAX_LOCK_MINUTES = 24 * 60;

export type LockState = { failedAttempts: number; lockoutCount: number; lockedUntil: Date | null };

export function isLocked(state: Pick<LockState, "lockedUntil">, now = new Date()): boolean {
  return !!state.lockedUntil && state.lockedUntil > now;
}

/** Duração do bloqueio: 15 min, 30, 60… (dobra a cada bloqueio), até 24h. */
export function lockMinutes(lockoutCount: number): number {
  return Math.min(BASE_LOCK_MINUTES * 2 ** Math.max(0, lockoutCount - 1), MAX_LOCK_MINUTES);
}

/** Próximo estado após uma senha errada. */
export function afterFailure(state: LockState, now = new Date()): LockState & { lockedNow: boolean } {
  const failedAttempts = state.failedAttempts + 1;
  if (failedAttempts < MAX_FAILED_ATTEMPTS) {
    return { ...state, failedAttempts, lockedNow: false };
  }
  const lockoutCount = state.lockoutCount + 1;
  return {
    failedAttempts: 0,
    lockoutCount,
    lockedUntil: new Date(now.getTime() + lockMinutes(lockoutCount) * 60_000),
    lockedNow: true,
  };
}

export const afterSuccess = (): LockState => ({ failedAttempts: 0, lockoutCount: 0, lockedUntil: null });
