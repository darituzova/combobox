import apiClient from '@/api/client';
import {
  MapDevicesResponse,
  MapDevicesQuery,
  MapDeviceDetailResponse,
  MachinesListResponse,
  MachinesQuery,
  MachineDetailResponse,
  MachineHistoryResponse,
  MachineHistoryQuery,
  MachineAlertsResponse,
} from '@/types';

export async function getMapDevices(query: MapDevicesQuery): Promise<MapDevicesResponse> {
  const response = await apiClient.get<MapDevicesResponse>('/map/devices', { params: query });
  return response.data;
}

export async function getMapDeviceDetail(id: number): Promise<MapDeviceDetailResponse> {
  const response = await apiClient.get<MapDeviceDetailResponse>(`/map/devices/${id}`);
  return response.data;
}

export async function getMachines(query: MachinesQuery): Promise<MachinesListResponse> {
  const response = await apiClient.get<MachinesListResponse>('/machines', { params: query });
  return response.data;
}

export async function getMachineDetail(id: number): Promise<MachineDetailResponse> {
  const response = await apiClient.get<MachineDetailResponse>(`/machines/${id}`);
  return response.data;
}

export async function getMachineHistory(id: number, query: MachineHistoryQuery): Promise<MachineHistoryResponse> {
  const response = await apiClient.get<MachineHistoryResponse>(`/machines/${id}/history`, { params: query });
  return response.data;
}

export async function getMachineAlerts(id: number): Promise<MachineAlertsResponse> {
  const response = await apiClient.get<MachineAlertsResponse>(`/machines/${id}/alerts`);
  return response.data;
}
