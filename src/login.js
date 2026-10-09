let _token = null

async function login() {
    if (!process.env.EMAIL_OR_USERNAME)
        return; // just don't use token
    const res = await fetch(`${process.env.REMOTE_URL}/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: process.env.EMAIL_OR_USERNAME, password: process.env.PASSWORD }),
    })

    const body = await res.json()

    if (!res.ok || body.status !== 'success') {
        throw new Error(JSON.stringify(body))
    }

    return body.data.token
}

export async function getToken() {
    if (!_token) _token = await login()
    return _token
}
