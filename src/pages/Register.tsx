import { FC, FormEvent, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { register } from '@/api/auth';
import { extractErrorMessage } from '@/api/client';
import { useSnackbarStore } from '@/store/snackbarStore';

const Register: FC = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbarStore((state) => state.showSnackbar);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      showSnackbar('Пожалуйста, заполните все поля', 'error');
      return;
    }
    if (password.length < 6) {
      showSnackbar('Пароль должен содержать минимум 6 символов', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showSnackbar('Пароли не совпадают', 'error');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email, password, confirm_password: confirmPassword });
      showSnackbar('Регистрация успешна! Теперь войдите в систему', 'success');
      navigate('/login');
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
          width: '100%',
          maxWidth: 440,
          p: { xs: 4, md: 6 },
          boxShadow: '0 0 40px rgba(0,0,0,0.05)',
        }}
      >
        <IconButton onClick={() => navigate('/login')} sx={{ mb: 1, ml: -1 }}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
          Регистрация
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Создайте новый аккаунт для доступа к системе
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            label="Имя и фамилия"
            value={name}
            onChange={(event) => setName(event.target.value)}
            fullWidth
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
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
          <TextField
            label="Подтверждение пароля"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            fullWidth
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CheckCircleIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Зарегистрироваться'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 3 }}>
          Уже есть аккаунт?{' '}
          <Link component={RouterLink} to="/login" underline="hover">
            Войти
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Register;
