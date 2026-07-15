from fastapi import APIRouter, HTTPException
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from controllers.schemas import MapDevicesResponse, MapDeviceDetail

map_router = APIRouter(prefix="/api/v1/map", tags=["Карта цеха"])

# Вспомогательная функция для проставления единиц измерения
def get_unit(m_type: str) -> str:
    units = {'temperature': '°C', 'pressure': 'кПа', 'vibration': 'mm/s', 'humidity': '%', 'energy': 'кВт'}
    return units.get(m_type, '')

@map_router.get("/devices", response_model=MapDevicesResponse, summary="3.1 Список устройств для карты")
@inject
async def get_map_devices(
    session: FromDishka[AsyncSession],
    building: str = None,
    floor: int = None,
    status: str = None
):
    query_str = "SELECT * FROM machines WHERE 1=1"
    params = {}

    if building:
        query_str += " AND building = :building"
        params["building"] = building
    if floor:
        query_str += " AND floor = :floor"
        params["floor"] = floor
    if status:
        query_str += " AND status = :status"
        params["status"] = status

    result = await session.execute(text(query_str), params)
    rows = result.mappings().all()

    devices = []
    for r in rows:
        devices.append({
            "id": r["id"],
            "name": r["name"],
            "building": r["building"],
            "floor": r["floor"],
            "latitude": r["latitude"],
            "longitude": r["longitude"],
            "status": r["status"],
            "type": r["type"],
            "value": 0.0,
            "unit": get_unit(r["type"]),
            "updated_at": r["updated_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["updated_at"] else None
        })
    return {"devices": devices}

@map_router.get("/devices/{id}", response_model=MapDeviceDetail, summary="3.2 Детальная информация по устройству (Карта)")
@inject
async def get_map_device_detail(id: int, session: FromDishka[AsyncSession]):
    result = await session.execute(text("SELECT * FROM machines WHERE id = :id"), {"id": id})
    r = result.mappings().first()

    if not r:
        raise HTTPException(status_code=404, detail="Устройство не найдено")

    return {
        "id": r["id"],
        "name": r["name"],
        "building": r["building"],
        "floor": r["floor"],
        "latitude": r["latitude"],
        "longitude": r["longitude"],
        "status": r["status"],
        "type": r["type"],
        "value": 0.0,
        "unit": get_unit(r["type"]),
        "updated_at": r["updated_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["updated_at"] else None,
        "trust_indicator": "online"
    }
