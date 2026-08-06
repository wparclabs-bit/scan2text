# Architecture Decision Record (ADR) Standard (v1.0)

*An immutable log of significant technical decisions, their context, and their trade-offs.*

| System | ADR ID | Author | Status | Date |
|---|---|---|---|---|
| `[System Name]` | `ADR-001` | `[Name]` | `Proposed / Accepted / Superseded` | `YYYY-MM-DD` |

---

# 1. Context

*Why is this decision needed? Keep concise (3–5 sentences).*

- What problem are we solving?
- What are the key constraints?
- Reference existing documents instead of duplicating information.

**Related References**

- PRD:
- System Design:
- API Specification:
- Database Schema:
- Related ADRs:

---

# 2. Decision Matrix

*Evaluate the realistic options before making a decision.*

| Option | Pros | Cons | Decision |
|---|---|---|---|
| **Option A: [Name]** | - Example benefit | - Example drawback | ✅ Selected |
| **Option B: [Name]** | - Example benefit | - Example drawback | Rejected |
| **Option C: [Name]** | - Example benefit | - Example drawback | Rejected |

---

# 3. Decision

*What are we choosing?*

We will use **[Selected Option]** because **[one-sentence rationale]**.

---

# 4. Consequences

*Every engineering decision has a cost.*

### Benefits

- ...

### Trade-offs

- ...

### Risks

- ...

---

# 5. Engineering Governance

### Write an ADR when a decision affects:

- Architecture
- Technology stack
- Infrastructure
- Security
- Scalability
- Long-term maintainability

### Do NOT write an ADR for:

- Bug fixes
- Routine refactoring
- Minor library choices
- Coding style
- Temporary experiments

### Immutability Rule

Once an ADR is **Accepted**, its content must not be modified except for its **Status** field.

If a decision changes later:

1. Create a new ADR.
2. Record the new decision there.
3. Update the previous ADR status to **Superseded by ADR-XXX**.

This preserves the complete engineering decision history.

### Naming Convention

```
ADR-001-use-postgres.md
ADR-002-authentication-strategy.md
ADR-003-api-versioning.md
```

---

**Changelog:** Tracked via Git history.