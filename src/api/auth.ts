import apiClient from '@/api/client';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
} from '@/types';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/auth/register', payload);
  return response.data;
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', payload);
  return response.data;
}

export async function refreshToken(payload: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', payload);
  return response.data;
}
