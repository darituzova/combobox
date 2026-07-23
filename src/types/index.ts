export type DeviceStatus = 'online' | 'warning' | 'critical' | 'offline';

export type SensorType = 'temperature' | 'pressure' | 'vibration' | 'humidity' | 'energy';

export type AlertStatus = 'pending' | 'acknowledged' | 'escalated';

export type AlertPriority = 'critical' | 'warning' | 'info';

export type ChartPeriod = '1h' | '6h' | '24h' | 'week' | 'month';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface UserRole {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  user: UserRole;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  token: string;
}

export interface KpiResponse {
  total_machines: number;
  online_machines: number;
  critical_alerts: number;
  system_health: number;
}

export interface ImportantMachine {
  id: number;
  name: string;
  parameter: SensorType;
  value: number;
  unit: string;
  status: DeviceStatus;
  updated_at: string;
}

export interface ImportantMachinesResponse {
  machines: ImportantMachine[];
}

export interface ChartPoint {
  time: string;
  value: number;
}

export interface AnomalyPoint {
  time: string;
  value: number;
  is_anomaly: boolean;
}

export interface ChartDataResponse {
  machine_id: number;
  parameter: SensorType;
  unit: string;
  data: ChartPoint[];
  anomaly_points: AnomalyPoint[];
}

export interface RecentAlert {
  id: number;
  machine_name: string;
  message: string;
  resolved_at: string;
}

export interface RecentAlertsResponse {
  alerts: RecentAlert[];
}

export interface SuspectMachine {
  id: number;
  name: string;
  issue: string;
  value: number;
  unit: string;
  threshold: number;
}

export interface SuspectMachinesResponse {
  machines: SuspectMachine[];
}

export interface MapDevice {
  id: number;
  name: string;
  building: string;
  floor: number;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  value: number;
  unit: string;
  updated_at: string;
  type: SensorType;
}

export interface MapDevicesResponse {
  devices: MapDevice[];
}

export interface MapDeviceDetailResponse {
  id: number;
  name: string;
  type: SensorType;
  building: string;
  floor: number;
  latitude: number;
  longitude: number;
  status: DeviceStatus;
  value: number;
  unit: string;
  updated_at: string;
  trust_indicator: DeviceStatus;
}

export interface MapDevicesQuery {
  building?: string;
  floor?: number;
  status?: DeviceStatus;
}

export interface MachineListItem {
  id: number;
  name: string;
  type: SensorType;
  value: number | null;
  unit: string;
  status: DeviceStatus;
  building: string;
  floor: number;
  updated_at: string;
}

export interface MachinesListResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  data: MachineListItem[];
}

export interface MachinesQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: DeviceStatus;
  type?: SensorType;
  building?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface MachineLocation {
  building: string;
  floor: number;
  room: string;
}

export interface MachineDetailResponse {
  id: number;
  name: string;
  type: SensorType;
  value: number | null;
  unit: string;
  status: DeviceStatus;
  building: string;
  floor: number;
  updated_at: string;
  trust_indicator: DeviceStatus;
  anomaly_count: number;
  location: MachineLocation;
}

export interface MachineHistoryQuery {
  period: ChartPeriod;
  parameter?: SensorType;
}

export interface MachineHistoryStats {
  min: number;
  max: number;
  avg: number;
}

export interface MachineHistoryResponse {
  machine_id: number;
  parameter: SensorType;
  unit: string;
  data: ChartPoint[];
  stats: MachineHistoryStats;
  anomaly_points: AnomalyPoint[];
}

export interface MachineAlert {
  id: number;
  message: string;
  severity: AlertPriority;
  status: AlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  timestamp: string;
}

export interface MachineAlertsResponse {
  alerts: MachineAlert[];
}

export interface AlertListItem {
  id: number;
  time: string;
  device: string;
  message: string;
  priority: AlertPriority;
  status: AlertStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  escalated_at: string | null;
}

export interface AlertsStats {
  pending: number;
  acknowledged: number;
  escalated: number;
  total: number;
}

export interface AlertsListResponse {
  total: number;
  page: number;
  limit: number;
  data: AlertListItem[];
  stats: AlertsStats;
}

export interface AlertsQuery {
  page?: number;
  limit?: number;
  status?: AlertStatus;
  priority?: AlertPriority;
  device?: string;
  user?: string;
  date_from?: string;
  date_to?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AcknowledgeAlertResponse {
  id: number;
  status: AlertStatus;
  acknowledged_by: string;
  acknowledged_at: string;
}

export interface AlertsExportRequest extends AlertsQuery {
  format: ExportFormat;
}

export interface ComparisonQuery {
  device_ids: string;
  period: ChartPeriod;
  date_from?: string;
  date_to?: string;
  parameter?: SensorType;
}

export interface ComparisonDevice {
  id: number;
  name: string;
  unit: string;
  data: ChartPoint[];
}

export interface ComparisonPeriodRange {
  from: string;
  to: string;
}

export interface ComparisonResponse {
  devices: ComparisonDevice[];
  period: ComparisonPeriodRange;
}

export interface SensorListItem {
  id: number;
  name: string;
  type: SensorType;
  type_label: string;
  unit: string;
  color: string;
}

export interface SensorsListResponse {
  sensors: SensorListItem[];
}

export interface NotificationChannels {
  telegram: boolean;
  email: boolean;
  sms: boolean;
}

export interface PriorityChannelSetting {
  channels: string;
  timeout: number;
}

export interface SystemPrioritySettings {
  critical: PriorityChannelSetting;
  warning: PriorityChannelSetting;
  info: PriorityChannelSetting;
}

export interface SystemSettings {
  escalation_timeout: number;
  channels: NotificationChannels;
  priorities: SystemPrioritySettings;
}

export interface UserSettings {
  important_sensors: number[];
  default_chart_sensor: number;
  theme: 'light' | 'dark' | 'system';
  email_notifications: boolean;
  refresh_interval: number;
}

export interface SettingsResponse {
  system: SystemSettings;
  user: UserSettings;
}

export interface UpdateSettingsRequest {
  system: SystemSettings;
  user: UserSettings;
}

export interface UpdateSettingsResponse {
  message: string;
  updated_at: string;
}

export interface ImportantSensorsResponse {
  sensor_ids: number[];
}

export interface UpdateImportantSensorsRequest {
  sensor_ids: number[];
}

export interface UpdateImportantSensorsResponse {
  message: string;
  sensor_ids: number[];
}

export interface DefaultChartSensorResponse {
  sensor_id: number;
}

export interface UpdateDefaultChartSensorRequest {
  sensor_id: number;
}

export interface UpdateDefaultChartSensorResponse {
  message: string;
  sensor_id: number;
}

export interface WsNewAlertPayload {
  id: number;
  machine_id: number;
  machine_name: string;
  message: string;
  severity: AlertPriority;
  timestamp: string;
  status: AlertStatus;
}

export interface WsAlertStatusChangedPayload {
  alert_id: number;
  status: AlertStatus;
  acknowledged_by: string;
  acknowledged_at: string;
}

export interface WsDeviceStatusChangedPayload {
  machine_id: number;
  old_status: DeviceStatus;
  new_status: DeviceStatus;
  timestamp: string;
}

export interface WsNewDataPayload {
  machine_id: number;
  parameter: SensorType;
  value: number;
  unit: string;
  timestamp: string;
}

export type WsEventType = 'new_alert' | 'alert_status_changed' | 'device_status_changed' | 'new_data';

export interface WsNewAlertEvent {
  event: 'new_alert';
  data: WsNewAlertPayload;
}

export interface WsAlertStatusChangedEvent {
  event: 'alert_status_changed';
  data: WsAlertStatusChangedPayload;
}

export interface WsDeviceStatusChangedEvent {
  event: 'device_status_changed';
  data: WsDeviceStatusChangedPayload;
}

export interface WsNewDataEvent {
  event: 'new_data';
  data: WsNewDataPayload;
}

export type WsEvent = WsNewAlertEvent | WsAlertStatusChangedEvent | WsDeviceStatusChangedEvent | WsNewDataEvent;

export interface ApiErrorResponse {
  message: string;
  code?: number;
}
