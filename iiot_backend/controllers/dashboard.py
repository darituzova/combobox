from fastapi import APIRouter, Query, HTTPException
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta, timezone

from controllers.schemas import (
    KPIData, DashboardImportantResponse, ChartDataResponse,
    DashboardRecentAlertsResponse, DashboardSuspectResponse
)

dashboard_router = APIRouter(prefix="/api/v1/dashboard", tags=["Дашборд"])

def get_unit(m_type: str) -> str:
    units = {'temperature': '°C', 'pressure': 'кПа', 'vibration': 'mm/s', 'humidity': '%', 'energy': 'кВт'}
    return units.get(m_type, '')

@dashboard_router.get("/kpi", response_model=KPIData, summary="2.1 KPI-карточки")
@inject
async def get_kpi(session: FromDishka[AsyncSession]):
    total_m = await session.scalar(text("SELECT COUNT(*) FROM machines"))
    online_m = await session.scalar(text("SELECT COUNT(*) FROM machines WHERE status != 'offline'"))
    crit_alerts = await session.scalar(text("SELECT COUNT(*) FROM alerts WHERE status = 'pending' AND severity = 'critical'"))

    total_m = total_m or 0
    online_m = online_m or 0
    crit_alerts = crit_alerts or 0

    # Считаем "Здоровье системы" (100% минус штрафы за отключенные станки и аварии)
    health = 100 - (crit_alerts * 5) - ((total_m - online_m) * 2)
    health = max(0, min(100, health)) # Держим в рамках 0-100

    return {
        "total_machines": total_m,
        "online_machines": online_m,
        "critical_alerts": crit_alerts,
        "system_health": health
    }

@dashboard_router.get("/important", response_model=DashboardImportantResponse, summary="2.2 Важные станки")
@inject
async def get_important_machines(session: FromDishka[AsyncSession]):
    # Для MVP просто берем первые 6 станков
    query = text("SELECT id, name, type, status, updated_at FROM machines ORDER BY id LIMIT 6")
    result = await session.execute(query)
    rows = result.mappings().all()

    machines = []
    for r in rows:
        machines.append({
            "id": r["id"],
            "name": r["name"],
            "parameter": r["type"],
            "value": 0.0, # Заглушка
            "unit": get_unit(r["type"]),
            "status": r["status"],
            "updated_at": r["updated_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["updated_at"] else None
        })
    return {"machines": machines}

@dashboard_router.get("/chart/{machine_id}", response_model=ChartDataResponse, summary="2.3 Данные для графика")
@inject
async def get_chart_data(
    machine_id: int,
    session: FromDishka[AsyncSession],
    period: str = Query("1h"),
    parameter: str = Query("temperature")
):
    allowed_params = {"temperature", "vibration", "humidity", "pressure", "energy_consumption"}
    if parameter not in allowed_params:
        parameter = "temperature"

    # Считаем время
    now = datetime.now(timezone.utc)
    if period == '24h': delta = timedelta(days=1)
    elif period == 'week': delta = timedelta(weeks=1)
    elif period == '6h': delta = timedelta(hours=6)
    else: delta = timedelta(hours=1)

    start_time = now - delta

    # Запрашиваем телеметрию из TimescaleDB
    query = text(f"""
        SELECT time, {parameter} as val
        FROM telemetry
        WHERE machine_id = :m_id AND time >= :start
        ORDER BY time ASC
    """)
    result = await session.execute(query, {"m_id": machine_id, "start": start_time})
    rows = result.mappings().all()

    data_points = []
    for r in rows:
        if r["val"] is not None:
            data_points.append({
                "time": r["time"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "value": round(r["val"], 2),
                "is_anomaly": False
            })

    return {
        "machine_id": machine_id,
        "parameter": parameter,
        "unit": get_unit(parameter),
        "data": data_points,
        "anomaly_points": [] # Пока пусто, свяжем с ML-моделью позже
    }

@dashboard_router.get("/alerts/recent", response_model=DashboardRecentAlertsResponse, summary="2.5 Недавние решённые алерты")
@inject
async def get_recent_alerts(session: FromDishka[AsyncSession]):
    query = text("""
        SELECT a.id, m.name as machine_name, a.message, a.acknowledged_at
        FROM alerts a
        JOIN machines m ON a.machine_id = m.id
        WHERE a.status = 'acknowledged'
        ORDER BY a.acknowledged_at DESC NULLS LAST
        LIMIT 5
    """)
    result = await session.execute(query)
    rows = result.mappings().all()

    alerts = []
    for r in rows:
        alerts.append({
            "id": r["id"],
            "machine_name": r["machine_name"],
            "message": r["message"],
            "resolved_at": r["acknowledged_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["acknowledged_at"] else ""
        })
    return {"alerts": alerts}

@dashboard_router.get("/suspect", response_model=DashboardSuspectResponse, summary="2.6 Подозрительные датчики")
async def get_suspect_sensors():
    # Фейковые данные для UI, так как пороги (thresholds) высчитываются ML-моделью
    return {
        "machines": [
            {"id": 15, "name": "Датчик T-15", "issue": "Температура растёт", "value": 26.5, "unit": "°C", "threshold": 28.0},
            {"id": 28, "name": "Датчик V-28", "issue": "Вибрация выше нормы", "value": 0.45, "unit": "mm/s", "threshold": 0.40}
        ]
    }
