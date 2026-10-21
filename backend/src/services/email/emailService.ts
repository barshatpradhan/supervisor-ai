import { AppError } from "../../utils/appError.js";
import { buildInvitationEmail } from "./invitationTemplate.js";
import type { OrganizationInvitationEmailInput } from "./types.js";

export interface EmailService {
  sendOrganizationInvitation(input: OrganizationInvitationEmailInput): Promise<void>;
}

class BrevoEmailService implements EmailService {
  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly fromName: string
  ) {}

  async sendOrganizationInvitation(input: OrganizationInvitationEmailInput) {
    try {
      const email = buildInvitationEmail(input);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: { email: this.fromEmail, name: this.fromName },
          to: [{ email: input.to }],
          subject: email.subject,
          htmlContent: email.html,
          textContent: email.text,
        }),
      });

      if (!response.ok) {
        // Brevo explains failures in the body ({ code, message }), e.g. an unverified sender.
        const providerResponse = await readProviderResponse(response, input.to);
        logDelivery("organization_invitation_email_failed", input, {
          provider: "brevo",
          statusCode: response.status,
          providerResponse,
        });
        throw new AppError("Unable to send organization invitation email.", 502, true, {
          cause: new Error(`Brevo responded ${response.status}: ${providerResponse}`),
        });
      }

      logDelivery("organization_invitation_email_sent", input, { provider: "brevo" });
    } catch (error) {
      if (error instanceof AppError) throw error;

      logDelivery("organization_invitation_email_failed", input, { provider: "brevo" });
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

const MAX_PROVIDER_RESPONSE_LENGTH = 500;

/** The provider's error body, trimmed, with the recipient address redacted. Never includes the API key. */
async function readProviderResponse(response: Response, recipient: string) {
  let body: string;
  try {
    body = await response.text();
  } catch {
    return "<unreadable response body>";
  }

  if (!body) return "<empty response body>";
  return body.split(recipient).join("[recipient]").slice(0, MAX_PROVIDER_RESPONSE_LENGTH);
}

export function createEmailService(): EmailService {
  switch (process.env.TRANSACTIONAL_EMAIL_PROVIDER) {
    case "console":
      return new ConsoleEmailService();

    case "brevo": {
      const apiKey = process.env.BREVO_API_KEY;
      const from = process.env.INVITATION_EMAIL_FROM;
      const fromName = process.env.INVITATION_EMAIL_FROM_NAME || "Supervisor AI";

      if (!apiKey || !from) {
        throw new AppError(
          "Transactional email is not configured for organization invitations.",
          503,
          true
        );
      }

      return new BrevoEmailService(apiKey, from, fromName);
    }

    default:
      throw new AppError(
        "Transactional email is not configured for organization invitations.",
        503,
        true
      );
  }
}
