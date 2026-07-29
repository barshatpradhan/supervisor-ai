export const queryKeys = {
  auth: { currentUser: ['auth', 'current-user'] as const },
  organizations: { all: ['organizations'] as const },
  projects: {
    all: ['projects'] as const,
    list: (organizationId: string) => ['projects', organizationId] as const,
    detail: (projectId: string) => ['projects', projectId] as const,
  },
  tasks: { all: ['tasks'] as const, detail: (taskId: string) => ['tasks', taskId] as const },
  dashboard: {
    employee: (organizationId: string) => ['dashboard', 'employee', organizationId] as const,
    supervisor: (organizationId: string) => ['dashboard', 'supervisor', organizationId] as const,
  },
} as const
