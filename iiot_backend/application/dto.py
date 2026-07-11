from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class NewTelemetryDTO:
    "DTO для передачипоказаний от ESP32 в бизнес-логику"

    machine_id: int
    temperature: float
    vibration: float
    humidity: float
    pressure: float
    energy_consumption: float


@dataclass(slots=True)
class AlertDTO:
    "DTO для сигналов об аномалиях"

    machine_id: int
    alert_type: str
    description: str
    timestamp: datetime
