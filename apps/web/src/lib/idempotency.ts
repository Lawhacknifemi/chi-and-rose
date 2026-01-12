/**
 * Client-side Idempotency Key Generation
 * 
 * Generates unique idempotency keys for requests.
 * Keys are stored in localStorage to survive page refreshes.
 */

/**
 * Generate a new idempotency key (UUID v4)
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Get or create an idempotency key for a specific operation
 * Uses localStorage to persist keys across page refreshes
 */
export function getIdempotencyKey(operation: string): string {
  const storageKey = `idempotency:${operation}`;
  const stored = localStorage.getItem(storageKey);

  if (stored) {
    return stored;
  }

  const key = generateIdempotencyKey();
  localStorage.setItem(storageKey, key);
  
  // Clean up after 24 hours
  setTimeout(() => {
    localStorage.removeItem(storageKey);
  }, 24 * 60 * 60 * 1000);

  return key;
}

/**
 * Clear idempotency key for an operation (after successful completion)
 */
export function clearIdempotencyKey(operation: string): void {
  localStorage.removeItem(`idempotency:${operation}`);
}
