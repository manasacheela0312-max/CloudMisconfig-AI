import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from scanner import scan_config
from agents import analyze_findings
from verifier import propose_remediation, verify_remediation
from schemas import (
    ScanRequest,
    AnalyzeRequest,
    RemediateRequest,
    VerifyRequest
)

app = FastAPI(
    title="CloudMisconfig AI",
    description="Agentic Cloud Security Auditor",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"]
)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "project": "CloudMisconfig AI"
    }


@app.get("/api/sample")
def get_sample():
    path = (
        Path(__file__).parent
        / "data"
        / "sample_cloud_config.json"
    )

    try:
        with open(path, "r", encoding="utf-8") as file:
            return json.load(file)
    except (OSError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=500,
            detail="Could not load sample configuration."
        ) from error


@app.post("/api/scan")
def scan(request: ScanRequest):
    try:
        findings = scan_config(request.config)

        return {
            "resource_count": len(
                request.config.get("resources", [])
            ),
            "finding_count": len(findings),
            "findings": findings
        }
    except (ValueError, TypeError, KeyError) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error


@app.post("/api/analyze")
def analyze(request: AnalyzeRequest):
    return analyze_findings(request.findings)


@app.post("/api/remediate")
def remediate(request: RemediateRequest):
    try:
        return propose_remediation(
            request.config,
            request.finding_ids
        )
    except (ValueError, TypeError, KeyError) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error


@app.post("/api/verify")
def verify(request: VerifyRequest):
    try:
        return verify_remediation(
            request.original,
            request.proposed
        )
    except (ValueError, TypeError, KeyError) as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        ) from error