import { getToken } from './login'

export async function listConnections({ emailOrUsername, projectLocator, projectId, userId, connectionId } = {}, sessionToken) {
    const token = sessionToken || await getToken()

    const url = new URL(`${process.env.REMOTE_URL}/v1/wsconnect/connections`)
    if (emailOrUsername) url.searchParams.set('user-or-email', emailOrUsername)
    if (projectLocator) url.searchParams.set('project-locator', projectLocator)
    if (projectId) url.searchParams.set('project-id', projectId)
    if (userId) url.searchParams.set('user-id', userId)
    if (connectionId) url.searchParams.set('connection-id', connectionId)
    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const body = await res.json()
    if (body.status !== 'success') throw new Error(body.message)
    return body.data
}

export async function callTools(toolCalls, sessionToken) {
    const token = sessionToken || await getToken()

    const res = await fetch(`${process.env.REMOTE_URL}/v1/wsconnect/tool`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(toolCalls),
    })
    const body = await res.json()
    if (body.status !== 'success') throw new Error(body.message)
    return body.data
}

export async function inject(injectCall, sessionToken) {
    const token = sessionToken || await getToken()

    const res = await fetch(`${process.env.REMOTE_URL}/v1/wsconnect/inject`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(injectCall),
    })
    const body = await res.json()
    if (body.status !== 'success') throw new Error(body.message)
    return body.data
}
