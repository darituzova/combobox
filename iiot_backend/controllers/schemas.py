from pydantic import BaseModel
from datetime import datetime

class TelemetryValues(BaseModel):
    temperature: float
    vibration: float
    humidity: float
    pressure: float
    energy_consumption: float

class IncomingTelemetrySchema(BaseModel):
    machine_id: int
    telemetry: TelemetryValues

class IncomingAlertSchema(BaseModel):
    machine_id: int
    alert_type: str
    description: str
    timestamp: datetime
