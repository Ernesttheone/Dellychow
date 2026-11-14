/**
 * Globally synchronized UTC timestamp utilities for Deli Chow group chat.
 *
 * Design invariants:
 * 1. Canonical timestamps are stored in UTC ISO 8601 format ("YYYY-MM-DDTHH:mm:ss.sssZ")
 *    using Firestore `serverTimestamp()` and the backend `/api/time` clock as the source of truth.
 * 2. Client device clocks are never trusted as the source of message sending time.
 * 3. Timestamps are converted into each participant's local timezone and DST rules strictly
 *    for display via `Intl.DateTimeFormat`, never mutating the stored UTC timestamp.
 */

let serverClockOffsetMs = 0;
let lastSyncAtMs = 0;
let inflightSync: Promise<number> | null = null;

/**
 * Synchronizes local clock offset against the backend server's UTC clock using midpoint RTT.
 */
export async function syncServerClock(force = false): Promise<number> {
  const nowLocal = Date.now();
  if (!force && lastSyncAtMs > 0 && nowLocal - lastSyncAtMs < 60_000) {
    return serverClockOffsetMs;
  }
  if (inflightSync) return inflightSync;

  inflightSync = (async () => {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 1800) : null;
      const t0 = Date.now();
      const res = await fetch('/api/time', {
        method: 'GET',
        cache: 'no-store',
        signal: controller?.signal,
      });
      if (timer) clearTimeout(timer);
      const t1 = Date.now();

      if (res.ok) {
        const data = await res.json();
        const serverMs =
          typeof data?.epochMs === 'number'
            ? data.epochMs
            : data?.utcIso
            ? Date.parse(data.utcIso)
            : NaN;

        if (Number.isFinite(serverMs)) {
          const midpointLocal = t0 + (t1 - t0) / 2;
          serverClockOffsetMs = Math.round(serverMs - midpointLocal);
          lastSyncAtMs = Date.now();
        }
      }
    } catch {
      // Offline or unreachable: retain last known offset cleanly
    } finally {
      inflightSync = null;
    }
    return serverClockOffsetMs;
  })();

  return inflightSync;
}

/**
 * Returns an authoritative server UTC ISO 8601 string and epoch ms.
 * Always tries a live `/api/time` measurement when called during message send.
 */
export async function getAuthoritativeServerTime(): Promise<{ utcIso: string; epochMs: number }> {
  const offset = await syncServerClock(true);
  const epochMs = Date.now() + offset;
  return {
    utcIso: new Date(epochMs).toISOString(),
    epochMs,
  };
}

/**
 * Returns the current synchronized UTC epoch ms (calibrated against server time).
 */
export function getSynchronizedNowMs(): number {
  return Date.now() + serverClockOffsetMs;
}

/**
 * Normalizes any Firestore Timestamp, plain {seconds, nanoseconds}, epoch number,
 * or ISO string (with or without trailing 'Z') into a canonical UTC ISO 8601 string.
 */
export function normalizeToUtcIso(rawServerTs: unknown, fallbackCreatedAt?: unknown): string {
  const candidates = [rawServerTs, fallbackCreatedAt];

  for (const val of candidates) {
    if (val == null) continue;

    // 1. Firestore Timestamp instance
    if (typeof (val as any).toDate === 'function') {
      const d = (val as any).toDate();
      if (d instanceof Date && !Number.isNaN(d.getTime())) {
        return d.toISOString();
      }
    }

    // 2. Serialized Firestore Timestamp object { seconds, nanoseconds }
    if (typeof val === 'object' && typeof (val as any).seconds === 'number') {
      const ms =
        (val as any).seconds * 1000 +
        (typeof (val as any).nanoseconds === 'number' ? Math.floor((val as any).nanoseconds / 1e6) : 0);
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString();
      }
    }

    // 3. Date object
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      return val.toISOString();
    }

    // 4. Epoch ms number
    if (typeof val === 'number' && Number.isFinite(val)) {
      const d = new Date(val);
      if (!Number.isNaN(d.getTime())) {
        return d.toISOString();
      }
    }

    // 5. String timestamp (ensure missing offset/Z defaults to UTC)
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) continue;
      const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
      const isoCandidate = hasTimezone ? trimmed : `${trimmed}Z`;
      const parsed = Date.parse(isoCandidate);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed).toISOString();
      }
      const rawParsed = Date.parse(trimmed);
      if (!Number.isNaN(rawParsed)) {
        return new Date(rawParsed).toISOString();
      }
    }
  }

  return new Date(getSynchronizedNowMs()).toISOString();
}

/**
 * Safely parses a canonical UTC ISO string to UTC epoch milliseconds.
 */
export function parseUtcEpochMs(utcIso: string): number {
  const ms = Date.parse(normalizeToUtcIso(utcIso));
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Converts a UTC ISO 8601 timestamp strictly for local display (respecting timezone & DST).
 */
export function formatMessageTimeLocal(utcIso: string): string {
  const ms = parseUtcEpochMs(utcIso);
  if (!ms) return '';
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Returns a descriptive tooltip showing the local date/time alongside the exact UTC reference.
 */
export function formatMessageFullTooltip(utcIso: string): string {
  const canonical = normalizeToUtcIso(utcIso);
  const date = new Date(parseUtcEpochMs(canonical));
  try {
    const localStr = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
    const utcHours = String(date.getUTCHours()).padStart(2, '0');
    const utcMins = String(date.getUTCMinutes()).padStart(2, '0');
    return `${localStr} (${utcHours}:${utcMins} UTC)`;
  } catch {
    return canonical;
  }
}

/**
 * Computes a stable local calendar day key ("YYYY-MM-DD") from a UTC instant.
 * Automatically honors the viewer's timezone and Daylight Saving Time rules.
 */
export function getLocalCalendarDayKey(utcIso: string): string {
  const date = new Date(parseUtcEpochMs(utcIso));
  try {
    // en-CA reliably formats dates as YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

/**
 * Returns a synchronized date separator label ("Today", "Yesterday", or full formatted date)
 * derived from server-calibrated time and displayed in the user's local calendar.
 */
export function getDateSeparatorLabel(utcIso: string): string {
  const msgDate = new Date(parseUtcEpochMs(utcIso));
  const msgDayKey = getLocalCalendarDayKey(utcIso);

  const syncedNowMs = getSynchronizedNowMs();
  const todayKey = getLocalCalendarDayKey(new Date(syncedNowMs).toISOString());
  const yesterdayKey = getLocalCalendarDayKey(new Date(syncedNowMs - 86_400_000).toISOString());

  if (msgDayKey === todayKey) return 'Today';
  if (msgDayKey === yesterdayKey) return 'Yesterday';

  const currentYear = new Intl.DateTimeFormat('en-CA', { year: 'numeric' }).format(new Date(syncedNowMs));
  const msgYear = new Intl.DateTimeFormat('en-CA', { year: 'numeric' }).format(msgDate);

  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: currentYear !== msgYear ? 'numeric' : undefined,
    }).format(msgDate);
  } catch {
    return msgDate.toLocaleDateString();
  }
}
