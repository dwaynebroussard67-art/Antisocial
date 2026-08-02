import { Resend } from "resend";

/**
 * OUT-OF-BAND STAFF ALERTS. In-app notifications (notify.ts) assume someone
 * is looking at the app; that assumption is false for a Band B hold at 3am.
 * This is the pipe that actually reaches a phone — D runs on Wi-Fi without
 * always having mobile data, so email (push notification on the Gmail app)
 * is the fastest thing that doesn't depend on a cell signal.
 *
 * Failure here must never break the moderation pipeline: by the time this
 * is called, content is already quarantined. A failed email is a missed
 * alert, not an open door — log loudly, don't throw.
 */

const FROM = process.env.RESEND_FROM_EMAIL || "Nura <onboarding@resend.dev>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return client ?? (client = new Resend(key));
}

export async function sendEmail(params: { to: string; subject: string; text: string }): Promise<void> {
  const resend = getClient();
  if (!resend) {
    console.error(
      `[email] RESEND_API_KEY not set — alert NOT sent: "${params.subject}" -> ${params.to}`
    );
    return;
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });
    if (error) {
      console.error("[email] Resend rejected the send:", error);
    }
  } catch (err) {
    console.error("[email] Resend send threw:", err);
  }
}
