import { notFound } from "next/navigation";
import { Harness } from "./Harness";

export const dynamic = "force-dynamic";

/** The customer account layout with made-up records, for looking at without signing in. A 404 unless the server starts with E2E=1. */
export default function E2EAccount() {
  if (process.env.E2E !== "1") notFound();
  return (
    <section className="dash-shell">
      <div className="container container--wide">
        <Harness />
      </div>
    </section>
  );
}
