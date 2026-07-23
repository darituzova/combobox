import { create } from 'zustand';
import {
  MachineListItem,
  MachinesQuery,
  MachineDetailResponse,
  MachineHistoryResponse,
  MachineAlert,
  DeviceStatus,
} from '@/types';

interface DevicesState {
  machines: MachineListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: MachinesQuery;
  loading: boolean;
  selectedMachine: MachineDetailResponse | null;
  selectedMachineHistory: MachineHistoryResponse | null;
  selectedMachineAlerts: MachineAlert[];
  setMachines: (
    machines: MachineListItem[],
    total: number,
    page: number,
    limit: number,
    totalPages: number
  ) => void;
  setQuery: (query: MachinesQuery) => void;
  setLoading: (loading: boolean) => void;
  setSelectedMachine: (machine: MachineDetailResponse | null) => void;
  setSelectedMachineHistory: (history: MachineHistoryResponse | null) => void;
  setSelectedMachineAlerts: (alerts: MachineAlert[]) => void;
  updateMachineStatusRealtime: (machineId: number, status: DeviceStatus) => void;
  updateMachineValueRealtime: (machineId: number, value: number) => void;
}

export const useDevicesStore = create<DevicesState>((set) => ({
  machines: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
  query: { page: 1, limit: 20, order: 'asc' },
  loading: false,
  selectedMachine: null,
  selectedMachineHistory: null,
  selectedMachineAlerts: [],
  setMachines: (machines, total, page, limit, totalPages) =>
    set({ machines, total, page, limit, totalPages }),
  setQuery: (query) => set({ query }),
  setLoading: (loading) => set({ loading }),
  setSelectedMachine: (selectedMachine) => set({ selectedMachine }),
  setSelectedMachineHistory: (selectedMachineHistory) => set({ selectedMachineHistory }),
  setSelectedMachineAlerts: (selectedMachineAlerts) => set({ selectedMachineAlerts }),
  updateMachineStatusRealtime: (machineId, status) =>
    set((state) => ({
      machines: state.machines.map((m) => (m.id === machineId ? { ...m, status } : m)),
      selectedMachine:
        state.selectedMachine && state.selectedMachine.id === machineId
          ? { ...state.selectedMachine, status }
          : state.selectedMachine,
    })),
  updateMachineValueRealtime: (machineId, value) =>
    set((state) => ({
      machines: state.machines.map((m) => (m.id === machineId ? { ...m, value } : m)),
      selectedMachine:
        state.selectedMachine && state.selectedMachine.id === machineId
          ? { ...state.selectedMachine, value }
          : state.selectedMachine,
    })),
}));
