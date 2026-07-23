import { FC } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from '@/theme';
import AppRouter from '@/router';
import GlobalSnackbar from '@/components/GlobalSnackbar';

const App: FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
    <GlobalSnackbar />
  </ThemeProvider>
);

export default App;
