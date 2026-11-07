"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { QUOTE_TERMS_VERSION } from "@/lib/terms";
import { depositPence } from "@/lib/deposit";
import { Confirmation } from "./Confirmation";

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

type Item = { label: string; amount_pence: number; position: number };
type Version = {
  id: string;
  version: number;
  package_code: string;
  build_pence: number;
  range_low_pence: number;
  range_high_pence: number;
  monthly_pence: number;
  requires_scope: boolean;
  scope_reasons: string[];
  quote_version_items: Item[];
};
type Quote = {
  id: string;
  reference: string;
  status: "draft" | "sent" | "accepted" | "declined" | "expired" | "superseded";
  expires_at: string | null;
  latest_version: number;
  quote_versions: Version[];
};
/** The acceptance of a quote, with its deposit if one has been started. Null until the client accepts. */
type Acceptance = {
  id: string;
  quote_id: string;
  deposits: { status: "pending" | "paid" | "expired"; amount_pence: number }[];
};

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });
const pounds = (pence: number) => money.format(pence / 100);
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

const PACKAGE_NAME: Record<string, string> = { essential: "Essential", professional: "Professional", premium: "Premium" };

/** The quotes issued to the signed-in person's organisation. Clients see only what row-level security allows. */
export function QuotesPanel({ client }: { client: SupabaseClient }) {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [acceptances, setAcceptances] = useState<Acceptance[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      client
        .from("quotes")
        .select(
          "id, reference, status, expires_at, latest_version, quote_versions(id, version, package_code, build_pence, range_low_pence, range_high_pence, monthly_pence, requires_scope, scope_reasons, quote_version_items(label, amount_pence, position))",
        )
        .order("created_at", { ascending: false }),
      client.from("quote_acceptances").select("id, quote_id"),
      client.from("deposits").select("quote_acceptance_id, status, amount_pence"),
    ]).then(([quoteRes, acceptRes, depositRes]) => {
        if (cancelled) return;
        const failed = Boolean(quoteRes.error || acceptRes.error);
        setLoadError(failed);
        // Deposits are matched to acceptances here, in one place, rather than through a nested query.
        const deposits = depositRes.error ? [] : ((depositRes.data as unknown as { quote_acceptance_id: string; status: "pending" | "paid" | "expired"; amount_pence: number }[]) ?? []);
        const accepted = acceptRes.error ? [] : ((acceptRes.data as unknown as { id: string; quote_id: string }[]) ?? []);
        setAcceptances(
          accepted.map((a) => ({
            id: a.id,
            quote_id: a.quote_id,
            deposits: deposits.filter((d) => d.quote_acceptance_id === a.id).map((d) => ({ status: d.status, amount_pence: d.amount_pence })),
          })),
        );
        setQuotes(quoteRes.error ? null : ((quoteRes.data as unknown as Quote[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [client, refresh]);

  if (loadError) return <p role="alert">We couldn&apos;t load your quotes. Please refresh the page.</p>;
  if (quotes === null) return <p className="lede">Loading your quotes…</p>;
  if (quotes.length === 0) return null;

  return (
    <section id="quotes" className="acct-quotes" aria-labelledby="acct-quotes-title">
      <h2 id="acct-quotes-title" className="h2">
        Your quotes
      </h2>
      {quotes.map((quote) => {
        const version = quote.quote_versions.find((v) => v.version === quote.latest_version);
        if (!version) return null;
        const acceptance = acceptances.find((a) => a.quote_id === quote.id) ?? null;
        return (
          <QuoteCard
            key={quote.id}
            client={client}
            quote={quote}
            version={version}
            acceptance={acceptance}
            onChanged={() => setRefresh((r) => r + 1)}
          />
        );
      })}
    </section>
  );
}

function QuoteCard({
  client,
  quote,
  version,
  acceptance,
  onChanged,
}: {
  client: SupabaseClient;
  quote: Quote;
  version: Version;
  acceptance: Acceptance | null;
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [confirmingDecline, setConfirmingDecline] = useState(false);
  const open = quote.status === "sent";
  const [newAcceptanceId, setAcceptanceId] = useState<string | null>(null);
  const acceptanceId = newAcceptanceId ?? acceptance?.id ?? null;
  const deposit_row = acceptance?.deposits?.[0] ?? null;
  const deposit = gbp.format(depositPence(version.build_pence) / 100);
  const items = [...version.quote_version_items].sort((a, b) => a.position - b.position);

  const accept = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const { data, error } = await client.rpc("accept_quote", {
      p_version_id: version.id,
      p_accepted_name: name,
      p_terms_version: QUOTE_TERMS_VERSION,
      p_user_agent: navigator.userAgent,
    });
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: error.message || "We couldn't accept this quote. Please try again." });
      return;
    }
    setAcceptanceId(typeof data === "string" ? data : null);
    setMessage({ kind: "ok", text: "Thank you. Your acceptance has been recorded and we'll be in touch about the next steps." });
    onChanged();
  };

  /** Sends the client to the Stripe Checkout page for their 50% deposit. The server checks their access. */
  const payDeposit = async () => {
    if (!acceptanceId) return;
    setBusy(true);
    setMessage(null);
    const { data: session } = await client.auth.getSession();
    const token = session.session?.access_token;
    const res = token
      ? await fetch("/api/deposits/checkout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ acceptanceId }),
        }).catch(() => null)
      : null;
    const json = res ? ((await res.json().catch(() => null)) as { url?: string; error?: string } | null) : null;
    if (json?.url) {
      window.location.href = json.url;
      return;
    }
    setBusy(false);
    if (json?.error === "already_paid") {
      // The deposit is already paid: refresh so the quote shows it.
      onChanged();
      return;
    }
    setMessage({ kind: "error", text: "We couldn't start the deposit payment. Please try again, or ask us for help." });
  };

  const decline = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await client.rpc("decline_quote", { p_version_id: version.id, p_reason: null });
    setBusy(false);
    if (error) {
      setMessage({ kind: "error", text: error.message || "We couldn't record your decision. Please try again." });
      return;
    }
    setConfirmingDecline(false);
    setMessage({ kind: "ok", text: "Thanks for letting us know." });
    onChanged();
  };

  return (
    <article className="acct-order" aria-labelledby={`quote-${quote.id}`}>
      <p className="eyebrow">
        {quote.reference} · {PACKAGE_NAME[version.package_code] ?? version.package_code} package · version {version.version}
      </p>
      <h3 id={`quote-${quote.id}`} className="h2">
        {pounds(version.range_low_pence)} to {pounds(version.range_high_pence)}
      </h3>
      <p className="acct-meta">
        {open
          ? quote.expires_at
            ? `Open until ${dateFormat.format(new Date(quote.expires_at))}`
            : "Open for acceptance"
          : `Status: ${quote.status}`}
      </p>

      <table className="acct-quote-table">
        <caption className="sr-only">Quote breakdown</caption>
        <tbody>
          {items.map((item) => (
            <tr key={item.position}>
              <th scope="row">{item.label}</th>
              <td>{pounds(item.amount_pence)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Estimated build total</th>
            <td>{pounds(version.build_pence)}</td>
          </tr>
          {version.monthly_pence > 0 && (
            <tr>
              <th scope="row">Care plan, per month</th>
              <td>{pounds(version.monthly_pence)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {version.requires_scope && (
        <div className="acct-scope">
          <p>This quote needs a short scoping call before the final price is confirmed:</p>
          <ul>
            {version.scope_reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {open && (
        <form onSubmit={accept} className="acct-form" aria-label={`Accept quote ${quote.reference}`}>
          <label htmlFor={`accept-${quote.id}`} className="acct-label">
            Your full name, to accept this quote
          </label>
          <input
            id={`accept-${quote.id}`}
            className="acct-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            minLength={2}
            maxLength={200}
          />
          <p className="acct-meta">
            By accepting you agree to the quote terms (version {QUOTE_TERMS_VERSION}). Your acceptance, name, email and
            time are recorded.
          </p>
          <div className="acct-bar">
            <button type="submit" className="btn btn--primary" disabled={busy || name.trim().length < 2}>
              {busy ? "Accepting…" : "Accept this quote"}
            </button>
            {!confirmingDecline ? (
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmingDecline(true)} disabled={busy}>
                Decline
              </button>
            ) : (
              <button type="button" className="btn btn--secondary" onClick={decline} disabled={busy}>
                Yes, decline this quote
              </button>
            )}
          </div>
        </form>
      )}

      {acceptanceId && deposit_row?.status === "paid" && (
        <div className="acct-deposit">
          <Confirmation
            title="Deposit paid"
            detail={`${pounds(deposit_row.amount_pence)} received. Thank you. The balance is due on launch.`}
            reference={quote.reference}
          />
        </div>
      )}
      {acceptanceId && deposit_row?.status !== "paid" && (
        <div className="acct-deposit">
          <p>To start the work, pay the 50% deposit of {deposit}. The balance is due on launch. No VAT is charged.</p>
          <button type="button" className="btn btn--primary" onClick={payDeposit} disabled={busy}>
            Pay the 50% deposit
          </button>
        </div>
      )}

      {message && message.kind === "ok" && <Confirmation title={message.text} />}
      {message && message.kind === "error" && (
        <p role="alert" className="acct-error">
          {message.text}
        </p>
      )}
    </article>
  );
}
