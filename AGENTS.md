# Repository instructions

## Development policy

- This project is under active development and does not require backward compatibility. Prefer intentional breaking changes when they produce a cleaner, safer, or more coherent design.
- Implement the best current design rather than preserving legacy APIs, data formats, behavior, or structure. Update every affected caller, test, document, configuration file, and related component so the repository remains internally consistent.
- Do not leave compatibility shims, deprecated paths, transitional aliases, dead code, or migration-only branches unless the user explicitly requests them.
- Comments and documentation must describe only the current state and rationale. Remove obsolete comments and change-history narration such as notes about what was renamed, replaced, or previously supported.
- After the requested implementation and verification are complete, always perform a dedicated final refactoring pass. Simplify structure, remove duplication and dead code, improve names and boundaries, update affected documentation, and rerun relevant verification before declaring the task complete.

## Preserve useful project knowledge

- During every task, proactively record durable, repository-specific knowledge that would help future work in this `AGENTS.md` file.
- Add only information that is broadly reusable, such as verified commands, architecture constraints, non-obvious conventions, recurring pitfalls, and decisions that affect later changes.
- Do not add temporary observations, speculative conclusions, secrets, credentials, personal data, or details that are already obvious from the source tree.
- Keep additions concise, place them under an appropriate heading, and update or remove stale guidance when later evidence contradicts it.
- Treat updates to `AGENTS.md` as part of completing the task; no separate user request is required.

## Keep work resumable

- Maintain the current task state in `PROGRESS.md` at the repository root so work can resume after the session or context is lost.
- Create `PROGRESS.md` when substantive work begins. Update it after each meaningful milestone and before ending a turn with unfinished work.
- Record the task goal, completed work, important decisions and assumptions, files changed, verification already run and its results, blockers, and the exact next steps.
- Keep the progress log concise and current: replace obsolete status instead of accumulating a transcript. Never put secrets, credentials, or personal data in it.
- When starting or resuming work, read `PROGRESS.md` before making changes. Verify its claims against the current working tree because it may be stale.
- When a task is fully complete, mark it complete in `PROGRESS.md` and retain a short final summary unless the user explicitly asks to remove it.
- Do not commit changes unless the user explicitly requests a commit.

## Verified development environment and API constraints

- The locally installed Bitwig Studio 6.0.11 Controller API documentation is at `/Applications/Bitwig Studio.app/Contents/Resources/Documentation/control-surface/api/`.
- Bitwig Controller extensions can follow the selected Arranger clip with `createArrangerCursorClip(...)` and inspect notes through the finite step grid (`NoteStep`), but the API does not expose a way to register an extension-defined command in Bitwig's keyboard-shortcut list.
- The Controller API does not expose an Arranger clip's absolute timeline position through `Clip`/`CursorClip`; do not claim that absolute-position transfer is available without a separate, verified source for that position.
- Synthesizer V Studio 2's script runtime is ECMAScript 5.1. Keep delivered Synthesizer V scripts ES5-compatible.
- Run the repository's automated checks with `python3 -m unittest discover -s tests -v`; use JXA only as a local syntax parser for JavaScript because host API behavior still requires manual testing in Bitwig and Synthesizer V.
