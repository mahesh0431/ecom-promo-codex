# Agent Guide

This repo is the source of truth for `ecom-promo-codex`, a small open-source demo app for an eCommerce promotion workflow powered by Codex.

Keep the project simple and aligned with the docs. The point is to show a practical customer-facing application where Codex helps inspect campaign context, choose promotion opportunities, and generate campaign content.

## Documentation

The project docs explain the product vision, architecture, campaign workflow, data model, Codex/MCP usage, image generation flow, and implementation planning approach.

Start with these:

- `VISION.md` for the product idea and scope.
- `ARCHITECTURE.md` for the technical direction.
- `docs/` for supporting details.

If a new decision, workflow, interface, or implementation detail does not fit an existing doc, create a new doc under `docs/` and link it from the most relevant existing place.

## Planning Rules

Use `docs/PLANS.md` when creating implementation plans.

When creating an ExecPlan, draft it first, validate that exact draft with a fresh sub-agent, then update it with useful feedback before implementation.

Store active ExecPlans in:

```text
docs/exec-plans/active/
```

Move completed ExecPlans to:

```text
docs/exec-plans/completed/
```

Each ExecPlan should be self-contained enough that a future agent can continue from the plan without needing chat history.

For app-owned Codex SDK runs, use the single backend `OPENAI_API_KEY` and keep Codex home/workspace state under ignored `output/codex-runtime/`.
