# Code Review Checklist (v1.0)

*Code reviews are about catching bugs, sharing knowledge, and maintaining architectural integrity. Review the code, not the developer.*

---

## 1. Architecture & Design (The "Big Picture")

- [ ] **Alignment:** Does this match the approved System Design and API Specification?
- [ ] **Scope:** Is the PR small and focused? (If >500 lines, consider asking the author to split it.)
- [ ] **Backward Compatibility:** Will this break existing clients? (e.g., renamed API fields, removed database columns without migration.)
- [ ] **ADR:** If a new library, framework, or major architectural pattern was introduced, is there an ADR?

---

## 2. Functional & Logic (The "Does it work?")

- [ ] **Requirements:** Are all User Story Acceptance Criteria satisfied?
- [ ] **Edge Cases:** What happens with empty, null, invalid, or unusually large inputs?
- [ ] **Error Handling:** Are failures handled gracefully? Are errors logged where appropriate?
- [ ] **Concurrency:** If handling payments, webhooks, or background jobs, is the implementation idempotent and concurrency-safe?

---

## 3. Code Quality & Maintainability (The "Clean Code")

- [ ] **Naming:** Do variables, functions, and classes clearly describe their purpose?
- [ ] **DRY:** Is duplicated logic avoided or extracted appropriately?
- [ ] **Dead Code:** Are unused imports, commented code, debug statements, and temporary code removed?
- [ ] **Magic Values:** Are hardcoded values replaced with named constants, configuration, or environment variables?

---

## 4. Security & Performance (The "Production Ready")

- [ ] **Secrets:** No hardcoded API keys, passwords, or tokens. *(Blocker)*
- [ ] **Authentication & Authorization:** Access control is correctly enforced.
- [ ] **Database:** Queries are efficient. Required indexes or migrations are included where appropriate.
- [ ] **Validation:** All external input (user input, APIs, webhooks) is validated before processing.

---

## 5. Testing & CI (The "Safety Net")

- [ ] **Automated Tests:** Happy Path and Negative Path are covered.
- [ ] **Mocking:** External services are properly mocked during automated tests.
- [ ] **Continuous Integration:** All automated checks (Lint, Test, Build) pass successfully.

---

## 6. References

- PRD
- User Story
- System Design
- API Specification
- ADR
- Testing Strategy & Standard

---

## 7. Reviewer Governance (The "Rules of Engagement")

### Review Principles

- Review the code, not the developer.
- Explain the reasoning behind feedback.
- Praise good solutions and thoughtful implementation.
- Keep reviews constructive, objective, and respectful.

### Feedback Categories

- **[Blocker]** – Must be resolved before merge (security, data loss, critical bugs).
- **[Suggestion]** – Recommended improvement, but optional.
- **[Nit]** – Minor style or formatting preference.
- **[Question]** – Request clarification or explanation.

### Timeliness

- Reviews should normally be completed within **24 hours**.
- Avoid leaving Pull Requests waiting without feedback.

---

## 8. Review Outcome

- [ ] Approved
- [ ] Changes Requested

---

**Changelog:** Tracked via Git history.