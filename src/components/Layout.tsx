import { FC, ReactNode, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Chip,
  Divider,
  useMediaQuery,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/PieChartOutline';
import MapIcon from '@mui/icons-material/Map';
import TableChartIcon from '@mui/icons-material/TableChart';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import NotificationsIcon from '@mui/icons-material/NotificationsActive';
import SettingsIcon from '@mui/icons-material/Tune';
import LogoutIcon from '@mui/icons-material/Logout';
import FactoryIcon from '@mui/icons-material/Factory';
import { useAuthStore } from '@/store/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Дашборд', icon: <DashboardIcon /> },
  { path: '/map', label: 'Карта цеха', icon: <MapIcon /> },
  { path: '/devices', label: 'Все станки', icon: <TableChartIcon /> },
  { path: '/comparison', label: 'Сравнение', icon: <CompareArrowsIcon /> },
  { path: '/alerts', label: 'История алертов', icon: <NotificationsIcon /> },
  { path: '/settings', label: 'Настройки', icon: <SettingsIcon /> },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Дашборд',
  '/map': 'Карта цеха',
  '/devices': 'Все станки',
  '/comparison': 'Сравнение датчиков',
  '/alerts': 'История алертов',
  '/settings': 'Настройки',
};

const DRAWER_WIDTH = 230;
const DRAWER_WIDTH_COLLAPSED = 72;

interface LayoutProps {
  children: ReactNode;
}

const Layout: FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const isMobile = useMediaQuery('(max-width:768px)');
  const wsStatus = useWebSocket();

  const currentTitle = useMemo(() => {
    if (location.pathname.startsWith('/device/')) return 'Детали станка';
    return pageTitles[location.pathname] || 'IIoT Monitor';
  }, [location.pathname]);

  const drawerWidth = isMobile ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const isActive = (path: string): boolean => {
    if (path === '/devices') {
      return location.pathname === '/devices' || location.pathname.startsWith('/device/');
    }
    return location.pathname === path;
  };

  const handleLogout = (): void => {
    clearSession();
    navigate('/login');
  };

  const statusColor = wsStatus === 'connected' ? '#22c55e' : wsStatus === 'connecting' ? '#eab308' : '#94a3b8';
  const statusLabel = wsStatus === 'connected' ? 'Онлайн' : wsStatus === 'connecting' ? 'Подключение' : 'Офлайн';

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 'none',
            borderRight: '1px solid #e2e8f0',
            px: isMobile ? 1 : 2,
            py: 3,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, px: isMobile ? 0 : 1, justifyContent: isMobile ? 'center' : 'flex-start' }}>
          <FactoryIcon sx={{ color: 'primary.main' }} />
          {!isMobile && (
            <Typography variant="h6" fontWeight={700} color="secondary.main">
              IIoT Monitor
            </Typography>
          )}
        </Box>
        <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              selected={isActive(item.path)}
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                justifyContent: isMobile ? 'center' : 'flex-start',
                px: isMobile ? 1 : 2,
                '&.Mui-selected': {
                  bgcolor: '#eef2ff',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: isMobile ? 0 : 40, color: '#94a3b8' }}>{item.icon}</ListItemIcon>
              {!isMobile && <ListItemText primary={item.label} />}
            </ListItemButton>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{ borderRadius: 2, justifyContent: isMobile ? 'center' : 'flex-start', px: isMobile ? 1 : 2 }}
        >
          <ListItemIcon sx={{ minWidth: isMobile ? 0 : 40, color: '#94a3b8' }}>
            <LogoutIcon />
          </ListItemIcon>
          {!isMobile && <ListItemText primary="Выйти" />}
        </ListItemButton>
      </Drawer>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', p: { xs: 2, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" color="secondary.main">
            {currentTitle}
          </Typography>
          <Chip
            label={statusLabel}
            sx={{
              bgcolor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              fontWeight: 600,
              '&::before': undefined,
            }}
            icon={
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: statusColor,
                  ml: 1,
                }}
              />
            }
          />
        </Box>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</Box>
      </Box>
    </Box>
  );
};

export default Layout;
