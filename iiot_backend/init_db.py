import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from core.config import config

async def setup_database():
    print(f"Подключаемся к базе данных: {config.db.host}:{config.db.port}...")
    engine = create_async_engine(config.db.url)

    async with engine.begin() as conn:
        # 1. Создаем обычную SQL-таблицу
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS telemetry (
                time TIMESTAMPTZ NOT NULL,
                machine_id INTEGER NOT NULL,
                temperature DOUBLE PRECISION,
                vibration DOUBLE PRECISION,
                humidity DOUBLE PRECISION,
                pressure DOUBLE PRECISION,
                energy_consumption DOUBLE PRECISION,
                anomaly_flag INTEGER DEFAULT 0
            );
        """))
        print("✅ Таблица 'telemetry' создана.")

        # 2. Превращаем её в гипертаблицу TimescaleDB (для супер-быстрой работы с IoT)
        await conn.execute(text("""
            SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);
        """))
        print("✅ Активирована гипертаблица TimescaleDB!")

    await engine.dispose()
    print("🚀 Успех! База готова к приему данных.")

if __name__ == "__main__":
    asyncio.run(setup_database())
