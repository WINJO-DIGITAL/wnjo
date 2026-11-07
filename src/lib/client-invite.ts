/** Checks a new client's details before staff invite them. Pure, so the rules are tested directly. */

export function parseNewClient(input: unknown): { ok: true; name: string; email: string } | { ok: false; reason: string } {
  if (!input || typeof input !== "object") return { ok: false, reason: "The client details are missing." };
  const body = input as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 1 || name.length > 160) return { ok: false, reason: "Enter the client's business name." };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: "Enter a valid email address for the client." };
  }
  return { ok: true, name, email };
}
