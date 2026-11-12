import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiProvider } from "@/lib/ai/provider";
import { AnthropicProvider, anthropicConfigFromEnv } from "@/lib/ai/anthropic";
import { XaiProvider, xaiConfigFromEnv } from "@/lib/ai/xai";
import { runTask, type RunOutcome } from "@/lib/ai/runner";
import { SupabaseRunStore } from "@/lib/ai/store";
import { loadBudgetLimits } from "@/lib/ai/budget-loader";
import { buildReadToolRegistry } from "@/lib/ai/read-tools";
import type { ToolRegistry } from "@/lib/ai/tools";

/**
 * The model provider, or null when it is not configured. AI_PROVIDER picks "anthropic" (Claude) or "xai" (Grok, the
 * default). Nothing is guessed: missing settings mean no provider.
 */
export function providerFromEnv(env: Record<string, string | undefined> = process.env): AiProvider | null {
  try {
    return env.AI_PROVIDER?.trim().toLowerCase() === "anthropic" ? new AnthropicProvider(anthropicConfigFromEnv(env)) : new XaiProvider(xaiConfigFromEnv(env));
  } catch {
    return null;
  }
}

const SYSTEM_PROMPT =
  "You work for WINJO DIGITAL, a web design and booking-systems agency. Use only the tools you are given. " +
  "Never invent client details. Keep your answers short and factual.";

/**
 * Builds what the worker needs to run a queued task: the database-backed store, the budget gate, the read-only
 * tools, and the provider. With no provider configured, a queued task is suspended rather than run.
 */
export function buildAgentRuntime(db: SupabaseClient, provider: AiProvider | null = providerFromEnv()): {
  tools: ToolRegistry;
  runQueuedTask: (taskId: string, options?: { deadline?: number }) => Promise<RunOutcome>;
} {
  const tools = buildReadToolRegistry(db);
  const store = new SupabaseRunStore(db);
  return {
    tools,
    runQueuedTask: async (taskId: string, options?: { deadline?: number }) => {
      const task = await store.loadTask(taskId);
      if (!provider) {
        await store.setTaskStatus(task.id, "suspended");
        return { status: "suspended", reason: "No model provider is configured." };
      }
      return runTask({
        taskId,
        provider,
        tools,
        store,
        system: SYSTEM_PROMPT,
        loadBudgets: () => loadBudgetLimits(db, task),
        deadline: options?.deadline,
      });
    },
  };
}
