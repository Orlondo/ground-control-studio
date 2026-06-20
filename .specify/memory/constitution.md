<!--
Sync Impact Report
- Version change: N/A -> 1.0.0
- Modified principles:
	- [PRINCIPLE_1_NAME] -> I. Spec-First Delivery
	- [PRINCIPLE_2_NAME] -> II. Scope-Locked Phase Execution
	- [PRINCIPLE_3_NAME] -> III. Typed Contracts and Validation
	- [PRINCIPLE_4_NAME] -> IV. Quality Gates Before Merge
	- [PRINCIPLE_5_NAME] -> V. Human Review and Traceability
- Added sections:
	- Technical Guardrails
	- Workflow and Review Gates
- Removed sections:
	- None
- Templates requiring updates:
	- ⚠ pending .specify/templates/commands/*.md (directory not present in this repo)
	- ✅ .specify/templates/plan-template.md (Constitution Check placeholder already compatible)
	- ✅ .specify/templates/spec-template.md (requirements and success-criteria structure compatible)
	- ✅ .specify/templates/tasks-template.md (phase and story structure compatible)
	- ✅ .github/prompts/speckit.constitution.prompt.md (agent mapping valid)
	- ✅ .github/prompts/speckit.specify.prompt.md (no conflicting constitution references)
	- ✅ .github/prompts/speckit.plan.prompt.md (no conflicting constitution references)
	- ✅ .github/prompts/speckit.tasks.prompt.md (no conflicting constitution references)
	- ✅ README.md (no conflicting constitution references)
	- ✅ AGENTS.md (compatible runtime guidance)
	- ✅ .github/copilot-instructions.md (compatible runtime guidance)
- Follow-up TODOs:
	- None
-->

# Liminal Episode Studio Constitution

## Core Principles

### I. Spec-First Delivery
Every material feature change MUST begin with a Spec Kit spec, then a plan, then
tasks before implementation starts. Architecture and scope decisions belong in
spec artifacts, not in ad-hoc implementation prompts. Rationale: stable specs are
required to keep implementation deterministic across human and AI contributors.

### II. Scope-Locked Phase Execution
Each implementation cycle MUST declare explicit in-scope and out-of-scope items,
and implementation MUST reject work outside the active phase unless the spec is
updated first. Rationale: this project relies on phased delivery to avoid feature
creep and preserve predictable iteration speed.

### III. Typed Contracts and Validation
All externally consumed data structures, API payloads, and core domain models MUST
have explicit TypeScript types and runtime validation at boundaries. Changes to
contract shapes MUST be reflected in spec and plan artifacts before merge.
Rationale: strong contracts prevent drift between UI, API, and generated content.

### IV. Quality Gates Before Merge
Changes MUST pass lint and type checks, and any newly added behavior MUST include
verification steps in tasks or quickstart artifacts. If tests are specified for a
feature, they MUST be written or updated as part of that feature. Rationale:
quality gates are the minimum control surface for safe AI-assisted development.

### V. Human Review and Traceability
AI-generated changes MUST be reviewed by a human before commit. Task execution
MUST maintain traceability from requirement -> task -> implementation, including
clear notes for assumptions and deferred items. Rationale: human accountability
and auditability are non-negotiable for long-term maintainability.

## Technical Guardrails

The project MUST use the existing Next.js + TypeScript stack unless a spec and
plan explicitly authorize a change. Feature work MUST prefer small, composable
modules over monolithic files. Runtime guidance in AGENTS.md and
.github/copilot-instructions.md is binding for implementation sessions.

## Workflow and Review Gates

The default workflow is Spec Kit: constitution -> specify -> plan -> tasks ->
implement. Before implementation, unresolved clarifications in spec artifacts
MUST be explicitly recorded as assumptions. During review, each pull request MUST
confirm constitutional compliance, scope adherence, and completion of required
quality gates.

## Governance

This constitution overrides conflicting local process notes. Amendments require a
documented rationale, explicit impact on templates/workflows, and a version bump
following semantic versioning rules:
- MAJOR: incompatible principle removals or redefinitions.
- MINOR: new principle/section or materially expanded obligations.
- PATCH: wording clarifications without behavioral change.

Compliance review is required for each plan and each pull request by checking the
Constitution Check section and validating that tasks and implementation remain
within approved scope.

**Version**: 1.0.0 | **Ratified**: 2026-06-19 | **Last Amended**: 2026-06-19
