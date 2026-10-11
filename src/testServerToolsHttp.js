// 100% claude (with review)

import crypto from 'crypto'
import { main as startHttpServer } from './http.js'

const base64url = (buf) => buf.toString('base64url')

async function main() {
    console.log('REMOTE_URL:', process.env.REMOTE_URL)
    const server = startHttpServer()
    await new Promise(resolve => server.once('listening', resolve))
    const { port } = server.address()
    const base = `http://127.0.0.1:${port}`
    const redirectUri = 'http://127.0.0.1:9999/callback'

    try {
        const registerRes = await fetch(`${base}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ redirect_uris: [redirectUri] }),
        })
        const { client_id } = await registerRes.json()

        const codeVerifier = base64url(crypto.randomBytes(32))
        const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest())

        const authorizeRes = await fetch(`${base}/authorize`, {
            method: 'POST',
            redirect: 'manual',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id,
                redirect_uri: redirectUri,
                state: 'xyz',
                code_challenge: codeChallenge,
                email: process.env.EMAIL_OR_USERNAME,
                password: process.env.PASSWORD,
            }),
        })
        const location = authorizeRes.headers.get('location')
        if (!location) throw new Error('no redirect — check login credentials')
        const code = new URL(location).searchParams.get('code')
        if (!code) throw new Error('no code in redirect — check login credentials')

        const tokenRes = await fetch(`${base}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                code_verifier: codeVerifier,
                client_id,
                redirect_uri: redirectUri,
            }),
        })
        const { access_token } = await tokenRes.json()

        let id = 0
        const rpc = async (method, params) => {
            const res = await fetch(base, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${access_token}` },
                body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
            })
            const text = await res.text()
            const dataLine = text.split('\n').find(l => l.startsWith('data: '))
            return dataLine ? JSON.parse(dataLine.slice(6)) : JSON.parse(text)
        }
        const toolData = (rpcJson) => JSON.parse(rpcJson.result.content[0].text)

        const ping = await rpc('tools/call', { name: 'callServerTools', arguments: { serverCall: { name: 'ping' } } })
        console.log('=== callServerTools ping ===')
        console.log(JSON.stringify(ping, null, 4))
        if (toolData(ping).message !== 'pong') throw new Error('ping failed')
        console.log('PASS: ping')

        const mine = await rpc('tools/call', { name: 'callServerTools', arguments: { serverCall: { name: 'projects.mine' } } })
        const projects = toolData(mine)
        console.log('=== callServerTools projects.mine ===')
        console.log(JSON.stringify(projects.map(p => ({ id: p.id, locator: p.locator, title: p.title })), null, 4))
        if (!Array.isArray(projects)) throw new Error('projects.mine: not an array')
        console.log('PASS: projects.mine')

        const list = await rpc('tools/list', {})
        const tool = list.result.tools.find(t => t.name === 'callServerTools')
        if (!tool) throw new Error('tools/list: callServerTools missing')
        if (!tool.inputSchema?.properties?.serverCall) throw new Error('tools/list: callServerTools schema missing serverCall')
        console.log('=== tools/list callServerTools ===')
        console.log(JSON.stringify({ name: tool.name, title: tool.title, inputSchema: tool.inputSchema }, null, 4))
        console.log('PASS: tools/list')
    } finally {
        server.close()
    }
}

main().catch(err => { console.error(err.message); process.exit(1) })
