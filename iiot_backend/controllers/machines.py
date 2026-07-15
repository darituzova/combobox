from fastapi import APIRouter, Query, HTTPException
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from controllers.schemas import MachineListResponse, MachineDetail
import math

machines_router = APIRouter(prefix="/api/v1/machines", tags=["Все станки"])

def get_unit(m_type: str) -> str:
    units = {'temperature': '°C', 'pressure': 'кПа', 'vibration': 'mm/s', 'humidity': '%', 'energy': 'кВт'}
    return units.get(m_type, '')

@machines_router.get("", response_model=MachineListResponse, summary="4.1 Список всех станков (с фильтрами)")
@inject
async def get_machines(
    session: FromDishka[AsyncSession],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = None,
    status: str = None,
    type: str = None,
    building: str = None,
    sort: str = "id",
    order: str = "asc"
):
    where_clauses = ["1=1"]
    params = {}

    # 1. Применяем фильтры
    if search:
        where_clauses.append("(name ILIKE :search OR id::text ILIKE :search)")
        params["search"] = f"%{search}%"
    if status:
        where_clauses.append("status = :status")
        params["status"] = status
    if type:
        where_clauses.append("type = :type")
        params["type"] = type
    if building:
        where_clauses.append("building = :building")
        params["building"] = building

    where_str = " AND ".join(where_clauses)

    # 2. Безопасная сортировка (защита от SQL-инъекций)
    allowed_sort = {"id", "name", "status", "updated_at", "type"}
    sort_col = sort if sort in allowed_sort else "id"
    sort_dir = "ASC" if order.lower() == "asc" else "DESC"

    # 3. Считаем общее количество для пагинации
    count_query = f"SELECT COUNT(*) FROM machines WHERE {where_str}"
    total_result = await session.execute(text(count_query), params)
    total_count = total_result.scalar() or 0

    # 4. Получаем саму страницу данных
    offset = (page - 1) * limit
    params["limit"] = limit
    params["offset"] = offset

    data_query = f"""
        SELECT * FROM machines
        WHERE {where_str}
        ORDER BY {sort_col} {sort_dir}
        LIMIT :limit OFFSET :offset
    """

    result = await session.execute(text(data_query), params)
    rows = result.mappings().all()

    data = []
    for r in rows:
        data.append({
            "id": r["id"],
            "name": r["name"],
            "type": r["type"],
            "value": 0.0,
            "unit": get_unit(r["type"]),
            "status": r["status"],
            "building": r["building"],
            "floor": r["floor"],
            "updated_at": r["updated_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["updated_at"] else None
        })

    return {
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total_count / limit) if limit else 1,
        "data": data
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
