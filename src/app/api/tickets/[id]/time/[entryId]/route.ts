import { NextRequest, NextResponse } from "next/server";

// TODO Sprint 3: This route referenced ticketTimeEntries and timeSpentMinutes/hoursUsedThisMonth
// which were removed in Sprint 2. Stub returns 410 until Sprint 3 cleanup.

export async function PUT(
  _request: NextRequest,
  _context: { params: Promise<{ id: string; entryId: string }> }
) {
  return NextResponse.json(
    { error: "Ticket time tracking has been removed. See Sprint 3 for replacement." },
    { status: 410 }
  );
}

export async function DELETE(
  _request: NextRequest,
  _context: { params: Promise<{ id: string; entryId: string }> }
) {
  return NextResponse.json(
    { error: "Ticket time tracking has been removed. See Sprint 3 for replacement." },
    { status: 410 }
  );
}
