import { NextResponse } from "next/server";
import { BLACK_FRIDAY, msUntilBlackFridayEnds } from "@/lib/black-friday";
import { blackFridayActiveNow, offerNowMs } from "@/lib/black-friday-clock";

export const dynamic = "force-dynamic";

/** Whether the Black Friday offer is on right now, by the server's clock. The banner and plan badges ask this. */
export function GET() {
  const active = blackFridayActiveNow();
  return NextResponse.json(
    {
      active,
      endsAt: BLACK_FRIDAY.endsAt,
      msLeft: active ? msUntilBlackFridayEnds(offerNowMs()) : 0,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
