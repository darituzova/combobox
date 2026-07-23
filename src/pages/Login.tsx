import { FC, FormEvent, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import FactoryIcon from '@mui/icons-material/Factory';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MapIcon from '@mui/icons-material/Map';
import SecurityIcon from '@mui/icons-material/Security';
import { login } from '@/api/auth';
import { extractErrorMessage } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { useSnackbarStore } from '@/store/snackbarStore';

const features = [
  { icon: <ShowChartIcon />, text: 'Визуализация данных в реальном времени' },
  { icon: <NotificationsActiveIcon />, text: 'Умные уведомления с подтверждением' },
  { icon: <MapIcon />, text: 'Интерактивная карта цеха' },
  { icon: <SecurityIcon />, text: 'Безопасный доступ и аудит действий' },
];

const Login: FC = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!email || !password) {
      showSnackbar('Пожалуйста, заполните все поля', 'error');
      return;
    }
    setLoading(true);
    try {
      const response = await login({ email, password });
      setSession(response.token, response.refresh_token, response.user);
      showSnackbar('Добро пожаловать в систему!', 'success');
      navigate('/dashboard');
    } catch (error) {
      showSnackbar(extractErrorMessage(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          width: '100%',
          maxWidth: 1200,
          minHeight: { xs: 'auto', md: '100vh' },
          boxShadow: '0 0 40px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'linear-gradient(145deg, #0f172a, #1e293b)',
            color: '#ffffff',
            p: 6,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <FactoryIcon sx={{ color: 'primary.main', fontSize: 28 }} />
            <Typography variant="h5" fontWeight={700}>
              IIoT Monitor
            </Typography>
          </Box>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 1.5, lineHeight: 1.2 }}>
            Умный мониторинг промышленного оборудования
          </Typography>
          <Typography sx={{ color: '#94a3b8', maxWidth: 380 }}>
            Платформа для сбора, визуализации и анализа данных с датчиков в реальном времени
          </Typography>
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {features.map((feature) => (
              <Box key={feature.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ color: 'primary.main', display: 'flex' }}>{feature.icon}</Box>
                <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                  {feature.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            flex: { xs: 1, md: '0 0 440px' },
            p: { xs: 4, md: 6 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
            Вход в систему
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Введите свои учётные данные для доступа к дашборду
          </Typography>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Пароль"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  size="small"
                />
              }
              label={<Typography variant="body2">Запомнить меня</Typography>}
            />
            <Link component={RouterLink} to="/reset-password" underline="hover" variant="body2">
              Забыли пароль?
            </Link>
          </Box>
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Войти'}
          </Button>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
            Нет аккаунта?{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              Зарегистрироваться
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
