from copy import deepcopy
from scanner import scan_config


def propose_remediation(config, finding_ids=None):
    proposed = deepcopy(config)
    findings = scan_config(config)

    selected_ids = set(
        finding_ids or [f["finding_id"] for f in findings]
    )

    changes = []

    for finding in findings:
        if finding["finding_id"] not in selected_ids:
            continue

        resource = next(
            (
                r for r in proposed["resources"]
                if r.get("resource_id") == finding["resource_id"]
            ),
            None
        )

        if resource is None:
            continue

        rule = finding["rule_id"]

        if rule == "S3_PUBLIC_ACCESS":
            before = resource.get("public_access")
            resource["public_access"] = False

            changes.append({
                "finding_id": finding["finding_id"],
                "resource": finding["resource_name"],
                "field": "public_access",
                "before": before,
                "after": False,
                "reason": "Disable unintended public access."
            })

        elif rule == "S3_ENCRYPTION":
            before = resource.get("encryption_enabled")
            resource["encryption_enabled"] = True

            changes.append({
                "finding_id": finding["finding_id"],
                "resource": finding["resource_name"],
                "field": "encryption_enabled",
                "before": before,
                "after": True,
                "reason": "Enable the sample encryption setting."
            })

        elif rule == "IAM_WILDCARD":
            before = {
                "actions": deepcopy(resource.get("actions", [])),
                "resources": deepcopy(resource.get("resources", []))
            }

            # Illustrative example only; requires review for real use.
            resource["actions"] = ["s3:GetObject"]
            resource["resources"] = [
                "arn:aws:s3:::REPLACE-WITH-APPROVED-BUCKET/*"
            ]

            changes.append({
                "finding_id": finding["finding_id"],
                "resource": finding["resource_name"],
                "field": "actions/resources",
                "before": before,
                "after": {
                    "actions": resource["actions"],
                    "resources": resource["resources"]
                },
                "reason": (
                    "Illustrative least-privilege policy. "
                    "Review permissions and replace the placeholder ARN."
                )
            })

    return {
        "proposed_config": proposed,
        "changes": changes
    }


def verify_remediation(original, proposed):
    before = scan_config(original)
    after = scan_config(proposed)

    before_map = {
        (f["resource_id"], f["rule_id"]): f for f in before
    }
    after_map = {
        (f["resource_id"], f["rule_id"]): f for f in after
    }

    resolved_keys = before_map.keys() - after_map.keys()
    remaining_keys = before_map.keys() & after_map.keys()
    new_keys = after_map.keys() - before_map.keys()

    resolved = [before_map[k] for k in resolved_keys]
    remaining = [after_map[k] for k in remaining_keys]
    new_findings = [after_map[k] for k in new_keys]

    if not remaining and not new_findings:
        status = "VERIFIED"
    elif resolved:
        status = "PARTIALLY_VERIFIED"
    else:
        status = "FAILED"

    return {
        "status": status,
        "resolved": resolved,
        "remaining": remaining,
        "new_findings": new_findings,
        "message": (
            "Verification was performed by rerunning "
            "the local security scanner."
        )
    }