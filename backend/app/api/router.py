from fastapi import APIRouter

from app.api.routes.approvals import router as approvals_router
from app.api.routes.audit import router as audit_router
from app.api.routes.automation import router as automation_router
from app.api.routes.contracts import router as contracts_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.health import router as health_router
from app.api.routes.monitoring import router as monitoring_router
from app.api.routes.obligations import router as obligations_router


api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(dashboard_router, tags=["Dashboard"])
api_router.include_router(contracts_router, tags=["Contracts"])
api_router.include_router(obligations_router, tags=["Obligations"])
api_router.include_router(monitoring_router, tags=["Exceptions"])
api_router.include_router(approvals_router, tags=["Approvals"])
api_router.include_router(audit_router, tags=["Audit"])
api_router.include_router(automation_router, tags=["Automation"])
