import apiClient from '@/api/client';
import {
  SettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  ImportantSensorsResponse,
  UpdateImportantSensorsRequest,
  UpdateImportantSensorsResponse,
  DefaultChartSensorResponse,
  UpdateDefaultChartSensorRequest,
  UpdateDefaultChartSensorResponse,
} from '@/types';

export async function getSettings(): Promise<SettingsResponse> {
  const response = await apiClient.get<SettingsResponse>('/settings');
  return response.data;
}

export async function updateSettings(payload: UpdateSettingsRequest): Promise<UpdateSettingsResponse> {
  const response = await apiClient.put<UpdateSettingsResponse>('/settings', payload);
  return response.data;
}

export async function getImportantSensors(): Promise<ImportantSensorsResponse> {
  const response = await apiClient.get<ImportantSensorsResponse>('/settings/important-sensors');
  return response.data;
}

export async function updateImportantSensors(
  payload: UpdateImportantSensorsRequest
): Promise<UpdateImportantSensorsResponse> {
  const response = await apiClient.put<UpdateImportantSensorsResponse>('/settings/important-sensors', payload);
  return response.data;
}

export async function getDefaultChartSensor(): Promise<DefaultChartSensorResponse> {
  const response = await apiClient.get<DefaultChartSensorResponse>('/settings/default-chart');
  return response.data;
}

export async function updateDefaultChartSensor(
  payload: UpdateDefaultChartSensorRequest
): Promise<UpdateDefaultChartSensorResponse> {
  const response = await apiClient.put<UpdateDefaultChartSensorResponse>('/settings/default-chart', payload);
  return response.data;
}
