//import fs from 'fs'
//fs.existsSync('.env') && require('dotenv/config') wtf is this?
//import { getToken } from './login.js'
//import { listUsers } from './wsConnect.js'

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

async function main() {
    await run('hello_world', [{ name: 'World' }])

    // existing listConnections scenarios
    await run('listConnections', [{}])
    await run('listConnections', [{ emailOrUsername: 'fubar' }])

    // request tools need a live connection — target the first one we find
    const conns = await testEntryPoint('listConnections', [{}])
    const connectionId = Object.keys(JSON.parse(conns.content[0].text))[0]
    if (!connectionId) {
        console.log('\nno active connections — skipping callTools / inject')
        return
    }

    await run('callTools', [{ toolCalls: { connectionId, request: { v: 't', calls: [] } } }])
    await run('inject',    [{ injectCall: { connectionId, request: { v: 'j', code: '1' } } }])
}

main().catch(err => { console.error(err.message); process.exit(1) })
