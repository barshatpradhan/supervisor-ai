import { AppError } from "../../utils/appError.js";

export function buildOrganizationInvitationAcceptanceUrl(token: string) {
  const frontendAppUrl = process.env.FRONTEND_APP_URL?.trim();

  if (!frontendAppUrl) {
    throw new AppError("Invitation delivery is not configured.", 500);
  }

  let url: URL;
  try {
    url = new URL(frontendAppUrl);
  } catch {
    throw new AppError("Invitation delivery is not configured.", 500);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("Invitation delivery is not configured.", 500);
  }

  return `${url.toString().replace(/\/$/, "")}/invitations/accept?token=${encodeURIComponent(token)}`;
}
