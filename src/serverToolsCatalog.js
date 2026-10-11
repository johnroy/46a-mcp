// 100% claude (with review)

import { z } from 'zod'

// Declarative catalog of 46a REST endpoints, built from
// /Users/jroy/.claude/skills/46a-api/api_kb/api.yaml (source of truth).
// params: path-template fields fill the path; leftovers go to the query
// string for GET/DELETE, JSON body otherwise.
// raw: true — response is plain/chunked text, not the JSON envelope;
// the dispatcher accumulates it to completion and returns the full text
// (true SSE streaming can't map to MCP text content).
export const catalog = {
    'ping': {
        method: 'GET',
        path: '/v1/ping',
        description: 'Health check (no auth)',
        params: z.object({}).strict(),
    },
    'login': {
        method: 'POST',
        path: '/v1/login',
        description: 'Authenticate and get JWT (email field accepts email or username); returns data incl. token',
        params: z.object({ email: z.string(), password: z.string() }).strict(),
        auth: false,
    },
    'extensions': {
        method: 'GET',
        path: '/v1/extensions',
        description: 'Get extensions data (no auth)',
        params: z.object({}).strict(),
    },
    'proxy': {
        method: 'GET',
        path: '/v1/proxy',
        description: 'Proxy a request through the server; returns raw (non-envelope) content',
        params: z.object({}).passthrough(),
        raw: true,
    },
    'users.create': {
        method: 'POST',
        path: '/v1/users',
        description: 'Create user account (signup, no auth)',
        params: z.object({
            username: z.string(),
            email: z.string(),
            password: z.string(),
            firstName: z.string(),
            lastName: z.string(),
        }).strict(),
        auth: false,
    },
    'users.search': {
        method: 'GET',
        path: '/v1/users/search',
        description: 'Search users (filters plus sort/select/offset/limit)',
        params: z.object({
            sort: z.string().optional(),
            select: z.string().optional(),
            offset: z.number().optional(),
            limit: z.number().optional(),
        }).passthrough(),
    },
    'users.update': {
        method: 'PUT',
        path: '/v1/users/:id',
        description: 'Update user profile',
        params: z.object({ id: z.string(), firstName: z.string(), lastName: z.string() }).strict(),
    },
    'users.updateApiKeys': {
        method: 'PUT',
        path: '/v1/users/:id/apikeys',
        description: 'Update user API keys',
        params: z.object({ id: z.string(), apiKeys: z.string() }).strict(),
    },
    'users.updatePassword': {
        method: 'PUT',
        path: '/v1/users/password',
        description: 'Update password (authenticated, or token-based reset)',
        params: z.object({ newPassword: z.string(), token: z.string().optional() }).strict(),
    },
    'users.forgot': {
        method: 'POST',
        path: '/v1/users/forgot',
        description: 'Send password reset email (locator = email or username, no auth)',
        params: z.object({ locator: z.string() }).strict(),
        auth: false,
    },
    'subscription.create': {
        method: 'POST',
        path: '/v1/users/:userId/subscription',
        description: 'Create or update subscription',
        params: z.object({ userId: z.string() }).passthrough(),
    },
    'subscription.billing': {
        method: 'GET',
        path: '/v1/users/:userId/subscription/billing',
        description: 'Get billing information',
        params: z.object({ userId: z.string() }).strict(),
    },
    'subscription.preview': {
        method: 'POST',
        path: '/v1/users/:userId/subscription/preview',
        description: 'Preview subscription changes',
        params: z.object({ userId: z.string() }).passthrough(),
    },
    'subscription.cancel': {
        method: 'POST',
        path: '/v1/users/:userId/subscription/cancel',
        description: 'Cancel subscription',
        params: z.object({ userId: z.string() }).strict(),
    },
    'projects.create': {
        method: 'POST',
        path: '/v1/projects/:modifier',
        description: 'Create project (modifier "new" or "create"; body: title, pages[])',
        params: z.object({
            modifier: z.enum(['new', 'create']),
            title: z.string(),
            pages: z.array(z.any()),
        }).passthrough(),
    },
    'projects.mine': {
        method: 'GET',
        path: '/v1/projects/mine',
        description: "List authenticated user's projects",
        params: z.object({}).strict(),
    },
    'projects.search': {
        method: 'GET',
        path: '/v1/projects/search',
        description: "Search projects (public + user's own)",
        params: z.object({}).passthrough(),
    },
    'projects.relocate': {
        method: 'POST',
        path: '/v1/projects/relocate/:oldLocator',
        description: 'Swap project locator (superuser only)',
        params: z.object({ oldLocator: z.string(), newLocator: z.string() }).strict(),
    },
    'projects.patch': {
        method: 'PATCH',
        path: '/v1/projects/:id',
        description: 'Update project metadata',
        params: z.object({ id: z.string() }).passthrough(),
    },
    'projects.delete': {
        method: 'DELETE',
        path: '/v1/projects/:id',
        description: 'Delete project (destructive)',
        params: z.object({ id: z.string() }).strict(),
    },
    'projects.access': {
        method: 'GET',
        path: '/v1/projects/:locatorOrId/access',
        description: 'Open project access for user (no auth required)',
        params: z.object({ locatorOrId: z.string() }).strict(),
        auth: false,
    },
    'projects.sync': {
        method: 'GET',
        path: '/v1/projects/:id/sync',
        description: 'Sync full project data',
        params: z.object({ id: z.string() }).strict(),
    },
    'projects.publish': {
        method: 'POST',
        path: '/v1/projects/:id/publish',
        description: 'Publish project',
        params: z.object({ id: z.string() }).passthrough(),
    },
    'projects.cover': {
        method: 'POST',
        path: '/v1/projects/:id/cover',
        description: 'Set project cover image',
        params: z.object({ id: z.string() }).passthrough(),
    },
    'projects.getUrls': {
        method: 'POST',
        path: '/v1/projects/:id/get_urls',
        description: 'Get URLs from project',
        params: z.object({ id: z.string() }).passthrough(),
    },
    'projects.importUrls': {
        method: 'POST',
        path: '/v1/projects/import_urls',
        description: 'Import URLs (body: urlMap, assetGroupId)',
        params: z.object({ urlMap: z.any(), assetGroupId: z.string().optional() }).strict(),
    },
    'projects.rating': {
        method: 'POST',
        path: '/v1/projects/:id/rating',
        description: 'Set project rating 0-5 (superuser only)',
        params: z.object({ id: z.string(), rating: z.number() }).strict(),
    },
    'ai.messages': {
        method: 'GET',
        path: '/v1/ai/messages/:id?',
        description: 'Get AI message history (optional thread id)',
        params: z.object({ id: z.string().optional() }).strict(),
    },
    'ai.postMessage': {
        method: 'POST',
        path: '/v1/ai/messages',
        description: 'Send message to AI',
        params: z.object({
            flavor: z.string().optional(),
            remoteThreadId: z.string().optional(),
            runId: z.string().optional(),
            lastMessageId: z.string().optional(),
            content: z.string().optional(),
            md: z.record(z.any()).optional(),
        }).strict(),
    },
    'ai.abort': {
        method: 'POST',
        path: '/v1/ai/messages/abort',
        description: 'Abort ongoing AI run',
        params: z.object({
            remoteThreadId: z.string().optional(),
            runId: z.string().optional(),
            md: z.record(z.any()).optional(),
        }).strict(),
    },
    'ai.chat': {
        method: 'POST',
        path: '/v1/ai/chat',
        description: 'Send chat message; with stream:true the chunked response is accumulated and returned as full text',
        params: z.object({
            flavor: z.string().optional(),
            remoteThreadId: z.string().optional(),
            stream: z.boolean().optional(),
            messages: z.array(z.any()).optional(),
            md: z.record(z.any()).optional(),
        }).strict(),
    },
    'ai.image': {
        method: 'POST',
        path: '/v1/ai/image',
        description: 'Create image via AI',
        params: z.object({
            parameters: z.record(z.any()).optional(),
            md: z.record(z.any()).optional(),
        }).strict(),
    },
    'ai.vote': {
        method: 'POST',
        path: '/v1/ai/vote',
        description: 'Vote on AI response',
        params: z.object({
            remoteThreadId: z.string().optional(),
            id: z.string().optional(),
            value: z.number().optional(),
            md: z.record(z.any()).optional(),
        }).strict(),
    },
    'ai.token': {
        method: 'POST',
        path: '/v1/ai/token',
        description: 'Create ephemeral token for AI access',
        params: z.object({
            flavor: z.string().optional(),
            opts: z.record(z.any()).optional(),
            md: z.record(z.any()).optional(),
        }).strict(),
    },
    'catalog.search': {
        method: 'GET',
        path: '/v1/catalog-item/search',
        description: 'Search public catalog items',
        params: z.object({}).passthrough(),
    },
    'catalogOwner.list': {
        method: 'GET',
        path: '/v1/catalog-item-owner',
        description: 'Get all catalog items owned by user',
        params: z.object({}).strict(),
    },
    'catalogOwner.create': {
        method: 'POST',
        path: '/v1/catalog-item-owner',
        description: 'Create new catalog item (objects = valid JSON string)',
        params: z.object({
            name: z.string(),
            description: z.string().optional(),
            objects: z.string(),
        }).strict(),
    },
    'catalogOwner.delete': {
        method: 'DELETE',
        path: '/v1/catalog-item-owner/:id',
        description: 'Delete catalog item (destructive)',
        params: z.object({ id: z.string() }).strict(),
    },
    'catalogOwner.newVersion': {
        method: 'POST',
        path: '/v1/catalog-item-owner/:id',
        description: 'Create new version of catalog item (objects = valid JSON string)',
        params: z.object({ id: z.string(), objects: z.string() }).strict(),
    },
    'catalogOwner.patch': {
        method: 'PATCH',
        path: '/v1/catalog-item-owner/:id',
        description: 'Update catalog item metadata',
        params: z.object({
            id: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            isPublic: z.boolean().optional(),
        }).strict(),
    },
    'catalogOwner.patchVersion': {
        method: 'PATCH',
        path: '/v1/catalog-item-owner/:id/:versionId',
        description: 'Update catalog item version metadata',
        params: z.object({
            id: z.string(),
            versionId: z.string(),
            description: z.string().optional(),
        }).strict(),
    },
    'wsconnect.connections': {
        method: 'GET',
        path: '/v1/wsconnect/connections',
        description: 'List live websocket connections (also exposed as the listConnections tool)',
        params: z.object({}).passthrough(),
    },
    'wsconnect.tool': {
        method: 'POST',
        path: '/v1/wsconnect/tool',
        description: 'Call tools against a live connection (also exposed as the callTools tool)',
        params: z.object({ connectionId: z.string(), request: z.record(z.any()) }).strict(),
    },
    'wsconnect.inject': {
        method: 'POST',
        path: '/v1/wsconnect/inject',
        description: 'Run JS against a live connection (also exposed as the inject tool)',
        params: z.object({ connectionId: z.string(), request: z.record(z.any()) }).strict(),
    },
    'ai5.createSession': {
        method: 'POST',
        path: '/v1/ai5/sessions',
        description: 'Create an AI5 session',
        params: z.object({ projectId: z.string().optional() }).strict(),
    },
    'ai5.getEvents': {
        method: 'GET',
        path: '/v1/ai5/sessions/:id/events',
        description: 'List events for an AI5 session',
        params: z.object({ id: z.string() }).strict(),
    },
    'ai5.postEvents': {
        method: 'POST',
        path: '/v1/ai5/sessions/:id/events',
        description: 'Send events to an AI5 session',
        params: z.object({ id: z.string(), events: z.array(z.any()) }).strict(),
    },
    'ai5.stream': {
        method: 'GET',
        path: '/v1/ai5/sessions/:id/stream',
        description: 'Stream AI5 session events; the chunked stream is accumulated and returned as full text',
        params: z.object({ id: z.string() }).strict(),
        raw: true,
    },
    // /v1/webhooks/:source is an inbound provider callback (basic-auth, empty response) — not callable here
};

export const catalogDocs = Object.entries(catalog)
    .map(([name, e]) => `- ${name} — ${e.method} ${e.path} — ${e.description}`)
    .join('\n');
