from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Any, Dict

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

class KPIData(BaseModel):
    total_machines: int
    online_machines: int
    critical_alerts: int
    system_health: int

class DashboardImportantMachine(BaseModel):
    id: int
    name: str
    parameter: str
    value: float
    unit: str
    status: str
    updated_at: Optional[str]

class DashboardImportantResponse(BaseModel):
    machines: List[DashboardImportantMachine]

class ChartDataPoint(BaseModel):
    time: str
    value: float
    is_anomaly: bool = False

class ChartDataResponse(BaseModel):
    machine_id: int
    parameter: str
    unit: str
    data: List[ChartDataPoint]
    anomaly_points: List[ChartDataPoint]

class DashboardRecentAlert(BaseModel):
    id: int
    machine_name: str
    message: str
    resolved_at: str

class DashboardRecentAlertsResponse(BaseModel):
    alerts: List[DashboardRecentAlert]

class DashboardSuspectMachine(BaseModel):
    id: int
    name: str
    issue: str
    value: float
    unit: str
    threshold: float

class DashboardSuspectResponse(BaseModel):
    machines: List[DashboardSuspectMachine]

class AlertItem(BaseModel):
    id: int
    time: Optional[str]
    device: str
    message: str
    priority: str
    status: str
    acknowledged_by: Optional[str]
    acknowledged_at: Optional[str]
    escalated_at: Optional[str]

class AlertStats(BaseModel):
    pending: int
    acknowledged: int
    escalated: int
    total: int

class AlertListResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[AlertItem]
    stats: AlertStats

class SensorItem(BaseModel):
    id: int
    name: str
    type: str
    type_label: str
    unit: str
    color: str

class ComparisonDeviceData(BaseModel):
    id: int
    name: str
    unit: str
    data: List[ChartDataPoint]

class ComparisonResponse(BaseModel):
    devices: List[ComparisonDeviceData]
    period: Dict[str, str]

class SystemSettingsSchema(BaseModel):
    escalation_timeout: int
    channels: Dict[str, bool]
    priorities: Dict[str, Any]

class UserSettingsSchema(BaseModel):
    important_sensors: List[int]
    default_chart_sensor: int
    theme: str
    email_notifications: bool
    refresh_interval: int

class SettingsResponse(BaseModel):
    system: SystemSettingsSchema
    user: UserSettingsSchema

class ImportantSensorsRequest(BaseModel):
    sensor_ids: List[int]

class DefaultChartRequest(BaseModel):
    sensor_id: int
