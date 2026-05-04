type EmbedProvider = "ollama" | "fixture";

export const EMBEDDING_DIMENSION = 384;

function getEmbedProvider(): EmbedProvider {
  const provider = process.env.AI_PROVIDER ?? "ollama";
  if (provider === "fixture") return "fixture";
  return "ollama";
}

function getEnvInt(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getOllamaNativeBaseUrl(): string {
  // OLLAMA_BASE_URL defaults to the /v1 OpenAI-compatible path; strip it for native API calls.
  const rawBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
  let url: URL;

  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new Error(`Invalid OLLAMA_BASE_URL "${rawBaseUrl}".`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("OLLAMA_BASE_URL must use http or https.");
  }

  // Remove the /v1 suffix so we can reach the native Ollama API endpoints.
  url.pathname = url.pathname.replace(/\/v1\/?$/, "");

  return url.toString().replace(/\/$/, "");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Embeddings request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function getFixtureEmbedding(): number[] {
  return new Array(EMBEDDING_DIMENSION).fill(0);
}

async function getOllamaEmbedding(text: string): Promise<number[]> {
  const baseUrl = getOllamaNativeBaseUrl();
  const model = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";
  const timeoutMs = getEnvInt("OLLAMA_TIMEOUT_MS", 30000);

  const fetchEmbedding = fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.text().catch(() => "(unreadable)");
      throw new Error(
        `Ollama embeddings request failed with status ${response.status}: ${body}`,
      );
    }

    const data = (await response.json()) as { embedding?: number[] };

    if (!Array.isArray(data.embedding)) {
      throw new Error(
        "Ollama embeddings response did not contain an embedding array.",
      );
    }

    return data.embedding;
  });

  return withTimeout(fetchEmbedding, timeoutMs);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (getEmbedProvider() === "fixture") {
    return getFixtureEmbedding();
  }
  return getOllamaEmbedding(text);
}

