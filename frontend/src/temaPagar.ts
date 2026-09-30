import { createTheme } from '@mui/material/styles'

export const temaPagar = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1B6EF3', dark: '#0D4ECC', light: '#3B82F6', contrastText: '#FFFFFF' },
    secondary: { main: '#3B82F6', contrastText: '#FFFFFF' },
    success: { main: '#10B981', contrastText: '#FFFFFF' },
    warning: { main: '#F59E0B', contrastText: '#0B1220' },
    error: { main: '#EF4444', contrastText: '#FFFFFF' },
    background: { default: '#F7F9FC', paper: '#FFFFFF' },
    text: { primary: '#0B1220', secondary: '#64748B', disabled: '#94A3B8' },
    divider: '#E2E8F0',
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
            '&:hover': { backgroundColor: '#0D4ECC' },
          },
        },
        outlined: {
          borderColor: '#E2E8F0',
          color: '#0B1220',
          '&:hover': { borderColor: '#1B6EF3', backgroundColor: 'rgba(27, 110, 243, 0.06)' },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
      },
    },
    MuiMenu: {
      styleOverrides: { paper: { maxHeight: 240, backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' } },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          '&.Mui-selected': { backgroundColor: 'rgba(27, 110, 243, 0.1)' },
          '&.Mui-selected:hover': { backgroundColor: 'rgba(27, 110, 243, 0.16)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748B', background: '#FFFFFF', borderColor: '#E2E8F0' },
        body: { fontSize: 13, color: '#0B1220', borderColor: '#E2E8F0' },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: '#F7F9FC' } } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E8F0' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1B6EF3' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#1B6EF3', borderWidth: 1.5 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: '#1B6EF3' } } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundColor: '#FFFFFF', backgroundImage: 'none', borderLeft: '1px solid #E2E8F0', color: '#0B1220' } },
    },
    MuiDialog: {
      styleOverrides: { paper: { backgroundColor: '#FFFFFF', backgroundImage: 'none', border: '1px solid #E2E8F0', color: '#0B1220' } },
    },
  },
})
