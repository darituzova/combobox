from fastapi import APIRouter, Query, HTTPException
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta, timezone

comparison_router = APIRouter(prefix="/api/v1", tags=["Сравнение датчиков"])

def get_sensor_meta(m_type: str):
    meta = {
        'temperature': ('Температура', '°C', '#ef4444'),
        'pressure': ('Давление', 'кПа', '#3b82f6'),
        'vibration': ('Вибрация', 'mm/s', '#eab308'),
        'humidity': ('Влажность', '%', '#06b6d4'),
        'energy': ('Энергия', 'кВт', '#22c55e')
    }
    return meta.get(m_type, ('Неизвестно', '', '#94a3b8'))

@comparison_router.get("/sensors", summary="7.2 Список всех датчиков (для выбора)")
@inject
async def get_all_sensors(session: FromDishka[AsyncSession]):
    query = text("SELECT id, name, type FROM machines ORDER BY id")
    result = await session.execute(query)
    rows = result.mappings().all()

    sensors = []
    for r in rows:
        label, unit, color = get_sensor_meta(r["type"])
        sensors.append({
            "id": r["id"], "name": r["name"], "type": r["type"],
            "type_label": label, "unit": unit, "color": color
        })
    return {"sensors": sensors}

@comparison_router.get("/comparison", summary="7.1 Данные для сравнения графиков")
@inject
async def get_comparison_data(
    device_ids: str = Query(..., description="ID через запятую, например: 1,2,3"),
    period: str = Query("1h"),
    parameter: str = Query("temperature"),
    session: FromDishka[AsyncSession] = None
):
    ids = [int(x.strip()) for x in device_ids.split(",") if x.strip().isdigit()]
    if not ids:
        raise HTTPException(status_code=400, detail="Неверный формат device_ids")

    if period == '24h': seconds = 86400
    elif period == 'week': seconds = 604800
    elif period == 'month': seconds = 2592000
    else: seconds = 3600

    devices_data = []
    allowed_columns = {"temperature", "vibration", "humidity", "pressure", "energy_consumption"}

    for m_id in ids:
        m_res = await session.execute(text("SELECT name, type FROM machines WHERE id = :id"), {"id": m_id})
        machine = m_res.mappings().first()
        if not machine: continue

        actual_param = machine["type"] if parameter == "default" or parameter not in allowed_columns else parameter
        if actual_param == "energy": actual_param = "energy_consumption"
        if actual_param not in allowed_columns: actual_param = "temperature"

        _, unit, _ = get_sensor_meta(actual_param)

        q_data = text(f"""
            SELECT time, {actual_param} as val
            FROM telemetry
            WHERE machine_id = :id AND time >= NOW() - INTERVAL '{seconds} seconds'
            ORDER BY time ASC
        """)
        d_res = await session.execute(q_data, {"id": m_id})

        data_points = [{"time": row["time"].strftime("%Y-%m-%dT%H:%M:%SZ"), "value": round(row["val"], 2)}
                       for row in d_res.mappings().all() if row["val"] is not None]

        devices_data.append({"id": m_id, "name": machine["name"], "unit": unit, "data": data_points})

    return {
        "devices": devices_data,
        "period": {"from": "calculated_by_db", "to": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    }
