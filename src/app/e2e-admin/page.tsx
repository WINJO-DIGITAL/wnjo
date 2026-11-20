import { notFound } from "next/navigation";
import { Harness } from "./Harness";

export const dynamic = "force-dynamic";

/** The staff screens with made-up records, for looking at and testing. A 404 unless the server starts with E2E=1. */
export default async function E2EAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.E2E !== "1") notFound();
  const q = await searchParams;
  return (
    <main className="container container--wide" style={{ margin: "2rem auto" }}>
      <Harness view={q.view ?? "today"} />
    </main>
  );
}
