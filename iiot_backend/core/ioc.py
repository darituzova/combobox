from typing import AsyncIterable

from dishka import Provider, Scope, provide, AnyOf, from_context
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from application import interfaces
from application.interactors import SaveTelemetryInteractor
from infrastructure.gateways import TelemetryGateway
from infrastructure.database import new_session_maker
from core.config import AppConfig

class AppProvider(Provider):

    config = from_context(provides=AppConfig, scope=Scope.APP)

    @provide(scope=Scope.APP)
    def get_session_maker(self, config: AppConfig) -> async_sessionmaker[AsyncSession]:
        return new_session_maker(config.db)


    @provide(scope=Scope.REQUEST)
    async def get_session(self, session_maker: async_sessionmaker[AsyncSession]) -> AsyncIterable[AsyncSession]:
        async with session_maker() as session:
            yield session

    @provide(scope=Scope.REQUEST)
    def get_db_session_interface(self, session: AsyncSession) -> interfaces.DBSession:
        return session

    telemetry_gateway = provide(
        TelemetryGateway,
        scope=Scope.REQUEST,
        provides=interfaces.TelemetrySaver
    )

    save_telemetry_interactor = provide(SaveTelemetryInteractor, scope=Scope.REQUEST)
