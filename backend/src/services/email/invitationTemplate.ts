import type { OrganizationInvitationEmailInput } from "./types.js";

const BRAND_NAME = "Supervisor AI";
const BRAND_BLUE = "#2D6FF7";
const BRAND_BLUE_SOFT = "#9DBCFB";
const PRIMARY = "#4157ad";
const PRIMARY_DARK = "#202d56";
const TEXT = "#23231f";
const TEXT_MUTED = "#6b6b63";
const BORDER = "#e6e6e1";
const PAGE_BG = "#f4f5f9";

const ROLE_LABELS: Record<OrganizationInvitationEmailInput["invitedRole"], string> = {
  employee: "Employee",
  supervisor: "Supervisor",
};

export interface InvitationEmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Builds the branded invitation email. Table layout and inline styles keep it intact in Gmail and Outlook. */
export function buildInvitationEmail(input: OrganizationInvitationEmailInput): InvitationEmailContent {
  const organization = escapeHtml(input.organizationName);
  const role = ROLE_LABELS[input.invitedRole];
  const url = escapeHtml(input.acceptanceUrl);
  const expiry = escapeHtml(formatExpiry(input.expiresAt));
  const inviter = input.invitedByName ? escapeHtml(input.invitedByName) : null;
  const year = new Date().getUTCFullYear();

  const intro = inviter
    ? `<strong>${inviter}</strong> has invited you to join <strong>${organization}</strong> on ${BRAND_NAME} as a <strong>${role}</strong>.`
    : `You have been invited to join <strong>${organization}</strong> on ${BRAND_NAME} as a <strong>${role}</strong>.`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Invitation to join ${organization}</title>
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${role} invitation to ${organization} on ${BRAND_NAME}. Expires ${expiry}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAGE_BG};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<!-- Header -->
<tr><td bgcolor="${PRIMARY_DARK}" style="background:${PRIMARY_DARK};background-image:linear-gradient(135deg,${PRIMARY_DARK} 0%,${PRIMARY} 100%);padding:28px 32px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:12px;">${logoMark()}</td>
<td valign="middle" style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">${BRAND_NAME}</td>
</tr></table>
<p style="margin:20px 0 0;font-size:13px;line-height:18px;color:#c9d2f5;letter-spacing:1.2px;text-transform:uppercase;">Team invitation</p>
<h1 style="margin:6px 0 0;font-size:24px;line-height:32px;font-weight:700;color:#ffffff;">Join ${organization}</h1>
</td></tr>
<tr><td height="4" bgcolor="${BRAND_BLUE}" style="height:4px;line-height:4px;font-size:0;background:${BRAND_BLUE};">&nbsp;</td></tr>

<!-- Body -->
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${TEXT};">Hello,</p>
<p style="margin:0 0 24px;font-size:16px;line-height:24px;color:${TEXT};">${intro}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f7ff;border:1px solid #d9e0ff;border-radius:8px;">
<tr><td style="padding:16px 20px;">
${detailRow("Organization", organization)}
${detailRow("Role", role)}
${detailRow("Invitation expires", expiry)}
</td></tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
<tr><td bgcolor="${PRIMARY}" style="border-radius:8px;background:${PRIMARY};">
<a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Accept invitation</a>
</td></tr>
</table>

<p style="margin:0 0 8px;font-size:14px;line-height:21px;color:${TEXT_MUTED};">If the button does not work, copy and paste this link into your browser:</p>
<p style="margin:0 0 24px;font-size:13px;line-height:20px;word-break:break-all;"><a href="${url}" target="_blank" style="color:${PRIMARY};">${url}</a></p>
<p style="margin:0;font-size:14px;line-height:21px;color:${TEXT_MUTED};">If you were not expecting this invitation, you can safely ignore this email. No account will be activated unless you accept.</p>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px;background:#fafaf8;border-top:1px solid ${BORDER};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:10px;">${logoMark(0.6)}</td>
<td valign="middle" style="font-size:14px;font-weight:700;color:${TEXT};">${BRAND_NAME}</td>
</tr></table>
<p style="margin:12px 0 0;font-size:12px;line-height:18px;color:${TEXT_MUTED};">Smarter workforce supervision, task planning and team insights.</p>
<p style="margin:8px 0 0;font-size:12px;line-height:18px;color:${TEXT_MUTED};">You received this email because someone invited ${escapeHtml(input.to)} to ${organization}. This is an automated message; please do not reply.</p>
<p style="margin:8px 0 0;font-size:12px;line-height:18px;color:${TEXT_MUTED};">&copy; ${year} ${BRAND_NAME}. All rights reserved.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${BRAND_NAME} — Team invitation`,
    "",
    "Hello,",
    "",
    input.invitedByName
      ? `${input.invitedByName} has invited you to join ${input.organizationName} on ${BRAND_NAME} as a ${role}.`
      : `You have been invited to join ${input.organizationName} on ${BRAND_NAME} as a ${role}.`,
    "",
    `Organization: ${input.organizationName}`,
    `Role: ${role}`,
    `Invitation expires: ${formatExpiry(input.expiresAt)}`,
    "",
    `Accept the invitation: ${input.acceptanceUrl}`,
    "",
    "If you were not expecting this invitation, you can safely ignore this email.",
    "",
    `© ${year} ${BRAND_NAME}`,
  ].join("\n");

  return {
    subject: `Invitation to join ${input.organizationName} on ${BRAND_NAME}`,
    html,
    text,
  };
}

/** The app's logo symbol (two bars and a dot) drawn with table cells, since most email clients block SVG. */
function logoMark(scale = 1) {
  const width = Math.round(36 * scale);
  const bar = Math.round(10 * scale);
  const gap = Math.round(3 * scale);
  const dot = Math.round(10 * scale);
  const dotOffset = Math.round(9 * scale);
  const tile = Math.round(48 * scale);
  const pad = Math.round((tile - width) / 2);
  const cell = (height: number, color: string, cellWidth = width) =>
    `<tr><td height="${height}" width="${cellWidth}" bgcolor="${color}" style="height:${height}px;width:${cellWidth}px;line-height:${height}px;font-size:0;background:${color};border-radius:${Math.round(height / 2)}px;">&nbsp;</td></tr>`;
  const spacer = `<tr><td height="${gap}" style="height:${gap}px;line-height:${gap}px;font-size:0;">&nbsp;</td></tr>`;

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border-radius:${Math.round(10 * scale)}px;"><tr><td style="padding:${pad}px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${width}">
${cell(bar, BRAND_BLUE)}
${spacer}
<tr><td style="padding-left:${dotOffset}px;font-size:0;line-height:0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0">${cell(dot, BRAND_BLUE, dot)}</table></td></tr>
${spacer}
${cell(bar, BRAND_BLUE_SOFT)}
</table>
</td></tr></table>`;
}

function detailRow(label: string, value: string) {
  return `<p style="margin:4px 0;font-size:14px;line-height:21px;color:${TEXT};"><span style="color:${TEXT_MUTED};display:inline-block;min-width:140px;">${label}</span><strong>${value}</strong></p>`;
}

/** "October 28, 2026 at 2:49 PM UTC" instead of a raw ISO timestamp. */
function formatExpiry(expiresAt: string) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return expiresAt;

  return `${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)} at ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date)} UTC`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}
