/**
 * Fixed-window rate-limit counters behind a small interface, so the in-memory store can later be
 * swapped for Redis or Postgres without touching the limiters.
 */
export interface RateLimitBucket {
  count: number;
  /** Epoch ms when this window ends and the count starts again from zero. */
  resetAt: number;
}

export interface RateLimitStore {
  /** Counts one hit against `key` and returns the bucket after counting. */
  hit(key: string, windowMs: number, now?: number): RateLimitBucket;
  /** The live bucket for `key` without counting, or null when there is none or it expired. */
  peek(key: string, now?: number): RateLimitBucket | null;
  /** Gives back one hit counted in the current window (for attempts that turned out not to count). */
  refund(key: string, now?: number): void;
  /** Forgets `key` (for example after a successful login). */
  clear(key: string): void;
  readonly size: number;
}

export interface MemoryRateLimitStoreOptions {
  /** Hard cap on tracked keys. When full, the oldest window is evicted to make room. */
  maxKeys: number;
  /** How often expired windows are swept out. */
  sweepIntervalMs?: number;
}

/**
 * In-process store. Memory is bounded: at most `maxKeys` entries, expired windows are swept on a
 * timer, and a new key arriving when the store is full evicts the oldest window (Map insertion
 * order), so rotating keys cannot grow it without limit. hit() is O(1) apart from that single
 * eviction. Counts reset when the process restarts and are not shared between instances.
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly maxKeys: number;
  private readonly sweepIntervalMs: number;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor({ maxKeys, sweepIntervalMs = 60_000 }: MemoryRateLimitStoreOptions) {
    if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error("maxKeys must be a positive integer.");
    this.maxKeys = maxKeys;
    this.sweepIntervalMs = sweepIntervalMs;
  }

  get size() {
    return this.buckets.size;
  }

  hit(key: string, windowMs: number, now = Date.now()) {
    this.startSweeping();
    const existing = this.buckets.get(key);
    if (existing && existing.resetAt > now) {
      existing.count += 1;
      return existing;
    }

    // A new window. Re-inserting keeps Map order roughly "oldest window first" for eviction.
    if (existing) this.buckets.delete(key);
    else if (this.buckets.size >= this.maxKeys) this.evictOldest();

    const bucket = { count: 1, resetAt: now + windowMs };
    this.buckets.set(key, bucket);
    return bucket;
  }

  peek(key: string, now = Date.now()) {
    const bucket = this.buckets.get(key);
    return bucket && bucket.resetAt > now ? bucket : null;
  }

  refund(key: string, now = Date.now()) {
    const bucket = this.buckets.get(key);
    if (bucket && bucket.resetAt > now && bucket.count > 0) bucket.count -= 1;
  }

  clear(key: string) {
    this.buckets.delete(key);
  }

  /** Removes every expired window. Runs on a timer; exposed for tests. */
  sweep(now = Date.now()) {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }

  /** Stops the sweep timer and forgets everything (tests, shutdown). */
  reset() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = null;
    this.buckets.clear();
  }

  private evictOldest() {
    const oldest = this.buckets.keys().next();
    if (!oldest.done) this.buckets.delete(oldest.value);
  }

  // Started lazily so that merely importing a limiter never creates a timer, and unref'd so the
  // timer never keeps the process alive.
  private startSweeping() {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
    this.sweepTimer.unref?.();
  }
}
