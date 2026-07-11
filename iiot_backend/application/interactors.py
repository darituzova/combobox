from datetime import datetime, timezone

from application import interfaces
from application.dto import AlertDTO, NewTelemetryDTO
from domain.entities import TelemetryDM


class SaveTelemetryInteractor:
    "Интерактор для сохранения входящей телеметрии (Контракт 1)"

    def __init__(
        self,
        db_session: interfaces.DBSession,
        telemetry_gateway: interfaces.TelemetrySaver,
    ):
        self._db_session = db_session
        self._gateway = telemetry_gateway

    async def __call__(self, dto: NewTelemetryDTO) -> None:
        telemetry = TelemetryDM(
            machine_id=dto.machine_id,
            temperature=dto.temperature,
            vibration=dto.vibration,
            humidity=dto.humidity,
            pressure=dto.pressure,
            energy_consumption=dto.energy_consumption,
            timestamp=datetime.now(timezone.utc),
        )

        await self._gateway.save(telemetry)

        await self._db_session.commit()
