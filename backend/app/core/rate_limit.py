from __future__ import annotations

from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import Depends, HTTPException, status

from app.core.auth import AuthContext, require_contract_editor


_WINDOW_SECONDS = 60.0
_MAX_MUTATIONS_PER_WINDOW = 30
_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def require_rate_limited_editor(
    current_user: AuthContext = Depends(require_contract_editor),
) -> AuthContext:
    """Simple single-process guard for expensive/mutating portfolio endpoints.

    Production deployments with multiple API workers should move this counter to
    Redis or an API gateway. The local MVP deliberately keeps the dependency
    small while still demonstrating abuse protection at the Python boundary.
    """
    now = monotonic()
    cutoff = now - _WINDOW_SECONDS
    key = f"{current_user.organization_id}:{current_user.user_id}"

    with _lock:
        bucket = _hits[key]
        while bucket and bucket[0] < cutoff:
            bucket.popleft()

        if len(bucket) >= _MAX_MUTATIONS_PER_WINDOW:
            retry_after = max(1, int(_WINDOW_SECONDS - (now - bucket[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many control-changing requests. Try again shortly.",
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)

    return current_user
