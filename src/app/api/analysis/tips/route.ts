import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    tips: [
      "Record from the side and keep the full body in frame.",
      "Use a 10-20 second clip with one clear set only.",
      "Keep the camera stable and avoid zooming during the set.",
      "For squat, aim for a side view that clearly shows torso, hip, knee, and ankle.",
      "This MVP gives conservative technique feedback only and does not provide medical advice.",
    ],
  });
}
