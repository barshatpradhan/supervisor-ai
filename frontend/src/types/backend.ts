export type BackendUserRole = 'admin' | 'supervisor' | 'employee'

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
  role: BackendUserRole
}

export interface BackendAuthSession {
  user: BackendAuthUser
  accessToken: string
  refreshToken: string
  expiresAt: number | null
}

export interface LoginRequest {
  email: string
  password: string
}

export type SignupRequest = LoginRequest

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

export interface BackendEmployeeProfile {
  id: string
  full_name: string
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
  bio?: string
  skills?: string[]
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
  storage_bucket: string
  storage_path: string
  original_filename: string
  mime_type: string
  size_bytes: number
  extraction_status: BackendDocumentExtractionStatus
  created_at: string
  updated_at: string
}

export interface BackendProjectDocumentAnalysis {
  id: string
  document_id: string
  project_id: string
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

export interface BackendProjectDocumentUploadResponse {
  document: BackendProjectDocument
  analysis: BackendProjectDocumentAnalysis
}

export interface BackendRecommendationScoreBreakdown {
  skillMatch: number
  availability: number
  performance: number
  workload: number
}

export interface BackendRecommendation {
  employeeId: string
  employeeName: string
  rank: number
  matchScore: number
  confidenceScore: number
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

export interface BackendDocumentAnalysisRequest {
  text: string
  fileName: string
  mimeType: string
}
