import { describe, expect, it } from "vitest";
import { recoveredStatus, STUCK_AFTER_MINUTES, stuckBefore } from "@/lib/ai/recovery";

describe("stuck task recovery", () => {
  it("re-queues a stuck task that has attempts left", () => {
    expect(recoveredStatus(1, 3)).toBe("queued");
    expect(recoveredStatus(2, 3)).toBe("queued");
  });

  it("fails a stuck task that has used all its attempts", () => {
    expect(recoveredStatus(3, 3)).toBe("failed");
  });

  it("counts a task as stuck only after the threshold has passed", () => {
    const now = new Date("2026-11-07T10:00:00Z");
    expect(stuckBefore(now)).toBe(new Date(now.getTime() - STUCK_AFTER_MINUTES * 60_000).toISOString());
    expect(stuckBefore(now, 5)).toBe("2026-11-07T09:55:00.000Z");
  });
});
