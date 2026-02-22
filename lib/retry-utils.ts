/**
 * Network resilience utilities.
 * Keeps retry logic simple — fail fast, don't hang.
 */

function isRetryableError(err: unknown): boolean {
  if (err instanceof TypeError && err.message === "Failed to fetch") return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (err.name === "AbortError") return false; // Never retry aborts
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) return true;
    if (msg.includes("timed out") || msg.includes("timeout")) return true;
    if (msg.includes("jwt") || msg.includes("token") || msg.includes("unauthorized")) return true;
  }
  return false;
}

/**
 * Retry an async function on transient failures.
 * Defaults: 2 attempts, 500ms base delay, exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 2, baseDelayMs = 500 } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Don't retry aborts or non-retryable errors
      if (err instanceof Error && err.name === "AbortError") throw err;
      if (attempt === maxAttempts || !isRetryableError(err)) throw err;

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * Run a promise with a timeout. Rejects with Error if it doesn't resolve in time.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Request timed out"
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}
