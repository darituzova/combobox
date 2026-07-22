from fastapi import APIRouter, HTTPException
from dishka.integrations.fastapi import FromDishka, inject
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import json
from controllers.schemas import SettingsResponse, ImportantSensorsRequest, DefaultChartRequest

settings_router = APIRouter(prefix="/api/v1/settings", tags=["Настройки системы"])

def parse_jsonb(val):
    if isinstance(val, str): return json.loads(val)
    return val if val else {}

@settings_router.get("", response_model=SettingsResponse, summary="8.1 Получить все настройки")
@inject
async def get_settings(session: FromDishka[AsyncSession]):
    # 1. Умный поиск пользователя (вместо хардкода user_id = 1)
    user_id = await session.scalar(text("SELECT id FROM users LIMIT 1"))
    if not user_id:
        raise HTTPException(status_code=400, detail="В системе нет пользователей. Зарегистрируйтесь через /auth/register")

    sys_row = (await session.execute(text("SELECT * FROM system_settings LIMIT 1"))).mappings().first()
    usr_row = (await session.execute(text("SELECT * FROM user_settings WHERE user_id = :uid"), {"uid": user_id})).mappings().first()

    if not usr_row:
        await session.execute(text("""
            INSERT INTO user_settings (user_id, important_sensors, default_chart_sensor)
            VALUES (:uid, '[1, 2, 3, 4, 5, 6]', 1)
        """), {"uid": user_id})
        await session.commit()
        usr_row = (await session.execute(text("SELECT * FROM user_settings WHERE user_id = :uid"), {"uid": user_id})).mappings().first()

    return {
        "system": {
            "escalation_timeout": sys_row["escalation_timeout"],
            "channels": parse_jsonb(sys_row["channels"]),
            "priorities": parse_jsonb(sys_row["priorities"])
        },
        "user": {
            "important_sensors": parse_jsonb(usr_row["important_sensors"]) or [],
            "default_chart_sensor": usr_row["default_chart_sensor"],
            "theme": usr_row["theme"],
            "email_notifications": usr_row["email_notifications"],
            "refresh_interval": usr_row["refresh_interval"]
        }
    }

@settings_router.put("", summary="8.2 Обновить настройки")
@inject
async def update_settings(data: SettingsResponse, session: FromDishka[AsyncSession]):
    user_id = await session.scalar(text("SELECT id FROM users LIMIT 1"))
    if not user_id:
        raise HTTPException(status_code=400, detail="В системе нет пользователей. Зарегистрируйтесь через /auth/register")

    # 1. Обновляем системные настройки (используем CAST вместо ::jsonb)
    await session.execute(text("""
        UPDATE system_settings
        SET escalation_timeout = :timeout,
            channels = CAST(:channels AS jsonb),
            priorities = CAST(:priorities AS jsonb)
    """), {
        "timeout": data.system.escalation_timeout,
        "channels": json.dumps(data.system.channels),
        "priorities": json.dumps(data.system.priorities)
    })

    # 2. Обновляем настройки пользователя (используем CAST вместо ::jsonb)
    await session.execute(text("""
        UPDATE user_settings
        SET important_sensors = CAST(:sensors AS jsonb),
            default_chart_sensor = :chart,
            theme = :theme,
            email_notifications = :email,
            refresh_interval = :interval
        WHERE user_id = :uid
    """), {
        "uid": user_id,
        "sensors": json.dumps(data.user.important_sensors),
        "chart": data.user.default_chart_sensor,
        "theme": data.user.theme,
        "email": data.user.email_notifications,
        "interval": data.user.refresh_interval
    })

    await session.commit()
    return {"message": "Настройки успешно сохранены"}
