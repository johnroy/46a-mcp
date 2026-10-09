import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server'

async function main() {
    if (!process.env.REMOTE_URL || !process.env.EMAIL_OR_USERNAME || !process.env.PASSWORD) {
        console.error('REMOTE_URL, EMAIL_OR_USERNAME and PASSWORD must all be set')
        process.exit(1)
    }
    const server = createServer()
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('MCP server running via stdio')
}

main()
