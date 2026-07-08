export type EmploymentType = "full_time" | "part_time";

export interface AssignableEmployeeSkill {
  name: string;
  proficiency_level: number;
  years_of_experience: number | null;
}

export interface AssignableEmployeeDirectoryEntry {
  id: string;
  full_name: string;
  employment_type: EmploymentType;
  availability_percentage: number;
  workload_percentage: number;
  weekly_capacity_hours: number;
  performance_score: number | null;
  skills: AssignableEmployeeSkill[];
}

export interface SupervisorEmployeeDirectoryQuery {
  search?: string;
  skill?: string;
  availability_min?: number;
  employment_type?: EmploymentType;
}
