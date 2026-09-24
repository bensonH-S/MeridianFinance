import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#FF5A0A', dark: '#FF7A3D', contrastText: '#FFFFFF' },
    secondary: { main: '#FF5A0A', dark: '#FF7A3D', contrastText: '#FFFFFF' },
    background: { default: '#060B10', paper: '#0C141C' },
    text: { primary: '#F5F7FA', secondary: '#8FA0AF' },
    divider: '#1C2A35',
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
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { '&.MuiButton-contained:hover': { backgroundColor: '#FF7A3D' } },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { outlined: { borderColor: '#1C2A35', backgroundColor: '#0C141C' } } },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#060B10',
          backgroundImage: 'radial-gradient(circle at 72% 0, #101d28 0, #060b10 38%)',
          colorScheme: 'dark',
        },
        '*': {
          scrollbarWidth: 'thin',
          scrollbarColor: '#3A4C5A transparent',
        },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-track': { background: 'transparent' },
        '*::-webkit-scrollbar-thumb': { background: '#3A4C5A', borderRadius: 8 },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { maxHeight: 240, backgroundColor: '#0A1219', border: '1px solid #1C2A35' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 14,
          fontWeight: 400,
          '&.Mui-selected': { backgroundColor: 'rgba(255, 90, 10, 0.16)' },
          '&.Mui-selected:hover': { backgroundColor: 'rgba(255, 90, 10, 0.22)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#738694', background: '#0C141C', borderColor: '#1C2A35' },
        body: { fontSize: 13, fontWeight: 400, color: '#D7E0E6', borderColor: '#17242E' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: '#0F1A23' },
      },
    },
  },
})
