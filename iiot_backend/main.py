from contextlib import asynccontextmanager
from controllers.auth import auth_router
import dishka_faststream
from dishka import make_async_container
from dishka.integrations.fastapi import setup_dishka
from fastapi import FastAPI
from faststream import FastStream
from faststream.mqtt import MQTTBroker

from core.config import config, AppConfig
from core.ioc import AppProvider
from controllers.http import http_router
from controllers.mqtt import MQTTController

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
    fastapi_app.include_router(http_router)
    fastapi_app.include_router(auth_router)

    setup_dishka(container, fastapi_app)

    return fastapi_app

app = get_app()
