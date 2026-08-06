# Testing Strategy & Standard (v1.0)

*We test to ship with confidence, not to achieve coverage metrics. Test behavior, not implementation.*

| System | PRD Ref | Preferred Frameworks | Status |
|---|---|---|---|
| `[System Name]` | `[PRD-001]` | `[e.g., Jest, Supertest, Playwright]` | `Active` |

---

# 1. Purpose

Define the testing strategy and minimum quality standards for Engineering OS projects.

Project-specific test cases belong in the Test Plan.

---

# 2. The Testing Pyramid

*Follow this hierarchy. Do not invert the pyramid by relying primarily on slow end-to-end tests.*

### 1. Unit Tests (20%)

**Purpose:** Fast, isolated business logic.

**Examples**

- Utility functions
- Data transformers
- Validation rules
- Business calculations

---

### 2. Integration Tests (70%)

**Purpose:** Verify components work together correctly.

**Examples**

- API ↔ Database
- API ↔ External Services
- Authentication & Authorization
- Business workflows

---

### 3. End-to-End (E2E) Tests (10%)

**Purpose:** Verify Critical User Journeys (CUJ).

**Examples**

- User registration
- Login
- Checkout
- Payment
- Order creation

---

# 3. Test Ownership

| Test Level | Owner |
|---|---|
| Unit | Developer |
| Integration | Developer |
| End-to-End (E2E) | Developer / QA |
| User Acceptance Testing (UAT) | Product Owner / Business |

---

# 4. Definition of Done Checklist

*A feature is **not** complete until:*

- [ ] Happy Path passes in Continuous Integration.
- [ ] Negative scenarios return expected errors (e.g., 400/401/403/404/422), not unexpected server failures.
- [ ] Authentication and authorization rules are verified.
- [ ] Regression tests cover bug fixes.
- [ ] All required tests pass in the CI pipeline.

---

# 5. What We Do NOT Test

Avoid wasting engineering effort on:

- Third-party library internals.
- Framework implementation details.
- Function call counts or other implementation details.
- Pixel-perfect UI validation (unless required by the project).

Focus on observable behavior and business outcomes.

---

# 6. Test Data & Environment

- Every test run starts from a clean environment.
- Use factories or fixtures to generate test data.
- Never use production or sensitive customer data.
- Store test secrets in dedicated test configuration (e.g., `.env.test`).

---

# 7. References

- PRD
- User Story
- API Specification
- Test Plan

---

# 8. Engineering Governance

### Continuous Integration

- Pull Requests must pass the complete test suite before merge.

### Regression Testing

- Every bug fix must include a regression test that reproduces the issue before the fix is applied.

### Test Naming

Test files should follow the project naming convention.

Example:

```
auth.service.ts
auth.service.spec.ts
```

---

# 9. Writing Rules

- Test behavior, not implementation.
- Prefer integration tests over excessive end-to-end tests.
- Keep tests deterministic and repeatable.
- Avoid duplicated test logic.
- Keep test suites fast and maintainable.

---

# 10. Definition of Ready (DoR)

- Requirements approved.
- Acceptance Criteria defined.
- Test environment available.
- Required test data prepared.

---

# 11. Definition of Done (DoD)

- Required tests completed.
- CI pipeline passing.
- Critical defects resolved or accepted.
- Regression tests added for bug fixes.
- Test Plan updated where applicable.

---

# 12. Naming Convention

```
Testing-Standard.md
```

---

**Changelog:** Tracked via Git history.