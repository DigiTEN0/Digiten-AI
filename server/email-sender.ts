import type { Organization } from "@shared/schema";

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function sendViaBrevo(
  fromEmail: string,
  fromName: string,
  replyTo: string,
  to: string,
  subject: string,
  html: string,
  textContent: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not set");
  }

  const payload: any = {
    sender: { email: fromEmail, name: fromName },
    replyTo: { email: replyTo, name: fromName },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent,
  };

  if (attachments && attachments.length > 0) {
    payload.attachment = attachments.map((a) => ({
      name: a.filename,
      content: a.content.toString("base64"),
    }));
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API error ${response.status}: ${body}`);
  }
}

const BREVO_VERIFIED_SENDER = "digiten.nl@gmail.com";

export async function sendEmail(
  org: Organization,
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<boolean> {
  const fromName = org.name || "Digiten.ai";
  const fromEmail = BREVO_VERIFIED_SENDER;
  const replyTo = org.email || fromEmail;
  const textContent = stripHtml(html);

  try {
    await sendViaBrevo(fromEmail, fromName, replyTo, to, subject, html, textContent, attachments);
    console.log(`[email] Sent via Brevo to ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`[email] Failed to send to ${to}:`, err.message || err);
    return false;
  }
}

export async function sendEmailWithCopy(
  org: Organization,
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[]
): Promise<boolean> {
  const sent = await sendEmail(org, to, subject, html, attachments);

  if (sent && org.email && org.email !== to) {
    const copyHtml = buildCopyNotificationWrapper(org.name, to, subject, html);
    sendEmail(org, org.email, `[Kopie] ${subject}`, copyHtml, attachments).catch((err) =>
      console.error(`[email] Failed to send copy to ${org.email}:`, err)
    );
  }

  return sent;
}

function buildCopyNotificationWrapper(orgName: string, sentTo: string, originalSubject: string, originalHtml: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="padding: 16px 20px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 13px; color: #0369a1;">
          <strong>Automatische kopie</strong> — Dit bericht is automatisch verstuurd naar <strong>${sentTo}</strong>
        </p>
      </div>
      ${originalHtml}
    </div>
  `;
}

export function buildQuoteEmailHtml(
  orgName: string,
  clientName: string,
  quoteLink: string,
  primaryColor: string
): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7;">
<tr><td align="center" style="padding:30px 15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:4px;">
<tr><td style="padding:28px 32px 0 32px;">
<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;color:#222222;">${orgName}</p>
</td></tr>
<tr><td style="padding:20px 32px;">
<p style="margin:0 0 16px 0;">Beste ${clientName},</p>
<p style="margin:0 0 16px 0;">Bedankt voor uw aanvraag. Wij hebben een offerte voor u opgesteld.</p>
<p style="margin:0 0 16px 0;">Via onderstaande link kunt u de offerte bekijken, eventueel optionele items aanpassen en digitaal ondertekenen:</p>
<p style="margin:0 0 24px 0;"><a href="${quoteLink}" style="color:${primaryColor};font-weight:bold;text-decoration:underline;">Offerte bekijken en ondertekenen</a></p>
<p style="margin:0 0 16px 0;">Mocht de link niet werken, kopieer dan het volgende adres in uw browser:</p>
<p style="margin:0 0 16px 0;font-size:12px;color:#666666;word-break:break-all;">${quoteLink}</p>
<p style="margin:0;">Met vriendelijke groet,<br>${orgName}</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eeeeee;">
<p style="margin:0;font-size:11px;color:#999999;">U ontvangt deze e-mail omdat er een offerte is aangevraagd bij ${orgName}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildInvoiceEmailHtml(
  orgName: string,
  clientName: string,
  invoiceNumber: string,
  total: string,
  primaryColor: string
): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7;">
<tr><td align="center" style="padding:30px 15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:4px;">
<tr><td style="padding:28px 32px 0 32px;">
<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;color:#222222;">${orgName}</p>
</td></tr>
<tr><td style="padding:20px 32px;">
<p style="margin:0 0 16px 0;">Beste ${clientName},</p>
<p style="margin:0 0 16px 0;">Hierbij ontvangt u factuur <strong>${invoiceNumber}</strong> voor een bedrag van <strong>${total}</strong>.</p>
<p style="margin:0 0 16px 0;">De factuur is als PDF bijgevoegd bij deze e-mail.</p>
<p style="margin:0;">Met vriendelijke groet,<br>${orgName}</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eeeeee;">
<p style="margin:0;font-size:11px;color:#999999;">Dit is een automatisch gegenereerde factuur van ${orgName}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildPortalAccessEmailHtml(
  orgName: string,
  clientName: string,
  portalLink: string,
  email: string,
  password: string,
  primaryColor: string
): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7;">
<tr><td align="center" style="padding:30px 15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:4px;">
<tr><td style="padding:28px 32px 0 32px;">
<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;color:#222222;">${orgName}</p>
</td></tr>
<tr><td style="padding:20px 32px;">
<p style="margin:0 0 16px 0;">Beste ${clientName},</p>
<p style="margin:0 0 16px 0;">Er is een klantenportaal voor u aangemaakt. Hier kunt u uw dossier bekijken, foto's inzien, berichten sturen en het werk goedkeuren.</p>
<p style="margin:0 0 24px 0;"><a href="${portalLink}" style="display:inline-block;padding:12px 28px;background-color:${primaryColor};color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">Bekijk uw dossier</a></p>
<div style="margin:0 0 20px 0;padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;">
<p style="margin:0 0 8px 0;font-weight:bold;font-size:13px;color:#555;">Uw inloggegevens:</p>
<p style="margin:0 0 4px 0;font-size:13px;">E-mail: <strong>${email}</strong></p>
<p style="margin:0;font-size:13px;">Wachtwoord: <strong>${password}</strong></p>
</div>
<p style="margin:0 0 16px 0;font-size:12px;color:#666;">U kunt ook handmatig inloggen via het klantenportaal met bovenstaande gegevens.</p>
<p style="margin:0;">Met vriendelijke groet,<br>${orgName}</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eeeeee;">
<p style="margin:0;font-size:11px;color:#999999;">Dit is een automatisch gegenereerd bericht van ${orgName}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildDossierMessageEmailHtml(
  orgName: string,
  recipientName: string,
  senderName: string,
  messageText: string,
  portalLink: string,
  primaryColor: string
): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7;">
<tr><td align="center" style="padding:30px 15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:4px;">
<tr><td style="padding:28px 32px 0 32px;">
<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;color:#222222;">${orgName}</p>
</td></tr>
<tr><td style="padding:20px 32px;">
<p style="margin:0 0 16px 0;">Beste ${recipientName},</p>
<p style="margin:0 0 16px 0;"><strong>${senderName}</strong> heeft een nieuw bericht gestuurd in uw dossier:</p>
<div style="margin:0 0 20px 0;padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;">
<p style="margin:0;font-size:13px;color:#555;white-space:pre-wrap;">${messageText}</p>
</div>
<p style="margin:0 0 24px 0;"><a href="${portalLink}" style="display:inline-block;padding:12px 28px;background-color:${primaryColor};color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">Bekijk dossier</a></p>
<p style="margin:0;">Met vriendelijke groet,<br>${orgName}</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eeeeee;">
<p style="margin:0;font-size:11px;color:#999999;">Dit is een automatisch bericht van ${orgName}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildEmployeeInviteEmailHtml(
  orgName: string,
  employeeName: string,
  email: string,
  password: string,
  loginLink: string,
  primaryColor: string
): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f7f7;">
<tr><td align="center" style="padding:30px 15px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:4px;">
<tr><td style="padding:28px 32px 0 32px;">
<p style="margin:0 0 4px 0;font-size:16px;font-weight:bold;color:#222222;">${orgName}</p>
</td></tr>
<tr><td style="padding:20px 32px;">
<p style="margin:0 0 16px 0;">Beste ${employeeName},</p>
<p style="margin:0 0 16px 0;">U bent uitgenodigd als medewerker bij <strong>${orgName}</strong> op het Digiten.ai platform.</p>
<p style="margin:0 0 24px 0;"><a href="${loginLink}" style="display:inline-block;padding:12px 28px;background-color:${primaryColor};color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;">Inloggen</a></p>
<div style="margin:0 0 20px 0;padding:16px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;">
<p style="margin:0 0 8px 0;font-weight:bold;font-size:13px;color:#555;">Uw inloggegevens:</p>
<p style="margin:0 0 4px 0;font-size:13px;">E-mail: <strong>${email}</strong></p>
<p style="margin:0;font-size:13px;">Wachtwoord: <strong>${password}</strong></p>
</div>
<p style="margin:0 0 16px 0;font-size:12px;color:#666;">Wijzig uw wachtwoord na het eerste inloggen.</p>
<p style="margin:0;">Met vriendelijke groet,<br>${orgName}</p>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #eeeeee;">
<p style="margin:0;font-size:11px;color:#999999;">Dit is een automatisch gegenereerd bericht van ${orgName}.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function buildNewLeadNotificationHtml(
  clientName: string,
  clientEmail: string,
  services: string[],
  notes: string,
  desiredDate: string
): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Nieuwe aanvraag ontvangen</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666;">Naam:</td><td style="padding: 8px 0; font-weight: bold;">${clientName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666;">E-mail:</td><td style="padding: 8px 0;">${clientEmail}</td></tr>
        ${desiredDate ? `<tr><td style="padding: 8px 0; color: #666;">Gewenste startdatum:</td><td style="padding: 8px 0;">${desiredDate}</td></tr>` : ""}
        <tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Diensten:</td><td style="padding: 8px 0;">${services.join(", ")}</td></tr>
        ${notes ? `<tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Opmerkingen:</td><td style="padding: 8px 0;">${notes}</td></tr>` : ""}
      </table>
    </div>
  `;
}
