from typing import Any
from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    config: dict[str, Any]


class AnalyzeRequest(BaseModel):
    findings: list[dict[str, Any]] = Field(default_factory=list)


class RemediateRequest(BaseModel):
    config: dict[str, Any]
    finding_ids: list[str] | None = None


class VerifyRequest(BaseModel):
    original: dict[str, Any]
    proposed: dict[str, Any]