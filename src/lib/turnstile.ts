import "server-only";

/**
 * Cloudflare Turnstile, checked on the server. With either key unset the check does nothing,
 * so the form keeps working until both keys are set.
 */

export type TurnstileResult = "skip" | "ok" | "fail";

export function turnstileConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY?.trim() && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}

/** Asks Cloudflare whether the token is valid. A network failure is a fail, so the visitor can try again. */
export async function verifyTurnstile(token: string, ip: string, env: Record<string, string | undefined> = process.env): Promise<TurnstileResult> {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) return "skip";
  if (!token.trim()) return "fail";
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return "fail";
    const data = (await res.json()) as { success?: boolean };
    return data.success === true ? "ok" : "fail";
  } catch (error) {
    console.error("Turnstile check failed:", error instanceof Error ? error.name : "unknown error");
    return "fail";
  }
}
