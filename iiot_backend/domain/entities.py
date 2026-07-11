from dataclasses import dataclass
from datetime import datetime


@dataclass(slots=True)
class TelemetryDM:
    "Доменная модель телеметрии станка"

    machine_id: int
    temperature: float
    vibration: float
    humidity: float
    pressure: float
    energy_consumption: float
    timestamp: datetime
    anomaly_flag: int = 0
