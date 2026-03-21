import { NextResponse } from "next/server";

import { saveUploadedVideo } from "@/lib/mock-db";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Video uploads require multipart form data." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing uploaded file." }, { status: 400 });
    }

    const upload = saveUploadedVideo({
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || "video/mp4",
    });

    return NextResponse.json({ upload });
  } catch (error) {
    console.error("Failed to upload video", error);
    return NextResponse.json(
      { error: "Unable to upload the video right now." },
      { status: 500 },
    );
  }
}
