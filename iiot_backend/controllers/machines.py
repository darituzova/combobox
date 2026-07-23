from fastapi import APIRouter, Query, HTTPException
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from controllers.schemas import MachineListResponse, MachineDetail, HistoryRecordResponse
import math
from datetime import datetime, timedelta, timezone
from typing import List

def get_sensor_meta(sensor_type: str):
    meta = {
        "temperature": ("Температура", "°C", "#ef4444"),
        "vibration": ("Вибрация", "mm/s", "#eab308"),
        "humidity": ("Влажность", "%", "#06b6d4"),
        "pressure": ("Давление", "кПа", "#3b82f6"),
        "energy": ("Энергия", "кВт", "#22c55e"),
        "energy_consumption": ("Энергия", "кВт", "#22c55e")
    }
    return meta.get(sensor_type, ("Неизвестно", "", "#94a3b8"))

machines_router = APIRouter(prefix="/api/v1/machines", tags=["Все станки"])

def get_unit(m_type: str) -> str:
    units = {'temperature': '°C', 'pressure': 'кПа', 'vibration': 'mm/s', 'humidity': '%', 'energy': 'кВт'}
    return units.get(m_type, '')

@machines_router.get("", response_model=MachineListResponse, summary="4.1 Список всех станков (с фильтрами)")
@inject
async def get_machines(
    session: FromDishka[AsyncSession],
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1)
):
    query = text("""
        WITH LastTelemetry AS (
            SELECT machine_id, time as updated_at, temperature, vibration, humidity, pressure, energy_consumption,
                   ROW_NUMBER() OVER(PARTITION BY machine_id ORDER BY time DESC) as rn
            FROM telemetry
        )
        SELECT
            m.id,
            m.name,
            m.type,
            m.building,
            m.floor,
            lt.updated_at,
            lt.temperature, lt.vibration, lt.humidity, lt.pressure, lt.energy_consumption,
            CASE
                WHEN lt.updated_at IS NULL THEN 'offline'
                WHEN EXTRACT(EPOCH FROM (NOW() - lt.updated_at)) > 300 THEN 'offline'
                ELSE 'online'
            END as calculated_status
        FROM machines m
        LEFT JOIN LastTelemetry lt ON m.id = lt.machine_id AND lt.rn = 1
        ORDER BY m.id
        LIMIT :limit OFFSET :offset
    """)

    offset = (page - 1) * limit
    result = await session.execute(query, {"limit": limit, "offset": offset})
    rows = result.mappings().all()

    data = []
    for r in rows:
        val = None
        if r["type"] == "temperature": val = r["temperature"]
        elif r["type"] == "vibration": val = r["vibration"]
        elif r["type"] == "humidity": val = r["humidity"]
        elif r["type"] == "pressure": val = r["pressure"]
        elif r["type"] == "energy": val = r["energy_consumption"]

        _, unit, _ = get_sensor_meta(r["type"])

        final_status = r["calculated_status"]

        if final_status == 'online' and val is not None:
            if r["type"] == "temperature" and val > 80: final_status = "critical"
            elif r["type"] == "temperature" and val > 75: final_status = "warning"
            elif r["type"] == "vibration" and val > 15: final_status = "critical"
            elif r["type"] == "pressure" and (val < 100 or val > 105): final_status = "warning"

        data.append({
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "value": round(val, 2) if val is not None else None,
            "unit": unit,
            "status": final_status,
            "building": r["building"],
            "floor": r["floor"],
            "updated_at": r["updated_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["updated_at"] else None
        })

    total_machines = 50
    total_pages = (total_machines + limit - 1) // limit

    return {
        "data": data,
        "total": total_machines,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@machines_router.get("/{id}", response_model=MachineDetail, summary="4.2 Детальная информация по станку")
@inject
async def get_machine_detail(id: int, session: FromDishka[AsyncSession]):
    result = await session.execute(text("SELECT * FROM machines WHERE id = :id"), {"id": id})
    r = result.mappings().first()

    if not r:
        raise HTTPException(status_code=404, detail="Станок не найден")

    return {
        "id": r["id"],
        "name": r["name"],
        "type": r["type"],
        "value": 0.0,
        "unit": get_unit(r["type"]),
        "status": r["status"],
        "building": r["building"],
        "floor": r["floor"],
        "updated_at": r["updated_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["updated_at"] else None,
        "trust_indicator": "online",
        "anomaly_count": 0,
        "location": {
            "building": r["building"],
            "floor": r["floor"],
            "room": r["room"]
        }
    }

@machines_router.get("/{machine_id}/history", response_model=List[HistoryRecordResponse], summary="5.1 История показателей станка")
@inject
async def get_machine_history(
    machine_id: int,
    session: FromDishka[AsyncSession],
    period: str = Query("1h", description="Период: 1h, 1d, 1w")
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
        response_data.append({
            "timestamp": row["time"].strftime("%Y-%m-%dT%H:%M:%SZ"),
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
