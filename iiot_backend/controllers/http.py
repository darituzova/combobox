from fastapi import APIRouter, Query
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta, timezone
from typing import List

from controllers.schemas import HistoryRecordResponse

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

    rows = result.mappings().all()

    return {
        "status": "ok",
        "count": len(rows),
        "data": [dict(row) for row in rows]
    }

@http_router.get(
    "/api/v1/machines/{machine_id}/history",
    response_model=List[HistoryRecordResponse],
    summary="Получить историю телеметрии станка"
)
@inject
async def get_machine_history(
    machine_id: int,
    period: str = Query("1h", description="Период выборки: 1h (час), 1d (день), 1w (неделя)"),
    session: FromDishka[AsyncSession] = None
):
    now = datetime.now(timezone.utc)
    if period.endswith('d'):
        delta = timedelta(days=int(period[:-1]))
    elif period.endswith('w'):
        delta = timedelta(weeks=int(period[:-1]))
    else:
        val = period.replace('h', '')
        delta = timedelta(hours=int(val) if val.isdigit() else 1)

    start_time = now - delta

    query = text("""
        SELECT time, temperature, vibration, humidity, pressure, energy_consumption
        FROM telemetry
        WHERE machine_id = :machine_id AND time >= :start_time
        ORDER BY time ASC
    """)

    result = await session.execute(query, {"machine_id": machine_id, "start_time": start_time})
    rows = result.mappings().all()

    response_data = []
    for row in rows:
        ts_str = row["time"].strftime("%Y-%m-%dT%H:%M:%SZ")

        response_data.append({
            "timestamp": ts_str,
            "telemetry": {
                "temperature": row["temperature"],
                "vibration": row["vibration"],
                "humidity": row["humidity"],
                "pressure": row["pressure"],
                "energy_consumption": row["energy_consumption"],
            },
            "anomaly_flag": 0
        })

    return response_data
