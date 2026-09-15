# Grow × Codex Operating Model

Effective: 2026-09-15

This operating model is shared by HandsFree REAL and Game Project #001.

## Core motto
> Emotion speaks. Grow interprets and decides. Codex implements and tests. Grow verifies. HandsFree remembers and operates.

## Roles
- **Emotion**: owns goals, priorities, and final approval for consequential decisions.
- **Grow**: owns architecture, requirement interpretation, sequencing, safety, integration, and final verification.
- **Codex**: preferred execution layer for repository-scale code changes, bug fixes, refactors, tests, and repeatable implementation work.
- **HandsFree**: operational memory/execution system that stores approved data and exposes verified status/actions.

## Default workflow
1. Emotion states the goal in normal language.
2. Grow interprets the intent, checks current project context, and decides what needs to change.
3. Grow converts the goal into an implementation scope and safety boundary.
4. Codex performs code-heavy implementation and repeatable testing when that route is appropriate.
5. Grow verifies the result against the actual user requirement and latest checkpoint.
6. Only verified outputs are promoted to CURRENT / production baselines.

Emotion does not need to decide whether Grow or Codex should perform a technical task. That routing decision belongs to Grow.

## Repository execution contract
For `cuda0809/handsfree-mobile`:
- Root `AGENTS.md` is the mandatory Codex repository instruction file.
- `CODEX_TEST_RULES.md` defines the minimum verification contract.
- `REAL_0.8_MOBILE_SAFE_WRITE_CHECKPOINT_2026-09-14.md` is the current REAL implementation checkpoint until superseded by a newer verified checkpoint.
- `UPDATE_POLICY.md` defines branch/preview/production behavior.
- `RELEASE_PIPELINE.md` defines Android/release-specific boundaries.

## Branch / verification rule
Implementation work follows:
`task branch -> tests -> Preview/environment verification -> Grow verification -> Emotion approval when consequential -> main / production`.

`main` is not a scratch branch. Production promotion is not an automatic Codex decision.

## User-interaction rule
Grow should do everything it can directly before asking Emotion to act. Emotion is asked only for steps that genuinely require user-only permissions, credentials, physical/UI interaction, billing, destructive or irreversible approval, or a capability unavailable to Grow/Codex.

When manual handoff is unavoidable, prefer a full replacement file or one-step action over partial code edits.

## Safety boundary
The following require Emotion approval before final application:
- production data mutation or deletion
- permission / sharing changes
- deployment target changes or production promotion
- cost-bearing actions
- structural changes that can affect the operating system or project direction

Documentation, diagnostics, branch-only implementation, and reversible test work may proceed without production promotion when they stay inside the approved goal and do not cross these boundaries.

## Failure handling
Do not stop at “cannot verify.” Diagnose the cause, try an available alternative, test again, and only promote a result that has been verified as far as the available environment permits.

A hidden fallback must not be used to turn a failed current integration into an apparently healthy result unless that fallback is an explicitly approved and observable part of the design.

## Device continuity
PC and mobile are one continuous workstream. The latest verified checkpoint is the single source of truth regardless of which device Emotion uses next.
