# Grow × Codex Operating Model

Effective: 2026-09-15

This operating model is shared by HandsFree REAL and Game Project #001.

## Roles
- Emotion: owns goals, priorities, and final approval for consequential decisions.
- Grow: owns architecture, requirement interpretation, sequencing, safety, integration, and final verification.
- Codex: preferred execution layer for repository-scale code changes, bug fixes, refactors, tests, and repeatable implementation work.

## Default workflow
1. Emotion states the goal or approves a consequential direction.
2. Grow decomposes the work, resolves technical direction, and selects what can be executed directly.
3. Codex performs code-heavy implementation and repeatable testing when that route is more efficient.
4. Grow verifies the implementation against the actual user requirement and current project checkpoint.
5. Only verified outputs are promoted to CURRENT / production baselines.

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

## Failure handling
Do not stop at “cannot verify.” Diagnose the cause, try an available alternative, test again, and only promote a result that has been verified as far as the available environment permits.

## Device continuity
PC and mobile are one continuous workstream. The latest verified checkpoint is the single source of truth regardless of which device Emotion uses next.
