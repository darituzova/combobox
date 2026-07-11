from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine
from core.config import DatabaseSettings

def new_session_maker(psql_config: DatabaseSettings) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(
        psql_config.url,
        pool_size = 15,
        max_ovelflow = 15,
        connect_args = {"command_tomeout": 5},
    )
    return async_sessionmaker(engine, class_=AsyncSession, autoflush=False, expire_on_commit=False)
