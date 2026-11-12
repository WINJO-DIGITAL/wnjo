import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/runner", () => ({ runTask: vi.fn() }));
vi.mock("@/lib/ai/store", () => ({ SupabaseRunStore: class {} }));
vi.mock("@/lib/ai/budget-loader", () => ({ loadBudgetLimits: vi.fn() }));
vi.mock("@/lib/ai/read-tools", () => ({ buildReadToolRegistry: vi.fn() }));

import { providerFromEnv } from "./agent-runtime";

const anthropic = { ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "claude-haiku-5-5", ANTHROPIC_INPUT_PENCE_PER_MILLION_TOKENS: "8", ANTHROPIC_OUTPUT_PENCE_PER_MILLION_TOKENS: "40" };
const xai = { XAI_API_KEY: "k", XAI_MODEL: "grok", XAI_INPUT_PENCE_PER_MILLION_TOKENS: "1", XAI_OUTPUT_PENCE_PER_MILLION_TOKENS: "2" };

describe("providerFromEnv", () => {
  it("has no provider when nothing is configured", () => {
    expect(providerFromEnv({})).toBeNull();
  });
  it("uses Grok by default, as before", () => {
    expect(providerFromEnv(xai)?.name).toBe("xai");
  });
  it("uses Claude when AI_PROVIDER says so and it is configured", () => {
    expect(providerFromEnv({ ...anthropic, AI_PROVIDER: "anthropic" })?.name).toBe("anthropic");
  });
  it("does not fall back to the other provider when the chosen one is half-configured", () => {
    expect(providerFromEnv({ ...xai, AI_PROVIDER: "anthropic" })).toBeNull();
    expect(providerFromEnv({ ...anthropic })).toBeNull();
  });
});
