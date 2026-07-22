from contextlib import asynccontextmanager
from controllers.auth import auth_router
import dishka_faststream
from dishka import make_async_container
from dishka.integrations.fastapi import setup_dishka
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from faststream import FastStream
from faststream.mqtt import MQTTBroker

from core.config import config, AppConfig
from core.ioc import AppProvider
from controllers.http import http_router
from controllers.mqtt import MQTTController
from controllers.map import map_router
from controllers.dashboard import dashboard_router
from controllers.machines import machines_router
from controllers.alerts import alerts_router
from controllers.comparison import comparison_router
from controllers.settings import settings_router

container = make_async_container(AppProvider(), context={AppConfig: config})

def get_faststream_app() -> FastStream:
    broker = MQTTBroker(host=config.mqtt.host, port=config.mqtt.port)
    faststream_app = FastStream(broker)

    dishka_faststream.setup_dishka(container, faststream_app, auto_inject=True)
    broker.include_router(MQTTController)

    return faststream_app

def get_app():
    faststream_app = get_faststream_app()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        await faststream_app.broker.start()
        yield
        await faststream_app.broker.disconnect()

    fastapi_app = FastAPI(title="IIoT Factory API", lifespan=lifespan)

    # НАСТРОЙКА CORS ДЛЯ ФРОНТЕНДА
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Подключаем роутеры
    fastapi_app.include_router(http_router)
    fastapi_app.include_router(auth_router)
    fastapi_app.include_router(map_router)
    fastapi_app.include_router(machines_router)
    fastapi_app.include_router(dashboard_router)
    fastapi_app.include_router(alerts_router)
    fastapi_app.include_router(comparison_router)
    fastapi_app.include_router(settings_router)

    setup_dishka(container, fastapi_app)

    return fastapi_app

app = get_app()
