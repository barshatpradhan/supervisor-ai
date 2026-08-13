export type BackendUserRole = 'admin' | 'supervisor' | 'employee'
export type BackendOrganizationMembershipRole =
  | 'organization_admin'
  | 'supervisor'
  | 'employee'
export type BackendOrganizationMembershipStatus = 'invited' | 'active' | 'suspended'
export type BackendPlatformRole = 'platform_admin'
export type BackendInvitationPublicStatus = 'pending' | 'expired' | 'revoked' | 'accepted'

export type BackendProjectStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'

export type BackendPriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

export type BackendTaskStatus =
  | 'todo'
  | 'in_progress'
  | 'blocked'
  | 'review'
  | 'completed'
  | 'cancelled'

export type BackendDocumentExtractionStatus = 'pending' | 'extracted' | 'failed'

export type BackendDocumentAnalysisComplexity = 'low' | 'medium' | 'high'

export interface BackendLinkedUser {
  id: string
  auth_user_id: string
  role: BackendUserRole
}

export interface BackendAuthUser {
  id: string
  authUserId: string
  email: string
  platformRole: BackendPlatformRole | null
  legacyRole: BackendUserRole | null
  role: BackendUserRole | null
}

export interface BackendAuthOnboardingState {
  hasActiveOrganization: boolean
  requiresOrganizationCreation: boolean
  hasPendingInvitations: boolean
}

export interface BackendAuthSession {
  user: BackendAuthUser
  onboarding: BackendAuthOnboardingState
  accessToken: string
  refreshToken: string
  expiresAt: number | null
}

export interface BackendAuthUserContext {
  user: BackendAuthUser
  onboarding: BackendAuthOnboardingState
}

export interface LoginRequest {
  email: string
  password: string
}

export type RegisterRequest = LoginRequest

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetConfirmationRequest {
  password: string
}

export interface BackendProvisioningSkillInput {
  name: string
  proficiency_level?: number
  years_of_experience?: number | null
}

export interface SignupRequest extends LoginRequest {
  full_name: string
  bio?: string
  employment_type?: 'full_time' | 'part_time'
  weekly_capacity_hours?: number
  skills?: BackendProvisioningSkillInput[]
}

export interface BackendPublicApprovedSkill {
  id: string
  name: string
  normalizedName: string
  category: string | null
}

export interface BackendAdminUser {
  id: string
  auth_user_id: string
  email: string | null
  role: BackendUserRole
  created_at: string
}

export interface BackendEmployeeSkill {
  id: string
  name: string
  normalizedName: string
  isApproved: boolean
  proficiencyLevel: number
  yearsOfExperience: number | null
  category: string | null
}

export interface BackendApprovedSkill {
  id: string
  name: string
  normalizedName: string
  isApproved: boolean
  createdBy: string | null
  category: string | null
  createdAt: string
}

export interface BackendCreateManagedUserRequest {
  email: string
  role: 'employee' | 'supervisor'
  full_name: string
  bio?: string
  department?: string
  employment_type?: 'full_time' | 'part_time'
  weekly_capacity_hours?: number
  skills?: BackendProvisioningSkillInput[]
}

export interface BackendProvisionedAdminUserResponse {
  user: {
    id: string
    email: string
    role: 'employee' | 'supervisor'
  }
  invitation_sent: boolean
  employee_profile: {
    id: string
    full_name: string
    employment_type: 'full_time' | 'part_time'
    weekly_capacity_hours: number
  } | null
  supervisor_profile: {
    id: string
    full_name: string
    department: string | null
  } | null
}

export interface BackendEmployeeProfile {
  id: string
  full_name: string
  job_title: string | null
  department: string | null
  employment_type: 'full_time' | 'part_time'
  weekly_capacity_hours: number
  availability_percentage: number
  workload_percentage: number
  bio: string | null
  performance_score: number | null
  created_at: string
  users: BackendLinkedUser
  skills: BackendEmployeeSkill[]
}

export interface BackendCreateEmployeeProfileRequest {
  full_name: string
  bio?: string
  employment_type?: 'full_time' | 'part_time'
  weekly_capacity_hours?: number
  skills?: string[]
}

export interface BackendUpdateEmployeeProfileRequest {
  full_name?: string
  job_title?: string | null
  department?: string | null
  bio?: string
  skills?: BackendProvisioningSkillInput[]
}

export interface BackendUpdateEmployeeWorkSettingsRequest {
  employment_type?: 'full_time' | 'part_time'
  weekly_capacity_hours?: number
}

export interface BackendSupervisorProfile {
  id: string
  full_name: string
  department: string | null
  bio: string | null
  created_at: string
  users: BackendLinkedUser
}

export interface BackendCreateSupervisorProfileRequest {
  full_name: string
  department?: string
  bio?: string
}

export interface BackendUpdateSupervisorProfileRequest {
  full_name?: string
  department?: string | null
  bio?: string | null
}

export interface BackendAssignableEmployeeSkill {
  name: string
  proficiency_level: number
  years_of_experience: number | null
}

export interface BackendAssignableEmployee {
  id: string
  full_name: string
  employment_type: 'full_time' | 'part_time'
  availability_percentage: number
  workload_percentage: number
  weekly_capacity_hours: number
  performance_score: number | null
  skills: BackendAssignableEmployeeSkill[]
}

export interface BackendSupervisorEmployeeDirectoryQuery {
  search?: string
  skill?: string
  availability_min?: number
  employment_type?: 'full_time' | 'part_time'
}

export interface BackendProject {
  id: string
  title: string
  description: string | null
  status: BackendProjectStatus
  priority: BackendPriorityLevel
  required_skills: string[]
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface BackendCreateProjectRequest {
  title: string
  description?: string
  status?: BackendProjectStatus
  priority?: BackendPriorityLevel
  requiredSkills?: string[]
}

export interface BackendUpdateProjectRequest {
  title?: string
  description?: string
  status?: BackendProjectStatus
  priority?: BackendPriorityLevel
  requiredSkills?: string[]
}

export interface BackendTask {
  id: string
  project_id: string
  title: string
  description: string | null
  status: BackendTaskStatus
  priority: BackendPriorityLevel
  estimated_hours: number
  assigned_employee_id: string | null
  created_by_user_id: string
  assigned_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface BackendTaskProgress {
  id: string
  task_id: string
  employee_id: string
  progress_percentage: number
  status: BackendTaskStatus | null
  notes: string | null
  created_at: string
}

export interface BackendCreateTaskRequest {
  projectId: string
  title: string
  description?: string
  status?: BackendTaskStatus
  priority?: BackendPriorityLevel
  estimatedHours?: number
  assignedEmployeeId?: string
}

export interface BackendAssignTaskRequest {
  employeeId?: string
}

export interface BackendCreateTaskProgressRequest {
  progressPercentage: number
  status?: BackendTaskStatus
  notes?: string
}

export interface BackendProjectDocument {
  id: string
  project_id: string
  original_filename: string
  mime_type: string
  size_bytes: number
  extraction_status: BackendDocumentExtractionStatus
  extraction_error: string | null
  extracted_text: string | null
  created_at: string
  updated_at: string
}

export interface BackendProjectDocumentAnalysis {
  id: string
  required_skills: string[]
  preferred_skills: string[]
  complexity: BackendDocumentAnalysisComplexity
  estimated_hours: number
  summary: string
  suggested_roles: string[]
  risks: string[]
  provider: string
  model: string | null
  created_at: string
}

export interface BackendProjectDocumentWithAnalysis {
  document: BackendProjectDocument
  analysis: BackendProjectDocumentAnalysis | null
}

export interface BackendProjectDocumentUploadResponse {
  document: BackendProjectDocument
  analysis: BackendProjectDocumentAnalysis | null
}

export interface BackendRecommendationScoreBreakdown {
  skillMatch: number
  availability: number
  performance: number
  workload: number
  requiredSkillMatch?: number
  preferredSkillMatch?: number
  proficiency?: number
  experience?: number
  workloadPercentage?: number
  availabilityPercentage?: number
  performanceScore?: number | null
  estimatedProjectHours?: number
  weeklyCapacityHours?: number
  suitability?: 'strong' | 'moderate' | 'weak'
  reasons?: string[]
  matchedRequiredSkills?: string[]
  matchedPreferredSkills?: string[]
  missingRequiredSkills?: string[]
  missingPreferredSkills?: string[]
}

export interface BackendRecommendation {
  employeeId: string
  fullName: string
  score: number
  employeeName: string
  rank: number
  matchScore: number
  confidenceScore: number
  matchedRequiredSkills: string[]
  matchedPreferredSkills: string[]
  missingRequiredSkills: string[]
  missingPreferredSkills: string[]
  workloadPercentage: number
  availabilityPercentage: number
  performanceScore: number | null
  estimatedProjectHours: number
  weeklyCapacityHours: number
  suitability: 'strong' | 'moderate' | 'weak'
  reasons: string[]
  matchedSkills: string[]
  missingSkills: string[]
  scoreBreakdown: BackendRecommendationScoreBreakdown
  summary: string
}

export interface BackendRecommendationResponse {
  projectId: string
  analysisId: string | null
  recommendationRunId: string
  recommendations: BackendRecommendation[]
}

export interface BackendRecommendationAssignmentResponse {
  recommendationRunId: string
  employeeId: string
  task: BackendTask
}

export interface BackendDocumentAnalysisRequest {
  text: string
  fileName: string
  mimeType: string
}

export interface BackendDashboardProjectSummaryItem {
  id: string
  title: string
  status: BackendProjectStatus
  priority: BackendPriorityLevel
  updated_at: string
}

export interface BackendDashboardTaskSummaryItem {
  id: string
  project_id: string
  project_title: string
  title: string
  status: BackendTaskStatus
  priority: BackendPriorityLevel
  assigned_employee_id: string | null
  updated_at: string
}

export interface BackendDashboardEmployeeWorkloadRecord {
  id: string
  full_name: string
  employment_type: 'full_time' | 'part_time'
  weekly_capacity_hours: number
  workload_percentage: number
  availability_percentage: number
  performance_score: number | null
}

export interface BackendDashboardAnalyzedProject {
  project_id: string
  title: string
  status: BackendProjectStatus
  priority: BackendPriorityLevel
  document_id: string
  analysis_id: string
  analyzed_at: string
}

export interface BackendDashboardRecommendationTopCandidate {
  employee_id: string
  employee_name: string
  rank: number
  match_score: number
  confidence_score: number
  summary: string
}

export interface BackendDashboardRecommendationRunSummary {
  project_id: string
  project_title: string
  analysis_id: string | null
  recommendation_run_id: string
  created_at: string
  top_candidate: BackendDashboardRecommendationTopCandidate | null
}

export interface BackendDashboardProjectProgressSummary {
  project_id: string
  title: string
  status: BackendProjectStatus
  priority: BackendPriorityLevel
  total_task_count: number
  completed_task_count: number
  progress_percentage: number
  updated_at: string
}

export interface BackendSupervisorDashboardProjectsSummary {
  total_projects: number
  active_projects: number
  completed_projects: number
  by_status: Record<BackendProjectStatus, number>
  by_priority: Record<BackendPriorityLevel, number>
  recently_updated_projects: BackendDashboardProjectSummaryItem[]
}

export interface BackendSupervisorDashboardTasksSummary {
  total_tasks: number
  unassigned_tasks: number
  assigned_tasks: number
  in_progress_tasks: number
  blocked_tasks: number
  completed_tasks: number
  by_status: Record<BackendTaskStatus, number>
  recent_tasks: BackendDashboardTaskSummaryItem[]
}

export interface BackendSupervisorDashboardEmployeesSummary {
  total_employees: number
  available_employees: number
  high_workload_employees: number
  average_workload: number
  average_availability: number
  top_workloads: BackendDashboardEmployeeWorkloadRecord[]
}

export interface BackendSupervisorDashboardDocumentsSummary {
  total_uploaded_documents: number
  by_extraction_status: Record<BackendDocumentExtractionStatus, number>
  projects_with_completed_analysis: number
  recent_analyzed_projects: BackendDashboardAnalyzedProject[]
}

export interface BackendSupervisorDashboardRecommendationsSummary {
  projects_with_recommendation_runs: number
  latest_recommendation_run: BackendDashboardRecommendationRunSummary | null
  latest_top_ranked_candidate: BackendDashboardRecommendationTopCandidate | null
  recent_recommendation_runs: BackendDashboardRecommendationRunSummary[]
}

export interface BackendSupervisorDashboardResponse {
  projects: BackendSupervisorDashboardProjectsSummary
  tasks: BackendSupervisorDashboardTasksSummary
  employees: BackendSupervisorDashboardEmployeesSummary
  documents: BackendSupervisorDashboardDocumentsSummary
  recommendations: BackendSupervisorDashboardRecommendationsSummary
  projectProgress: BackendDashboardProjectProgressSummary[]
}

export interface BackendEmployeeDashboardWorkSummary {
  assigned_tasks: number
  in_progress_tasks: number
  blocked_tasks: number
  completed_tasks: number
  workload_percentage: number
  availability_percentage: number
  weekly_capacity_hours: number
}

export interface BackendEmployeeDashboardAssignment {
  task_id: string
  title: string
  description: string | null
  project_id: string
  project_title: string
  priority: BackendPriorityLevel
  status: BackendTaskStatus
  estimated_hours: number
  assigned_at: string | null
  current_progress_percentage: number
  latest_progress_status: BackendTaskStatus | null
  latest_progress_notes: string | null
  last_progress_at: string | null
}

export interface BackendEmployeeDashboardRecentProgressItem {
  progress_id: string
  task_id: string
  task_title: string
  project_id: string
  project_title: string
  progress_percentage: number
  status: BackendTaskStatus | null
  notes: string | null
  created_at: string
}

export interface BackendEmployeeDashboardProfileSummary {
  employee_id: string
  full_name: string
  bio: string | null
  employment_type: 'full_time' | 'part_time'
  weekly_capacity_hours: number
  workload_percentage: number
  availability_percentage: number
  performance_score: number | null
  approved_skills: string[]
  pending_skills: string[]
}

export interface BackendEmployeeDashboardAttentionSummary {
  blocked_tasks: BackendEmployeeDashboardAssignment[]
  unstarted_assigned_tasks: BackendEmployeeDashboardAssignment[]
  tasks_requiring_progress_update: BackendEmployeeDashboardAssignment[]
}

export interface BackendEmployeeDashboardResponse {
  workSummary: BackendEmployeeDashboardWorkSummary
  currentAssignments: BackendEmployeeDashboardAssignment[]
  recentProgress: BackendEmployeeDashboardRecentProgressItem[]
  profile: BackendEmployeeDashboardProfileSummary
  attention: BackendEmployeeDashboardAttentionSummary
}

export interface BackendCurrentUserOrganizationMembershipSummary {
  id: string
  role: BackendOrganizationMembershipRole
  status: BackendOrganizationMembershipStatus
  invited_at: string | null
  joined_at: string | null
  created_at: string
}

export interface BackendCurrentUserOrganizationSummary {
  id: string
  name: string
  slug: string
}

export interface BackendCurrentUserOrganizationInvitationSummary {
  id: string
  expires_at: string
}

export interface BackendCurrentUserOrganizationListItem {
  membership: BackendCurrentUserOrganizationMembershipSummary
  organization: BackendCurrentUserOrganizationSummary
  invitation: BackendCurrentUserOrganizationInvitationSummary | null
}

export interface BackendCreateOrganizationRequest {
  name: string
  slug: string
}

export interface BackendOrganizationCreationResponse {
  membership: {
    id: string
    organization_id: string
    user_id: string
    role: BackendOrganizationMembershipRole
    status: BackendOrganizationMembershipStatus
    invited_at: string | null
    invited_by_user_id: string | null
    joined_at: string | null
    created_at: string
  }
  organization: {
    id: string
    name: string
    slug: string
    created_at: string
    created_by_user_id: string
    updated_at: string
  }
}

export interface BackendInvitationInspectionResponse {
  organization: {
    id: string
    name: string
    slug: string
  }
  invited_email_masked: string
  invited_email: string
  role: Extract<BackendOrganizationMembershipRole, 'employee' | 'supervisor'>
  profile: {
    full_name: string | null
    job_title: string | null
    department: string | null
    employment_type: 'full_time' | 'part_time' | null
    weekly_capacity_hours: number | null
  }
  expires_at: string
  status: BackendInvitationPublicStatus
  account_exists: boolean
  authentication_required: boolean
  current_user_email_matches: boolean | null
}

export interface BackendInvitationAcceptanceResponse {
  organization: {
    id: string
    name: string
    slug: string
    created_at: string
    created_by_user_id: string
    updated_at: string
  }
  membership: {
    id: string
    organization_id: string
    user_id: string
    role: BackendOrganizationMembershipRole
    status: BackendOrganizationMembershipStatus
    invited_at: string | null
    invited_by_user_id: string | null
    joined_at: string | null
    created_at: string
  }
  profileCreated: boolean
}

export interface BackendOrganizationInvitationSummary {
  invitation_id: string
  membership_id: string | null
  email: string
  role: Extract<BackendOrganizationMembershipRole, 'employee' | 'supervisor'>
  invited_at: string
  last_sent_at: string | null
  send_count: number
  expires_at: string
  accepted_by_user_id: string | null
  accepted_at: string | null
  revoked_by_user_id: string | null
  revoked_at: string | null
  membership_status: BackendOrganizationMembershipStatus
}

export interface BackendOrganizationInvitationMutationResponse {
  invitation: {
    id: string
    organization_id: string
    user_id: string | null
    membership_id: string | null
    email: string
    role: Extract<BackendOrganizationMembershipRole, 'employee' | 'supervisor'>
    profile: Record<string, unknown>
    invited_by_user_id: string
    invited_at: string
    last_sent_at: string | null
    send_count: number
    expires_at: string
    accepted_by_user_id: string | null
    accepted_at: string | null
    revoked_by_user_id: string | null
    revoked_at: string | null
    created_at: string
  }
  membership: {
    id: string
    organization_id: string
    user_id: string
    role: BackendOrganizationMembershipRole
    status: BackendOrganizationMembershipStatus
    invited_at: string | null
    invited_by_user_id: string | null
    joined_at: string | null
    created_at: string
  } | null
}

export interface BackendCreateOrganizationInvitationRequest {
  email: string
  role: Extract<BackendOrganizationMembershipRole, 'employee' | 'supervisor'>
  profile:
    | {
        full_name: string
        job_title?: string
        department?: string
        bio?: string
        employment_type?: 'full_time' | 'part_time'
        weekly_capacity_hours?: number
      }
    | {
        full_name: string
        bio?: string
        department?: string
      }
}
