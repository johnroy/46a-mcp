import dotenv from 'dotenv'
dotenv.config({ path: 'config.env' })

import http from 'http'
import { fileURLToPath } from 'url'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createServer } from './server.js'
import { register, authorizeGet, authorizePost, token, verify, verifyBasic, authorizationServerMetadata, protectedResourceMetadata } from './oauth.js'

const PORT = process.env.MCP_HTTP_PORT
const HOST = process.env.MCP_HTTP_HOST
const REMOTE_URL = process.env.REMOTE_URL
const MAX_BODY_BYTES = 4 * 1024 * 1024

const readBody = (req) => new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', chunk => {
        size += chunk.length
        if (size > MAX_BODY_BYTES) {
            reject(Object.assign(new Error('Payload too large'), { status: 413 }))
            req.destroy()
            return
        }
        chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
})

const sendJsonRpcError = (res, status, code, message) => {
    if (res.headersSent) { res.end(); return }
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }))
}

const handler = async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`)

    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-authorization-server') {
        return authorizationServerMetadata(res, `http://${req.headers.host}`)
    }
    if (req.method === 'GET' && url.pathname === '/.well-known/oauth-protected-resource') {
        return protectedResourceMetadata(res, `http://${req.headers.host}`)
    }
    if (req.method === 'POST' && url.pathname === '/register') {
        return register(res, JSON.parse(await readBody(req)))
    }
    if (req.method === 'GET' && url.pathname === '/authorize') {
        return authorizeGet(res, Object.fromEntries(url.searchParams))
    }
    if (req.method === 'POST' && url.pathname === '/authorize') {
        return authorizePost(res, Object.fromEntries(new URLSearchParams(await readBody(req))))
    }
    if (req.method === 'POST' && url.pathname === '/token') {
        return token(res, Object.fromEntries(new URLSearchParams(await readBody(req))))
    }

    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'POST' })
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed' }, id: null }))
        return
    }

    const sessionToken = verify(req.headers.authorization) || await verifyBasic(req.headers.authorization)
    if (!sessionToken) {
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="http://${req.headers.host}/.well-known/oauth-protected-resource", Basic realm="46a"`)
        sendJsonRpcError(res, 401, -32000, 'Unauthorized: use Bearer OAuth token or Basic auth (username:password)')
        return
    }

    let body
    try {
        body = await readBody(req)
    } catch (err) {
        sendJsonRpcError(res, err.status || 500, -32000, err.message)
        return
    }

    let parsed
    try {
        parsed = JSON.parse(body)
    } catch (err) {
        sendJsonRpcError(res, 400, -32700, 'Parse error')
        return
    }

    // Stateless mode: a fresh server + transport per request so concurrent
    // clients with colliding JSON-RPC ids never share response routing.
    const mcpServer = createServer(sessionToken)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
        transport.close()
        mcpServer.close()
    })

    try {
        await mcpServer.connect(transport)
        await transport.handleRequest(req, res, parsed)
    } catch (err) {
        console.error('MCP request error:', err)
        sendJsonRpcError(res, 500, -32603, 'Internal server error')
    }
}

export const main = () => {
    if (!PORT || !HOST || !REMOTE_URL) {
        console.error('MCP_HTTP_PORT, MCP_HTTP_HOST and REMOTE_URL must all be set')
        process.exit(1)
    }
    const server = http.createServer(handler)
    server.listen(PORT, HOST, () => console.error(`MCP server listening on http://${HOST}:${PORT}`))
    return server
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
