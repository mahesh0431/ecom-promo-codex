# Codex Execution Plans (ExecPlans)

An ExecPlan is a self-contained implementation plan that a coding agent or human novice can follow to deliver a working, observable change.

Use this document when the user asks for an exact plan. The exact plan becomes the implementation guide: it should say what to build, how to build it, how to validate it, and how to resume if the work pauses.

This repository uses ExecPlans when implementation starts, especially for changes that touch code, schema, local data handling, Codex SDK behavior, MCP tools, image generation, or multi-step UI behavior.

## Core Standard

Every ExecPlan must be self-contained. Assume the reader has only the current working tree and the ExecPlan file. Do not rely on chat history, memory, prior plans, or unstated decisions.

Every ExecPlan must be a living document. Update it as progress is made, surprises appear, and decisions are finalized. A future agent should be able to resume from the plan alone.

Every ExecPlan must produce demonstrably working behavior. The goal is not "files changed"; the goal is a user-visible or test-visible outcome.

Every ExecPlan must define non-obvious terms in plain language. If a term like "migration", "daemon", "bridge", or "app-server" is used, explain what it means in this repository and where it appears.

## How To Use ExecPlans

When authoring an ExecPlan, read the relevant project docs first. Pull the necessary context into the ExecPlan instead of assuming the reader will open every linked file.

When implementing an ExecPlan, keep going through the next milestone instead of asking for routine next steps. Ask the user only when a decision changes demo scope, safety boundaries, auth/data posture, OpenAI runtime behavior, or another non-obvious tradeoff.

When discussing or revising an ExecPlan, record decisions in the plan's `Decision Log`. The reason for a change should be clear later without reading the chat.

When researching uncertain designs, use explicit prototype milestones. A prototype should be additive, testable, and judged by clear promotion/discard criteria.

Do not commit automatically. Commit only when the user asks, or when repo workflow explicitly instructs it. Record progress in the ExecPlan regardless of whether a commit is made.

## Relationship To Other Docs

Use these docs for durable product and technical direction:

- `VISION.md`
- `ARCHITECTURE.md`
- `docs/product/README.md`
- `docs/product/campaign-workflow.md`
- `docs/product/data-model.md`
- `docs/product/codex-tools.md`
- `docs/product/image-generation.md`

Use `AGENTS.md` for repo navigation and agent-facing project rules.

Use ExecPlans for exact implementation steps, validation commands, evidence, surprises, and completion notes.

## Required Sections

Every ExecPlan must include these sections:

- `Purpose / Big Picture`
- `Progress`
- `Surprises & Discoveries`
- `Decision Log`
- `Outcomes & Retrospective`
- `Context and Orientation`
- `Milestones`
- `Plan of Work`
- `Concrete Steps`
- `Validation and Acceptance`
- `Idempotence and Recovery`
- `Artifacts and Notes`
- `Interfaces and Dependencies`

The living sections are not optional:

- `Progress`
- `Surprises & Discoveries`
- `Decision Log`
- `Outcomes & Retrospective`

## Formatting

If an ExecPlan is sent in chat, wrap the whole plan in one fenced code block labeled `md`.

If an ExecPlan is written to a `.md` file where the file contains only the plan, omit the surrounding triple backticks.

Do not nest triple-backtick code fences inside an ExecPlan. When showing commands, transcripts, diffs, or snippets inside a plan, indent them instead.

Write in plain prose. Use checkboxes only in `Progress`, where they are required. Use tables sparingly; prefer prose unless a table makes the plan easier to execute.

Use two blank lines after headings.

## Milestones

Milestones and Progress are different.

Milestones are the planned story of implementation. They explain the major chunks of work in prose. A milestone should be understandable before any code is written.

Progress is the live state ledger. It records what has actually happened, with checkboxes and timestamps, including partial work and stopping points.

Do not use milestones as a checklist. Do not use progress as the implementation story. Both are required because they answer different questions:

- Milestones answer: "What are we trying to build, in what order, and how will each chunk prove itself?"
- Progress answers: "What has actually been completed, when, and what remains right now?"

Each milestone must explain:

- what will exist afterward
- what files or areas are involved
- what commands to run
- what observable proof should appear

Each milestone must be independently verifiable and should move the system closer to working behavior.

Prototype milestones are allowed when they reduce risk. Label them clearly as prototypes and state how to promote or discard them.

Example milestone style:

    Milestone 1: Create the database foundation.

    At the end of this milestone, `pnpm db:seed` creates a local SQLite database with the demo user, product catalog, and dated sales records. The work touches `prisma/`, backend database code, and tests under `tests/`. Run `pnpm test` and `pnpm db:seed`; success is visible when SQLite contains the seeded demo user, products, and product sales.

Example progress style:

    - [x] (2026-04-26 10:15Z) Created the initial SQLite schema module.
    - [ ] Implement `pnpm db:seed` command wiring.
    - [ ] Add validation that shows created table names.

## Validation

Validation is mandatory.

Every ExecPlan must say exactly how to verify the change. Use concrete commands, working directories, expected outputs, and human-observable behavior.

Examples:

    cd /Users/mahesh/Projects/ecom-promo-codex
    pnpm test

    Expected: all tests pass.

For UI work, include at least one end-to-end scenario. For schema work, include commands that show the created tables or inserted rows. For Codex SDK or MCP work, include how to observe that Codex received scoped context, returned structured output, and the backend saved the expected records.

If a validation step cannot be run yet, explain why and what evidence is still available.

## Evidence

Capture concise evidence as the plan progresses:

- relevant terminal output
- short logs
- important file paths
- command transcripts
- before/after behavior

Evidence should prove the feature works. Do not paste huge logs unless the full output is necessary.

## Idempotence And Safety

Plans should be safe to resume.

If a command can be rerun safely, say so. If a command can partially fail, describe how to recover. If data files or migrations are involved, explain backup or retry behavior.

For this repo, be especially careful with local credentials and generated artifacts:

- never ask agents to commit secrets or `.env` files
- keep generated `data/` ignored by git
- use seeded demo data or synthetic fixtures for committed tests
- do not commit generated images unless they are intentional static documentation assets
- describe destructive operations before using them

## Repo Conventions

Store active ExecPlans in:

    docs/exec-plans/active/

Move completed ExecPlans to:

    docs/exec-plans/completed/

Use filenames like:

    <feature>-YYYY-MM-DD.md

Example:

    docs/exec-plans/active/seeded-database-foundation-2026-06-06.md

ExecPlans should reference the project docs they depend on. One ExecPlan may cover multiple docs when the implementation slice naturally crosses feature boundaries.

An ExecPlan is scoped to an implementation slice. A valid ExecPlan can cover a full workflow, part of a workflow, multiple docs, a contract, a bug fix, a migration, a cleanup, or a technical-debt item. Choose the scope that makes the work understandable, independently verifiable, and safe to resume.

Prefer one active ExecPlan per coherent implementation slice. For example, the first seeded-database implementation may link the data model, auth notes, and campaign workflow because the working behavior needs all three. A later image-generation refinement may cover only the image workflow and persistence behavior. A bug-fix ExecPlan may link no project doc if it only repairs existing behavior; in that case, name the affected files and acceptance behavior clearly.

When creating an ExecPlan that implements a whole documented workflow, add an `ExecPlan:` link to the relevant doc only if that helps future readers. When the plan is complete, move it to `completed/` and update project docs only if behavior or scope changed. For partial workflow work, bug fixes, migrations, or refinements, record important decisions in the ExecPlan and update project docs only when durable behavior changes.

Track technical debt discovered during implementation in:

    docs/exec-plans/tech-debt-tracker.md

Create that tracker when the first real technical debt item appears.

## Skeleton

Use this skeleton when creating a new ExecPlan.

    # <Short, action-oriented description>

    This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

    This plan follows `docs/PLAN.md`.

    ## Purpose / Big Picture

    Explain what someone gains after this change and how they can see it working. State the user-visible behavior this plan enables.

    ## Progress

    Use checkboxes with timestamps. Every stopping point must be reflected here. Prefix entries with the milestone they belong to, such as `[M1]`, so progress can be matched back to the implementation story.

    - [ ] (YYYY-MM-DD HH:MMZ) [M1] Initial plan created.

    ## Surprises & Discoveries

    Record unexpected behavior, bugs, tool limitations, or design insights.

    - Observation: ...
      Evidence: ...

    ## Decision Log

    Record decisions and why they were made.

    - Decision: ...
      Rationale: ...
      Date/Author: ...

    ## Outcomes & Retrospective

    Summarize what changed, what works, what remains, and what was learned. Update this at major milestones and completion.

    ## Context and Orientation

    Explain the current repo state relevant to this task. Name files and modules by repository-relative path. Define non-obvious terms.

    ## Milestones

    Write narrative milestones. Each milestone should describe the goal, the work, the files or areas involved, the commands to run, and the observable proof.

    Milestone 1: <name>

    At the end of this milestone, <new working capability exists>. The work touches <files or areas>. To validate it, run <commands>. The expected result is <observable behavior or output>.

    Milestone 2: <name>

    At the end of this milestone, <next working capability exists>. The work touches <files or areas>. To validate it, run <commands>. The expected result is <observable behavior or output>.

    ## Plan of Work

    Describe the sequence of edits and additions in prose. Name the files, modules, commands, and behavior that will change.

    ## Concrete Steps

    Give exact commands and working directories. Include short expected transcripts when useful.

    ## Validation and Acceptance

    Explain how to prove the change works. Include tests, CLI scenarios, expected output, and any manual checks.

    ## Idempotence and Recovery

    Explain what can be rerun safely and how to recover from partial failure.

    ## Artifacts and Notes

    Include concise evidence, important snippets, generated paths, or logs.

    ## Interfaces and Dependencies

    Name libraries, services, modules, function signatures, command names, config fields, and database tables that must exist at the end.

## Calibration For ecom-promo-codex

This standard is intentionally strict because this repo will be worked on by coding agents that may not have conversation history.

It is not meant to slow down small docs edits. Use ExecPlans when the work needs implementation memory, validation, or resumability. For tiny wording changes, update the relevant doc directly.
