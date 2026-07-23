import { FC } from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSnackbarStore } from '@/store/snackbarStore';

const GlobalSnackbar: FC = () => {
  const open = useSnackbarStore((state) => state.open);
  const message = useSnackbarStore((state) => state.message);
  const severity = useSnackbarStore((state) => state.severity);
  const closeSnackbar = useSnackbarStore((state) => state.closeSnackbar);

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={closeSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={closeSnackbar} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default GlobalSnackbar;
