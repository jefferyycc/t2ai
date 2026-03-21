import { NextResponse } from "next/server";

import { getAnalysisById } from "@/lib/mock-db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  const { analysisId } = await params;
  const analysis = getAnalysisById(analysisId);

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }

  return NextResponse.json({ analysis });
}
