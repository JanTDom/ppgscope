export interface RateLimitOptions {
  /** Maksymalna liczba prób w oknie. */
  readonly maxAttempts: number;
  /** Długość okna w milisekundach. */
  readonly windowMs: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  /** Ile sekund klient ma poczekać, gdy żądanie odrzucono. */
  readonly retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Limiter w pamięci procesu. Na Vercelu każda instancja ma własny licznik,
 * więc to osłona przed zgadywaniem hasła, a nie twarda gwarancja globalna.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function prune(now: number): void {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }

  return {
    hit(key: string, now = Date.now()): RateLimitDecision {
      prune(now);
      const current = buckets.get(key);
      if (!current) {
        buckets.set(key, { count: 1, resetAt: now + options.windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      current.count += 1;
      if (current.count > options.maxAttempts) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    },
    reset(key: string): void {
      buckets.delete(key);
    },
  };
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "nieznany";
}
