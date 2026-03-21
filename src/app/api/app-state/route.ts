import { NextResponse } from "next/server";

import { getDashboardSnapshot } from "@/lib/mock-db";

export async function GET() {
  return NextResponse.json(getDashboardSnapshot());
}
