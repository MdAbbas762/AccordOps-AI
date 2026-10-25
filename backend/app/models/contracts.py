from datetime import date, datetime

from pydantic import BaseModel


class ContractSummary(BaseModel):
    id: str
    title: str
    customer_name: str
    contract_type: str
    status: str
    effective_date: date | None = None
    expiration_date: date | None = None
    auto_renews: bool
    renewal_notice_days: int | None = None
    file_name: str | None = None
    mime_type: str | None = None
    page_count: int | None = None
    created_at: datetime


class ContractUploadResponse(ContractSummary):
    extracted_characters: int
