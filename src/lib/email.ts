import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

// Best-effort email. Never throws — if SMTP is unconfigured or fails, it just
// logs and returns, so in-app notifications always work regardless.
export async function sendEmail(to: string, subject: string, text: string, html?: string): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "tms@localhost";
  try {
    await t.sendMail({ from, to, subject, text, html });
  } catch (e) {
    console.error("[email] failed to send to", to, e);
  }
}
