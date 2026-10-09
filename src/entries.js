
import { z } from 'zod'
import instructions from './instructions';

export const getInstructions = () => instructions;

export const getEntries = (fns) => ([[
    'hello_world',
    {
        title: 'Hello World',
        description: 'Returns a greeting.',
        inputSchema: z.object({
            name: z.string().describe('Name to greet')
        }).strict(),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false
        }
    },
    async ({ name }) => ({
        content: [{ type: 'text', text: `Hello, ${name}!` }]
    })
], [
    'listConnections',
    {
        title: 'List Connections',
        description: 'Lists active WebSocket connections on the server. Returns a map of connection_id -> { user: { id, username, email }, project: { id, locator } }. Optionally filter by emailOrUsername.',
        inputSchema: z.object({
            emailOrUsername: z.string().optional().describe('Users email address or username'),
            projectLocator: z.string().optional().describe('Project locator'),
            projectId: z.string().optional().describe('Project id'),
            userId: z.string().optional().describe('User id'),
            connectionId: z.string().optional().describe('Connection id'),
        }).strict(),
        annotations: {
            readOnlyHint: true,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false
        }
    },
    async ({ emailOrUsername, projectLocator, projectId, userId, connectionId }) => {
        const result = await fns.listConnections({ emailOrUsername, projectLocator, projectId, userId, connectionId })
        return ({
            content: [{ type: 'text', text: JSON.stringify(result, null, 4) }]
        })
    }
], [
    'callTools',
    {
        title: 'Call Tools',
        description: 'Invokes tool calls on a connected client over its live WebSocket connection and returns the accumulated responses. Target the client via its connection_id (from listConnections).',
        inputSchema: z.object({
            toolCalls: z.object({
                connectionId: z.string().describe('Connection id of the target client (from listConnections)'),
                request: z.record(z.any()).describe('Tool request payload forwarded to the client (must carry verb v:"t")')
            }).strict()
        }).strict(),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true
        }
    },
    async ({ toolCalls }) => {
        const result = await fns.callTools(toolCalls);
        return ({
            content: [{ type: 'text', text: JSON.stringify(result, null, 4) }]
        })
    }
], [
    'inject',
    {
        title: 'Inject',
        description: 'Injects code to run on a connected client over its live WebSocket connection and returns the accumulated responses. Target the client via its connection_id (from listConnections).',
        inputSchema: z.object({
            injectCall: z.object({
                connectionId: z.string().describe('Connection id of the target client (from listConnections)'),
                request: z.record(z.any()).describe('Inject request payload forwarded to the client (must carry verb v:"j")')
            }).strict()
        }).strict(),
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: true
        }
    },
    async ({ injectCall }) => {
        const result = await fns.inject(injectCall);
        return ({
            content: [{ type: 'text', text: JSON.stringify(result, null, 4) }]
        })
    }
]]);

