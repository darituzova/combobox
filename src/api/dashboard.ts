import apiClient from '@/api/client';
import {
  KpiResponse,
  ImportantMachinesResponse,
  ChartDataResponse,
  ChartPeriod,
  SensorType,
  RecentAlertsResponse,
  SuspectMachinesResponse,
} from '@/types';

export async function getKpi(): Promise<KpiResponse> {
  const response = await apiClient.get<KpiResponse>('/dashboard/kpi');
  return response.data;
}

export async function getImportantMachines(): Promise<ImportantMachinesResponse> {
  const response = await apiClient.get<ImportantMachinesResponse>('/dashboard/important');
  return response.data;
}

export async function getDashboardChart(
  machineId: number,
  period: ChartPeriod,
  parameter?: SensorType
): Promise<ChartDataResponse> {
  const response = await apiClient.get<ChartDataResponse>(`/dashboard/chart/${machineId}`, {
    params: { period, parameter },
  });
  return response.data;
}

export async function getRecentAlerts(): Promise<RecentAlertsResponse> {
  const response = await apiClient.get<RecentAlertsResponse>('/dashboard/alerts/recent');
  return response.data;
}

export async function getSuspectMachines(): Promise<SuspectMachinesResponse> {
  const response = await apiClient.get<SuspectMachinesResponse>('/dashboard/suspect');
  return response.data;
}
