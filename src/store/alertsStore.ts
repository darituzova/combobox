import { create } from 'zustand';
import { WsNewAlertPayload, RecentAlert, SuspectMachine, AlertListItem, AlertsQuery, AlertsStats } from '@/types';

interface AlertsState {
  liveAlerts: WsNewAlertPayload[];
  recentResolved: RecentAlert[];
  suspectMachines: SuspectMachine[];
  historyAlerts: AlertListItem[];
  historyStats: AlertsStats;
  historyTotal: number;
  historyQuery: AlertsQuery;
  addLiveAlert: (alert: WsNewAlertPayload) => void;
  removeLiveAlert: (alertId: number) => void;
  setRecentResolved: (alerts: RecentAlert[]) => void;
  setSuspectMachines: (machines: SuspectMachine[]) => void;
  setHistoryAlerts: (alerts: AlertListItem[], total: number, stats: AlertsStats) => void;
  setHistoryQuery: (query: AlertsQuery) => void;
  markAlertAcknowledgedInHistory: (alertId: number, acknowledgedBy: string, acknowledgedAt: string) => void;
}

export const useAlertsStore = create<AlertsState>((set) => ({
  liveAlerts: [],
  recentResolved: [],
  suspectMachines: [],
  historyAlerts: [],
  historyStats: { pending: 0, acknowledged: 0, escalated: 0, total: 0 },
  historyTotal: 0,
  historyQuery: { page: 1, limit: 20 },
  addLiveAlert: (alert) =>
    set((state) => ({
      liveAlerts: [alert, ...state.liveAlerts.filter((a) => a.id !== alert.id)],
    })),
  removeLiveAlert: (alertId) =>
    set((state) => ({ liveAlerts: state.liveAlerts.filter((a) => a.id !== alertId) })),
  setRecentResolved: (recentResolved) => set({ recentResolved }),
  setSuspectMachines: (suspectMachines) => set({ suspectMachines }),
  setHistoryAlerts: (historyAlerts, historyTotal, historyStats) =>
    set({ historyAlerts, historyTotal, historyStats }),
  setHistoryQuery: (historyQuery) => set({ historyQuery }),
  markAlertAcknowledgedInHistory: (alertId, acknowledgedBy, acknowledgedAt) =>
    set((state) => ({
      historyAlerts: state.historyAlerts.map((a) =>
        a.id === alertId
          ? { ...a, status: 'acknowledged', acknowledged_by: acknowledgedBy, acknowledged_at: acknowledgedAt }
          : a
      ),
      liveAlerts: state.liveAlerts.filter((a) => a.id !== alertId),
    })),
}));
