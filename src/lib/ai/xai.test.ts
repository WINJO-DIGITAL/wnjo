import { describe, expect, it } from "vitest";
import { ProviderError } from "@/lib/ai/provider";
import { parseXaiResponse, XaiProvider, xaiConfigFromEnv, type XaiConfig } from "@/lib/ai/xai";

const config: XaiConfig = { apiKey: "test-key", model: "test-model", inputPencePerMillionTokens: 100, outputPencePerMillionTokens: 300 };
const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const request = { system: "sys", messages: [{ role: "user" as const, content: "Task" }], tools: [{ name: "read_project", description: "Read" }] };

describe("xAI configuration", () => {
  it("refuses to start without a key or the model and prices configured", () => {
    expect(() => xaiConfigFromEnv({})).toThrow(/XAI_API_KEY/);
    expect(() => xaiConfigFromEnv({ XAI_API_KEY: "k" })).toThrow(/XAI_MODEL/);
  });

  it("reads a complete configuration and never invents a model or price", () => {
    const c = xaiConfigFromEnv({
      XAI_API_KEY: "k",
      XAI_MODEL: "m",
      XAI_INPUT_PENCE_PER_MILLION_TOKENS: "120",
      XAI_OUTPUT_PENCE_PER_MILLION_TOKENS: "360",
    });
    expect(c).toMatchObject({ apiKey: "k", model: "m", inputPencePerMillionTokens: 120, outputPencePerMillionTokens: 360 });
  });
});

describe("xAI provider", () => {
  it("sends the key, model and tools, and returns a final answer with usage and cost", async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const provider = new XaiProvider(config, async (url, init) => {
      sent = { url, init };
      return ok({ choices: [{ message: { content: "All good" } }], usage: { prompt_tokens: 1000, completion_tokens: 500 } });
    });
    const result = await provider.complete(request);
    expect(result).toEqual({ kind: "final", text: "All good", usage: { inputTokens: 1000, outputTokens: 500, costPence: 1 } });
    expect(sent!.url).toBe("https://api.x.ai/v1/chat/completions");
    const headers = sent!.init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(sent!.init.body as string);
    expect(body.model).toBe("test-model");
    expect(body.tools[0].function.name).toBe("read_project");
  });

  it("leaves the tools list out of a request that has none", async () => {
    let body: Record<string, unknown> = {};
    const provider = new XaiProvider(config, async (_url, init) => {
      body = JSON.parse(String(init.body));
      return ok({ choices: [{ message: { content: "{}" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } });
    });
    await provider.complete({ system: "sys", messages: [{ role: "user", content: "Task" }], tools: [] });
    expect("tools" in body).toBe(false);
  });

  it("returns a tool call with parsed arguments", async () => {
    const provider = new XaiProvider(config, async () =>
      ok({ choices: [{ message: { tool_calls: [{ function: { name: "read_project", arguments: '{"id":"p1"}' } }] } }], usage: {} }),
    );
    expect(await provider.complete(request)).toMatchObject({ kind: "tool_call", tool: "read_project", args: { id: "p1" } });
  });

  it("maps refused credentials to an authentication error", async () => {
    const provider = new XaiProvider(config, async () => new Response("no", { status: 401 }));
    await expect(provider.complete(request)).rejects.toMatchObject({ kind: "authentication" });
  });

  it("maps rate limits and outages to transient errors", async () => {
    const limited = new XaiProvider(config, async () => new Response("slow", { status: 429 }));
    await expect(limited.complete(request)).rejects.toMatchObject({ kind: "transient" });
    const down = new XaiProvider(config, async () => { throw new TypeError("network"); });
    await expect(down.complete(request)).rejects.toBeInstanceOf(ProviderError);
    await expect(down.complete(request)).rejects.toMatchObject({ kind: "transient" });
  });
});

describe("xAI response parsing", () => {
  it("rejects a response with no message", () => {
    expect(() => parseXaiResponse({}, config)).toThrow(/no message/);
  });
  it("rejects tool arguments that are not a JSON object", () => {
    expect(() => parseXaiResponse({ choices: [{ message: { tool_calls: [{ function: { name: "x", arguments: "[1]" } }] } }] }, config)).toThrow(/not an object/);
    expect(() => parseXaiResponse({ choices: [{ message: { tool_calls: [{ function: { name: "x", arguments: "{bad" } }] } }] }, config)).toThrow(/not JSON/);
  });
  it("rounds cost up to whole pence", () => {
    const r = parseXaiResponse({ choices: [{ message: { content: "x" } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }, config);
    expect(r.usage.costPence).toBe(1);
  });
});
