import { AppError } from "../../utils/appError.js";

export interface OrganizationInvitationEmailInput {
  to: string;
  organizationName: string;
  invitedRole: "employee" | "supervisor";
  invitedByName?: string;
  acceptanceUrl: string;
  expiresAt: string;
  invitationId?: string;
  organizationId?: string;
}

export interface EmailService {
  sendOrganizationInvitation(input: OrganizationInvitationEmailInput): Promise<void>;
}

class ResendEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async sendOrganizationInvitation(input: OrganizationInvitationEmailInput) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.from,
          to: [input.to],
          subject: `You've been invited to join ${input.organizationName}`,
          html: [
            `<p><strong>You've been invited to join ${escapeHtml(input.organizationName)}</strong></p>`,
            input.invitedByName
              ? `<p>${escapeHtml(input.invitedByName)} has invited you to join ${escapeHtml(input.organizationName)} as a ${escapeHtml(input.invitedRole)}.</p>`
              : `<p>You have been invited to join ${escapeHtml(input.organizationName)} as a ${escapeHtml(input.invitedRole)}.</p>`,
            `<p><a href="${escapeHtml(input.acceptanceUrl)}">Accept Invitation</a></p>`,
            `<p>This invitation expires on ${escapeHtml(input.expiresAt)}.</p>`,
            "<p>If you weren't expecting this invitation, you can ignore this email.</p>",
          ].join(""),
        }),
      });

      if (!response.ok) {
        logDelivery("organization_invitation_email_failed", input, { provider: "resend", statusCode: response.status });
        throw new AppError("Unable to send organization invitation email.", 502, true);
      }

      logDelivery("organization_invitation_email_sent", input, { provider: "resend" });
    } catch (error) {
      if (error instanceof AppError) throw error;

      logDelivery("organization_invitation_email_failed", input, { provider: "resend" });
      throw new AppError("Unable to send organization invitation email.", 502, true, { cause: error });
    }
  }
}

class ConsoleEmailService implements EmailService {
  async sendOrganizationInvitation(input: OrganizationInvitationEmailInput) {
    logDelivery("organization_invitation_email_sent", input, { provider: "console" });
  }
}

function recipientDomain(address: string) {
  return address.split("@")[1]?.toLowerCase() || "invalid";
}

function logDelivery(event: string, input: OrganizationInvitationEmailInput, fields: Record<string, unknown>) {
  console.info(JSON.stringify({
    scope: "transactional_email",
    event,
    invitationId: input.invitationId,
    organizationId: input.organizationId,
    recipientDomain: recipientDomain(input.to),
    ...fields,
  }));
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

export function createEmailService(): EmailService {
  switch (process.env.TRANSACTIONAL_EMAIL_PROVIDER) {
    case "console":
      return new ConsoleEmailService();

    case "resend": {
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.INVITATION_EMAIL_FROM;

      if (!apiKey || !from) {
        throw new AppError(
          "Transactional email is not configured for organization invitations.",
          503,
          true
        );
      }

      return new ResendEmailService(apiKey, from);
    }

    default:
      throw new AppError(
        "Transactional email is not configured for organization invitations.",
        503,
        true
      );
  }
}
