import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { usePrefs } from '../prefs'

export function ModuloPage({ titulo }: { titulo: string }) {
  const { t } = usePrefs()
  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Box component="img" src={`${import.meta.env.BASE_URL}logo-azimut.png?v=5`} alt="Azimut" sx={{ width: 'min(520px, 92%)', height: 'auto', mb: 1.5 }} />
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 500 }}>
        {t('Em desenvolvimento', 'In progress')}
      </Typography>
      <Typography variant="h5">{titulo}</Typography>
    </Box>
  )
}
