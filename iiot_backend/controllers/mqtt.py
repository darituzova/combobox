from dishka.integrations.base import FromDishka
from faststream.mqtt import MQTTRouter  # <--- ИСПРАВЛЕНО ЗДЕСЬ

from application.dto import NewTelemetryDTO
from application.interactors import SaveTelemetryInteractor
from controllers.schemas import IncomingTelemetrySchema

MQTTController = MQTTRouter()

@MQTTController.subscriber("factory/telemetry")
async def handle_telemetry(
    data: IncomingTelemetrySchema,
    interactor: FromDishka[SaveTelemetryInteractor]
):
    dto = NewTelemetryDTO(
        machine_id=data.machine_id,
        temperature=data.telemetry.temperature,
        vibration=data.telemetry.vibration,
        humidity=data.telemetry.humidity,
        pressure=data.telemetry.pressure,
        energy_consumption=data.telemetry.energy_consumption
    )
    await interactor(dto)
