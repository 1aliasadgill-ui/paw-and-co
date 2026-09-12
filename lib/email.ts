import { all, runtime, update } from './db';

// Checkout commits its outbox record first. Delivery failures never undo an order.
export async function sendPendingEmails(limit = 5) {
  const key = runtime('EMAIL_API_KEY');
  const from = runtime('EMAIL_FROM');
  if (!key || !from) return { sent: 0, configured: false };
  const rows = await all("SELECT * FROM outbox WHERE status='pending' AND attempts<5 ORDER BY created_at LIMIT ?", [limit]);
  let sent = 0;
  for (const row of rows) {
    let delivered = false;
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Idempotency-Key': row.id },
        body: JSON.stringify({ from, to: row.recipient, subject: row.subject, text: row.body }),
        signal: AbortSignal.timeout(5000),
      });
      delivered = response.ok;
    } catch { /* Keep the message available for an administrative retry. */ }
    await update('outbox', { attempts: row.attempts + 1, status: delivered ? 'sent' : 'pending' }, row.id).run();
    if (delivered) sent++;
  }
  return { sent, configured: true };
}
