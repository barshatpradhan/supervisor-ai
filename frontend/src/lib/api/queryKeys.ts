export const queryKeys = {
  auth: { currentUser: ['auth', 'current-user'] as const },
  organizations: { all: ['organizations'] as const },
  projects: { all: ['projects'] as const, detail: (projectId: string) => ['projects', projectId] as const },
  tasks: { all: ['tasks'] as const, detail: (taskId: string) => ['tasks', taskId] as const },
  dashboard: { employee: ['dashboard', 'employee'] as const, supervisor: ['dashboard', 'supervisor'] as const },
} as const
