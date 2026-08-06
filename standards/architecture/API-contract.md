# API Specification Standard

Version: 1.0  
Status: Released  
Owner: Solution Architect

Contributors (Optional):
- Staff Engineer
- Backend Engineer
- Frontend Engineer

---

# Purpose

This document defines the Engineering OS standard for API specifications.

An API Specification is a **binding contract** between frontend, backend, QA, and AI engineers. It defines how systems communicate before implementation begins.

This document specifies endpoints, requests, responses, validation rules, authentication, and error handling.

**Rule of Thumb:** If frontend, backend, QA, and AI engineers can independently implement and test the API from this document, then the specification has succeeded.

---

## API Information

| System | PRD Reference | System Design | Base URL | Status |
|----------|---------------|---------------|----------|--------|
| `[System Name]` | `[PRD-001]` | `[System-Design-XXX]` | `https://api.example.com/api/v1` | Draft / Approved |

---

# 1. Global Standards

- **Protocol:** REST / JSON (or GraphQL / gRPC where applicable)
- **Authentication:** JWT Bearer Token in the `Authorization` header
- **Dates:** ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- **Versioning:** Prefix all endpoints with `/api/v1/`
- **Standard Error Format:**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable details"
  }
}
```

- **Standard HTTP Status Codes**

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Validation Error |
| 500 | Internal Server Error |

- **Rate Limiting:** Document per-endpoint limits where applicable (e.g., `100 requests/minute`).
- **Idempotency:** Document if the endpoint requires an `Idempotency-Key` header.

---

# 2. Endpoint Contract

> Copy this section for every endpoint.

---

## `POST /api/v1/resource`

**Description**

Briefly describe the endpoint.

---

### Headers

| Header | Required | Description |
|---------|----------|-------------|
| Authorization | Yes | Bearer JWT Token |
| Content-Type | Yes | application/json |
| Idempotency-Key | Optional | Required for idempotent operations |

---

### Path / Query Parameters

*(Delete this section if none.)*

| Name | Type | Required | Validation / Rules | Description |
|------|------|----------|--------------------|-------------|
| id | UUID | Yes | Valid UUID | Resource identifier |

---

### Request Body

*(Delete this section for GET or DELETE requests.)*

| Field | Type | Required | Validation / Rules | Description |
|-------|------|----------|--------------------|-------------|
| name | String | Yes | Max 50 chars | Resource name |

---

### Success Response

**HTTP 201 Created**

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Resource ID |
| name | String | Resource name |

---

### Expected Errors

| HTTP Code | Reason |
|-----------|--------|
| 400 | Validation failed |
| 401 | Missing or invalid token |
| 403 | Permission denied |
| 404 | Resource not found |
| 409 | Duplicate resource |
| 422 | Business validation failed |
| 500 | Internal server error |

---

### Examples

#### Request

```http
POST /api/v1/resource
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Acme Corp"
}
```

#### Success Response

```json
{
  "id": "123e4567-e89b-12d3",
  "name": "Acme Corp"
}
```

---

# Writing Rules

- Design the API contract before implementation.
- Keep endpoint names resource-oriented.
- One endpoint equals one contract block.
- Every endpoint must include at least one request and response example.
- Document validation rules where they apply.
- Document rate limits where applicable.
- Document idempotency requirements where applicable.
- Maintain consistency with the approved System Design.

---

# Definition of Ready (DoR)

- System Design is approved.
- Resources are identified.
- Authentication approach is defined.
- Endpoint structure is agreed.

---

# Definition of Done (DoD)

- All endpoints are documented.
- Request and response schemas are complete.
- Validation rules are defined.
- Error responses are documented.
- Examples are provided.
- Peer reviewed.
- Approved by the Solution Architect.

---

# Naming Convention

```
API-Spec-<system-name>.md
```

Examples:

- `API-Spec-Payment-Gateway.md`
- `API-Spec-Merchant-Portal.md`
- `API-Spec-Notification-Service.md`

---

**Changelog:** Tracked via Git history.