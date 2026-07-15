from pydantic import BaseModel, Field
from datetime import datetime
from typing import List

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

class TelemetryDataResponse(BaseModel):
    temperature: float
    vibration: float
    humidity: float
    pressure: float
    energy_consumption: float

class HistoryRecordResponse(BaseModel):
    timestamp: str = Field(..., description="Время в формате ISO 8601 (с Z на конце)")
    telemetry: TelemetryDataResponse
    anomaly_flag: int = Field(default=0, description="1 если аномалия, 0 если всё ок")

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str

class ResetPasswordRequest(BaseModel):
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

class TokenResponse(BaseModel):
    token: str
    refresh_token: str
    user: UserResponse
