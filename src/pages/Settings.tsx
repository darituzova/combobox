import { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Grid,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button,
  CircularProgress,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { getSettings, updateSettings } from '@/api/settings';
import { getSensorsList } from '@/api/comparison';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SensorListItem, SystemSettings, UserSettings } from '@/types';

const MAX_IMPORTANT_SENSORS = 6;

const Settings: FC = () => {
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const system = useSettingsStore((state) => state.system);
  const user = useSettingsStore((state) => state.user);
  const setSettings = useSettingsStore((state) => state.setSettings);

  const [sensors, setSensors] = useState<SensorListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [localSystem, setLocalSystem] = useState<SystemSettings | null>(null);
  const [localUser, setLocalUser] = useState<UserSettings | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsResponse, sensorsResponse] = await Promise.all([getSettings(), getSensorsList()]);
      setSettings(settingsResponse.system, settingsResponse.user);
      setLocalSystem(settingsResponse.system);
      setLocalUser(settingsResponse.user);
      setSensors(sensorsResponse.sensors);
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [setSettings, showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSystemChannelToggle = (channel: keyof SystemSettings['channels']) => (): void => {
    if (!localSystem) return;
    setLocalSystem({ ...localSystem, channels: { ...localSystem.channels, [channel]: !localSystem.channels[channel] } });
  };

  const handleEscalationTimeoutChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (!localSystem) return;
    setLocalSystem({ ...localSystem, escalation_timeout: Number(event.target.value) });
  };

  const handlePriorityChannelChange = (priority: keyof SystemSettings['priorities']) => (event: SelectChangeEvent<string>): void => {
    if (!localSystem) return;
    setLocalSystem({
      ...localSystem,
      priorities: {
        ...localSystem.priorities,
        [priority]: { ...localSystem.priorities[priority], channels: event.target.value },
      },
    });
  };

  const handlePriorityTimeoutChange = (priority: keyof SystemSettings['priorities']) => (
    event: ChangeEvent<HTMLInputElement>
  ): void => {
    if (!localSystem) return;
    setLocalSystem({
      ...localSystem,
      priorities: {
        ...localSystem.priorities,
        [priority]: { ...localSystem.priorities[priority], timeout: Number(event.target.value) },
      },
    });
  };

  const handleImportantSensorToggle = (sensorId: number): void => {
    if (!localUser) return;
    const isSelected = localUser.important_sensors.includes(sensorId);
    if (isSelected) {
      setLocalUser({ ...localUser, important_sensors: localUser.important_sensors.filter((id) => id !== sensorId) });
      return;
    }
    if (localUser.important_sensors.length >= MAX_IMPORTANT_SENSORS) {
      showSnackbar('Можно выбрать не более 6 важных датчиков', 'warning');
      return;
    }
    setLocalUser({ ...localUser, important_sensors: [...localUser.important_sensors, sensorId] });
  };

  const handleDefaultSensorChange = (event: SelectChangeEvent<string>): void => {
    if (!localUser) return;
    setLocalUser({ ...localUser, default_chart_sensor: Number(event.target.value) });
  };

  const handleThemeChange = (event: SelectChangeEvent<string>): void => {
    if (!localUser) return;
    setLocalUser({ ...localUser, theme: event.target.value as UserSettings['theme'] });
  };

  const handleEmailNotificationsToggle = (): void => {
    if (!localUser) return;
    setLocalUser({ ...localUser, email_notifications: !localUser.email_notifications });
  };

  const handleRefreshIntervalChange = (event: SelectChangeEvent<string>): void => {
    if (!localUser) return;
    setLocalUser({ ...localUser, refresh_interval: Number(event.target.value) });
  };

  const handleSave = async (): Promise<void> => {
    if (!localSystem || !localUser) return;
    setSaving(true);
    try {
      const response = await updateSettings({ system: localSystem, user: localUser });
      setSettings(localSystem, localUser);
      showSnackbar(response.message, 'success');
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !localSystem || !localUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            Системные настройки
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Настройки механизма оповещений и эскалации
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            <Typography variant="body2" fontWeight={500}>
              ⏱️ Время ожидания (минут до эскалации)
            </Typography>
            <TextField
              size="small"
              type="number"
              value={localSystem.escalation_timeout}
              onChange={handleEscalationTimeoutChange}
              inputProps={{ min: 1, max: 60 }}
              sx={{ width: 120 }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            <Typography variant="body2" fontWeight={500}>
              📨 Каналы дублирования
            </Typography>
            <FormGroup row>
              <FormControlLabel
                control={<Checkbox checked={localSystem.channels.telegram} onChange={handleSystemChannelToggle('telegram')} />}
                label="Telegram"
              />
              <FormControlLabel
                control={<Checkbox checked={localSystem.channels.email} onChange={handleSystemChannelToggle('email')} />}
                label="Email"
              />
              <FormControlLabel
                control={<Checkbox checked={localSystem.channels.sms} onChange={handleSystemChannelToggle('sms')} />}
                label="SMS"
              />
            </FormGroup>
          </Box>

          <Typography variant="body2" fontWeight={500} sx={{ mt: 2, mb: 1.5 }}>
            📊 Настройка приоритетов
          </Typography>
          <Grid container spacing={2}>
            {(['critical', 'warning', 'info'] as const).map((priority) => (
              <Grid item xs={12} md={4} key={priority}>
                <Card variant="outlined" sx={{ bgcolor: '#f8fafc' }}>
                  <CardContent>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1.5 }}>
                      {priority === 'critical' ? '🔴 Критичный' : priority === 'warning' ? '🟡 Важный' : '🔵 Информационный'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="caption">Каналы:</Typography>
                      <Select
                        size="small"
                        value={localSystem.priorities[priority].channels}
                        onChange={handlePriorityChannelChange(priority)}
                        sx={{ flex: 1 }}
                      >
                        <MenuItem value="telegram,sms">Telegram, SMS</MenuItem>
                        <MenuItem value="telegram,email">Telegram, Email</MenuItem>
                        <MenuItem value="all">Все</MenuItem>
                        <MenuItem value="telegram">Telegram</MenuItem>
                        <MenuItem value="email">Email</MenuItem>
                        <MenuItem value="">Не отправлять</MenuItem>
                      </Select>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption">Время:</Typography>
                      <TextField
                        size="small"
                        type="number"
                        value={localSystem.priorities[priority].timeout}
                        onChange={handlePriorityTimeoutChange(priority)}
                        inputProps={{ min: 1, max: 60 }}
                        sx={{ width: 80 }}
                      />
                      <Typography variant="caption">мин</Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
            Настройки пользователя
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Настройка отображения данных на вашем дашборде
          </Typography>

          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            🔍 Важные датчики (выберите до 6 для отображения на дашборде)
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0.5, maxHeight: 150, overflowY: 'auto', mb: 2 }}>
            {sensors.map((sensor) => (
              <FormControlLabel
                key={sensor.id}
                control={
                  <Checkbox
                    size="small"
                    checked={localUser.important_sensors.includes(sensor.id)}
                    onChange={() => handleImportantSensorToggle(sensor.id)}
                  />
                }
                label={<Typography variant="body2">{sensor.name}</Typography>}
              />
            ))}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            <Typography variant="body2" fontWeight={500}>
              📊 Датчик для графика (по умолчанию)
            </Typography>
            <Select size="small" value={String(localUser.default_chart_sensor)} onChange={handleDefaultSensorChange} sx={{ minWidth: 220 }}>
              {sensors.map((sensor) => (
                <MenuItem key={sensor.id} value={String(sensor.id)}>
                  {sensor.name} ({sensor.type_label})
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            <Typography variant="body2" fontWeight={500}>
              🌙 Тема оформления
            </Typography>
            <Select size="small" value={localUser.theme} onChange={handleThemeChange} sx={{ minWidth: 180 }}>
              <MenuItem value="light">☀️ Светлая</MenuItem>
              <MenuItem value="dark">🌙 Тёмная</MenuItem>
              <MenuItem value="system">💻 Системная</MenuItem>
            </Select>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #f1f5f9' }}>
            <Typography variant="body2" fontWeight={500}>
              🔔 Получать уведомления на почту
            </Typography>
            <FormControlLabel
              control={<Checkbox checked={localUser.email_notifications} onChange={handleEmailNotificationsToggle} />}
              label="Включить"
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
            <Typography variant="body2" fontWeight={500}>
              🔄 Частота обновления данных
            </Typography>
            <Select size="small" value={String(localUser.refresh_interval)} onChange={handleRefreshIntervalChange} sx={{ minWidth: 160 }}>
              <MenuItem value="5">5 секунд</MenuItem>
              <MenuItem value="10">10 секунд</MenuItem>
              <MenuItem value="30">30 секунд</MenuItem>
              <MenuItem value="60">1 минута</MenuItem>
            </Select>
          </Box>
        </CardContent>
      </Card>

      <Button variant="contained" size="large" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ alignSelf: 'flex-start' }}>
        {saving ? <CircularProgress size={20} color="inherit" /> : 'Сохранить все настройки'}
      </Button>
    </Box>
  );
};

export default Settings;
