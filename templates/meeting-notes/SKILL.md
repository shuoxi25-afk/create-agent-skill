---
{{FRONTMATTER}}
---

# {{TITLE}}

{{DESCRIPTION}}

## Input and result

Accept pasted notes, a transcript, or a readable file supplied by the user. Return a meeting summary with decisions, action items, and open questions in the language of the notes unless the user requests another language.
For the default layout, read [the report template](assets/meeting-report.md). Adapt it to an explicitly requested format.
No external service or executable dependency is required for this instruction-only skill; the host must be able to read the supplied material.

## Workflow

1. Read the supplied notes. Reuse the supplied topic and meeting date; if absent, label them “待确认” or “Unconfirmed”. If there are no readable notes, request them before summarizing.
2. Extract only confirmed decisions. Keep a proposal, suggestion, disagreement, or pending approval separate from a decision.
3. Extract each explicit action, its owner, deadline, and a short source quote or location. Missing owner or deadline stays unconfirmed. Preserve a stated deadline; resolve a relative date only when a supplied meeting date and context make it unambiguous.
4. Record unresolved questions and contradictory statements with their source context. Ask a focused question only when needed to fulfill the user's requested result; otherwise include the uncertainty in the report.
5. Check every decision and action against the source. Keep distinct owners or deadlines in separate rows. If a section has no supported entries, say none were found.

## Trial

When asked to test this skill, use only the Raw input in [the worked example](references/example.md) as the source. Compare the resulting report with its Expected output and Acceptance checks after producing it. The expected answer is a reference for review, not an additional source of meeting facts.
