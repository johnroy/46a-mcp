export default (`
# 46a MCP

Drive a **live 46a project open in a user's browser** — read its DOM/app state and perform editor
actions in real time. This is **not** a REST/data API (that's the 46a server API); it only acts on an
*open* project session.

## Tools
- **listConnections** (read-only) — list live browser connections. Optional \`emailOrUsername\` filter.
  Returns \`connectionId -> { user, project }\`.
- **callTools** (side-effecting) — run 46a tool calls against one connection.
  \`{ connectionId, request: { v:'t', calls:[…] } }\`.
- **inject** (side-effecting) — run code in the connection's browser session.
  \`{ connectionId, request: { v:'j', code } }\`. \`code\` MUST be a single expression evaluating to a
  Promise (\`Promise.resolve(...)\` or an async IIFE).

## Workflow (required order)
1. **listConnections** → 2. pick a *live* \`connectionId\` → 3. **callTools** / **inject**.
You cannot skip step 1: \`connectionId\` is required, ephemeral, and orphans on page reload — re-list when in doubt.

## What you can call via callTools
\`request.calls\` is an OpenAI-style array: \`{ id, type:'function', function:{ name, arguments } }\`
where \`arguments\` is a JSON **string**. Many calls in one request run in parallel and return one array.

**SOURCE OF TRUTH for valid calls and their exact arguments:**
\`/Users/jroy/.claude/skills/46a-private/references/tools.json\`
— a merged OpenAI-style function-schema array of all 8 top-level tools:
\`add_object\`, \`add_objects\`, \`make_object_from_html\`, \`getSelectorData\`, \`doAction\`, \`createImage\`,
\`delegateAI\`, \`uiInteraction\`. The \`doAction\` verbs and \`getSelectorData\` selectors are documented
inline within those two entries. Read that file before constructing calls.

## Action model (choosing a call)
- **Read** state → \`getSelectorData\` (selectors) or \`inject\`.
- **Mutate** → \`add_object\` / \`add_objects\` (prefer for many) / \`make_object_from_html\` / \`doAction\` / \`createImage\`.

## Results & errors
- Success → \`[{ tool_call_id, output }]\`.
- Empty \`[]\` = ran but errored / unknown verb — **not** silent success.
- \`"no active connection"\` → stale id → re-run listConnections.
- Timeout → dead connection → pick a different live one.
- Confirm a mutation landed by reading back via a selector or inject.
`);
