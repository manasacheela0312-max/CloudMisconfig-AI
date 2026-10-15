
import json


def scan_config(source):
    if isinstance(source, (str, bytes)):
        with open(source, "r", encoding="utf-8") as file:
            config = json.load(file)
    else:
        config = source

    # Accept multiple JSON structures.
    if isinstance(config, list):
        resources = config
    elif isinstance(config, dict):
        resources = config.get("resources")

        if resources is None:
            resources = config.get("misconfigurations")

        if resources is None:
            resources = config.get("findings")

        if resources is None:
            # Handle a single resource object.
            if "resource_type" in config:
                resources = [config]
            else:
                raise ValueError(
                    "No supported resource array found. "
                    "Expected resources, misconfigurations, or findings."
                )
    else:
        raise ValueError("JSON must contain an object or array.")

    if not isinstance(resources, list):
        raise ValueError("The resource collection must be an array.")

    normalized_config = {"resources": resources}

    # Continue using the existing detection rules.
    return _scan_resources(normalized_config)


def _scan_resources(config):
    findings = []

    for resource in config["resources"]:
        if not isinstance(resource, dict):
            continue

        resource_id = resource.get("resource_id", "unknown")
        name = resource.get("name", resource_id)
        resource_type = resource.get("resource_type")

        if resource_type == "S3_BUCKET":
            if (
                resource.get("public_access") is True
                and resource.get("intended_public") is not True
            ):
                findings.append({
                    "finding_id": f"{resource_id}-public",
                    "resource_id": resource_id,
                    "resource_name": name,
                    "issue": "Potentially public S3 bucket",
                    "severity": "HIGH",
                    "evidence": "public_access is true",
                    "recommendation": (
                        "Review effective permissions and disable "
                        "public access if it is not required."
                    ),
                    "rule_id": "S3_PUBLIC_ACCESS"
                })

            if resource.get("encryption_enabled") is False:
                findings.append({
                    "finding_id": f"{resource_id}-encryption",
                    "resource_id": resource_id,
                    "resource_name": name,
                    "issue": "Encryption configuration disabled",
                    "severity": "MEDIUM",
                    "evidence": "encryption_enabled is false",
                    "recommendation": (
                        "Enable the required encryption configuration."
                    ),
                    "rule_id": "S3_ENCRYPTION"
                })

        elif resource_type == "IAM_POLICY":
            actions = resource.get("actions", [])
            resources_list = resource.get("resources", [])

            if (
                resource.get("effect") == "Allow"
                and "*" in actions
                and "*" in resources_list
            ):
                findings.append({
                    "finding_id": f"{resource_id}-wildcard",
                    "resource_id": resource_id,
                    "resource_name": name,
                    "issue": "Overly permissive IAM policy",
                    "severity": "HIGH",
                    "evidence": "Effect Allow, Action *, Resource *",
                    "recommendation": (
                        "Replace wildcard permissions with "
                        "the minimum required permissions."
                    ),
                    "rule_id": "IAM_WILDCARD"
                })

    return findings
