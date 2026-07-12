from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import session
from sqlalchemy.sql import text
from application.interfaces import TelemetrySaver
from domain.entities import TelemetryDM

class TelemetryGateway(TelemetrySaver):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, telemetry: TelemetryDM):
        "Сохранение записи телеметрии"
        query = text("""
            INSERT INTO telemetry (
                time, machine_id, temperature, vibration, humidity, pressure, energy_consumption
            ) VALUES (
                :time, :machine_id, :temperature, :vibration, :humidity, :pressure, :energy_consumption
            )
        """)
        await self._session.execute(
            statement=query,
            params = {
                "time": telemetry.timestamp,
                "machine_id": telemetry.machine_id,
                "temperature": telemetry.temperature,
                "vibration": telemetry.vibration,
                "humidity": telemetry.humidity,
                "pressure": telemetry.pressure,
                "energy_consumption": telemetry.energy_consumption
            }
        )
