from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services.supabase import (
    get_supabase_admin,
    get_supabase_public,
)


security = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    email: str
    organization_id: str
    role: str


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AuthContext:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = credentials.credentials

    try:
        auth_response = get_supabase_public().auth.get_user(token)
        user = auth_response.user
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user could not be resolved",
        )

    try:
        profile_response = (
            get_supabase_admin()
            .table("profiles")
            .select("organization_id, role, email")
            .eq("id", str(user.id))
            .single()
            .execute()
        )

        profile = profile_response.data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AccordOps profile could not be loaded",
        ) from exc

    organization_id = profile.get("organization_id")

    if not organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not assigned to an organization",
        )

    return AuthContext(
        user_id=str(user.id),
        email=profile.get("email") or user.email or "",
        organization_id=str(organization_id),
        role=profile.get("role") or "viewer",
    )


def require_contract_editor(
    current_user: AuthContext = Depends(get_current_user),
) -> AuthContext:
    if current_user.role not in {"admin", "reviewer"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to upload contracts",
        )

    return current_user
