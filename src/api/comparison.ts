import apiClient from '@/api/client';
import { ComparisonResponse, ComparisonQuery, SensorsListResponse } from '@/types';

export async function getComparison(query: ComparisonQuery): Promise<ComparisonResponse> {
  const response = await apiClient.get<ComparisonResponse>('/comparison', { params: query });
  return response.data;
}

export async function getSensorsList(): Promise<SensorsListResponse> {
  const response = await apiClient.get<SensorsListResponse>('/sensors');
  return response.data;
}
