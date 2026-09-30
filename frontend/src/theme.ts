import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1B2A6B', dark: '#152056', contrastText: '#FFFFFF' },
    secondary: { main: '#E8520A', dark: '#CF4909', contrastText: '#FFFFFF' },
    success: { main: '#059669', contrastText: '#FFFFFF' },
    warning: { main: '#D97706', contrastText: '#FFFFFF' },
    error: { main: '#DC2626', contrastText: '#FFFFFF' },
    background: { default: '#F9FAFB', paper: '#FFFFFF' },
    text: { primary: '#111827', secondary: '#6B7280', disabled: '#9CA3AF' },
    divider: '#E5E7EB',
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
            backgroundColor: '#1B2A6B',
            '&:hover': { backgroundColor: '#152056' },
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none' },
        outlined: { borderColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F9FAFB',
          color: '#111827',
          colorScheme: 'light',
        },
        '*': { scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': { background: '#D1D5DB', borderRadius: 8 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { maxHeight: 240, backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 400,
          '&.Mui-selected': { backgroundColor: 'rgba(27, 42, 107, 0.08)' },
          '&.Mui-selected:hover': { backgroundColor: 'rgba(27, 42, 107, 0.12)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B7280', background: '#FFFFFF', borderColor: '#E5E7EB' },
        body: { fontSize: 13, fontWeight: 400, color: '#111827', borderColor: '#E5E7EB' },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: '#F9FAFB' } } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E5E7EB' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D1D5DB' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#E8520A', borderWidth: 1.5 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { '&.Mui-focused': { color: '#E8520A' } } },
    },
    MuiDrawer: {
      styleOverrides: { paper: { backgroundImage: 'none' } },
    },
  },
})
