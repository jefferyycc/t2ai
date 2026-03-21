import { LimitationTag } from "@/lib/types";

export function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export function deriveLimitations(injuries: string[]): LimitationTag[] {
  const normalized = injuries.map((injury) => injury.toLowerCase());
  const limitations: LimitationTag[] = [];

  if (normalized.some((injury) => injury.includes("shoulder"))) {
    limitations.push("shoulder");
  }
  if (
    normalized.some(
      (injury) =>
        injury.includes("back") ||
        injury.includes("lumbar") ||
        injury.includes("spine"),
    )
  ) {
    limitations.push("lower-back");
  }
  if (normalized.some((injury) => injury.includes("knee"))) {
    limitations.push("knee");
  }
  if (normalized.some((injury) => injury.includes("wrist"))) {
    limitations.push("wrist");
  }

  return unique(limitations);
}
