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
            break # Успешно подключились, выходим из цикла
        except Exception as e:
            print(f"⏳ База еще не готова, ждем... ({i+1}/15)")
            await asyncio.sleep(2)

    if not conn:
        print("❌ Не удалось подключиться к базе данных.")
        return

    print("🏗 Создание архитектуры таблиц (Контракты ТЗ)...")
    # ... дальше весь твой старый код создания таблиц ...
