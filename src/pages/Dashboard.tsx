import { FC, memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Button,
  ButtonGroup,
  Divider,
  CircularProgress,
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import WifiIcon from '@mui/icons-material/Wifi';
import WarningIcon from '@mui/icons-material/WarningAmber';
import FavoriteIcon from '@mui/icons-material/FavoriteBorder';
import ReactECharts from 'echarts-for-react';
import { getKpi, getImportantMachines, getDashboardChart, getRecentAlerts, getSuspectMachines } from '@/api/dashboard';
import { acknowledgeAlert } from '@/api/alerts';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';
import { useAlertsStore } from '@/store/alertsStore';
import {
  KpiResponse,
  ImportantMachine,
  ChartDataResponse,
  ChartPeriod,
  RecentAlert,
  SuspectMachine,
  WsNewAlertPayload,
  DeviceStatus,
} from '@/types';

const statusColorMap: Record<DeviceStatus, string> = {
  online: '#22c55e',
  warning: '#eab308',
  critical: '#ef4444',
  offline: '#94a3b8',
};

const statusLabelMap: Record<DeviceStatus, string> = {
  online: 'Норма',
  warning: 'Внимание',
  critical: 'Авария',
  offline: 'Офлайн',
};

const periodLabels: Record<ChartPeriod, string> = {
  '1h': '1ч',
  '6h': '6ч',
  '24h': '24ч',
  week: 'Нед',
  month: 'Месяц',
};

interface KpiCardProps {
  label: string;
  value: string;
  icon: JSX.Element;
  color: string;
  bgColor: string;
}

const KpiCard: FC<KpiCardProps> = memo(({ label, value, icon, color, bgColor }) => (
  <Card>
    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ color }}>
          {value}
        </Typography>
      </Box>
      <Avatar sx={{ bgcolor: bgColor, color, width: 48, height: 48 }}>{icon}</Avatar>
    </CardContent>
  </Card>
));
KpiCard.displayName = 'KpiCard';

interface ImportantMachineCardProps {
  machine: ImportantMachine;
}

const ImportantMachineCard: FC<ImportantMachineCardProps> = memo(({ machine }) => (
  <Card sx={{ borderLeft: `4px solid ${statusColorMap[machine.status]}` }}>
    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="body2" fontWeight={600}>
          {machine.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {machine.parameter}
        </Typography>
        <Chip
          label={statusLabelMap[machine.status]}
          size="small"
          sx={{
            display: 'block',
            width: 'fit-content',
            mt: 0.5,
            bgcolor: `${statusColorMap[machine.status]}22`,
            color: statusColorMap[machine.status],
            fontWeight: 600,
          }}
        />
      </Box>
      <Typography variant="h6" fontWeight={700}>
        {machine.value}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
          {machine.unit}
        </Typography>
      </Typography>
    </CardContent>
  </Card>
));
ImportantMachineCard.displayName = 'ImportantMachineCard';

interface LiveAlertRowProps {
  alert: WsNewAlertPayload;
  onAcknowledge: (id: number) => void;
  acknowledging: boolean;
}

const LiveAlertRow: FC<LiveAlertRowProps> = memo(({ alert, onAcknowledge, acknowledging }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid #f1f5f9' }}>
    <Box>
      <Typography variant="body2" fontWeight={500}>
        {alert.machine_name} — {alert.message}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {new Date(alert.timestamp).toLocaleTimeString('ru')}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label={alert.severity === 'critical' ? 'Критично' : 'Предупреждение'}
        size="small"
        color={alert.severity === 'critical' ? 'error' : 'warning'}
      />
      <Button size="small" variant="outlined" disabled={acknowledging} onClick={() => onAcknowledge(alert.id)}>
        Подтвердить
      </Button>
    </Box>
  </Box>
));
LiveAlertRow.displayName = 'LiveAlertRow';

const Dashboard: FC = () => {
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const liveAlerts = useAlertsStore((state) => state.liveAlerts);
  const removeLiveAlert = useAlertsStore((state) => state.removeLiveAlert);
  const recentResolved = useAlertsStore((state) => state.recentResolved);
  const setRecentResolved = useAlertsStore((state) => state.setRecentResolved);
  const suspectMachines = useAlertsStore((state) => state.suspectMachines);
  const setSuspectMachines = useAlertsStore((state) => state.setSuspectMachines);

  const [kpi, setKpi] = useState<KpiResponse | null>(null);
  const [importantMachines, setImportantMachines] = useState<ImportantMachine[]>([]);
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1h');
  const [chartMachineId, setChartMachineId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [acknowledgingIds, setAcknowledgingIds] = useState<Set<number>>(new Set());

  const loadKpi = useCallback(async () => {
    try {
      const data = await getKpi();
      setKpi(data);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [showSnackbar]);

  const loadImportantMachines = useCallback(async () => {
    try {
      const data = await getImportantMachines();
      setImportantMachines(data.machines);
      if (chartMachineId === null && data.machines.length > 0) {
        const critical = data.machines.find((m) => m.status === 'critical') || data.machines[0];
        setChartMachineId(critical.id);
      }
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [showSnackbar, chartMachineId]);

  const loadRecentResolved = useCallback(async () => {
    try {
      const data = await getRecentAlerts();
      setRecentResolved(data.alerts);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [showSnackbar, setRecentResolved]);

  const loadSuspectMachines = useCallback(async () => {
    try {
      const data = await getSuspectMachines();
      setSuspectMachines(data.machines);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  }, [showSnackbar, setSuspectMachines]);

  const loadChart = useCallback(
    async (machineId: number, period: ChartPeriod) => {
      try {
        const data = await getDashboardChart(machineId, period);
        setChartData(data);
      } catch (error) {
        showSnackbar(extractErrorMessage(error), 'error');
      }
    },
    [showSnackbar]
  );

  useEffect(() => {
    setLoading(true);
    Promise.all([loadKpi(), loadImportantMachines(), loadRecentResolved(), loadSuspectMachines()]).finally(() =>
      setLoading(false)
    );
    const kpiInterval = setInterval(loadKpi, 30000);
    const importantInterval = setInterval(loadImportantMachines, 10000);
    const recentInterval = setInterval(loadRecentResolved, 120000);
    const suspectInterval = setInterval(loadSuspectMachines, 30000);
    return () => {
      clearInterval(kpiInterval);
      clearInterval(importantInterval);
      clearInterval(recentInterval);
      clearInterval(suspectInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chartMachineId !== null) {
      loadChart(chartMachineId, chartPeriod);
    }
  }, [chartMachineId, chartPeriod, loadChart]);

  const handleAcknowledge = useCallback(
    async (alertId: number) => {
      setAcknowledgingIds((prev) => new Set(prev).add(alertId));
      try {
        await acknowledgeAlert(alertId);
        removeLiveAlert(alertId);
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
    [removeLiveAlert, showSnackbar]
  );

  const healthPercent = kpi?.system_health ?? 0;

  const chartOption = useMemo(() => {
    if (!chartData) return {};
    const anomalyTimes = new Set(chartData.anomaly_points.map((p) => p.time));
    return {
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: chartData.data.map((p) => new Date(p.time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })),
      },
      yAxis: { type: 'value', name: chartData.unit },
      series: [
        {
          type: 'line',
          data: chartData.data.map((p) => p.value),
          smooth: true,
          areaStyle: { opacity: 0.15 },
          itemStyle: { color: '#2563eb' },
          symbolSize: (_value: number, params: { dataIndex: number }) =>
            anomalyTimes.has(chartData.data[params.dataIndex].time) ? 10 : 4,
        },
      ],
    };
  }, [chartData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Всего станков"
            value={String(kpi?.total_machines ?? 0)}
            icon={<MemoryIcon />}
            color="#2563eb"
            bgColor="#eef2ff"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Онлайн"
            value={String(kpi?.online_machines ?? 0)}
            icon={<WifiIcon />}
            color="#16a34a"
            bgColor="#dcfce7"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            label="Аварии"
            value={String(kpi?.critical_alerts ?? 0)}
            icon={<WarningIcon />}
            color="#dc2626"
            bgColor="#fee2e2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Здоровье системы
                </Typography>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <CircularProgress variant="determinate" value={healthPercent} size={56} sx={{ color: '#16a34a' }} />
                  <Box
                    sx={{
                      top: 0,
                      left: 0,
                      bottom: 0,
                      right: 0,
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" fontWeight={700}>
                      {healthPercent}%
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Avatar sx={{ bgcolor: '#fef9c3', color: '#ca8a04', width: 48, height: 48 }}>
                <FavoriteIcon />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.75 }}>
        Важные станки
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {importantMachines.map((machine) => (
          <Grid item xs={12} sm={6} md={4} key={machine.id}>
            <ImportantMachineCard machine={machine} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3.5 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {chartData ? `Станок #${chartData.machine_id}` : 'График'}
                </Typography>
                <ButtonGroup size="small">
                  {(Object.keys(periodLabels) as ChartPeriod[])
                    .filter((p) => p !== 'month')
                    .map((period) => (
                      <Button
                        key={period}
                        variant={chartPeriod === period ? 'contained' : 'outlined'}
                        onClick={() => setChartPeriod(period)}
                      >
                        {periodLabels[period]}
                      </Button>
                    ))}
                </ButtonGroup>
              </Box>
              <Box sx={{ height: 220 }}>
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} notMerge />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Текущие аварии
              </Typography>
              {liveAlerts.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Активных аварий нет
                </Typography>
              )}
              {liveAlerts.map((alert) => (
                <LiveAlertRow
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  acknowledging={acknowledgingIds.has(alert.id)}
                />
              ))}
              <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Недавние решённые
              </Typography>
              {recentResolved.map((alert: RecentAlert) => (
                <Box key={alert.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography variant="body2">
                    {alert.machine_name} — {alert.message}
                  </Typography>
                  <Chip label="Решено" size="small" color="success" variant="outlined" />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.75 }}>
        Подозрительные датчики
      </Typography>
      <Grid container spacing={2}>
        {suspectMachines.map((machine: SuspectMachine) => (
          <Grid item xs={12} sm={6} md={4} key={machine.id}>
            <Card>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {machine.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {machine.issue}
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={600} color="#ca8a04">
                  {machine.value} {machine.unit}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
