import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  ButtonGroup,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';
import { getMachineDetail, getMachineHistory, getMachineAlerts, getMachines } from '@/api/devices';
import { acknowledgeAlert } from '@/api/alerts';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';
import { useDevicesStore } from '@/store/devicesStore';
import { ChartPeriod, DeviceStatus, MachineListItem, MachineAlert } from '@/types';

const statusColorMap: Record<DeviceStatus, string> = {
  online: '#16a34a',
  warning: '#ca8a04',
  critical: '#dc2626',
  offline: '#64748b',
};

const statusLabelMap: Record<DeviceStatus, string> = {
  online: '✅ Онлайн',
  warning: '⚠️ Предупреждение',
  critical: '🔴 Авария!',
  offline: '❌ Офлайн',
};

const periodLabels: Record<ChartPeriod, string> = {
  '1h': '1ч',
  '6h': '6ч',
  '24h': '24ч',
  week: 'Нед',
  month: 'Месяц',
};

const DeviceDetail: FC = () => {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);

  const selectedMachine = useDevicesStore((state) => state.selectedMachine);
  const setSelectedMachine = useDevicesStore((state) => state.setSelectedMachine);
  const selectedMachineHistory = useDevicesStore((state) => state.selectedMachineHistory);
  const setSelectedMachineHistory = useDevicesStore((state) => state.setSelectedMachineHistory);
  const selectedMachineAlerts = useDevicesStore((state) => state.selectedMachineAlerts);
  const setSelectedMachineAlerts = useDevicesStore((state) => state.setSelectedMachineAlerts);

  const [period, setPeriod] = useState<ChartPeriod>('1h');
  const [loading, setLoading] = useState<boolean>(true);
  const [machineOptions, setMachineOptions] = useState<MachineListItem[]>([]);
  const [acknowledgingIds, setAcknowledgingIds] = useState<Set<number>>(new Set());

  const machineId = Number(params.id);

  const loadMachineOptions = useCallback(async () => {
    try {
      const data = await getMachines({ page: 1, limit: 200 });
      setMachineOptions(data.data);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [showSnackbar]);

  const loadDetail = useCallback(async () => {
    if (Number.isNaN(machineId)) return;
    setLoading(true);
    try {
      const [detail, history, alerts] = await Promise.all([
        getMachineDetail(machineId),
        getMachineHistory(machineId, { period }),
        getMachineAlerts(machineId),
      ]);
      setSelectedMachine(detail);
      setSelectedMachineHistory(history);
      setSelectedMachineAlerts(alerts.alerts);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [machineId, period, showSnackbar, setSelectedMachine, setSelectedMachineHistory, setSelectedMachineAlerts]);

  useEffect(() => {
    loadMachineOptions();
  }, [loadMachineOptions]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleMachineSelectChange = (event: SelectChangeEvent<string>): void => {
    navigate(`/device/${event.target.value}`);
  };

  const handleAcknowledge = useCallback(
    async (alertId: number) => {
      setAcknowledgingIds((prev) => new Set(prev).add(alertId));
      try {
        await acknowledgeAlert(alertId);
        setSelectedMachineAlerts(
          selectedMachineAlerts.map((a: MachineAlert) =>
            a.id === alertId ? { ...a, status: 'acknowledged', acknowledged_by: 'Текущий пользователь' } : a
          )
        );
        showSnackbar('Авария подтверждена', 'success');
      } catch (error) {
        showSnackbar(extractErrorMessage(error), 'error');
      } finally {
        setAcknowledgingIds((prev) => {
          const next = new Set(prev);
          next.delete(alertId);
          return next;
        });
      }
    },
    [selectedMachineAlerts, setSelectedMachineAlerts, showSnackbar]
  );

  const handleExportHistory = useCallback((): void => {
    if (!selectedMachineHistory) return;
    const worksheetData = selectedMachineHistory.data.map((point) => ({
      Время: new Date(point.time).toLocaleString('ru'),
      Значение: point.value,
      Единица: selectedMachineHistory.unit,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'История');
    XLSX.writeFile(workbook, `machine_${machineId}_history.xlsx`);
  }, [selectedMachineHistory, machineId]);

  const chartOption = useMemo(() => {
    if (!selectedMachineHistory) return {};
    const anomalyTimes = new Set(selectedMachineHistory.anomaly_points.map((p) => p.time));
    return {
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: selectedMachineHistory.data.map((p) =>
          new Date(p.time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
        ),
      },
      yAxis: { type: 'value', name: selectedMachineHistory.unit },
      series: [
        {
          type: 'line',
          data: selectedMachineHistory.data.map((p) => p.value),
          smooth: true,
          areaStyle: { opacity: 0.15 },
          itemStyle: {
            color:
              selectedMachine?.status === 'critical'
                ? '#dc2626'
                : selectedMachine?.status === 'warning'
                  ? '#eab308'
                  : '#2563eb',
          },
          symbolSize: (_value: number, params: { dataIndex: number }) =>
            anomalyTimes.has(selectedMachineHistory.data[params.dataIndex].time) ? 10 : 4,
        },
      ],
    };
  }, [selectedMachineHistory, selectedMachine]);

  if (loading || !selectedMachine) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <FormControl size="small" sx={{ minWidth: 280 }}>
        <InputLabel id="machine-select-label">Выберите станок</InputLabel>
        <Select
          labelId="machine-select-label"
          label="Выберите станок"
          value={String(machineId)}
          onChange={handleMachineSelectChange}
        >
          {machineOptions.map((machine) => (
            <MenuItem key={machine.id} value={String(machine.id)}>
              #{machine.id} {machine.name} ({statusLabelMap[machine.status]})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Общая информация
              </Typography>
              {[
                ['Название', selectedMachine.name],
                ['ID', `#${selectedMachine.id}`],
                ['Тип', selectedMachine.type],
                ['Корпус / Этаж', `${selectedMachine.location.building.toUpperCase()} · ${selectedMachine.location.floor} этаж`],
              ].map(([label, value]) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {value}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Статус
                </Typography>
                <Chip
                  label={selectedMachine.status}
                  size="small"
                  sx={{ bgcolor: `${statusColorMap[selectedMachine.status]}22`, color: statusColorMap[selectedMachine.status], fontWeight: 600 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
                Текущие показатели
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Typography variant="body2" color="text.secondary">
                  Значение
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {selectedMachine.value !== null ? `${selectedMachine.value} ${selectedMachine.unit}` : 'Нет данных'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f1f5f9' }}>
                <Typography variant="body2" color="text.secondary">
                  Индикатор доверия
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ color: statusColorMap[selectedMachine.trust_indicator] }}>
                  {statusLabelMap[selectedMachine.trust_indicator]}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  История аномалий
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {selectedMachine.anomaly_count}
                </Typography>
              </Box>
              <ButtonGroup size="small" sx={{ mb: 1 }}>
                {(Object.keys(periodLabels) as ChartPeriod[]).map((p) => (
                  <Button key={p} variant={period === p ? 'contained' : 'outlined'} onClick={() => setPeriod(p)}>
                    {periodLabels[p]}
                  </Button>
                ))}
              </ButtonGroup>
              <Box sx={{ height: 160 }}>
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} notMerge />
              </Box>
              {selectedMachineHistory && (
                <Grid container spacing={1.5} sx={{ mt: 1 }}>
                  {[
                    ['Минимум', selectedMachineHistory.stats.min],
                    ['Максимум', selectedMachineHistory.stats.max],
                    ['Среднее', selectedMachineHistory.stats.avg],
                  ].map(([label, value]) => (
                    <Grid item xs={4} key={label}>
                      <Box sx={{ bgcolor: '#f8fafc', p: 1, borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" textTransform="uppercase">
                          {label}
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                          {(value as number).toFixed(1)}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            История алертов по станку
          </Typography>
          {selectedMachineAlerts.map((alert) => (
            <Box key={alert.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                <Typography variant="body2">{alert.message}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alert.timestamp).toLocaleString('ru')}
                  </Typography>
                  <Chip
                    label={alert.status === 'acknowledged' ? 'Подтверждён' : alert.status === 'escalated' ? 'Эскалирован' : 'Ожидает'}
                    size="small"
                    color={alert.status === 'acknowledged' ? 'success' : alert.status === 'escalated' ? 'error' : 'warning'}
                  />
                  {alert.status === 'pending' && (
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={acknowledgingIds.has(alert.id)}
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Подтвердить
                    </Button>
                  )}
                </Box>
              </Box>
              <Divider />
            </Box>
          ))}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <Button variant="outlined" onClick={handleExportHistory}>
          📥 Скачать историю (Excel)
        </Button>
      </Box>
    </Box>
  );
};

export default DeviceDetail;
