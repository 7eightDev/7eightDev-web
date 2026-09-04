export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
}

const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  return ms * (0.5 + Math.random() * 0.5);
}

/**
 * Executes an async operation with exponential backoff + jitter.
 * Retries only on transient errors (network, timeout, 429/5xx).
 * Throws immediately on non-retryable errors.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  isRetryable?: (error: unknown) => boolean
): Promise<T> {
  const baseDelay = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelay = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const shouldRetry = isRetryable ?? (() => true);

  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= config.maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );
      const delay = jitter(exponentialDelay);

      await sleep(delay);
      attempt += 1;
    }
  }
}
