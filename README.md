# n8n-nodes-cloudflare-ai-gateway

An [n8n](https://n8n.io) community node that exposes **Cloudflare AI Gateway** as a Language Model, so it can be attached to the **AI Agent** and other LangChain nodes in n8n that need an LLM.

It connects to Cloudflare's OpenAI-compatible endpoint and gives access to **all models served through AI Gateway** — Cloudflare Workers AI (`@cf/...`) and third-party providers (`openai/...`, `anthropic/...`, `google/...`, `xai/...`, …) — through a single credential.

## Installation

In n8n: **Settings → Community nodes → Install**, then enter `n8n-nodes-cloudflare-ai-gateway`.

Or via npm:

```bash
npm install n8n-nodes-cloudflare-ai-gateway
```

## Credential setup

Create a Cloudflare API token with these permissions (Account-scoped):

| Permission | Scope | Used for |
|---|---|---|
| `AI Gateway - Run` | Account | Inference (chat completions) |
| `AI Gateway - Read` | Account | Read gateway config |
| `Workers AI - Read` | Account | `@cf/...` models + model list |

Then in n8n create a **Cloudflare AI Gateway API** credential with:

- **Account ID** — your Cloudflare Account ID ([how to find it](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/))
- **Gateway ID** — your gateway name (`default` is created automatically)
- **API Token** — the token above

## Usage

1. Add the **Cloudflare AI Gateway** node as a sub-node of an **AI Agent** (or any node that takes a Language Model).
2. **Model**:
   - **From List** — Workers AI text-generation models, loaded live from the Cloudflare API.
   - **ID** — type any model the gateway serves, e.g. `openai/gpt-4.1`, `anthropic/claude-sonnet-4`, `google/gemini-3-flash`, or `@cf/moonshotai/kimi-k2.6`.

## Billing

- **Workers AI models** (`@cf/...`): billed per [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/). Work out of the box.
- **Third-party models** (`openai/...`, `anthropic/...`, …): require **Unified Billing credits** loaded on your account, **or** [BYOK (stored keys)](https://developers.cloudflare.com/ai-gateway/configuration/bring-your-own-keys/). Without them you will get `Insufficient balance` (error 2021).

## Under the hood

The node wraps LangChain's `ChatOpenAI` pointed at Cloudflare's OpenAI-compatible endpoint:

```
POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1/chat/completions
Authorization: Bearer {CF_TOKEN}
cf-aig-gateway-id: {gateway_id}
```

This keeps it compatible with tool calling (agents) and standard chat-completion parameters.

## Development

This node was developed using [OpenCode](https://opencode.ai) as an AI coding copilot, powered by the **GLM-5.2** language model.

## License

MIT
