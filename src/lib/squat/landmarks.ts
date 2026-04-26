/**
 * Browser-only MediaPipe Pose Landmarker wrapper.
 *
 * Loads the WASM-backed PoseLandmarker, scrubs through a video frame-by-frame
 * (~10 fps to keep CPU low), and returns the FrameLandmarks array that the
 * pure metric layer consumes.
 *
 * This module imports browser-only APIs (HTMLVideoElement, etc.) so it must
 * never be imported from a server file. The component using it should be
 * marked "use client" and dynamically import this module if SSR concerns
 * arise.
 *
 * Model: pose_landmarker_lite.task — small, fast, served from MediaPipe's
 * CDN. Override with NEXT_PUBLIC_POSE_MODEL_URL if you self-host.
 */

import {
  FilesetResolver,
  PoseLandmarker,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";
import type { FrameLandmarks, PoseLandmark } from "@/lib/types";

const DEFAULT_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const WASM_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm";

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/**
 * Lazily creates the PoseLandmarker. Called once per page load; subsequent
 * analyses reuse the warm instance.
 */
async function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      const modelUrl =
        process.env.NEXT_PUBLIC_POSE_MODEL_URL ?? DEFAULT_MODEL_URL;
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: modelUrl, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    })();
  }
  return landmarkerPromise;
}

function toPoseLandmark(raw: { x: number; y: number; z?: number; visibility?: number }): PoseLandmark {
  return {
    x: raw.x,
    y: raw.y,
    z: raw.z,
    visibility: raw.visibility ?? 0,
  };
}

function extractFrameLandmarks(
  result: PoseLandmarkerResult,
  timestampMs: number,
): FrameLandmarks | null {
  const first = result.landmarks?.[0];
  if (!first) return null;
  return {
    timestampMs,
    landmarks: first.map(toPoseLandmark),
  };
}

export type ProcessVideoOptions = {
  /** Sampling rate in frames per second. Lower = faster, less accurate. */
  sampleRate?: number;
  /** Optional progress callback (0..1). */
  onProgress?: (fraction: number) => void;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
};

/**
 * Walks the video from start to end at `sampleRate` fps, runs PoseLandmarker
 * on each frame, and accumulates FrameLandmarks. The video element should be
 * already loaded (readyState >= HAVE_METADATA).
 */
export async function processVideo(
  video: HTMLVideoElement,
  options: ProcessVideoOptions = {},
): Promise<FrameLandmarks[]> {
  const sampleRate = options.sampleRate ?? 10;
  const stepMs = 1000 / sampleRate;
  const durationMs = video.duration * 1000;

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Video duration is not available — wait for loadedmetadata.");
  }

  const landmarker = await getLandmarker();
  const frames: FrameLandmarks[] = [];

  // Pause native playback; we drive currentTime manually to ensure each frame
  // is processed exactly once.
  video.pause();

  for (let t = 0; t <= durationMs; t += stepMs) {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    await seekTo(video, t / 1000);

    const result = landmarker.detectForVideo(video, t);
    const frame = extractFrameLandmarks(result, t);
    if (frame) frames.push(frame);

    options.onProgress?.(t / durationMs);
  }

  options.onProgress?.(1);
  return frames;
}

function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Video seek failed."));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = Math.min(seconds, video.duration ?? seconds);
  });
}
