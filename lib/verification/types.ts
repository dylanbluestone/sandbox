/**
 * lib/verification/types.ts
 *
 * Core type contracts for pluggable age verification backends.
 *
 * Design intent
 * ─────────────
 * Real-world age verification services (Veriff, Onfido, Persona, Yoti, etc.)
 * all follow the same rough shape: you initialise a provider with credentials,
 * start a session for a user, poll or receive webhooks for status updates, and
 * eventually get a result. This file defines a provider-agnostic interface so
 * that the calling application never depends directly on a vendor SDK. Swapping
 * providers is a one-line change in the DI root — the rest of the app is
 * untouched.
 *
 * Typical flow
 * ────────────
 *   1. Bootstrap:  provider.init(config)
 *   2. Start:      session = await provider.startSession(userId)
 *   3. Redirect:   send user to session.verificationUrl (if present)
 *   4. Poll / webhook: provider.getSessionStatus(session.sessionId)
 *   5. Result:     session.result.verified, session.result.age, etc.
 */

// ─── Supporting enums ─────────────────────────────────────────────────────────

/**
 * Runtime environment for the verification provider.
 *
 * - `sandbox`    Use for development and automated testing. Requests do not
 *                consume credits and results are deterministic/mocked.
 * - `production` Live traffic. Uses real credentials and charges per session.
 */
export type VerificationEnvironment = 'sandbox' | 'production';

/**
 * Lifecycle state of a verification session.
 *
 * ```
 * pending ──► in_progress ──► completed
 *    │               │
 *    └───────────────┴──► failed
 *                         expired  (set by the provider after expiresAt passes)
 * ```
 *
 * - `pending`     Session created but the user has not yet started the flow.
 * - `in_progress` User has opened the verification URL and is actively going
 *                 through the steps.
 * - `completed`   Provider finished processing. Check `result.verified` for
 *                 the outcome.
 * - `failed`      An unrecoverable error occurred (network, document rejected,
 *                 liveness failure). Check `result.failureReason`.
 * - `expired`     The session was not completed before `expiresAt`. A new
 *                 session must be created.
 */
export type SessionStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

/**
 * Types of identity document a provider may have verified.
 * Non-exhaustive — providers may return values outside this union.
 */
export type DocumentType =
  | 'passport'
  | 'drivers_license'
  | 'national_id'
  | 'residence_permit'
  | 'other';

// ─── VerificationConfig ───────────────────────────────────────────────────────

/**
 * Credentials and runtime options passed to `VerificationProvider.init()`.
 *
 * The base interface covers fields that every provider needs. Extend it for
 * vendor-specific options:
 *
 * ```ts
 * interface AcmeConfig extends VerificationConfig {
 *   region: 'eu' | 'us';
 *   retryPolicy: { maxAttempts: number; backoffMs: number };
 * }
 * ```
 *
 * Never log or persist an instance of this interface — it contains credentials.
 */
export interface VerificationConfig {
  /**
   * Provider API key or client secret.
   * Source this from an environment variable, never hard-code it.
   *
   * @example process.env.VERIFICATION_API_KEY
   */
  apiKey: string;

  /**
   * Target environment. Use `'sandbox'` in all non-production deployments
   * to avoid billing and prevent test data polluting real records.
   */
  environment: VerificationEnvironment;

  /**
   * HTTPS URL the provider will POST status-change events to.
   * Required if your integration relies on webhooks rather than polling.
   * Must be publicly reachable — localhost will not work in production.
   *
   * @example 'https://yourapp.com/api/webhooks/verification'
   */
  webhookUrl?: string;

  /**
   * Maximum time in seconds a session remains valid before the provider
   * marks it as `expired`. Defaults vary by provider (typically 3 600–86 400 s).
   */
  sessionTimeoutSeconds?: number;

  /**
   * Arbitrary provider-specific options not covered by the base interface.
   * Prefer explicit fields over this escape hatch when building a concrete
   * implementation.
   *
   * @example { region: 'eu', retryOnRateLimit: true }
   */
  options?: Record<string, unknown>;
}

// ─── VerificationResult ───────────────────────────────────────────────────────

/**
 * The outcome of a completed (or failed) verification session.
 * Only present on a `VerificationSession` when `status` is `'completed'`
 * or `'failed'`.
 *
 * @example
 * if (session.status === 'completed' && session.result?.verified) {
 *   grantAccess(session.result.age);
 * }
 */
export interface VerificationResult {
  /**
   * `true`  — the provider confirmed the user's identity and age.
   * `false` — verification attempted but did not pass (see `failureReason`).
   */
  verified: boolean;

  /**
   * Age in whole years, derived from the verified document.
   * Only present when `verified` is `true` and the provider extracted DOB.
   */
  age?: number;

  /**
   * Date of birth as recorded on the verified document.
   * Only present when `verified` is `true` and the provider extracted DOB.
   *
   * Use `ageUtils.calculateAge(result.dateOfBirth)` for any subsequent
   * age arithmetic — do not re-derive from `age` alone.
   */
  dateOfBirth?: Date;

  /**
   * Type of identity document used for verification.
   * Absent when verification failed before document classification.
   */
  documentType?: DocumentType;

  /**
   * Timestamp at which the provider finalised this result.
   * Use this — not the session's `createdAt` — for audit log entries.
   */
  verifiedAt: Date;

  /**
   * Machine-readable reason code when `verified` is `false`.
   * Values are provider-defined (e.g. `'document_expired'`, `'liveness_failed'`,
   * `'age_below_minimum'`). Always display a user-friendly message; never
   * surface this value directly in UI.
   */
  failureReason?: string;

  /**
   * Provider's confidence score for the verification decision, in [0, 1].
   * A score of `1.0` is highest confidence; `0.0` is lowest.
   * Not all providers emit this. Treat `undefined` as "not available" rather
   * than low confidence.
   *
   * @example
   * if (result.confidence !== undefined && result.confidence < 0.8) {
   *   flagForManualReview(session.sessionId);
   * }
   */
  confidence?: number;
}

// ─── VerificationSession ──────────────────────────────────────────────────────

/**
 * A single verification attempt for one user.
 * Created by `VerificationProvider.startSession()` and updated via
 * `getSessionStatus()` or incoming webhooks.
 *
 * Treat sessions as immutable snapshots — each call to `getSessionStatus`
 * returns a fresh object reflecting the latest server-side state.
 *
 * @example
 * const session = await provider.startSession(userId);
 * // later, after webhook or poll:
 * const updated = await provider.getSessionStatus(session.sessionId);
 * if (updated.status === 'completed') handleResult(updated.result);
 */
export interface VerificationSession {
  /**
   * Opaque identifier assigned by the provider. Store this to correlate
   * webhook events and status polls with the originating session.
   */
  sessionId: string;

  /**
   * Your application's identifier for the user being verified.
   * Passed through from `startSession()` for correlation — the provider
   * does not interpret or validate this value.
   */
  userId: string;

  /** Current lifecycle state of the session. */
  status: SessionStatus;

  /**
   * When the session was created on the provider's side.
   * May differ slightly from the moment `startSession()` returned, due to
   * network latency or provider clock skew.
   */
  createdAt: Date;

  /**
   * After this timestamp the provider will no longer accept user input and
   * will transition the session to `'expired'`. Poll or complete the flow
   * before this time.
   */
  expiresAt: Date;

  /**
   * URL to redirect or embed for the user to complete the verification flow.
   * Present when the provider hosts its own UI (most SaaS providers do).
   * Absent for headless / document-upload-only providers.
   *
   * Treat this URL as single-use and short-lived — do not cache it.
   */
  verificationUrl?: string;

  /**
   * The outcome of the session. Only populated when `status` is
   * `'completed'` or `'failed'`.
   */
  result?: VerificationResult;

  /**
   * Arbitrary key/value data attached at session creation via `startSession()`.
   * Useful for correlating sessions with your own data model without mutating
   * the core interface (e.g. `{ orderId, requiredMinAge, returnUrl }`).
   */
  metadata?: Record<string, unknown>;
}

// ─── VerificationProvider ─────────────────────────────────────────────────────

/**
 * Abstract contract for an age verification backend.
 *
 * Implement this interface to integrate any verification vendor. The rest of
 * the application depends only on this interface — concrete providers are
 * injected at the composition root and never imported directly by feature code.
 *
 * ## Implementing a provider
 *
 * ```ts
 * export class AcmeVerificationProvider implements VerificationProvider {
 *   private client: AcmeClient | null = null;
 *
 *   async init(config: VerificationConfig): Promise<void> {
 *     this.client = new AcmeClient(config.apiKey, config.environment);
 *   }
 *
 *   async startSession(userId, metadata) {
 *     if (!this.client) throw new Error('Provider not initialised — call init() first');
 *     // ... map to AcmeClient API
 *   }
 *   // ... remaining methods
 * }
 * ```
 *
 * ## Registering a provider
 *
 * ```ts
 * const provider: VerificationProvider = new AcmeVerificationProvider();
 * await provider.init({ apiKey: process.env.ACME_KEY!, environment: 'production' });
 * ```
 */
export interface VerificationProvider {
  /**
   * Initialises the provider with credentials and runtime configuration.
   *
   * Must be called exactly once before any other method. Implementations
   * should validate `config`, establish any persistent connections, and
   * store state needed by subsequent calls.
   *
   * @param config - API credentials and runtime options.
   *
   * @throws {Error} If `config.apiKey` is missing or malformed.
   * @throws {Error} If the provider SDK fails to initialise (network,
   *   invalid credentials, etc.).
   *
   * @example
   * await provider.init({
   *   apiKey: process.env.VERIFICATION_API_KEY!,
   *   environment: 'production',
   *   webhookUrl: 'https://yourapp.com/api/webhooks/verification',
   * });
   */
  init(config: VerificationConfig): Promise<void>;

  /**
   * Creates a new verification session for the given user.
   *
   * Returns immediately with a `VerificationSession` in `'pending'` status.
   * If the provider hosts a verification UI, `session.verificationUrl` will
   * be set — redirect or embed it so the user can complete the flow.
   *
   * @param userId   - Your application's stable identifier for the user.
   *                   Opaque to the provider; used only for correlation.
   * @param metadata - Optional bag of key/value pairs persisted on the session.
   *                   Useful for attaching context (e.g. required minimum age,
   *                   return URL, internal order ID) without mutating the schema.
   *
   * @returns A `VerificationSession` with `status: 'pending'`.
   *
   * @throws {Error} If the provider has not been initialised via `init()`.
   * @throws {Error} If the provider API is unreachable or returns an error.
   *
   * @example
   * const session = await provider.startSession(user.id, {
   *   requiredMinAge: 18,
   *   returnUrl: 'https://yourapp.com/verify/callback',
   * });
   * redirect(session.verificationUrl);
   */
  startSession(userId: string, metadata?: Record<string, unknown>): Promise<VerificationSession>;

  /**
   * Fetches the current state of an existing session.
   *
   * Use this for polling-based integrations. For webhook-based integrations,
   * call this on receipt of a webhook event to get the canonical server-side
   * state before acting on it — never trust webhook payload data alone.
   *
   * @param sessionId - The `sessionId` returned by `startSession()`.
   *
   * @returns A fresh `VerificationSession` snapshot.
   *
   * @throws {Error} If `sessionId` is not found (may have been purged by the
   *   provider after its retention window).
   * @throws {Error} If the provider API is unreachable.
   *
   * @example
   * // Poll until terminal state
   * let session = await provider.getSessionStatus(sessionId);
   * while (session.status === 'pending' || session.status === 'in_progress') {
   *   await sleep(2000);
   *   session = await provider.getSessionStatus(sessionId);
   * }
   */
  getSessionStatus(sessionId: string): Promise<VerificationSession>;

  /**
   * Cancels an active session, preventing the user from completing it.
   *
   * Use this when the user explicitly abandons the flow, or when your
   * application determines that verification is no longer needed (e.g. the
   * underlying transaction was cancelled). Calling this on an already-terminal
   * session (`completed`, `failed`, `expired`) should be a no-op.
   *
   * @param sessionId - The `sessionId` to cancel.
   *
   * @throws {Error} If `sessionId` is not found.
   * @throws {Error} If the provider API is unreachable.
   *
   * @example
   * // User navigated away — clean up
   * await provider.cancelSession(session.sessionId);
   */
  cancelSession(sessionId: string): Promise<void>;

  /**
   * Verifies the authenticity of an incoming webhook request.
   *
   * Providers sign their webhook payloads with a shared secret (typically
   * HMAC-SHA256). Call this before processing any webhook event to confirm
   * it originated from the provider and has not been tampered with.
   *
   * This method is optional — some providers do not offer webhook signing,
   * or your integration may rely on polling instead of webhooks. Implement
   * it whenever the provider supports it; omit it otherwise.
   *
   * @param payload   - The raw request body as a string or Buffer.
   *                    Do NOT parse it before passing it here — JSON.parse()
   *                    can alter whitespace and invalidate the signature.
   * @param signature - The signature header value sent by the provider
   *                    (e.g. `req.headers['x-webhook-signature']`).
   *
   * @returns `true` if the signature is valid; `false` otherwise.
   *          **Reject the request and return 400 if this returns `false`.**
   *
   * @example
   * const rawBody = await req.text();
   * const sig = req.headers.get('x-webhook-signature') ?? '';
   * if (!provider.validateWebhook?.(rawBody, sig)) {
   *   return new Response('Invalid signature', { status: 400 });
   * }
   * const event = JSON.parse(rawBody);
   * await handleVerificationEvent(event);
   */
  validateWebhook?(payload: string | Buffer, signature: string): boolean;
}
