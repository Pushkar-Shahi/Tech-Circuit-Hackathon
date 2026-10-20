"""Authentication & authorization for VeriBrand AI.

Supports two modes:
- AUTH_MODE=demo: reads role from X-Demo-Role header (default admin / owner)
- AUTH_MODE=jwt: verifies HS256 JWT bearer token containing {"sub", "name", "role", "org_id"}

Enforces strict tenant isolation and role permissions across all endpoints.
"""

import base64
from dataclasses import dataclass
import hmac
import json
import time
from typing import Literal

from fastapi import Depends, Request

from app.core.config import get_settings
from app.core.errors import ApiError, forbidden

Role = Literal["owner", "admin", "manager", "creator", "specialist"]
ROLES: tuple[Role, ...] = ("owner", "admin", "manager", "creator", "specialist")

PERMISSIONS = (
    "brand.manage",
    "brain.ingest",
    "rules.manage",
    "rules.approve",
    "campaign.create",
    "campaign.scan",
    "campaign.edit",
    "rewrite.accept",
    "override.request",
    "override.decide",
    "campaign.approve",
    "campaign.publish",
    "campaign.escalate",
    "analytics.view",
    "audit.view",
    "settings.manage",
)

MATRIX: dict[str, set[str]] = {
    "owner": set(PERMISSIONS),
    "admin": {
        "brand.manage",
        "brain.ingest",
        "rules.manage",
        "rules.approve",
        "campaign.create",
        "campaign.scan",
        "campaign.edit",
        "rewrite.accept",
        "override.decide",
        "campaign.approve",
        "analytics.view",
        "audit.view",
    },
    "manager": {
        "campaign.create",
        "campaign.scan",
        "campaign.edit",
        "rewrite.accept",
        "override.decide",
        "campaign.approve",
        "campaign.publish",
        "campaign.escalate",
        "analytics.view",
    },
    "creator": {
        "campaign.create",
        "campaign.scan",
        "campaign.edit",
        "rewrite.accept",
        "override.request",
    },
    "specialist": {
        "campaign.scan",
        "rewrite.accept",
        "override.decide",
        "campaign.approve",
        "audit.view",
        "analytics.view",
    },
}

DEMO_USERS: dict[str, str] = {
    "owner": "Elena Vance",
    "admin": "Marcus Sterling",
    "manager": "Sarah Jenkins",
    "creator": "Liam Chen",
    "specialist": "Rachel Adams",
}


@dataclass(frozen=True)
class User:
    name: str
    role: str
    org_id: str = "org_acme"
    ip: str | None = None

    def can(self, perm: str) -> bool:
        return perm in MATRIX.get(self.role, set())


def role_can(role: str, perm: str) -> bool:
    return perm in MATRIX.get(role, set())


def _client_ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None


def _b64url_decode(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _verify_jwt(token: str, secret: str) -> dict:
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
        header = json.loads(_b64url_decode(header_b64))
        if header.get("alg") != "HS256":
            raise ValueError("unsupported alg")
        expected = hmac.digest(secret.encode(), f"{header_b64}.{payload_b64}".encode(), "sha256")
        if not hmac.compare_digest(expected, _b64url_decode(sig_b64)):
            raise ValueError("bad signature")
        payload = json.loads(_b64url_decode(payload_b64))
        if "exp" in payload and time.time() > float(payload["exp"]):
            raise ValueError("expired")
        return payload
    except ValueError as e:
        raise ApiError(401, "unauthorized", f"Invalid token: {e}") from e
    except Exception as e:
        raise ApiError(401, "unauthorized", "Invalid token") from e


def current_user(request: Request) -> User:
    settings = get_settings()
    ip = _client_ip(request)
    if settings.auth_mode == "jwt":
        auth = request.headers.get("authorization", "")
        if not auth.lower().startswith("bearer "):
            raise ApiError(401, "unauthorized", "Missing bearer token")
        if not settings.jwt_secret:
            raise ApiError(500, "internal_error", "JWT_SECRET is not configured")
        claims = _verify_jwt(auth[7:].strip(), settings.jwt_secret.get_secret_value())
        role = claims.get("role", "creator")
        if role not in ROLES:
            raise ApiError(403, "forbidden", f"Unknown role '{role}'")
        return User(
            name=claims.get("name") or claims.get("sub", "user"),
            role=role,
            org_id=claims.get("org_id", "org_acme"),
            ip=ip,
        )
    role = (request.headers.get("x-demo-role") or "admin").strip().lower()
    if role not in ROLES:
        role = "admin"
    return User(name=DEMO_USERS.get(role, "Marcus Sterling"), role=role, org_id="org_acme", ip=ip)


def require(perm: str):
    """Dependency factory: `user: User = Depends(require("rules.manage"))`."""

    def dep(user: User = Depends(current_user)) -> User:
        if not user.can(perm):
            raise forbidden(user.role, perm)
        return user

    return dep
