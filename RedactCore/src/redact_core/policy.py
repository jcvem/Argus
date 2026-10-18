import os
from pathlib import Path
import yaml
from redact_core.models import (
    PolicyRule,
    RedactionPolicy,
    ResourceContext,
    SubjectContext,
)


def get_default_policies_dir() -> Path:
    """Finds policy directory via env var, working directory, app root, or repo tree."""
    env_dir = os.environ.get("REDACTCORE_POLICIES_DIR")
    if env_dir:
        return Path(env_dir)
    cwd_policies = Path.cwd() / "policies"
    if cwd_policies.exists():
        return cwd_policies
    app_policies = Path("/app/policies")
    if app_policies.exists():
        return app_policies
    repo_policies = Path(__file__).resolve().parent.parent.parent / "policies"
    return repo_policies


POLICIES_DIR = get_default_policies_dir()


class PolicyEngine:
    """Loads and evaluates redaction policies against subject and resource context."""

    def __init__(self, policies_dir: Path | str | None = None):
        self.policies_dir = Path(policies_dir) if policies_dir else get_default_policies_dir()
        self._policies: dict[str, RedactionPolicy] = {}
        self.reload_policies()

    def reload_policies(self) -> None:
        """Reloads all YAML policy definitions from disk."""
        self._policies.clear()
        if not self.policies_dir.exists():
            return

        for p_file in self.policies_dir.glob("*.yaml"):
            try:
                data = yaml.safe_load(p_file.read_text(encoding="utf-8"))
                policy = RedactionPolicy(**data)
                self._policies[policy.policy_id] = policy
            except Exception as e:
                print(f"Warning: Failed to load policy {p_file.name}: {e}")

    def list_policies(self) -> list[RedactionPolicy]:
        """Returns all currently loaded policies."""
        return list(self._policies.values())

    def get_policy(self, policy_id: str) -> RedactionPolicy:
        """Retrieves a policy by ID, or raises KeyError if not found."""
        if policy_id not in self._policies:
            # Try reloading once in case a new file was added
            self.reload_policies()
        if policy_id not in self._policies:
            raise KeyError(f"Policy '{policy_id}' not found. Available: {list(self._policies.keys())}")
        return self._policies[policy_id]

    def save_policy(self, policy: RedactionPolicy) -> Path:
        """Saves a policy as a YAML file in policies_dir, and activates it in memory."""
        self.policies_dir.mkdir(parents=True, exist_ok=True)
        safe_id = "".join(c for c in policy.policy_id if c.isalnum() or c in ("-", "_")).strip()
        if not safe_id:
            raise ValueError(f"Invalid policy_id '{policy.policy_id}'")

        target_file = self.policies_dir / f"{safe_id}.yaml"
        # Convert Pydantic model to clean dictionary
        raw_dict = policy.model_dump(exclude_none=True)
        yaml_str = yaml.dump(raw_dict, sort_keys=False)
        target_file.write_text(yaml_str, encoding="utf-8")

        # Cache in memory
        self._policies[policy.policy_id] = policy
        return target_file

    def delete_policy(self, policy_id: str) -> bool:
        """Deletes a policy YAML file from policies_dir and unloads it from memory."""
        safe_id = "".join(c for c in policy_id if c.isalnum() or c in ("-", "_")).strip()
        if not safe_id:
            raise ValueError(f"Invalid policy_id '{policy_id}'")

        target_file = self.policies_dir / f"{safe_id}.yaml"
        file_existed = False
        if target_file.exists():
            target_file.unlink()
            file_existed = True

        memory_existed = policy_id in self._policies or safe_id in self._policies
        if policy_id in self._policies:
            del self._policies[policy_id]
        if safe_id in self._policies:
            del self._policies[safe_id]

        return file_existed or memory_existed

    def evaluate_rule(
        self,
        policy: RedactionPolicy,
        entity_type: str,
        subject: SubjectContext,
        resource: ResourceContext | None = None,
    ) -> PolicyRule:
        """Evaluates policy rules for a specific entity type under the given subject/resource context."""
        # Find explicit rule for this entity_type
        for rule in policy.rules:
            if rule.entity_type.upper() == entity_type.upper():
                # Check optional condition matching if specified
                if rule.conditions:
                    req_roles = rule.conditions.get("roles", [])
                    if req_roles and not (subject.roles & set(req_roles)):
                        # If condition not met, fall back to redact
                        return PolicyRule(
                            entity_type=entity_type,
                            action="redact",
                            replacement=f"[{entity_type} REDACTED]",
                            description="Access condition not met",
                        )
                return rule

        # Fallback to default action
        return PolicyRule(
            entity_type=entity_type,
            action=policy.default_action,
            replacement=f"[{entity_type} REDACTED]" if policy.default_action == "redact" else None,
            description="Policy default action applied",
        )


# Global policy engine instance
default_policy_engine = PolicyEngine()
