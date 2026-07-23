import apiClient from '@/api/client';
import { AlertsListResponse, AlertsQuery, AcknowledgeAlertResponse, AlertsExportRequest } from '@/types';

export async function getAlerts(query: AlertsQuery): Promise<AlertsListResponse> {
  const response = await apiClient.get<AlertsListResponse>('/alerts', { params: query });
  return response.data;
}

export async function acknowledgeAlert(id: number): Promise<AcknowledgeAlertResponse> {
  const response = await apiClient.post<AcknowledgeAlertResponse>(`/alerts/${id}/acknowledge`);
  return response.data;
}

export async function exportAlerts(payload: AlertsExportRequest): Promise<Blob> {
  const response = await apiClient.post('/alerts/export', payload, { responseType: 'blob' });
  return response.data as Blob;
}
