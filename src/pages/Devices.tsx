import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { DataGrid, GridColDef, GridSortModel, GridPaginationModel, GridRenderCellParams } from '@mui/x-data-grid';
import { getMachines } from '@/api/devices';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';
import { useDevicesStore } from '@/store/devicesStore';
import { DeviceStatus, MachineListItem, SensorType } from '@/types';

const statusColorMap: Record<DeviceStatus, string> = {
  online: '#16a34a',
  warning: '#ca8a04',
  critical: '#dc2626',
  offline: '#64748b',
};

const statusBgMap: Record<DeviceStatus, string> = {
  online: '#dcfce7',
  warning: '#fef9c3',
  critical: '#fee2e2',
  offline: '#f1f5f9',
};

const statusLabelMap: Record<DeviceStatus, string> = {
  online: 'Онлайн',
  warning: 'Предупреждение',
  critical: 'Авария',
  offline: 'Офлайн',
};

const typeLabelMap: Record<SensorType, string> = {
  temperature: 'Температура',
  pressure: 'Давление',
  vibration: 'Вибрация',
  humidity: 'Влажность',
  energy: 'Энергия',
};

const Devices: FC = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const machines = useDevicesStore((state) => state.machines);
  const total = useDevicesStore((state) => state.total);
  const query = useDevicesStore((state) => state.query);
  const loading = useDevicesStore((state) => state.loading);
  const setMachines = useDevicesStore((state) => state.setMachines);
  const setQuery = useDevicesStore((state) => state.setQuery);
  const setLoading = useDevicesStore((state) => state.setLoading);

  const [searchInput, setSearchInput] = useState<string>(query.search ?? '');

  const loadMachines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMachines(query);
      setMachines(data.data, data.total, data.page, data.limit, data.total_pages);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [query, setMachines, setLoading, showSnackbar]);

  useEffect(() => {
    loadMachines();
    const interval = setInterval(loadMachines, 30000);
    return () => clearInterval(interval);
  }, [loadMachines]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery({ ...query, search: searchInput, page: 1 });
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleStatusFilter = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    setQuery({ ...query, status: value === 'all' ? undefined : (value as DeviceStatus), page: 1 });
  };

  const handleTypeFilter = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    setQuery({ ...query, type: value === 'all' ? undefined : (value as SensorType), page: 1 });
  };

  const handleBuildingFilter = (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    setQuery({ ...query, building: value === 'all' ? undefined : value, page: 1 });
  };

  const handleSortModelChange = (model: GridSortModel): void => {
    if (model.length === 0) {
      setQuery({ ...query, sort: undefined, order: undefined });
      return;
    }
    setQuery({ ...query, sort: model[0].field, order: (model[0].sort ?? 'asc') as 'asc' | 'desc' });
  };

  const handlePaginationModelChange = (model: GridPaginationModel): void => {
    setQuery({ ...query, page: model.page + 1, limit: model.pageSize });
  };

  const columns: GridColDef<MachineListItem>[] = useMemo(
    () => [
      { field: 'id', headerName: 'ID', width: 90, renderCell: (params: GridRenderCellParams<MachineListItem>) => `#${params.value}` },
      { field: 'name', headerName: 'Название', flex: 1, minWidth: 160 },
      {
        field: 'type',
        headerName: 'Тип',
        width: 150,
        valueFormatter: (value: SensorType) => typeLabelMap[value] || String(value),
      },
      {
        field: 'value',
        headerName: 'Значение',
        width: 130,
        renderCell: (params: GridRenderCellParams<MachineListItem>) =>
          params.row.value !== null ? `${params.row.value} ${params.row.unit}` : 'Нет данных',
      },
      {
        field: 'status',
        headerName: 'Статус',
        width: 160,
        renderCell: (params: GridRenderCellParams<MachineListItem>) => (
          <Box
            sx={{
              bgcolor: statusBgMap[params.row.status],
              color: statusColorMap[params.row.status],
              px: 1.5,
              py: 0.5,
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {statusLabelMap[params.row.status]}
          </Box>
        ),
      },
      {
        field: 'building',
        headerName: 'Корпус',
        width: 120,
        renderCell: (params: GridRenderCellParams<MachineListItem>) =>
          `${params.row.building.toUpperCase()} · ${params.row.floor} эт.`,
      },
      {
        field: 'updated_at',
        headerName: 'Обновлено',
        width: 150,
        renderCell: (params: GridRenderCellParams<MachineListItem>) => new Date(params.row.updated_at).toLocaleTimeString('ru'),
      },
    ],
    []
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
      <Card sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Поиск по названию или ID..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="status-filter-label">Статус</InputLabel>
          <Select labelId="status-filter-label" label="Статус" value={query.status ?? 'all'} onChange={handleStatusFilter}>
            <MenuItem value="all">Все статусы</MenuItem>
            <MenuItem value="online">Онлайн</MenuItem>
            <MenuItem value="warning">Предупреждение</MenuItem>
            <MenuItem value="critical">Авария</MenuItem>
            <MenuItem value="offline">Офлайн</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="type-filter-label">Тип</InputLabel>
          <Select labelId="type-filter-label" label="Тип" value={query.type ?? 'all'} onChange={handleTypeFilter}>
            <MenuItem value="all">Все типы</MenuItem>
            <MenuItem value="temperature">Температура</MenuItem>
            <MenuItem value="pressure">Давление</MenuItem>
            <MenuItem value="vibration">Вибрация</MenuItem>
            <MenuItem value="humidity">Влажность</MenuItem>
            <MenuItem value="energy">Энергия</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="building-filter-label">Корпус</InputLabel>
          <Select labelId="building-filter-label" label="Корпус" value={query.building ?? 'all'} onChange={handleBuildingFilter}>
            <MenuItem value="all">Все корпуса</MenuItem>
            <MenuItem value="a">Корпус А</MenuItem>
            <MenuItem value="b">Корпус Б</MenuItem>
            <MenuItem value="c">Корпус В</MenuItem>
          </Select>
        </FormControl>
      </Card>
      <Card sx={{ flex: 1, minHeight: 420 }}>
        <DataGrid
          rows={machines}
          columns={columns}
          loading={loading}
          rowCount={total}
          paginationMode="server"
          sortingMode="server"
          paginationModel={{ page: (query.page ?? 1) - 1, pageSize: query.limit ?? 20 }}
          onPaginationModelChange={handlePaginationModelChange}
          onSortModelChange={handleSortModelChange}
          pageSizeOptions={[10, 20, 50]}
          onRowClick={(params) => navigate(`/device/${params.row.id}`)}
          sx={{ border: 'none', cursor: 'pointer' }}
          disableRowSelectionOnClick
        />
      </Card>
    </Box>
  );
};

export default Devices;
