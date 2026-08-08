ADR-004: Second-Brain Vault Consolidation & QA Home
Status: Accepted
Date: 2026-08-08
Context: The vault had duplicate numeric prefixes (02-ADRs + 02-Architecture, 03-Product + 03-Sprints), making sort order ambiguous and inviting agents to write files to wrong paths. The PRD-locked QA artifact path second-brain/02-QA/ did not exist. ADRs lived in a top-level folder separate from the architecture they justify.
Decision: CEO restructured the vault in Obsidian (so wikilinks auto-repair): unique numeric prefixes; ADRs merged under Architecture as 03-Architecture/ADRs/; new 02-QA/ created as the locked home for manual test scripts; Product holds PRD v1.7 files 01-04; Sprints renumbered. AGENTS.md vault map updated to match; this ADR lives in 03-Architecture/ADRs/.
Consequences:
Positive: Deterministic sort order removes wrong-path guesses by agents; single architecture home; the PRD contract path 02-QA/ now exists.
Positive: Future ADRs are co-located with the architecture they justify.
Negative: Any pre-existing hardcoded references to old folder names (02-ADRs, 02-Architecture, 03-Product, 03-Sprints) break until updated.
Required change: AGENTS.md vault map rewritten (this session). Grep the repo for old path strings before Phase 7. CEO performed renames in the Obsidian UI to preserve backlinks.