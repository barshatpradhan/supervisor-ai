const uuidPath = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", format: "uuid" },
});

const conversationId = uuidPath("conversationId", "Conversation id");
const messageId = uuidPath("messageId", "Message id");

const ok = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Success" } } },
});

const notFound = { description: "Conversation, message or task not found, or not visible to the caller (other organizations always get 404)" };
const conflict = { description: "Read-only conversation, deleted message, or the request does not apply" };
const tooMany = { description: "Per-user rate limit reached" };
const badRequest = { description: "Validation error" };

const body = (schema: Record<string, unknown>, example?: Record<string, unknown>) => ({
  required: true,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});

export const messagingSchemas = {
  SendMessage: {
    type: "object",
    required: ["body"],
    properties: {
      body: { type: "string", minLength: 1, maxLength: 4000, description: "Plain text. Mention a member with <@user-uuid>." },
      clientId: { type: "string", format: "uuid", description: "Client-generated id; a retry with the same id returns the original message." },
      taskId: { type: "string", format: "uuid", description: "Tag a task the sender can access. In a project channel it must belong to that project." },
    },
  },
  TaskChip: {
    oneOf: [
      {
        type: "object",
        required: ["accessible", "taskId", "title", "status", "progressPercent", "assignee"],
        properties: {
          accessible: { const: true },
          taskId: { type: "string", format: "uuid" },
          title: { type: "string" },
          status: { type: "string" },
          progressPercent: { type: "integer", minimum: 0, maximum: 100 },
          assignee: { type: ["object", "null"] },
        },
      },
      {
        type: "object",
        required: ["accessible"],
        properties: { accessible: { const: false } },
        description: "The viewer can't access the task, or it was deleted. No task data is included.",
      },
    ],
  },
} as const;

export const messagingPaths = {
  "/messaging/conversations": {
    get: {
      tags: ["Messaging"],
      summary: "List the caller's conversations with unread counts and a last-message preview",
      description:
        "General for every member; every live project channel for organization admins and supervisors; for employees, " +
        "the channels of projects where they have at least one live task (messages from their earliest current assignment onward); " +
        "the caller's own direct messages.",
      responses: { "200": ok("Conversations") },
    },
  },
  "/messaging/unread-summary": {
    get: {
      tags: ["Messaging"],
      summary: "Unread and unread-mention totals (polled for the navigation badge)",
      responses: { "200": ok("Unread summary"), "429": tooMany },
    },
  },
  "/messaging/members": {
    get: { tags: ["Messaging"], summary: "Active organization members, for direct messages and @mentions", responses: { "200": ok("Members") } },
  },
  "/messaging/conversations/direct": {
    post: {
      tags: ["Messaging"],
      summary: "Open the direct conversation with another active member, creating it once",
      requestBody: body({ type: "object", required: ["userId"], properties: { userId: { type: "string", format: "uuid" } } }),
      responses: { "200": ok("Direct conversation"), "400": badRequest, "404": { description: "Not an active member of this organization" } },
    },
  },
  "/messaging/conversations/{conversationId}/members": {
    get: {
      tags: ["Messaging"],
      summary: "People who can open this conversation right now, for @mention autocomplete",
      description:
        "Each entry has only userId, name, role and isProjectCreator; no email addresses. A project channel lists active " +
        "organization admins and supervisors plus employees with a live task in the project.",
      parameters: [conversationId],
      responses: { "200": ok("Conversation members"), "404": notFound },
    },
  },
  "/messaging/conversations/{conversationId}/messages": {
    get: {
      tags: ["Messaging"],
      summary: "Page messages newest first, or poll for changes",
      description:
        "Without updatedSince: a page of messages, newest first; pass nextCursor as cursor for older ones. " +
        "With updatedSince: messages created or changed since then (edits, deletes, reactions), oldest change first; pass syncedAt back on the next poll. " +
        "Employees in a project channel get messages from their access date onward, plus earlier messages that tag a task now assigned to them; " +
        "those carry shownForTask: true and are returned whole (text, sender, mentions, reactions, task chip).",
      parameters: [
        conversationId,
        { name: "cursor", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 30 } },
        { name: "updatedSince", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: { "200": ok("Messages"), "400": badRequest, "404": notFound, "429": tooMany },
    },
    post: {
      tags: ["Messaging"],
      summary: "Send a message (30 per minute per user)",
      parameters: [conversationId],
      requestBody: body({ $ref: "#/components/schemas/SendMessage" }, { body: "Can you check <@0f8fad5b-d9cb-469f-a165-70867728950e>?", clientId: "6f1c1b2e-6a3b-4b8e-9b51-3f1f6f0c2a11" }),
      responses: { "201": ok("Message sent"), "400": badRequest, "404": notFound, "409": conflict, "429": tooMany },
    },
  },
  "/messaging/conversations/{conversationId}/messages/{messageId}": {
    patch: {
      tags: ["Messaging"],
      summary: "Edit your own message",
      parameters: [conversationId, messageId],
      requestBody: body({ type: "object", required: ["body"], properties: { body: { type: "string", maxLength: 4000 } } }),
      responses: { "200": ok("Message updated"), "400": badRequest, "403": { description: "Not your message" }, "404": notFound, "409": conflict },
    },
    delete: {
      tags: ["Messaging"],
      summary: "Delete your own message; its text, mentions, reactions and task tag are removed",
      parameters: [conversationId, messageId],
      responses: { "200": ok("Message deleted"), "403": { description: "Not your message" }, "404": notFound },
    },
  },
  "/messaging/conversations/{conversationId}/messages/{messageId}/reactions": {
    post: {
      tags: ["Messaging"],
      summary: "React with one of the curated emoji",
      parameters: [conversationId, messageId],
      requestBody: body({ type: "object", required: ["emoji"], properties: { emoji: { type: "string" } } }, { emoji: "👍" }),
      responses: { "200": ok("Reaction added"), "400": badRequest, "404": notFound, "409": conflict },
    },
  },
  "/messaging/conversations/{conversationId}/messages/{messageId}/reactions/{emoji}": {
    delete: {
      tags: ["Messaging"],
      summary: "Remove your reaction",
      parameters: [conversationId, messageId, { name: "emoji", in: "path", required: true, schema: { type: "string" }, description: "URL-encoded emoji" }],
      responses: { "200": ok("Reaction removed"), "404": notFound, "409": conflict },
    },
  },
  "/messaging/conversations/{conversationId}/read": {
    post: {
      tags: ["Messaging"],
      summary: "Mark the conversation as read up to a message (or now); never moves backwards",
      parameters: [conversationId],
      requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { messageId: { type: "string", format: "uuid" } } } } } },
      responses: { "200": ok("Marked as read"), "404": notFound },
    },
  },
  "/messaging/progress-requests": {
    post: {
      tags: ["Messaging"],
      summary: "Ask a task's assignee for a progress update",
      description: "Posts a progress request, tagged to the task and mentioning the assignee, in the caller's direct conversation with the assignee. Never changes the task.",
      requestBody: body({ type: "object", required: ["taskId"], properties: { taskId: { type: "string", format: "uuid" } } }),
      responses: { "201": ok("Progress request sent"), "404": notFound, "409": conflict, "429": tooMany },
    },
  },
} as const;
