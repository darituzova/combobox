from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, timedelta, timezone
from typing import List

from controllers.schemas import (
    HistoryRecordResponse,
    IncomingAlertSchema,
    IncomingTelemetrySchema
)
from application.interactors import SaveTelemetryInteractor

# ==========================================
# БЕЗОПАСНЫЙ ИМПОРТ
# ==========================================
# Пытаемся импортировать доменную модель. Если она называется иначе
# или лежит в другом файле, сервер всё равно успешно запустится!
try:
    from domain.entities import TelemetryDM
except ImportError:
    TelemetryDM = None

http_router = APIRouter()

# ==========================================
# WEBSOCKET MANAGER
# ==========================================
class ConnectionManager:
    def __init__(self):
        # Храним список всех подключенных Фронтендов
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Рассылаем сообщение всем подключенным клиентам
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()


# ==========================================
# 1. КОНТРАКТ №3: WebSocket для Фронтенда (Реалтайм алерты)
# ==========================================
@http_router.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    """Сюда подключается веб-интерфейс Фронтенда для мгновенного приема аномалий"""
    await manager.connect(websocket)
    try:
        while True:
            # Просто удерживаем соединение активным
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ==========================================
# 2. КОНТРАКТ №3: Прием аномалии от Аналитика (HTTP POST)
# ==========================================
@http_router.post("/api/v1/alerts", summary="Отправить сигнал об аномалии (Для Аналитика)")
async def receive_alert(data: IncomingAlertSchema):
    """
    Сюда отправляет данные модель машинного обучения (Аналитик).
    Бэкенд транслирует полученный алерт по WebSocket на Фронтенд.
    """
    ws_message = {
      "event": "critical_anomaly",
      "data": {
        "machine_id": data.machine_id,
        "failure_type": data.alert_type,
        "downtime_risk": 1.0
      }
    }

    # Отправляем во все вебсосокеты
    await manager.broadcast(ws_message)

    return {"status": "alert_broadcasted", "message": ws_message}


# ==========================================
# 3. КОНТРАКТ №2: История для Фронтенда (HTTP GET)
# ==========================================
@http_router.get(
    "/api/v1/machines/{machine_id}/history",
    response_model=List[HistoryRecordResponse],
    summary="Получить историю телеметрии станка (Для графиков)"
)
@inject
async def get_machine_history(
    machine_id: int,
    period: str = Query("1h", description="Период: 1h, 1d, 1w"),
    session: FromDishka[AsyncSession] = None
):
    """Возвращает структурированную историю телеметрии по конкретному станку"""
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


# ==========================================
# 4. ЗАПАСНОЙ HTTP-КАНАЛ: Прием телеметрии (Контракт №1)
# ==========================================
@http_router.post(
    "/api/v1/telemetry",
    summary="Запасной HTTP-канал: Отправить телеметрию напрямую в БД"
)
@inject
async def receive_telemetry(
    data: IncomingTelemetrySchema,
    interactor: FromDishka[SaveTelemetryInteractor]
):
    """
    Альтернативный HTTP-эндпоинт для отправки телеметрии в обход MQTT.
    Полезен для тестирования через Postman/Swagger или на случай сбоя брокера.
    """
    if TelemetryDM:
        # Распаковываем вложенный JSON в плоскую структуру
        dto = TelemetryDM(
            machine_id=data.machine_id,
            temperature=data.telemetry.temperature,
            vibration=data.telemetry.vibration,
            humidity=data.telemetry.humidity,
            pressure=data.telemetry.pressure,
            energy_consumption=data.telemetry.energy_consumption
        )
    else:
        # Если класс не импортировался, передаем сырую схему
        dto = data

    await interactor(dto)

    return {"status": "telemetry_saved"}


# ==========================================
# 5. ДИАГНОСТИКА: Просмотр последних записей в БД
# ==========================================
@http_router.get("/api/v1/telemetry/latest", summary="Диагностика: Показать 10 последних записей в БД")
@inject
async def get_latest_telemetry(session: FromDishka[AsyncSession]):
    """Вспомогательный эндпоинт для быстрой проверки записи"""
    query = text("SELECT * FROM telemetry ORDER BY time DESC LIMIT 10")
    result = await session.execute(query)

    rows = result.mappings().all()

    return {
        "status": "ok",
        "count": len(rows),
        "data": [dict(row) for row in rows]
    }
