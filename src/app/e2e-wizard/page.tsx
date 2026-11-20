import { notFound } from "next/navigation";
import { Harness } from "./Harness";

export const dynamic = "force-dynamic";

/** The details form with a stand-in server, for the browser tests. A 404 unless the server starts with E2E=1. */
export default function E2EWizard() {
  if (process.env.E2E !== "1") notFound();
  return (
    <main className="container" style={{ maxWidth: 640, margin: "2rem auto" }}>
      <Harness />
    </main>
  );
}
