import { NextResponse, type NextRequest } from "next/server";

import { previousMonthRef } from "@/lib/finance/snapshots";
import { upsertMonthlySnapshot } from "@/lib/actions/snapshots";

/**
 * Vercel Cron handler. Configured in vercel.json to run on the first day
 * of each month at 03:00 UTC; it builds the snapshot for the previous
 * month so the closing values are consistent with the data entered up to
 * the end of that month.
 *
 * Security: Vercel Cron sends an Authorization header containing the
 * project's CRON_SECRET. We refuse the request when the header doesn't
 * match — local tests can hit the route by setting the same env locally.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const reference = request.nextUrl.searchParams.get("month") ?? previousMonthRef();
  const result = await upsertMonthlySnapshot(reference);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json({ ok: true, reference });
}
