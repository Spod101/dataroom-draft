/**
 * Check if an error is likely a network/connection failure that may succeed on retry.
 */
function isRetryableError(err: unknown): boolean {
  if (err instanceof TypeError && err.message === "Failed to fetch") return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const name = err.name.toLowerCase();
    // Network/connection errors that often happen when tab was idle
    if (name === "aborterror") return true;
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) return true;
    if (msg.includes("err_network_changed") || msg.includes("err_connection")) return true;
  }
  return false;
}

/**
 * Retry an async function on network failures.
 * Uses exponential backoff: 1s, 2s, 4s between retries.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryableError(err)) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Reject after ms milliseconds. Use with Promise.race() to add a timeout to any promise.
 */
export function timeoutPromise<T = never>(ms: number, message = "Request timed out"): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });
}

/**
 * Run a promise with a timeout. If it doesn't resolve within ms, reject with a timeout error.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Request timed out"
): Promise<T> {
  return Promise.race([promise, timeoutPromise<T>(ms, message)]);
}
