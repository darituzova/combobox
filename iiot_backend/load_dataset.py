import asyncio
import csv
import asyncpg
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

async def main():
    print("🔌 Подключение к базе данных для инициализации датасета...")
    try:
        conn = await asyncpg.connect(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT")
        )
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return

    # ЗАЩИТА ОТ ДУБЛИРОВАНИЯ: Проверяем, пустая ли таблица
    try:
        count = await conn.fetchval("SELECT COUNT(*) FROM telemetry")
        if count > 0:
            print(f"✅ База уже содержит {count} записей. Пропускаем загрузку датасета.")
            await conn.close()
            return
    except Exception as e:
        print(f"⚠️ Ошибка при проверке таблицы (возможно, она еще не создана): {e}")
        await conn.close()
        return

    print("📂 Чтение файла smart_manufacturing_data.csv...")
    records = []

    with open('smart_manufacturing_data.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dt = datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S')
            records.append((
                dt,
                int(row['machine_id']),
                float(row['temperature']),
                float(row['vibration']),
                float(row['humidity']),
                float(row['pressure']),
                float(row['energy_consumption'])
            ))

    print(f"🚀 Подготовлено {len(records)} записей. Заливаем в TimescaleDB...")

    query = """
        INSERT INTO telemetry
        (time, machine_id, temperature, vibration, humidity, pressure, energy_consumption)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    """

    await conn.executemany(query, records)
    await conn.close()
    print("✅ Успех! Исторические данные загружены.")

if __name__ == "__main__":
    asyncio.run(main())
