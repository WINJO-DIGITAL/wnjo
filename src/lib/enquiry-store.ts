import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Saves enquiries to the database. Server-only: it uses the project's secret key, which
 * bypasses row-level security, so it must never reach the browser. The table has no
 * browser access at all. Returns null until SUPABASE_SERVICE_ROLE_KEY is set.
 */
export type StoredEnquiry = {
  reference: string;
  kind: "contact" | "brief";
  name: string;
  email: string;
  company?: string;
  topic?: string;
  budget?: string;
  timeline?: string;
  subject: string;
  body: string;
};

export function enquiryStoreConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export async function saveEnquiry(row: StoredEnquiry): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return false;
  try {
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.from("enquiries").insert({
      reference: row.reference,
      kind: row.kind,
      name: row.name,
      email: row.email,
      company: row.company ?? null,
      topic: row.topic ?? null,
      budget: row.budget ?? null,
      timeline: row.timeline ?? null,
      subject: row.subject,
      body: row.body,
    });
    if (error) {
      // Log the code only: the message can echo personal data.
      console.error(`Enquiry save failed: ${error.code ?? "unknown"}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Enquiry save failed:", error instanceof Error ? error.name : "unknown error");
    return false;
  }
}
