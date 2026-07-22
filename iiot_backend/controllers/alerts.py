from fastapi import APIRouter, Query, HTTPException, WebSocket, WebSocketDisconnect
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from core.websocket import manager
from controllers.schemas import AlertListResponse, IncomingAlertSchema

alerts_router = APIRouter(prefix="/api/v1/alerts", tags=["История алертов"])

@alerts_router.get("", response_model=AlertListResponse, summary="6.1 Список всех алертов")
@inject
async def get_alerts(
    session: FromDishka[AsyncSession],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = None,
    priority: str = None
):
    where_clauses = ["1=1"]
    params = {}

    if status:
        where_clauses.append("a.status = :status")
        params["status"] = status
    if priority:
        where_clauses.append("a.severity = :priority")
        params["priority"] = priority

    where_str = " AND ".join(where_clauses)

    # 1. Считаем статистику для плашек наверху страницы
    stats_query = text("SELECT status, COUNT(*) FROM alerts GROUP BY status")
    stats_res = await session.execute(stats_query)
    stats_dict = {row[0]: row[1] for row in stats_res.fetchall()}

    pending = stats_dict.get('pending', 0)
    acknowledged = stats_dict.get('acknowledged', 0)
    escalated = stats_dict.get('escalated', 0)
    total = pending + acknowledged + escalated

    # 2. Вытаскиваем сами алерты с пагинацией
    offset = (page - 1) * limit
    params["limit"] = limit
    params["offset"] = offset

    query = text(f"""
        SELECT a.id, a.timestamp, m.name as device, m.building, m.floor, a.message,
               a.severity as priority, a.status, u.name as ack_by, a.acknowledged_at, a.escalated_at
        FROM alerts a
        LEFT JOIN machines m ON a.machine_id = m.id
        LEFT JOIN users u ON a.acknowledged_by = u.id
        WHERE {where_str}
        ORDER BY a.timestamp DESC
        LIMIT :limit OFFSET :offset
    """)

    result = await session.execute(query, params)
    rows = result.mappings().all()

    data = []
    for r in rows:
        device_full = f"{r['device']} (Корпус {r['building']}, {r['floor']} эт.)" if r['building'] else r['device']
        data.append({
            "id": r["id"],
            "time": r["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["timestamp"] else None,
            "device": device_full,
            "message": r["message"],
            "priority": r["priority"],
            "status": r["status"],
            "acknowledged_by": r["ack_by"],
            "acknowledged_at": r["acknowledged_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["acknowledged_at"] else None,
            "escalated_at": r["escalated_at"].strftime("%Y-%m-%dT%H:%M:%SZ") if r["escalated_at"] else None
        })

    return {
        "total": total, "page": page, "limit": limit, "data": data,
        "stats": {"pending": pending, "acknowledged": acknowledged, "escalated": escalated, "total": total}
    }

@alerts_router.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    """Сюда подключается веб-интерфейс Фронтенда для мгновенного приема аномалий"""
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@alerts_router.post("", summary="Отправить сигнал об аномалии (Для Аналитика)")
@inject
async def receive_alert(data: IncomingAlertSchema, session: FromDishka[AsyncSession]):
    query = text("""
        INSERT INTO alerts (machine_id, message, severity, status)
        VALUES (:m_id, :msg, :sev, 'pending')
        RETURNING id, timestamp
    """)
    result = await session.execute(query, {
        "m_id": data.machine_id,
        "msg": data.alert_type,
        "sev": "critical"
    })
    await session.commit()
    new_alert = result.mappings().first()

    ws_message = {
      "event": "new_alert",
      "data": {
        "id": new_alert["id"],
        "machine_id": data.machine_id,
        "machine_name": f"Станок #{data.machine_id}",
        "message": data.alert_type,
        "severity": "critical",
        "timestamp": new_alert["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ"),
        "status": "pending"
      }
    }
    await manager.broadcast(ws_message)
    return {"status": "alert_broadcasted", "message": ws_message}

@alerts_router.post("/{id}/acknowledge", summary="6.2 Подтверждение аварии")
@inject
async def acknowledge_alert(id: int, session: FromDishka[AsyncSession]):
    # 1. Имитируем авторизацию: берем первого попавшегося пользователя из БД
    user_id = await session.scalar(text("SELECT id FROM users LIMIT 1"))

    # Если база пустая — выдаем красивую ошибку, а не ломаем сервер
    if not user_id:
        raise HTTPException(
            status_code=400,
            detail="В системе нет ни одного пользователя! Зарегистрируйте инженера через /auth/register"
        )

    # 2. Обновляем статус аварии
    query = text("""
        UPDATE alerts
        SET status = 'acknowledged', acknowledged_by = :user_id, acknowledged_at = NOW()
        WHERE id = :id AND status = 'pending'
        RETURNING id, status, acknowledged_at
    """)
    result = await session.execute(query, {"id": id, "user_id": user_id})
    updated = result.mappings().first()

    if not updated:
        raise HTTPException(status_code=400, detail="Алерт не найден или уже подтверждён")

    await session.commit()

    # 3. Достаем имя инженера для красивого ответа
    user_name = await session.scalar(text("SELECT name FROM users WHERE id = :user_id"), {"user_id": user_id})

    return {
        "id": updated["id"],
        "status": updated["status"],
        "acknowledged_by": user_name,
        "acknowledged_at": updated["acknowledged_at"].strftime("%Y-%m-%dT%H:%M:%SZ")
    }

@alerts_router.post("/export", summary="6.3 Экспорт (Заглушка)")
async def export_alerts(format: str = Query("csv")):
    return {"message": f"Файл в формате {format} успешно сгенерирован (заглушка)"}
