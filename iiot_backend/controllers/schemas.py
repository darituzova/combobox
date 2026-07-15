from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

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


class MapDeviceItem(BaseModel):
    id: int
    name: str
    building: Optional[str]
    floor: Optional[int]
    latitude: Optional[float]
    longitude: Optional[float]
    status: str
    value: float = 0.0      # Текущее значение (пока заглушка, позже свяжем с телеметрией)
    unit: str = ""
    updated_at: Optional[str]
    type: str

class MapDevicesResponse(BaseModel):
    devices: List[MapDeviceItem]

class MapDeviceDetail(MapDeviceItem):
    trust_indicator: str = "online"

# ==========================================
# СХЕМЫ ДЛЯ СТАНКОВ (Раздел 4)
# ==========================================
class MachineListItem(BaseModel):
    id: int
    name: str
    type: str
    value: float = 0.0
    unit: str = ""
    status: str
    building: Optional[str]
    floor: Optional[int]
    updated_at: Optional[str]

class MachineListResponse(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int
    data: List[MachineListItem]

class MachineLocation(BaseModel):
    building: Optional[str]
    floor: Optional[int]
    room: Optional[str]

class MachineDetail(BaseModel):
    id: int
    name: str
    type: str
    value: float = 0.0
    unit: str = ""
    status: str
    building: Optional[str]
    floor: Optional[int]
    updated_at: Optional[str]
    trust_indicator: str = "online"
    anomaly_count: int = 0
    location: MachineLocation
