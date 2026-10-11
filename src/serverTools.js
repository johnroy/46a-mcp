// 100% claude (with review)

import { getToken } from './login.js'
import { catalog } from './serverToolsCatalog.js'

export async function callServerTools({ name, params = {} }, sessionToken) {
    const entry = catalog[name]
    if (!entry) throw new Error(`Unknown server endpoint: ${name}`)

    const parsed = entry.params.parse(params)
    const leftover = { ...parsed }

    const path = entry.path
        .split('/')
        .map(seg => {
            const m = seg.match(/^:(\w+)(\?)?$/)
            if (!m) return seg
            const value = leftover[m[1]]
            delete leftover[m[1]]
            return value === undefined ? null : encodeURIComponent(value)
        })
        .filter(seg => seg !== null)
        .join('/')

    const token = entry.auth === false ? null : (sessionToken || await getToken())

    const url = new URL(`${process.env.REMOTE_URL}${path}`)
    const hasBody = !['GET', 'DELETE'].includes(entry.method)
    if (!hasBody) {
        for (const [k, v] of Object.entries(leftover)) {
            if (v !== undefined) url.searchParams.set(k, v)
        }
    }

    const res = await fetch(url, {
        method: entry.method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(hasBody ? { body: JSON.stringify(leftover) } : {}),
    })

    // raw/streamed responses (proxy, ai5.stream, ai.chat stream:true) are
    // accumulated to completion; true SSE can't map to MCP text content
    if (entry.raw || (name === 'ai.chat' && parsed.stream)) {
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
        return res.text()
    }

    const body = await res.json()
    if (body.status !== 'success') throw new Error(body.message)
    return body.data
}
