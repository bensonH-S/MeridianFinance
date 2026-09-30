import { createTheme } from '@mui/material/styles'

export const temaEscuro = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#1B6EF3', dark: '#0D4ECC', light: '#60A5FA', contrastText: '#FFFFFF' },
    secondary: { main: '#60A5FA', contrastText: '#051017' },
    success: { main: '#34D399', contrastText: '#051017' },
    warning: { main: '#FBBF24', contrastText: '#051017' },
    error: { main: '#F87171', contrastText: '#051017' },
    background: { default: '#051017', paper: '#0C1822' },
    text: { primary: '#F8FAFC', secondary: '#94A3B8', disabled: '#64748B' },
    divider: '#1C3040',
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontWeightLight: 400,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h5: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em' },
    h6: { fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' },
    body1: { fontSize: 13, fontWeight: 400 },
    body2: { fontSize: 13, fontWeight: 400 },
    button: { textTransform: 'none', fontWeight: 500 },
    caption: { fontWeight: 400 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500 },
        contained: {
          '&.MuiButton-containedPrimary': {
            backgroundColor: '#1B6EF3',
            color: '#FFFFFF',
            '&:hover': { backgroundColor: '#3B82F6' },
          },
        },
        outlined: {
          borderColor: '#1C3040',
          color: '#F8FAFC',
          '&:hover': { borderColor: '#1B6EF3', backgroundColor: 'rgba(27, 110, 243, 0.12)' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#1C3040', backgroundColor: '#0C1822' },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { maxHeight: 240, backgroundColor: '#122433', border: '1px solid #1C3040' } },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          '&.Mui-selected': { backgroundColor: 'rgba(27, 110, 243, 0.2)' },
          '&.Mui-selected:hover': { backgroundColor: 'rgba(27, 110, 243, 0.28)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B', background: '#0C1822', borderColor: '#1C3040' },
        body: { fontSize: 13, color: '#F8FAFC', borderColor: '#1C3040' },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: '#122433' } } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#122433',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#1C3040' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1B6EF3' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1B6EF3', borderWidth: 1.5 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: '#60A5FA' } } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: '#0C1822', backgroundImage: 'none', borderLeft: '1px solid #1C3040', color: '#F8FAFC' } },
    },
    MuiDialog: {
      styleOverrides: { paper: { backgroundColor: '#0C1822', backgroundImage: 'none', border: '1px solid #1C3040', color: '#F8FAFC' } },
    },
  },
})
