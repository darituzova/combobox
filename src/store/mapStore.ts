import { create } from 'zustand';
import { MapDevice, MapDevicesQuery, MapDeviceDetailResponse, DeviceStatus } from '@/types';

interface MapState {
  devices: MapDevice[];
  query: MapDevicesQuery;
  selectedDevice: MapDeviceDetailResponse | null;
  loading: boolean;
  setDevices: (devices: MapDevice[]) => void;
  setQuery: (query: MapDevicesQuery) => void;
  setSelectedDevice: (device: MapDeviceDetailResponse | null) => void;
  setLoading: (loading: boolean) => void;
  updateDeviceStatusRealtime: (deviceId: number, status: DeviceStatus) => void;
  updateDeviceValueRealtime: (deviceId: number, value: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  devices: [],
  query: {},
  selectedDevice: null,
  loading: false,
  setDevices: (devices) => set({ devices }),
  setQuery: (query) => set({ query }),
  setSelectedDevice: (selectedDevice) => set({ selectedDevice }),
  setLoading: (loading) => set({ loading }),
  updateDeviceStatusRealtime: (deviceId, status) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === deviceId ? { ...d, status } : d)),
      selectedDevice:
        state.selectedDevice && state.selectedDevice.id === deviceId
          ? { ...state.selectedDevice, status }
          : state.selectedDevice,
    })),
  updateDeviceValueRealtime: (deviceId, value) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.id === deviceId ? { ...d, value } : d)),
      selectedDevice:
        state.selectedDevice && state.selectedDevice.id === deviceId
          ? { ...state.selectedDevice, value }
          : state.selectedDevice,
    })),
}));
