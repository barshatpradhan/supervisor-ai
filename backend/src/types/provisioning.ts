import type { AuthSessionResponse, UserRole } from "./auth.js";

export interface ProvisioningSkillInput {
  name: string;
  proficiency_level?: number;
  years_of_experience?: number | null;
}

export interface PublicEmployeeSignupInput {
  email: string;
  password: string;
  full_name: string;
  bio?: string;
  employment_type?: "full_time" | "part_time";
  weekly_capacity_hours?: number;
  skills?: ProvisioningSkillInput[];
}

export interface AdminProvisionUserInput {
  email: string;
  role: Extract<UserRole, "employee" | "supervisor">;
  full_name: string;
  bio?: string;
  department?: string;
  employment_type?: "full_time" | "part_time";
  weekly_capacity_hours?: number;
  skills?: ProvisioningSkillInput[];
}

export interface ProvisionedAdminUserResponse {
  user: {
    id: string;
    email: string;
    role: Extract<UserRole, "employee" | "supervisor">;
  };
  invitation_sent: boolean;
  employee_profile:
    | {
        id: string;
        full_name: string;
        employment_type: "full_time" | "part_time";
        weekly_capacity_hours: number;
      }
    | null;
  supervisor_profile:
    | {
        id: string;
        full_name: string;
        department: string | null;
      }
    | null;
}

export interface PublicEmployeeSignupResult extends AuthSessionResponse {}
