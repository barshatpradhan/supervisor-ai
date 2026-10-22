/** What a skill input should do and say after the backend has checked it. */
export interface SkillCheckOutcome {
  /** False when the input is not a skill; nothing should be added. */
  accepted: boolean
  /** The name to add: the catalog name, the AI-corrected name, or the input. */
  name: string
  isApproved: boolean
  category: string | null
  skillId: string | null
  /** Shown under the input; empty when the input was already exactly right. */
  message: string
  tone: 'info' | 'warning' | 'error'
}
