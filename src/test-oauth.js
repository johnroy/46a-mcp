import crypto from 'crypto'
import { main as startHttpServer } from './http'

const base64url = (buf) => buf.toString('base64url')

async function main() {
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

        const unauthedRes = await fetch(base, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'hello_world', arguments: { name: 'World' } } }),
        })
        console.log('=== unauthenticated call ===')
        console.log(unauthedRes.status === 401 ? 'PASS: 401' : `FAIL: ${unauthedRes.status}`)

        const mcpRes = await fetch(base, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: `Bearer ${access_token}` },
            body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'hello_world', arguments: { name: 'World' } } }),
        })
        const mcpText = await mcpRes.text()
        const dataLine = mcpText.split('\n').find(l => l.startsWith('data: '))
        const mcpJson = dataLine ? JSON.parse(dataLine.slice(6)) : mcpText
        console.log('=== authenticated call ===')
        console.log(JSON.stringify(mcpJson, null, 4))
    } finally {
        server.close()
    }
}

main().catch(err => { console.error(err.message); process.exit(1) })
