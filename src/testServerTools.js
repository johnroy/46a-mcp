// 100% claude (with review)

import { testEntryPoint } from './server.js';

const run = async (name, args) => {
    try {
        const result = await testEntryPoint(name, args)
        console.log(`\n=== ${name} ${JSON.stringify(args[0])} ===`)
        console.log(JSON.stringify(result, null, 4))
        return result
    } catch (err) {
        console.error(`\n=== ${name} ${JSON.stringify(args[0])} (ERROR) ===`)
        console.error(err.message)
    }
}

const data = (result) => JSON.parse(result.content[0].text)

async function main() {
    // 1. ping (no auth)
    const ping = await run('callServerTools', [{ serverCall: { name: 'ping' } }])
    if (data(ping).message !== 'pong') throw new Error('ping failed')

    // 2. login
    const login = await run('callServerTools', [{ serverCall: { name: 'login', params: { email: 'fubar', password: '222222' } } }])
    if (!data(login).token) throw new Error('login: no token')

    // 3. projects.mine (authed)
    const mine = await run('callServerTools', [{ serverCall: { name: 'projects.mine' } }])
    const projects = data(mine)
    if (!Array.isArray(projects)) throw new Error('projects.mine: not an array')

    // 4. projects.access with a locator, then projects.sync with its id
    const locator = projects[0].locator
    const access = await run('callServerTools', [{ serverCall: { name: 'projects.access', params: { locatorOrId: locator } } }])
    const id = data(access).id || data(access)._id || projects[0].id || projects[0]._id
    const sync = await run('callServerTools', [{ serverCall: { name: 'projects.sync', params: { id } } }])
    if (!data(sync).pages) throw new Error('projects.sync: no pages')

    // 5. error case: unknown endpoint name
    await run('callServerTools', [{ serverCall: { name: 'no.such.endpoint' } }])

    // 6. error case: projects.sync with bogus id
    await run('callServerTools', [{ serverCall: { name: 'projects.sync', params: { id: '000000000000000000000000' } } }])
}

main().catch(err => { console.error(err.message); process.exit(1) })
