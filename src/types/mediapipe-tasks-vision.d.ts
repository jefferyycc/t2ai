/**
 * Minimal ambient typings for the subset of @mediapipe/tasks-vision the
 * squat analyzer uses.
 *
 * Why declare these locally: the package's exports map orders the `"types"`
 * condition after `"import"`/`"require"`, which breaks TypeScript's bundler
 * resolution — every `import { ... } from "@mediapipe/tasks-vision"` reports
 * "Cannot find module". Declaring the surface area we depend on here keeps
 * the runtime import working (Next.js bundles JS via the `import` condition)
 * while giving TypeScript what it needs to compile.
 *
 * If you need additional MediaPipe APIs in the future, add them here. The
 * full type definitions live in node_modules/@mediapipe/tasks-vision/vision.d.ts.
 */
declare module "@mediapipe/tasks-vision" {
  export class FilesetResolver {
    static forVisionTasks(wasmFileset: string): Promise<unknown>;
  }

  export interface NormalizedLandmark {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
  }

  export interface PoseLandmarkerResult {
    landmarks?: NormalizedLandmark[][];
    worldLandmarks?: NormalizedLandmark[][];
  }

  export interface PoseLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: "CPU" | "GPU";
    };
    runningMode: "IMAGE" | "VIDEO" | "LIVE_STREAM";
    numPoses?: number;
    minPoseDetectionConfidence?: number;
    minPosePresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class PoseLandmarker {
    static createFromOptions(
      fileset: unknown,
      options: PoseLandmarkerOptions,
    ): Promise<PoseLandmarker>;
    detectForVideo(
      video: HTMLVideoElement | HTMLImageElement,
      timestampMs: number,
    ): PoseLandmarkerResult;
    close(): void;
  }
}
