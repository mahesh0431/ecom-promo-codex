# Architecture

## Purpose

`ecom-promo-codex` is a local-first demo application for an eCommerce promotion workflow where Codex is the core agentic layer.

The app keeps the workflow simple:

1. Start from product and sales data.
2. Let Codex inspect the data through a small read-only MCP layer.
3. Let Codex choose products that need campaign attention.
4. Generate an Instagram campaign for one selected product.
5. Generate and persist campaign images using the OpenAI image generation API.

This is intentionally not a full commerce platform.

## Roadmap

### V0: Instagram Promo Demo

V0 is the interview demo.

It should prove:

- a clean local UI flow;
- simple seeded app authentication;
- local durable persistence;
- Codex SDK usage;
- Codex access to product and sales context through a tiny MCP server;
- Instagram campaign generation;
- OpenAI image generation;
- saved campaign images and recent campaigns.

V0 should stay focused on the demo flow and avoid unrelated platform features.

### V1: Voice Integration

V1 adds realtime voice so the user can talk through campaign refinement instead of only typing instructions.

### V2: Codex App Skill And MCP Integration

V2 makes the workflow Codex-native. Codex App can use a repo skill plus MCP tools to work with the same promotion workflow, while the backend remains the system of record.

## Local-First Shape

```text
Demo UI
  -> Backend API
    -> seeded demo auth
    -> Prisma
    -> SQLite
    -> Codex SDK runner
      -> demo workspace
      -> promo-campaign-mcp
        -> read-only product/sales context
    -> OpenAI image generation
```

The app can run locally. The local app owns the database, workspace, and UI. OpenAI services are still external and require credentials.

Recommended V0 stack:

- Next.js with App Router;
- Node.js and TypeScript;
- shadcn/ui with Tailwind CSS;
- Prisma with SQLite;
- seeded-only email/password login;
- Codex SDK for the agent loop;
- a tiny read-only MCP server for campaign/product context;
- OpenAI image generation for campaign images.

## Frontend Shape

The UI should be simple and demo-focused. Use shadcn/ui and Tailwind CSS instead of hand-rolling components.

V0 screens:

1. Login.
2. Campaign opportunities.
3. Campaign detail and image generation.
4. Recent campaigns.

The app should feel like a small campaign tool, not a marketing landing page.

## Auth Boundary

There are two auth concerns:

1. **OpenAI runtime authentication**
   - required so the backend can run Codex SDK and image generation;
   - uses the server-side `OPENAI_API_KEY`;
   - should be checked during server startup, not requested through a second in-app popup.

2. **Demo app authentication**
   - protects the app workflow;
   - uses a seeded-only email/password login;
   - does not include signup, invite, password reset, or user creation flows in V0;
   - should be enough to show authenticated state without building enterprise auth.

Recommended V0 setup:

```text
App auth:
  demo@promo.test / demo-password

Codex SDK auth:
  OPENAI_API_KEY on the backend

Image generation auth:
  OPENAI_API_KEY on the backend
```

The UI can show runtime status such as `Codex runtime: Connected` and `Image API: Connected`, but it should not ask the user to complete a second OpenAI login during the demo.

## Responsibility Split

Codex SDK owns:

- deciding which MCP tools to call;
- selecting campaign opportunities;
- explaining why products need attention;
- generating Instagram captions;
- generating image prompts.

The MCP server owns:

- exposing safe product and sales context;
- returning product and sales facts for campaign review;
- avoiding final opportunity selection so Codex owns the reasoning step;
- refusing writes, secrets, auth/session access, and image generation.

The backend owns:

- app authentication;
- persistence;
- MCP server implementation;
- image generation API calls;
- image storage;
- response validation;
- UI-facing API responses.

Codex should not write directly to the app database. It should call only read-only MCP tools, then return structured recommendations, captions, and image prompts for the backend to persist.

## Documentation

- [Campaign workflow](docs/campaign-workflow.md)
- [Auth](docs/auth.md)
- [Data model](docs/data-model.md)
- [Codex MCP contract](docs/codex-tools.md)
- [Image generation](docs/image-generation.md)

## References

- [Product vision](VISION.md)
- [OpenAI Codex SDK](https://github.com/openai/codex/tree/main/sdk/typescript)
- [Codex MCP](https://developers.openai.com/codex/mcp)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
