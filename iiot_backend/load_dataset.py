import asyncio
import csv
import asyncpg
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

async def main():
    print("🔌 Подключение к БД для инициализации датасета...")
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

    # Защита от дублирования
    try:
        count = await conn.fetchval("SELECT COUNT(*) FROM telemetry")
        if count > 0:
            print(f"✅ База уже содержит {count} записей. Пропускаем загрузку.")
            await conn.close()
            return
    except Exception as e:
        pass

    print("📂 Чтение файла smart_manufacturing_data.csv...")
    raw_records = []
    max_csv_time = datetime.min

    with open('smart_manufacturing_data.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            dt = datetime.strptime(row['timestamp'], '%Y-%m-%d %H:%M:%S')

            # Находим самую свежую дату в файле
            if dt > max_csv_time:
                max_csv_time = dt

            raw_records.append({
                "dt": dt,
                "m_id": int(row['machine_id']),
                "temp": float(row['temperature']),
                "vib": float(row['vibration']),
                "hum": float(row['humidity']),
                "pres": float(row['pressure']),
                "energy": float(row['energy_consumption'])
            })

    # ==========================================
    # СДВИГ ВРЕМЕНИ (TIME SHIFT)
    # ==========================================
    now = datetime.now()
    time_shift = now - max_csv_time # Вычисляем разницу между "сейчас" и концом датасета

    print(f"⏱ Максимальное время в CSV: {max_csv_time}")
    print(f"⏩ Сдвигаем всю историю виртуального завода на {time_shift} вперед (к текущему моменту)...")

    records = []
    for r in raw_records:
        shifted_dt = r["dt"] + time_shift # Прибавляем разницу к каждой точке
        records.append((
            shifted_dt, r["m_id"], r["temp"], r["vib"], r["hum"], r["pres"], r["energy"]
        ))

    print(f"🚀 Подготовлено {len(records)} записей. Заливаем в TimescaleDB...")

    query = """
        INSERT INTO telemetry
        (time, machine_id, temperature, vibration, humidity, pressure, energy_consumption)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    """

    await conn.executemany(query, records)
    await conn.close()
    print("✅ Успех! Исторические данные актуализированы до сегодняшнего дня.")

if __name__ == "__main__":
    asyncio.run(main())
