export const queryKeys = {
  auth: { currentUser: ['auth', 'current-user'] as const },
  organizations: { all: ['organizations'] as const },
  team: {
    list: (organizationId: string) => ['team', organizationId] as const,
    teams: (organizationId: string) => ['team', organizationId, 'teams'] as const,
  },
  projects: {
    all: ['projects'] as const,
    list: (organizationId: string) => ['projects', organizationId] as const,
    detail: (organizationId: string, projectId: string) =>
      ['projects', organizationId, projectId] as const,
  },
  documents: {
    list: (organizationId: string, projectId: string) =>
      ['documents', organizationId, projectId] as const,
  },
  recommendations: {
    detail: (organizationId: string, projectId: string) =>
      ['recommendations', organizationId, projectId] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    project: (organizationId: string, projectId: string) =>
      ['tasks', organizationId, projectId] as const,
    detail: (taskId: string) => ['tasks', taskId] as const,
  },
  dashboard: {
    employee: (organizationId: string) => ['dashboard', 'employee', organizationId] as const,
    supervisor: (organizationId: string) => ['dashboard', 'supervisor', organizationId] as const,
  },
  messaging: {
    all: (organizationId: string) => ['messaging', organizationId] as const,
    conversations: (organizationId: string) => ['messaging', organizationId, 'conversations'] as const,
    unread: (organizationId: string) => ['messaging', organizationId, 'unread'] as const,
    members: (organizationId: string) => ['messaging', organizationId, 'members'] as const,
    conversationMembers: (organizationId: string, conversationId: string) =>
      ['messaging', organizationId, 'conversation-members', conversationId] as const,
    taggableTasks: (organizationId: string) => ['messaging', organizationId, 'taggable-tasks'] as const,
    thread: (organizationId: string, conversationId: string) =>
      ['messaging', organizationId, 'thread', conversationId] as const,
    changes: (organizationId: string, conversationId: string) =>
      ['messaging', organizationId, 'changes', conversationId] as const,
  },
} as const
