/** Tiempo sin usar la app (en segundo plano o sin tocarla) después del cual hay que desbloquearla. */
export const LOCK_AFTER_MS = 5 * 60 * 1000;

export function shouldLock(lastActiveAt: number | null, now: number): boolean {
  return lastActiveAt != null && now - lastActiveAt > LOCK_AFTER_MS;
}
