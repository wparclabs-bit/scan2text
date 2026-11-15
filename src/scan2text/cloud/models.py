"""Cloud Profile data models."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CloudRecipe(BaseModel):
    """Versioned prompt and sampling settings carried by a Cloud Profile."""

    version: str
    prompt: str
    temperature: float = Field(ge=0.0, le=2.0)
    top_p: float = Field(ge=0.0, le=1.0)
    thinking_enabled: bool = False


class CredentialDescriptor(BaseModel):
    """Non-secret description of a credential stored by the operating system."""

    key_id: str
    last_four: str = ""


class CloudCostEstimate(BaseModel):
    """Measured cost basis for a thirty-page Cloud document."""

    prompt_tokens_per_page: int
    completion_tokens_per_page: int
    pages_per_document: int = 30
    input_usd_per_million_tokens: float
    output_usd_per_million_tokens: float
    estimated_cost_usd: float
    measured_on: str
    basis: str


class CloudProfile(BaseModel):
    """Provider, model, Recipe, cost estimate, and secret-free key descriptor."""

    name: str = "Cloud Profile"
    beta: bool = True
    enabled: bool = False
    base_url: str
    model_id: str
    region: str = "United States"
    recipe: CloudRecipe
    cost_estimate: CloudCostEstimate
    credential: CredentialDescriptor | None = None
