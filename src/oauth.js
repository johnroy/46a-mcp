import crypto from 'crypto'

const clients = new Map()   // client_id -> { redirect_uris }
const codes = new Map()     // code -> { clientId, redirectUri, challenge, sessionToken }
const sessions = new Map()  // access_token -> sessionToken

const s256 = v => crypto.createHash('sha256').update(v).digest('base64url')

const sendJson = (res, status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(obj))
}

export const verifyBasic = async (authHeader) => {
    const [scheme, encoded] = (authHeader || '').split(' ')
    if (scheme !== 'Basic' || !encoded) return null
    const decoded = Buffer.from(encoded, 'base64').toString('utf8')
    const sep = decoded.indexOf(':')
    const email = decoded.slice(0, sep)
    const password = decoded.slice(sep + 1)
    try {
        const loginRes = await fetch(`${process.env.REMOTE_URL}/v1/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        const loginBody = await loginRes.json()
        return loginBody.status === 'success' ? loginBody.data.token : null
    } catch (err) {
        return null
    }
}

export const register = (res, body) => {
    const client_id = crypto.randomUUID()
    clients.set(client_id, { redirect_uris: body.redirect_uris })
    console.log('register: client registered', { client_id, redirect_uris: body.redirect_uris })
    return sendJson(res, 200, { client_id, redirect_uris: body.redirect_uris })
}

export const authorizationServerMetadata = (res, baseUrl) => sendJson(res, 200, {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
})

export const protectedResourceMetadata = (res, baseUrl) => sendJson(res, 200, {
    resource: baseUrl,
    authorization_servers: [baseUrl],
})

const loginForm = (q) => `<form method="post" action="/authorize">
<input type="hidden" name="client_id" value="${q.client_id}">
<input type="hidden" name="redirect_uri" value="${q.redirect_uri}">
<input type="hidden" name="state" value="${q.state || ''}">
<input type="hidden" name="code_challenge" value="${q.code_challenge}">
<input name="email" placeholder="email or username">
<input name="password" type="password" placeholder="password">
<button type="submit">Sign in</button></form>`

export const authorizeGet = (res, query) => {
    const client = clients.get(query.client_id)
    if (!client || !client.redirect_uris.includes(query.redirect_uri)) {
        console.error('authorizeGet: invalid_request', { client_id: query.client_id, redirect_uri: query.redirect_uri })
        return sendJson(res, 400, { error: 'invalid_request' })
    }
    console.log('authorizeGet: showing login form', { client_id: query.client_id })
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(loginForm(query))
}

export const authorizePost = async (res, body) => {
    const { client_id, redirect_uri, state, code_challenge, email, password } = body
    const client = clients.get(client_id)
    if (!client || !client.redirect_uris.includes(redirect_uri)) {
        console.error('authorizePost: invalid_request', { client_id, redirect_uri })
        return sendJson(res, 400, { error: 'invalid_request' })
    }
    let loginBody
    try {
        const loginRes = await fetch(`${process.env.REMOTE_URL}/v1/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        loginBody = await loginRes.json()
    } catch (err) {
        console.error('authorizePost: login request failed', err)
        return sendJson(res, 502, { error: 'server_error' })
    }
    if (loginBody.status !== 'success') {
        console.error('authorizePost: access_denied', { email, loginBody })
        return sendJson(res, 401, { error: 'access_denied' })
    }
    console.log('authorizePost: login success', { email })
    const code = crypto.randomBytes(32).toString('base64url')
    codes.set(code, { clientId: client_id, redirectUri: redirect_uri, challenge: code_challenge, sessionToken: loginBody.data.token })
    const url = new URL(redirect_uri)
    url.searchParams.set('code', code)
    url.searchParams.set('state', state || '')
    res.writeHead(302, { Location: url.toString() })
    res.end()
}

export const token = (res, body) => {
    const { code, code_verifier, client_id, redirect_uri } = body
    const entry = codes.get(code)
    codes.delete(code)
    if (!entry || entry.clientId !== client_id || entry.redirectUri !== redirect_uri
        || entry.challenge !== s256(code_verifier || '')) {
        console.error('token: invalid_grant', { client_id, redirect_uri })
        return sendJson(res, 400, { error: 'invalid_grant' })
    }
    const accessToken = crypto.randomBytes(32).toString('base64url')
    sessions.set(accessToken, entry.sessionToken)
    console.log('token: issued access token', { client_id })
    return sendJson(res, 200, { access_token: accessToken, token_type: 'Bearer' })
}

export const verify = (authHeader) => {
    const [scheme, accessToken] = (authHeader || '').split(' ')
    if (scheme !== 'Bearer' || !accessToken) {
        console.error('verify: missing or malformed authorization header', { authHeader })
        return null
    }
    const sessionToken = sessions.get(accessToken)
    if (!sessionToken) {
        console.error('verify: unknown access token')
        return null
    }
    console.log('verify: token verified')
    return sessionToken
}
