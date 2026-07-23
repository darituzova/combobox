import { useEffect, useRef, useState } from 'react';
import { WsEvent } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { useAlertsStore } from '@/store/alertsStore';
import { useDevicesStore } from '@/store/devicesStore';
import { useMapStore } from '@/store/mapStore';

export type WsConnectionStatus = 'connecting' | 'connected' | 'disconnected';

const MAX_RECONNECT_DELAY_MS = 30000;
const BASE_RECONNECT_DELAY_MS = 1000;

export function useWebSocket(): WsConnectionStatus {
  const [status, setStatus] = useState<WsConnectionStatus>('connecting');
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef<boolean>(true);

  const addLiveAlert = useAlertsStore((state) => state.addLiveAlert);
  const markAlertAcknowledgedInHistory = useAlertsStore((state) => state.markAlertAcknowledgedInHistory);
  const updateMachineStatusRealtime = useDevicesStore((state) => state.updateMachineStatusRealtime);
  const updateMachineValueRealtime = useDevicesStore((state) => state.updateMachineValueRealtime);
  const updateMapDeviceStatusRealtime = useMapStore((state) => state.updateDeviceStatusRealtime);
  const updateMapDeviceValueRealtime = useMapStore((state) => state.updateDeviceValueRealtime);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    shouldReconnectRef.current = true;

    function connect(): void {
      const baseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/api/v1/ws';
      const wsUrl = `${baseUrl}?token=${encodeURIComponent(token ?? '')}`;
      setStatus('connecting');
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
        setStatus('connected');
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as WsEvent;
          handleEvent(parsed);
        } catch {
          setStatus('connected');
        }
      };

      socket.onerror = () => {
        socket.close();
      };

      socket.onclose = () => {
        setStatus('disconnected');
        if (shouldReconnectRef.current) {
          const delay = Math.min(
            BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttemptRef.current,
            MAX_RECONNECT_DELAY_MS
          );
          reconnectAttemptRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };
    }

    function handleEvent(event: WsEvent): void {
      switch (event.event) {
        case 'new_alert':
          addLiveAlert(event.data);
          break;
        case 'alert_status_changed':
          markAlertAcknowledgedInHistory(event.data.alert_id, event.data.acknowledged_by, event.data.acknowledged_at);
          break;
        case 'device_status_changed':
          updateMachineStatusRealtime(event.data.machine_id, event.data.new_status);
          updateMapDeviceStatusRealtime(event.data.machine_id, event.data.new_status);
          break;
        case 'new_data':
          updateMachineValueRealtime(event.data.machine_id, event.data.value);
          updateMapDeviceValueRealtime(event.data.machine_id, event.data.value);
          break;
        default:
          break;
      }
    }

    connect();

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
    };
  }, [
    isAuthenticated,
    token,
    addLiveAlert,
    markAlertAcknowledgedInHistory,
    updateMachineStatusRealtime,
    updateMachineValueRealtime,
    updateMapDeviceStatusRealtime,
    updateMapDeviceValueRealtime,
  ]);

  return status;
}
