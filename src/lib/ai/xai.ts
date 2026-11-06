import "server-only";
import { ProviderError, type AiProvider, type ProviderMessage, type ProviderResponse, type ToolSpec } from "@/lib/ai/provider";

/**
 * xAI (Grok) provider, using the chat-completions request format with function tools.
 * Model name and prices come from configuration: nothing here assumes a model or a price.
 * Not yet verified against the live service; it needs XAI_API_KEY and the configuration below.
 */

export type XaiConfig = {
  apiKey: string;
  model: string;
  inputPencePerMillionTokens: number;
  outputPencePerMillionTokens: number;
  baseUrl?: string;
};

export function xaiConfigFromEnv(env: Record<string, string | undefined> = process.env): XaiConfig {
  const need = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`${key} is not configured`);
    return value;
  };
  const num = (key: string) => {
    const n = Number(need(key));
    if (!Number.isFinite(n) || n < 0) throw new Error(`${key} must be a non-negative number`);
    return n;
  };
  return {
    apiKey: need("XAI_API_KEY"),
    model: need("XAI_MODEL"),
    inputPencePerMillionTokens: num("XAI_INPUT_PENCE_PER_MILLION_TOKENS"),
    outputPencePerMillionTokens: num("XAI_OUTPUT_PENCE_PER_MILLION_TOKENS"),
    baseUrl: env.XAI_BASE_URL?.trim() || DEFAULT_BASE_URL,
  };
}

const DEFAULT_BASE_URL = "https://api.x.ai/v1";

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export class XaiProvider implements AiProvider {
  readonly name = "xai";
  readonly model: string;

  constructor(
    private readonly config: XaiConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.model = config.model;
  }

  async complete(input: { system: string; messages: ProviderMessage[]; tools: ToolSpec[] }): Promise<ProviderResponse> {
    const body = {
      model: this.config.model,
      messages: [
        { role: "system", content: input.system },
        ...input.messages.map((m) => ({
          role: m.role === "tool" ? "user" : m.role,
          content: m.role === "tool" ? `Tool result (${m.toolName ?? "tool"}): ${m.content}` : m.content,
        })),
      ],
      tools: input.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: { type: "object", properties: {} } },
      })),
    };

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.config.baseUrl ?? DEFAULT_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      throw new ProviderError("Could not reach the model provider", "transient");
    }
    if (res.status === 401 || res.status === 403) throw new ProviderError(`Provider refused the credentials (${res.status})`, "authentication");
    if (res.status === 429 || res.status >= 500) throw new ProviderError(`Provider unavailable (${res.status})`, "transient");
    if (!res.ok) throw new ProviderError(`Provider rejected the request (${res.status})`, "invalid_response");

    const json = (await res.json().catch(() => null)) as XaiResponse | null;
    return parseXaiResponse(json, this.config);
  }
}

type XaiResponse = {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

/** Turns a provider response into the engine's shape. Anything unexpected is an invalid response, not a guess. */
export function parseXaiResponse(json: XaiResponse | null, config: XaiConfig): ProviderResponse {
  const message = json?.choices?.[0]?.message;
  if (!message) throw new ProviderError("Provider returned no message", "invalid_response");
  const inputTokens = Math.max(0, Math.floor(json?.usage?.prompt_tokens ?? 0));
  const outputTokens = Math.max(0, Math.floor(json?.usage?.completion_tokens ?? 0));
  const costPence = Math.ceil(
    (inputTokens * config.inputPencePerMillionTokens + outputTokens * config.outputPencePerMillionTokens) / 1_000_000,
  );
  const usage = { inputTokens, outputTokens, costPence };

  const call = message.tool_calls?.[0]?.function;
  if (call) {
    if (!call.name) throw new ProviderError("Provider returned a tool call without a name", "invalid_response");
    let args: unknown;
    try {
      args = JSON.parse(call.arguments ?? "{}");
    } catch {
      throw new ProviderError("Provider returned tool arguments that are not JSON", "invalid_response");
    }
    if (!args || typeof args !== "object" || Array.isArray(args)) {
      throw new ProviderError("Provider returned tool arguments that are not an object", "invalid_response");
    }
    return { kind: "tool_call", tool: call.name, args: args as Record<string, unknown>, usage };
  }
  return { kind: "final", text: message.content ?? "", usage };
}
