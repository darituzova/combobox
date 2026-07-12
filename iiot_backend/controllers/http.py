from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter

# Заглушка
class ProcessAlertInteractorStub:
    async def __call__(self, dto: any) -> None:
        print(f"ПОЛУЧЕН АЛАРМ: {dto}")

from controllers.schemas import IncomingAlertSchema
from application.dto import AlertDTO

http_router = APIRouter()

@http_router.post("/api/v1/alerts")
@inject
async def receive_alert(
    data: IncomingAlertSchema,
    interactor: FromDishka[ProcessAlertInteractorStub]
):
    dto = AlertDTO(**data.model_dump())

    await interactor(dto)

    return {"status": "alert_received"}


from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
@http_router.get("/api/v1/telemetry/latest")
@inject
async def get_latest_telemetry(session: FromDishka[AsyncSession]):
    """
    Грязный эндпоинт без архитектуры.
    Берем сессию напрямую и делаем SELECT последних 10 записей.
    """
    query = text("SELECT * FROM telemetry ORDER BY time DESC LIMIT 10")
    result = await session.execute(query)

    # Превращаем результат БД в список словарей, чтобы FastAPI мог отдать это как JSON
    rows = result.mappings().all()

    return {
        "status": "ok",
        "count": len(rows),
        "data": [dict(row) for row in rows]
    }
