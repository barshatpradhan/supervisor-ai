export function shouldReturnInvitationDebugUrl(
  environment: NodeJS.ProcessEnv = process.env
) {
  return environment.NODE_ENV !== "production" && environment.INVITATION_DEBUG_RETURN_URL === "true";
}
