import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  SelectChangeEvent,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  TableSortLabel,
  Stack,
} from '@mui/material';
import { getAlerts, acknowledgeAlert, exportAlerts } from '@/api/alerts';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';
import { useAlertsStore } from '@/store/alertsStore';
import { AlertPriority, AlertStatus, ExportFormat } from '@/types';

const statusLabelMap: Record<AlertStatus, { label: string; color: 'warning' | 'success' | 'error' }> = {
  pending: { label: '⏳ Ожидает', color: 'warning' },
  acknowledged: { label: '✅ Подтверждён', color: 'success' },
  escalated: { label: '🔄 Эскалирован', color: 'error' },
};

const priorityLabelMap: Record<AlertPriority, string> = {
  critical: '🔴 Критичный',
  warning: '🟡 Важный',
  info: '🔵 Информационный',
};

type SortableField = 'id' | 'time' | 'device' | 'priority' | 'status' | 'acknowledged_by';

const Alerts: FC = () => {
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const historyAlerts = useAlertsStore((state) => state.historyAlerts);
  const historyStats = useAlertsStore((state) => state.historyStats);
  const historyTotal = useAlertsStore((state) => state.historyTotal);
  const historyQuery = useAlertsStore((state) => state.historyQuery);
  const setHistoryAlerts = useAlertsStore((state) => state.setHistoryAlerts);
  const setHistoryQuery = useAlertsStore((state) => state.setHistoryQuery);
  const markAlertAcknowledgedInHistory = useAlertsStore((state) => state.markAlertAcknowledgedInHistory);

  const [confirmAlertId, setConfirmAlertId] = useState<number | null>(null);
  const [acknowledging, setAcknowledging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlerts(historyQuery);
      setHistoryAlerts(data.data, data.total, data.stats);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [historyQuery, setHistoryAlerts, showSnackbar]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const deviceOptions = useMemo(() => Array.from(new Set(historyAlerts.map((a) => a.device))), [historyAlerts]);
  const userOptions = useMemo(
    () => Array.from(new Set(historyAlerts.map((a) => a.acknowledged_by).filter((u): u is string => Boolean(u)))),
    [historyAlerts]
  );

  const handleFilterChange = (field: keyof typeof historyQuery) => (event: SelectChangeEvent<string>): void => {
    const value = event.target.value;
    setHistoryQuery({ ...historyQuery, [field]: value === 'all' ? undefined : value, page: 1 });
  };

  const handleDateChange = (field: 'date_from' | 'date_to') => (event: ChangeEvent<HTMLInputElement>): void => {
    setHistoryQuery({ ...historyQuery, [field]: event.target.value || undefined, page: 1 });
  };

  const handleSort = (field: SortableField): void => {
    const isAsc = historyQuery.sort === field && historyQuery.order === 'asc';
    setHistoryQuery({ ...historyQuery, sort: field, order: isAsc ? 'desc' : 'asc' });
  };

  const openConfirm = (alertId: number): void => setConfirmAlertId(alertId);
  const closeConfirm = (): void => setConfirmAlertId(null);

  const handleConfirmAcknowledge = async (): Promise<void> => {
    if (confirmAlertId === null) return;
    setAcknowledging(true);
    try {
      const response = await acknowledgeAlert(confirmAlertId);
      markAlertAcknowledgedInHistory(confirmAlertId, response.acknowledged_by, response.acknowledged_at);
      showSnackbar('Уведомление подтверждено', 'success');
      closeConfirm();
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleExport = async (format: ExportFormat): Promise<void> => {
    try {
      const blob = await exportAlerts({ ...historyQuery, format });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alerts_export.${format === 'excel' ? 'xlsx' : format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    }
  };

  const confirmedAlert = historyAlerts.find((a) => a.id === confirmAlertId);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: 1 }}>
      <Card>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="status-filter-label">Статус</InputLabel>
            <Select
              labelId="status-filter-label"
              label="Статус"
              value={historyQuery.status ?? 'all'}
              onChange={handleFilterChange('status')}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="pending">⏳ Ожидают</MenuItem>
              <MenuItem value="acknowledged">✅ Подтверждённые</MenuItem>
              <MenuItem value="escalated">🔄 Эскалированные</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="device-filter-label">Датчик</InputLabel>
            <Select
              labelId="device-filter-label"
              label="Датчик"
              value={historyQuery.device ?? 'all'}
              onChange={handleFilterChange('device')}
            >
              <MenuItem value="all">Все</MenuItem>
              {deviceOptions.map((device) => (
                <MenuItem key={device} value={device}>
                  {device}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="priority-filter-label">Приоритет</InputLabel>
            <Select
              labelId="priority-filter-label"
              label="Приоритет"
              value={historyQuery.priority ?? 'all'}
              onChange={handleFilterChange('priority')}
            >
              <MenuItem value="all">Все</MenuItem>
              <MenuItem value="critical">🔴 Критичный</MenuItem>
              <MenuItem value="warning">🟡 Важный</MenuItem>
              <MenuItem value="info">🔵 Информационный</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="user-filter-label">Сотрудник</InputLabel>
            <Select
              labelId="user-filter-label"
              label="Сотрудник"
              value={historyQuery.user ?? 'all'}
              onChange={handleFilterChange('user')}
            >
              <MenuItem value="all">Все</MenuItem>
              {userOptions.map((user) => (
                <MenuItem key={user} value={user}>
                  {user}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="date"
            label="с"
            InputLabelProps={{ shrink: true }}
            value={historyQuery.date_from ?? ''}
            onChange={handleDateChange('date_from')}
          />
          <TextField
            size="small"
            type="date"
            label="по"
            InputLabelProps={{ shrink: true }}
            value={historyQuery.date_to ?? ''}
            onChange={handleDateChange('date_to')}
          />
          <Stack direction="row" spacing={2} sx={{ ml: 'auto' }}>
            <Typography variant="body2">
              ⏳ Ожидают: <b>{historyStats.pending}</b>
            </Typography>
            <Typography variant="body2">
              ✅ Подтверждено: <b>{historyStats.acknowledged}</b>
            </Typography>
            <Typography variant="body2">
              🔄 Эскалировано: <b>{historyStats.escalated}</b>
            </Typography>
            <Typography variant="body2">
              📋 Всего: <b>{historyStats.total}</b>
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <TableContainer component={Card} sx={{ maxHeight: 460 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={historyQuery.sort === 'id'} direction={historyQuery.order} onClick={() => handleSort('id')}>
                  ID
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={historyQuery.sort === 'time'} direction={historyQuery.order} onClick={() => handleSort('time')}>
                  Время
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={historyQuery.sort === 'device'} direction={historyQuery.order} onClick={() => handleSort('device')}>
                  Датчик
                </TableSortLabel>
              </TableCell>
              <TableCell>Сообщение</TableCell>
              <TableCell>
                <TableSortLabel
                  active={historyQuery.sort === 'priority'}
                  direction={historyQuery.order}
                  onClick={() => handleSort('priority')}
                >
                  Приоритет
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={historyQuery.sort === 'status'} direction={historyQuery.order} onClick={() => handleSort('status')}>
                  Статус
                </TableSortLabel>
              </TableCell>
              <TableCell>Сотрудник</TableCell>
              <TableCell>Действие</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historyAlerts.map((alert) => (
              <TableRow key={alert.id} hover>
                <TableCell>#{alert.id}</TableCell>
                <TableCell>{new Date(alert.time).toLocaleString('ru')}</TableCell>
                <TableCell>{alert.device}</TableCell>
                <TableCell>{alert.message}</TableCell>
                <TableCell>{priorityLabelMap[alert.priority]}</TableCell>
                <TableCell>
                  <Chip label={statusLabelMap[alert.status].label} color={statusLabelMap[alert.status].color} size="small" />
                </TableCell>
                <TableCell>
                  {alert.status === 'acknowledged' && alert.acknowledged_by
                    ? `${alert.acknowledged_by} (${alert.acknowledged_at})`
                    : alert.status === 'escalated'
                      ? `🔄 ${alert.escalated_at ?? '—'}`
                      : '—'}
                </TableCell>
                <TableCell>
                  {alert.status === 'pending' ? (
                    <Button size="small" variant="contained" onClick={() => openConfirm(alert.id)}>
                      Подтвердить
                    </Button>
                  ) : alert.status === 'escalated' ? (
                    <Typography variant="caption" color="error">
                      Эскалирован
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="success.main">
                      Готово
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!loading && historyAlerts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Нет алертов с выбранными фильтрами
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant="contained" color="inherit" onClick={() => handleExport('csv')}>
          Скачать CSV
        </Button>
        <Button variant="contained" color="success" onClick={() => handleExport('excel')}>
          Скачать Excel
        </Button>
        <Button variant="contained" color="error" onClick={() => handleExport('pdf')}>
          Скачать PDF
        </Button>
      </Box>

      <Dialog open={confirmAlertId !== null} onClose={closeConfirm}>
        <DialogTitle>Подтверждение аварии</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите подтвердить получение уведомления
            {confirmedAlert ? ` "${confirmedAlert.message}" от ${confirmedAlert.device}` : ''}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm} disabled={acknowledging}>
            Отмена
          </Button>
          <Button onClick={handleConfirmAcknowledge} variant="contained" disabled={acknowledging}>
            Подтвердить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Alerts;
