from fastapi import APIRouter
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from controllers.schemas import IncomingTelemetrySchema
from application.interactors import SaveTelemetryInteractor

try:
    from domain.entities import TelemetryDM
except ImportError:
    TelemetryDM = None

telemetry_router = APIRouter(prefix="/api/v1/telemetry", tags=["Телеметрия и Диагностика"])

@telemetry_router.post("", summary="Запасной HTTP-канал: Отправить телеметрию напрямую в БД")
@inject
async def receive_telemetry(data: IncomingTelemetrySchema, interactor: FromDishka[SaveTelemetryInteractor]):
    if TelemetryDM:
        dto = TelemetryDM(
            machine_id=data.machine_id,
            temperature=data.telemetry.temperature,
            vibration=data.telemetry.vibration,
            humidity=data.telemetry.humidity,
            pressure=data.telemetry.pressure,
            energy_consumption=data.telemetry.energy_consumption
        )
    else:
        dto = data
    await interactor(dto)
    return {"status": "telemetry_saved"}

@telemetry_router.get("/latest", summary="Диагностика: Показать 1000 последних записей в БД")
@inject
async def get_latest_telemetry(session: FromDishka[AsyncSession]):
    query = text("SELECT * FROM telemetry ORDER BY time DESC LIMIT 1000")
    result = await session.execute(query)
    rows = result.mappings().all()
    return {"status": "ok", "count": len(rows), "data": [dict(row) for row in rows]}
