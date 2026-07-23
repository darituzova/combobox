import { FC, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Stack,
  SelectChangeEvent,
} from '@mui/material';
import { getMapDevices, getMapDeviceDetail } from '@/api/devices';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';
import { useMapStore } from '@/store/mapStore';
import { DeviceStatus, MapDevice } from '@/types';

const statusColorMap: Record<DeviceStatus, string> = {
  online: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
  offline: '#94a3b8',
};

const statusLabelMap: Record<DeviceStatus, string> = {
  online: 'Онлайн',
  warning: 'Предупреждение',
  critical: 'Авария',
  offline: 'Офлайн',
};

const legendItems: DeviceStatus[] = ['online', 'warning', 'critical', 'offline'];

const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173];

const MapPage: FC = () => {
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const devices = useMapStore((state) => state.devices);
  const setDevices = useMapStore((state) => state.setDevices);
  const query = useMapStore((state) => state.query);
  const setQuery = useMapStore((state) => state.setQuery);

  const loadDevices = useCallback(async () => {
    try {
      const data = await getMapDevices(query);
      setDevices(data.devices);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [query, setDevices, showSnackbar]);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 30000);
    return () => clearInterval(interval);
  }, [loadDevices]);

  const handleBuildingChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    setQuery({ ...query, building: value === 'all' ? undefined : value });
  };

  const handleFloorChange = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    setQuery({ ...query, floor: value === 'all' ? undefined : Number(value) });
  };

  const handleStatusPopupLoad = useCallback(
    async (deviceId: number): Promise<MapDevice | null> => {
      try {
        await getMapDeviceDetail(deviceId);
        return null;
      } catch (error) {
        showSnackbar(extractErrorMessage(error), 'error');
        return null;
      }
    },
    [showSnackbar]
  );

  const center = useMemo<[number, number]>(() => {
    if (devices.length === 0) return DEFAULT_CENTER;
    return [devices[0].latitude, devices[0].longitude];
  }, [devices]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="building-filter-label">Корпус</InputLabel>
            <Select
              labelId="building-filter-label"
              label="Корпус"
              value={query.building ?? 'all'}
              onChange={handleBuildingChange}
            >
              <MenuItem value="all">Все корпуса</MenuItem>
              <MenuItem value="a">Корпус А</MenuItem>
              <MenuItem value="b">Корпус Б</MenuItem>
              <MenuItem value="c">Корпус В</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="floor-filter-label">Этаж</InputLabel>
            <Select
              labelId="floor-filter-label"
              label="Этаж"
              value={query.floor !== undefined ? String(query.floor) : 'all'}
              onChange={handleFloorChange}
            >
              <MenuItem value="all">Все этажи</MenuItem>
              <MenuItem value="1">1 этаж</MenuItem>
              <MenuItem value="2">2 этаж</MenuItem>
              <MenuItem value="3">3 этаж</MenuItem>
              <MenuItem value="4">4 этаж</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" spacing={2} sx={{ bgcolor: 'background.paper', px: 2, py: 1, borderRadius: 2, border: '1px solid #e2e8f0' }}>
          {legendItems.map((status) => (
            <Stack key={status} direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: statusColorMap[status] }} />
              <Typography variant="caption">{statusLabelMap[status]}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Card sx={{ height: 380, overflow: 'hidden' }}>
        <MapContainer center={center} zoom={16} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors, &copy; CartoDB'
          />
          {devices.map((device) => (
            <CircleMarker
              key={device.id}
              center={[device.latitude, device.longitude]}
              radius={9}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: statusColorMap[device.status], fillOpacity: 1 }}
              eventHandlers={{ click: () => handleStatusPopupLoad(device.id) }}
            >
              <Popup>
                <Typography variant="subtitle2" fontWeight={700}>
                  {device.name}
                </Typography>
                <Typography variant="body2">
                  Значение: {device.value} {device.unit}
                </Typography>
                <Typography variant="body2">Статус: {statusLabelMap[device.status]}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Обновлено: {new Date(device.updated_at).toLocaleTimeString('ru')}
                </Typography>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>

      <Typography variant="subtitle1" fontWeight={600}>
        Примеры состояний датчиков
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {devices.slice(0, 4).map((device) => (
          <Card key={device.id} sx={{ borderLeft: `4px solid ${statusColorMap[device.status]}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {device.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    bgcolor: `${statusColorMap[device.status]}22`,
                    color: statusColorMap[device.status],
                    px: 1.25,
                    py: 0.25,
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  {statusLabelMap[device.status]}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {device.value} {device.unit}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Корпус {device.building.toUpperCase()} · {device.floor} эт.
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default MapPage;
