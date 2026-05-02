/**
 * Notification Service — SOLID Pattern
 * Single Responsibility: centralizes all outbound notifications.
 * Open/Closed: new channels (WhatsApp, Email) can be added without modifying existing ones.
 */

export type NotificationType =
  | 'new_lead'
  | 'portal_viewed'
  | 'payment_received'
  | 'document_uploaded'
  | 'experience_generated'
  | 'custom';

export type NotificationChannel = 'telegram_advisor' | 'telegram_client';

export interface NotificationPayload {
  type: NotificationType;
  data: Record<string, string>;
}

// ── Internal helper ────────────────────────────────────────────────────────

async function callEndpoint(url: string, body: object): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.error(`[NotificationService] Error calling ${url}:`, err);
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Notify the advisor (internal Telegram channel).
 */
export async function notifyAdvisor(type: NotificationType, data: Record<string, string>): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return callEndpoint(`${baseUrl}/api/telegram/notify`, { type, data });
}

/**
 * Notify a specific client via their personal Telegram chat.
 */
export async function notifyClient(
  contactId: string,
  message: string,
  type: 'welcome' | 'itinerary' | 'reminder' | 'document' | 'experience' | 'custom' = 'custom'
): Promise<boolean> {
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return callEndpoint(`${baseUrl}/api/telegram/client-notify`, {
    contact_id: contactId,
    message,
    type,
  });
}

/**
 * Convenience: notify both advisor and client simultaneously.
 */
export async function notifyBoth(
  advisorPayload: NotificationPayload,
  clientPayload: { contactId: string; message: string; type?: string }
): Promise<{ advisorOk: boolean; clientOk: boolean }> {
  const [advisorOk, clientOk] = await Promise.all([
    notifyAdvisor(advisorPayload.type, advisorPayload.data),
    notifyClient(clientPayload.contactId, clientPayload.message, clientPayload.type as any),
  ]);
  return { advisorOk, clientOk };
}
