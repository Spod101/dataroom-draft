
import { ensureValidSession } from './supabase';

function isRetryableError(err: unknown): boolean {
  if (err instanceof TypeError && err.message === "Failed to fetch") return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const name = err.name.toLowerCase();
    // Network/connection errors that often happen when tab was idle
    if (name === "aborterror") return true;
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("connection")) return true;
    if (msg.includes("timed out") || msg.includes("timeout")) return true;
    if (msg.includes("err_network_changed") || msg.includes("err_connection")) return true;
    // Auth errors that might be recoverable after session refresh
    if (msg.includes("jwt") || msg.includes("token") || msg.includes("unauthorized")) return true;
    // Supabase specific errors
    if (msg.includes("pgrst") || msg.includes("postgres")) return true;
  }
  return false;
}

/**
 * Check if an error indicates an auth/session issue that needs refresh.
 */
function isAuthError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("jwt") || msg.includes("token expired") || msg.includes("unauthorized")) return true;
    if (msg.includes("not authenticated") || msg.includes("invalid claim")) return true;
  }
  return false;
}

export type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  signal?: AbortSignal;
  /** If true, try to refresh auth session before retrying auth errors */
  refreshAuthOnError?: boolean;
};

/**
 * Retry an async function on network failures.
 * Uses exponential backoff: baseDelayMs * 2^attempt between retries.
 * 
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @throws The last error if all retries fail, or AbortError if aborted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { 
    maxAttempts = 3, 
    baseDelayMs = 1000, 
    signal,
    refreshAuthOnError = true 
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if aborted before each attempt
    if (signal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError');
    }
    
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      
      // Don't retry if aborted
      if (signal?.aborted || (err instanceof Error && err.name === 'AbortError')) {
        throw err;
      }
      
      // Check if this is the last attempt or error is not retryable
      if (attempt === maxAttempts || !isRetryableError(err)) {
        throw err;
      }
      
      // If it's an auth error, try to refresh the session before retrying
      if (refreshAuthOnError && isAuthError(err)) {
        try {
          const sessionValid = await ensureValidSession();
          if (!sessionValid) {
            // Session couldn't be refreshed, throw immediately
            throw err;
          }
        } catch {
          // Session refresh failed, throw original error
          throw err;
        }
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      
      // Wait before retry, respecting abort signal
      await new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(resolve, delay);
        
        if (signal) {
          const abortHandler = () => {
            clearTimeout(timeoutId);
            reject(new DOMException('Request was aborted', 'AbortError'));
          };
          
          signal.addEventListener('abort', abortHandler, { once: true });
          
          // Clean up abort listener after timeout
          setTimeout(() => {
            signal.removeEventListener('abort', abortHandler);
          }, delay + 1);
        }
      });
    }
  }
  
  throw lastError;
}

/**
 * Create a promise that rejects after ms milliseconds.
 * Use with Promise.race() to add a timeout to any promise.
 */
export function timeoutPromise<T = never>(
  ms: number, 
  message = "Request timed out",
  signal?: AbortSignal
): Promise<T> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(message)), ms);
    
    if (signal) {
      const abortHandler = () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Request was aborted', 'AbortError'));
      };
      
      signal.addEventListener('abort', abortHandler, { once: true });
    }
  });
}

/**
 * Run a promise with a timeout. If it doesn't resolve within ms, reject with a timeout error.
 * 
 * @param promise - The promise to wrap with a timeout
 * @param ms - Timeout in milliseconds
 * @param message - Error message for timeout
 * @param signal - Optional AbortSignal for cancellation
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Request timed out",
  signal?: AbortSignal
): Promise<T> {
  // Check if already aborted
  if (signal?.aborted) {
    throw new DOMException('Request was aborted', 'AbortError');
  }
  
  return Promise.race([promise, timeoutPromise<T>(ms, message, signal)]);
}
