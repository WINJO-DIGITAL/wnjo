import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { rateKey, sharedRateLimited } from "@/lib/rate-limit-shared";

const client = (rpc: ReturnType<typeof vi.fn>) => ({ rpc }) as unknown as SupabaseClient;

describe("rateKey", () => {
  it("keeps the scope and hashes the identifier, so no raw IP address is stored", () => {
    const key = rateKey("enquiry", "203.0.113.7");
    expect(key.startsWith("enquiry:")).toBe(true);
    expect(key).not.toContain("203.0.113.7");
    expect(key.length).toBeLessThanOrEqual(200);
  });

  it("gives the same key for the same input and different keys per scope", () => {
    expect(rateKey("enquiry", "a")).toBe(rateKey("enquiry", "a"));
    expect(rateKey("enquiry", "a")).not.toBe(rateKey("checkout", "a"));
  });
});

describe("sharedRateLimited", () => {
  it("reports the database's answer", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    expect(await sharedRateLimited(client(rpc), "enquiry", "ip", 5, 600)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", expect.objectContaining({ p_max: 5, p_window_seconds: 600 }));
  });

  it("allows the request when the database errors or is missing, so a genuine enquiry is never blocked", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sharedRateLimited(client(vi.fn().mockResolvedValue({ data: null, error: { message: "x" } })), "enquiry", "ip", 5, 600)).toBe(false);
    expect(await sharedRateLimited(client(vi.fn().mockRejectedValue(new Error("down"))), "enquiry", "ip", 5, 600)).toBe(false);
    expect(await sharedRateLimited(null, "enquiry", "ip", 5, 600)).toBe(false);
    spy.mockRestore();
  });
});
