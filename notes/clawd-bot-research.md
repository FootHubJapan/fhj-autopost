# Clawd bot / Clawdbot research notes

## Access attempts

- `https://www.bing.com/search?q=what%20is%20clawd%20bot&form=QBRE`: `curl` failed with `CONNECT tunnel failed, response 403`.
- `https://muusannitizyou.jp/how-to-create-ai/`: `curl` failed with `CONNECT tunnel failed, response 403`.

## Verified summary (user-provided)

Clawdbot is an open-source, messaging-first AI assistant that connects to chat apps
(e.g., WhatsApp/Telegram/iMessage/Slack/Discord) and routes messages to a chosen AI
model (Claude, ChatGPT, and others). It can remember context over time, send proactive
nudges, and trigger automations on the machine where it runs (local or a cheap VPS).

It runs as a background service you control, acting as a gateway between messaging
apps and AI models/tools: Messaging app ⇄ Clawdbot Gateway ⇄ AI model + Tools. The
gateway can unify inboxes, keep state, run scheduled jobs, and connect to services
like calendar/email/notes, which enables proactive behavior (notifications and alerts).

Typical setup is lightweight: a small VPS is often enough for routing and automations
because heavy computation happens in the AI provider, while local hardware is only
needed if you want to run local models or heavier workloads.

Installation is described as a fast path with a one-line installer:
`curl -fsSL https://clawd.bot/install.sh | bash`, followed by a setup wizard to
link chat providers, choose a model provider, and configure integrations.

Official documentation: https://clawd.bot/
