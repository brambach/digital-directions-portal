import { NextRequest, NextResponse } from "next/server";

// TODO Sprint 3: This route references supportHourLogs which was removed in Sprint 2.
// The support hours system is being replaced. Stub returns 410 until Sprint 3 cleanup.

export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: "Support hours system has been removed. See Sprint 3 for Freshdesk replacement." },
    { status: 410 }
  );
}
