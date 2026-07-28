import { AppError } from "../../utils/appError.js";

export interface OrganizationInvitationEmailInput {
  to: string;
  organizationName: string;
  invitedRole: "employee" | "supervisor";
  invitedByName?: string;
  acceptanceUrl: string;
  expiresAt: string;
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
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [input.to],
        subject: `You're invited to join ${input.organizationName}`,
        html: [
          `<p>You have been invited to join <strong>${escapeHtml(input.organizationName)}</strong> as a ${escapeHtml(input.invitedRole)}.</p>`,
          input.invitedByName
            ? `<p>Invited by ${escapeHtml(input.invitedByName)}.</p>`
            : "",
          `<p><a href="${escapeHtml(input.acceptanceUrl)}">Create your account or accept this invitation</a></p>`,
          `<p>This invitation expires ${escapeHtml(input.expiresAt)}.</p>`,
        ].join(""),
      }),
    });

    if (!response.ok) {
      throw new AppError("Unable to send organization invitation email.", 502, true);
    }
  }
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
  if (process.env.TRANSACTIONAL_EMAIL_PROVIDER !== "resend") {
    throw new AppError(
      "Transactional email is not configured for organization invitations.",
      503,
      true
    );
  }

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
