import { AnalysisCreateInput, UploadedVideo, VideoAnalysis } from "@/lib/types";
import { createVideoAnalysis } from "@/lib/video-analysis";

export function createMockAnalysis(
  input: AnalysisCreateInput & { userId: string },
  upload: UploadedVideo | null,
): VideoAnalysis {
  return createVideoAnalysis(input, upload);
}
