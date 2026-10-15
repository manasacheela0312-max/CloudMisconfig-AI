from scanner import scan_config
from verifier import (
    propose_remediation,
    verify_remediation
)


def sample_config():
    return {
        "resources": [
            {
                "resource_id": "b1",
                "resource_type": "S3_BUCKET",
                "name": "documents",
                "public_access": True,
                "encryption_enabled": False,
                "intended_public": False
            },
            {
                "resource_id": "p1",
                "resource_type": "IAM_POLICY",
                "name": "admin-policy",
                "effect": "Allow",
                "actions": ["*"],
                "resources": ["*"]
            },
            {
                "resource_id": "b2",
                "resource_type": "S3_BUCKET",
                "name": "public-images",
                "public_access": True,
                "encryption_enabled": True,
                "intended_public": True
            }
        ]
    }


def test_detects_expected_issues():
    findings = scan_config(sample_config())

    assert len(findings) == 3
    assert all(
        f["resource_id"] != "b2"
        for f in findings
    )


def test_remediation_and_verification():
    config = sample_config()
    proposal = propose_remediation(config)

    result = verify_remediation(
        config,
        proposal["proposed_config"]
    )

    assert result["status"] == "VERIFIED"
    assert len(result["resolved"]) == 3


def test_invalid_configuration():
    try:
        scan_config({"wrong_key": []})
        assert False, "Expected ValueError"
    except ValueError:
        pass