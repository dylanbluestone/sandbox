/**
 * lib/verification/providers/MockVerificationProvider.ts
 *
 * An in-memory VerificationProvider for local development and automated
 * testing. No network calls, no credentials required.
 *
 * Behaviour summary
 * ─────────────────
 * - startSession()     → always returns a `pending` session immediately
 * - getSessionStatus() → first call returns `in_progress`; second returns
 *                        `completed` (or `failed` based on options)
 * - cancelSession()    → transitions any active session to `failed`
 * - validateWebhook()  → always returns `true`
 * - reset()            → wipes all in-memory sessions (use between tests)
 *
 * Deterministic outcome rules (applied in priority order)
 * ───────────────────────────────────────────────────────
 * 1. failureRate   — random roll; if triggered, result is `verified: false`
 *                    with `failureReason: 'simulated_failure'`
 * 2. alwaysVerify  — when `true` (default), every non-failed session passes
 * 3. userId        — when `alwaysVerify` is `false`:
 *                    contains "adult"  → verified: true
 *                    contains "minor"  → verified: false
 *                    anything else     → verified: true
 */

import type {
  DocumentType,
  VerificationConfig,
  VerificationProvider,
  VerificationResult,
  VerificationSession,
} from '@/lib/verification/types';

// ─── Internal types ───────────────────────────────────────────────────────────

/**
 * Constructor options for `MockVerificationProvider`.
 * All fields are optional — the defaults are sensible for most use cases.
 */
export interface MockProviderOptions {
  /**
   * When `true` every session resolves to `verified: true` regardless of
   * userId. Set to `false` to enable userId-based routing (adult/minor) or
   * failure-rate simulation.
   *
   * @default true
   */
  alwaysVerify?: boolean;

  /**
   * Artificial delay in milliseconds applied to every async method.
   * Set to `0` in unit tests for synchronous-style assertions.
   * Leave at the default in integration / manual tests to simulate network RTT.
   *
   * @default 500
   */
  simulatedDelay?: number;

  /**
   * Probability (0–1) that a completed session resolves to `verified: false`
   * with `failureReason: 'simulated_failure'`. Applied before `alwaysVerify`
   * and userId routing.
   *
   * Useful for testing your app's error-handling paths without hard-coding
   * special userIds.
   *
   * @default 0
   */
  failureRate?: number;

  /**
   * When `true`, logs each method call and state transition to `console.debug`.
   * Automatically disabled in test environments (NODE_ENV === 'test') unless
   * explicitly set to `true`.
   *
   * @default false (or: process.env.NODE_ENV !== 'test')
   */
  debug?: boolean;
}

/** Internal mutable record — extends the public interface with a poll counter. */
interface StoredSession extends VerificationSession {
  /** How many times getSessionStatus has been called for this session. */
  _pollCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Session TTL used when the config does not specify one (24 hours). */
const DEFAULT_SESSION_TIMEOUT_SECONDS = 60 * 60 * 24;

/** Age returned for verified adult mock results. */
const MOCK_ADULT_AGE = 30;

/** Age returned for verified minor mock results (used when alwaysVerify is off). */
const MOCK_MINOR_AGE = 16;

const MOCK_DOCUMENT_TYPES: DocumentType[] = ['passport', 'drivers_license', 'national_id'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a pseudo-random UUID v4 without any external dependency. */
function generateUUID(): string {
  // crypto.randomUUID() is available in Node 14.17+ and all modern browsers.
  // Fall back to a manual implementation for environments that lack it.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Polyfill: Math.random()-based, sufficient for test IDs (not cryptographically secure).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Picks a random element from a non-empty array. */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a Date of birth for a person of the given age (birthday today). */
function dobForAge(age: number): Date {
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - age);
  return dob;
}

/** Returns a shallow clone of a StoredSession without the internal _pollCount field. */
function toPublicSession(stored: StoredSession): VerificationSession {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _pollCount, ...session } = stored;
  return session;
}

// ─── MockVerificationProvider ─────────────────────────────────────────────────

/**
 * In-memory `VerificationProvider` for local development and unit testing.
 *
 * @example Basic usage (tests)
 * ```ts
 * const provider = new MockVerificationProvider({ simulatedDelay: 0 });
 * await provider.init({ apiKey: 'mock', environment: 'sandbox' });
 *
 * const session = await provider.startSession('user-123');
 * expect(session.status).toBe('pending');
 *
 * await provider.getSessionStatus(session.sessionId); // in_progress
 * const done = await provider.getSessionStatus(session.sessionId); // completed
 * expect(done.result?.verified).toBe(true);
 *
 * provider.reset(); // clean up between tests
 * ```
 *
 * @example Testing the denied path
 * ```ts
 * const provider = new MockVerificationProvider({
 *   alwaysVerify: false,
 *   simulatedDelay: 0,
 * });
 * await provider.init({ apiKey: 'mock', environment: 'sandbox' });
 * const session = await provider.startSession('minor-456');
 * await provider.getSessionStatus(session.sessionId);
 * const done = await provider.getSessionStatus(session.sessionId);
 * expect(done.result?.verified).toBe(false);
 * ```
 *
 * @example Testing failure-rate paths
 * ```ts
 * const provider = new MockVerificationProvider({
 *   failureRate: 1, // always fail
 *   simulatedDelay: 0,
 * });
 * ```
 */
export class MockVerificationProvider implements VerificationProvider {
  // ── Configuration ────────────────────────────────────────────────────────

  private readonly alwaysVerify: boolean;
  private readonly simulatedDelay: number;
  private readonly failureRate: number;
  private readonly debugEnabled: boolean;

  // ── State ────────────────────────────────────────────────────────────────

  private config: VerificationConfig | null = null;
  private readonly sessions = new Map<string, StoredSession>();

  // ── Constructor ──────────────────────────────────────────────────────────

  constructor(options: MockProviderOptions = {}) {
    this.alwaysVerify = options.alwaysVerify ?? true;
    this.simulatedDelay = options.simulatedDelay ?? 500;
    this.failureRate = Math.min(1, Math.max(0, options.failureRate ?? 0));
    this.debugEnabled =
      options.debug ?? (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test');

    this.log('MockVerificationProvider created', {
      alwaysVerify: this.alwaysVerify,
      simulatedDelay: this.simulatedDelay,
      failureRate: this.failureRate,
    });
  }

  // ── VerificationProvider interface ───────────────────────────────────────

  /**
   * Stores the config and marks the provider as ready.
   * Always resolves — no network call is made.
   *
   * @throws {Error} If `config.apiKey` is empty.
   */
  async init(config: VerificationConfig): Promise<void> {
    await this.delay();

    if (!config.apiKey) {
      throw new Error('MockVerificationProvider: apiKey must not be empty');
    }

    this.config = config;
    this.log('init() succeeded', { environment: config.environment });
  }

  /**
   * Creates and stores a new session in `pending` status.
   *
   * @throws {Error} If `init()` has not been called.
   * @throws {Error} If `userId` is empty.
   */
  async startSession(
    userId: string,
    metadata?: Record<string, unknown>
  ): Promise<VerificationSession> {
    this.assertInitialised();
    await this.delay();

    if (!userId) {
      throw new Error('MockVerificationProvider: userId must not be empty');
    }

    const now = new Date();
    const timeoutSeconds = this.config!.sessionTimeoutSeconds ?? DEFAULT_SESSION_TIMEOUT_SECONDS;

    const session: StoredSession = {
      sessionId: generateUUID(),
      userId,
      status: 'pending',
      createdAt: now,
      expiresAt: new Date(now.getTime() + timeoutSeconds * 1000),
      // Simulate a hosted verification UI with a mock URL
      verificationUrl: `https://mock-verify.example.com/session/${generateUUID()}`,
      metadata,
      result: undefined,
      _pollCount: 0,
    };

    this.sessions.set(session.sessionId, session);
    this.log('startSession()', { sessionId: session.sessionId, userId });

    return toPublicSession(session);
  }

  /**
   * Advances the session through its lifecycle on each call:
   *
   * | Poll # | Status        | Notes                                  |
   * |--------|---------------|----------------------------------------|
   * | 1      | `in_progress` | User is going through the flow         |
   * | 2+     | `completed`   | Result attached (or `failed` if rolled) |
   *
   * Also transitions sessions that have passed `expiresAt` to `expired`.
   *
   * @throws {Error} If `sessionId` is not found.
   */
  async getSessionStatus(sessionId: string): Promise<VerificationSession> {
    this.assertInitialised();
    await this.delay();

    const session = this.requireSession(sessionId);

    // Already in a terminal state — return as-is.
    if (this.isTerminal(session.status)) {
      this.log('getSessionStatus() → terminal (no-op)', {
        sessionId,
        status: session.status,
      });
      return toPublicSession(session);
    }

    // Check expiry before advancing.
    if (new Date() >= session.expiresAt) {
      session.status = 'expired';
      this.log('getSessionStatus() → expired', { sessionId });
      return toPublicSession(session);
    }

    session._pollCount += 1;
    this.log('getSessionStatus()', { sessionId, pollCount: session._pollCount });

    if (session._pollCount === 1) {
      // First poll: transition to in_progress
      session.status = 'in_progress';
      this.log('getSessionStatus() → in_progress', { sessionId });
    } else {
      // Second+ poll: resolve with a result
      const result = this.buildResult(session.userId);
      session.status = result.verified ? 'completed' : 'failed';
      session.result = result;
      this.log('getSessionStatus() → ' + session.status, {
        sessionId,
        verified: result.verified,
        failureReason: result.failureReason,
      });
    }

    return toPublicSession(session);
  }

  /**
   * Transitions an active session to `failed`.
   * If the session is already in a terminal state the call is a no-op.
   *
   * @throws {Error} If `sessionId` is not found.
   */
  async cancelSession(sessionId: string): Promise<void> {
    this.assertInitialised();
    await this.delay();

    const session = this.requireSession(sessionId);

    if (this.isTerminal(session.status)) {
      this.log('cancelSession() no-op — already terminal', {
        sessionId,
        status: session.status,
      });
      return;
    }

    session.status = 'failed';
    session.result = {
      verified: false,
      verifiedAt: new Date(),
      failureReason: 'session_cancelled',
    };

    this.log('cancelSession() → failed', { sessionId });
  }

  /**
   * Always returns `true`.
   * In tests that exercise webhook handling, use `vi.spyOn` to override
   * this if you need to simulate a rejected signature.
   */
  validateWebhook(_payload: string | Buffer, _signature: string): boolean {
    this.log('validateWebhook() → true (mock always accepts)');
    return true;
  }

  // ── Testing helpers ───────────────────────────────────────────────────────

  /**
   * Removes all stored sessions and resets the poll counter.
   * Call this in `beforeEach` / `afterEach` to keep tests isolated.
   *
   * @example
   * afterEach(() => provider.reset());
   */
  reset(): void {
    const count = this.sessions.size;
    this.sessions.clear();
    this.log(`reset() — cleared ${count} session(s)`);
  }

  /**
   * Returns a snapshot of all currently stored sessions.
   * Useful for asserting side-effects in tests without calling the public API.
   *
   * @example
   * await provider.startSession('user-1');
   * expect(provider.getAllSessions()).toHaveLength(1);
   */
  getAllSessions(): VerificationSession[] {
    return Array.from(this.sessions.values()).map(toPublicSession);
  }

  /**
   * Directly injects a session into the store with the given status.
   * Use this to seed specific scenarios without driving through the full
   * poll cycle.
   *
   * @example
   * // Seed an already-expired session
   * const id = provider.injectSession('user-99', 'expired');
   * const session = await provider.getSessionStatus(id);
   * expect(session.status).toBe('expired');
   */
  injectSession(
    userId: string,
    status: StoredSession['status'],
    overrides: Partial<Omit<StoredSession, 'sessionId' | 'userId' | 'status'>> = {}
  ): string {
    const now = new Date();
    const sessionId = generateUUID();

    const session: StoredSession = {
      sessionId,
      userId,
      status,
      createdAt: overrides.createdAt ?? now,
      expiresAt:
        overrides.expiresAt ?? new Date(now.getTime() + DEFAULT_SESSION_TIMEOUT_SECONDS * 1000),
      result: overrides.result,
      metadata: overrides.metadata,
      _pollCount: overrides._pollCount ?? 0,
    };

    this.sessions.set(sessionId, session);
    this.log('injectSession()', { sessionId, userId, status });
    return sessionId;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private assertInitialised(): void {
    if (!this.config) {
      throw new Error('MockVerificationProvider: call init() before using the provider');
    }
  }

  private requireSession(sessionId: string): StoredSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`MockVerificationProvider: session not found — ${sessionId}`);
    }
    return session;
  }

  private isTerminal(status: StoredSession['status']): boolean {
    return status === 'completed' || status === 'failed' || status === 'expired';
  }

  /**
   * Resolves the outcome for a session based on (in priority order):
   * 1. failureRate random roll
   * 2. alwaysVerify flag
   * 3. userId keyword matching (adult / minor)
   */
  private buildResult(userId: string): VerificationResult {
    const now = new Date();

    // 1. Failure-rate roll
    if (this.failureRate > 0 && Math.random() < this.failureRate) {
      return {
        verified: false,
        verifiedAt: now,
        failureReason: 'simulated_failure',
      };
    }

    // 2. alwaysVerify shortcut
    if (this.alwaysVerify) {
      return this.buildVerifiedResult(MOCK_ADULT_AGE, now);
    }

    // 3. userId keyword routing
    const lc = userId.toLowerCase();
    if (lc.includes('minor')) {
      return {
        verified: false,
        verifiedAt: now,
        failureReason: 'age_below_minimum',
        age: MOCK_MINOR_AGE,
        confidence: 0.97,
      };
    }

    return this.buildVerifiedResult(MOCK_ADULT_AGE, now);
  }

  private buildVerifiedResult(age: number, verifiedAt: Date): VerificationResult {
    return {
      verified: true,
      age,
      dateOfBirth: dobForAge(age),
      documentType: randomPick(MOCK_DOCUMENT_TYPES),
      verifiedAt,
      confidence: parseFloat((0.85 + Math.random() * 0.15).toFixed(2)), // 0.85–1.00
    };
  }

  /** Resolves after `simulatedDelay` ms. No-op when delay is 0. */
  private delay(): Promise<void> {
    if (this.simulatedDelay <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, this.simulatedDelay));
  }

  /** Emits a debug line when `debugEnabled` is true. */
  private log(message: string, data?: Record<string, unknown>): void {
    if (!this.debugEnabled) return;
    const prefix = '[MockVerificationProvider]';
    if (data) {
      console.debug(prefix, message, data);
    } else {
      console.debug(prefix, message);
    }
  }
}
