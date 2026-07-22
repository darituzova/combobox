import asyncio
import asyncpg
import os
import random
from dotenv import load_dotenv

load_dotenv()

async def init_db():
    print("🔌 Подключение к базе данных для инициализации...")

    # ПУЛЕНЕПРОБИВАЕМОЕ ПОДКЛЮЧЕНИЕ (ЖДЕМ БАЗУ ДО 30 СЕКУНД)
    conn = None
    for i in range(15):
        try:
            conn = await asyncpg.connect(
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASSWORD"),
                database=os.getenv("DB_NAME"),
                host=os.getenv("DB_HOST"),
                port=os.getenv("DB_PORT")
            )
            break # Успешно подключились, выходим из цикла ожидания
        except Exception as e:
            print(f"⏳ База еще не готова, ждем... ({i+1}/15)")
            await asyncio.sleep(2)

    if not conn:
        print("❌ Не удалось подключиться к базе данных. Проверьте настройки.")
        return

    print("🏗 Создание архитектуры таблиц (Контракты ТЗ)...")
    # 1. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'engineer',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)

    # 2. ТАБЛИЦА СТАНКОВ / ДАТЧИКОВ
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS machines (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            type VARCHAR(50) NOT NULL,
            building VARCHAR(50),
            floor INTEGER,
            room VARCHAR(50),
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            status VARCHAR(50) DEFAULT 'offline',
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)

    # 3. ТАБЛИЦА АЛЕРТОВ (АВАРИЙ)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id SERIAL PRIMARY KEY,
            machine_id INTEGER REFERENCES machines(id),
            message TEXT NOT NULL,
            severity VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            acknowledged_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            acknowledged_at TIMESTAMP WITH TIME ZONE,
            escalated_at TIMESTAMP WITH TIME ZONE,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    """)

    # 4. ТАБЛИЦЫ НАСТРОЕК
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            id SERIAL PRIMARY KEY,
            escalation_timeout INTEGER DEFAULT 5,
            channels JSONB DEFAULT '{"telegram": true, "email": false, "sms": false}',
            priorities JSONB DEFAULT '{
                "critical": {"channels": "telegram,sms", "timeout": 3},
                "warning": {"channels": "email", "timeout": 10},
                "info": {"channels": "", "timeout": 30}
            }'
        );
    """)

    await conn.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            important_sensors JSONB DEFAULT '[]',
            default_chart_sensor INTEGER,
            theme VARCHAR(20) DEFAULT 'light',
            email_notifications BOOLEAN DEFAULT true,
            refresh_interval INTEGER DEFAULT 10
        );
    """)

    # 5. ТАБЛИЦА ТЕЛЕМЕТРИИ (Уже была, но оставим для надежности)
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS telemetry (
            time TIMESTAMP WITH TIME ZONE NOT NULL,
            machine_id INTEGER NOT NULL,
            temperature DOUBLE PRECISION,
            vibration DOUBLE PRECISION,
            humidity DOUBLE PRECISION,
            pressure DOUBLE PRECISION,
            energy_consumption DOUBLE PRECISION
        );
    """)

    # Превращаем телеметрию в гипертаблицу TimescaleDB (игнорируем ошибку, если уже создана)
    try:
        await conn.execute("SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);")
    except Exception:
        pass

    # Заполняем системные настройки, если их нет
    sys_settings_count = await conn.fetchval("SELECT COUNT(*) FROM system_settings")
    if sys_settings_count == 0:
        await conn.execute("INSERT INTO system_settings (escalation_timeout) VALUES (5);")

    # Генерируем 50 станков для нашего датасета (чтобы они красиво отображались на карте)
    machine_count = await conn.fetchval("SELECT COUNT(*) FROM machines")
    if machine_count == 0:
        print("🏭 Генерация виртуального завода (50 станков)...")
        types = ['temperature', 'pressure', 'vibration', 'humidity', 'energy']
        buildings = ['A', 'B', 'C']

        records = []
        for i in range(1, 51):
            name = f"Датчик T-{i:02d}"
            m_type = random.choice(types)
            building = random.choice(buildings)
            floor = random.randint(1, 4)
            room = f"{floor}0{random.randint(1, 9)}"

            # Генерируем координаты с небольшим разбросом для карты
            # Базовая точка: 55.7580, 37.6150 (Условно Москва)
            lat = 55.7580 + random.uniform(-0.005, 0.005)
            lon = 37.6150 + random.uniform(-0.005, 0.005)

            records.append((i, name, m_type, building, floor, room, lat, lon))

        await conn.executemany("""
            INSERT INTO machines (id, name, type, building, floor, room, latitude, longitude)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, records)

        # Обновляем счетчик автоинкремента, так как мы вставили ID вручную
        await conn.execute("SELECT setval('machines_id_seq', 50);")

    print("✅ База данных полностью готова к работе по новому ТЗ!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(init_db())
