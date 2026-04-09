/**
 * Safe operation wrappers with retry logic
 */

const RETRY_CONFIG = {
  defaultRetries: 3,
  retryDelayMs: 1000,
};

export async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  context: string,
  fallback: T,
  maxRetries: number = RETRY_CONFIG.defaultRetries
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelayMs * attempt));
      }
    }
  }

  if (import.meta.env.DEV) {
    console.error(`[${context}]`, lastError);
  }

  return fallback;
}

export function safeSyncOperation<T>(
  operation: () => T,
  context: string,
  fallback: T
): T {
  try {
    return operation();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[${context}]`, error);
    }
    return fallback;
  }
}
