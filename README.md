# 46a MCP Server

Live control of a 46a project open in a user's browser, via MCP. Lets an MCP client
read live application/DOM state and perform editor actions in real time.

## Installation

### As an HTTP target (standalone)

How to use the MCP connector, for hints ask claude "claude: show me where to configure mcpServers?"

1. Add the server URL as a custom connector (claude.ai: Settings → Connectors → Add
   custom connector; Claude Code: `claude mcp add --transport http 46a-mcp https://46a.co/mcp`).

### Configure local entry with OAuth
Local claude MCP configuration to use oauth (default)

```json
{
  "mcpServers": {
    "46a-mcp-http-oauth": {
      "type": "streamable-http",
      "url": "https://46a.co/mcp"
    }
  }
}
```

### Configure a local entry with basic auth
Local claude MCP configuration to use basic auth instead of oauth.

```json
{
  "mcpServers": {
    "46a-mcp-http-basic-auth": {
      "type": "streamable-http",
      "url": "https://46a.co/mcp",
      "headers": {
        "Authorization": "Basic <user:pass>"
      }
    }
  }
}
```

### Configure stdio process

```json
{
  "mcpServers": {
    "46a-mcp-stdio": {
      "command": "node",
      "args": ["dist/stdio.js"],
      "cwd": "/Users/jroy/src/46a/mcp",
      "env": {
        "REMOTE_URL": "https://46a.co/mcp",
        "EMAIL_OR_USERNAME": "<user>",
        "PASSWORD": "<pass>"
      }
    }
  }
}
```

## Build stdio server

```bash
npm run build
```

## Running

```bash
node src/http.js
```

## Connecting a client

A. Configure a custom connector, **or**
B. Add entries (as above) to `.mcp.json` or other Claude config location, using
   either basic auth or OAuth (default), **or**
C. Configure a local entry for the stdio-based process (see above)

## Workflow

1. `listConnections` → pick a live `connectionId`.
2. `callTools` and/or `inject` against that `connectionId`.

`connectionId` is ephemeral and orphans on page reload — re-list when in doubt.

## Tools

Client discovers tools via `tools/list`.

- **listConnections** — list live browser connections. Optional `emailOrUsername` filter.
  Returns `connectionId -> { user, project }`.
- **callTools** — run 46a tool calls against one connection:
  `{ connectionId, request: { v: 't', calls: [...] } }`.
- **inject** — run code in the connection's browser session:
  `{ connectionId, request: { v: 'j', code } }`. `code` must be a single expression
  evaluating to a Promise.
- **hello_world** — connectivity test tool.

### callTools call surface

`request.calls`

- `add_object` — add a single object (Circle, Square, _basic.text, _basic.plainText,
  _basic.html, SVG).
- `add_objects` — batched add_object, preferred for creating many objects at once.
- `make_object_from_html` — add an object from a raw HTML snippet.
- `getSelectorData` — read application state (page, workspace, project, user, objects, logs).
- `doAction` — perform an editor action (undo/redo, open editor, select objects, zoom,
  change page, patch object fields, project/page lifecycle, etc).
- `createImage` — generate an image via DALL-E and add it to the project.
- `delegateAI` — delegate a task to another assistant.
- `uiInteraction` — create a UI widget/interaction in the chat thread or UI.

