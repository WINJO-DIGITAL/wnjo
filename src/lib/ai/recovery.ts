/**
 * Decides what happens to a task left in "running" after its worker stopped (a crash, a timeout, or a lost
 * database write). A task with attempts left goes back in the queue; one out of attempts fails. Pure, so the
 * rule is tested without a database.
 */
export const STUCK_AFTER_MINUTES = 20;

export function recoveredStatus(attempts: number, maxAttempts: number): "queued" | "failed" {
  return attempts < maxAttempts ? "queued" : "failed";
}

export function stuckBefore(now: Date, minutes = STUCK_AFTER_MINUTES): string {
  return new Date(now.getTime() - minutes * 60_000).toISOString();
}
