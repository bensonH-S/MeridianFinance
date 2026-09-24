import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export function ModuloPage({ titulo }: { titulo: string }) {
  return (
    <Box sx={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Box component="img" src={`${import.meta.env.BASE_URL}logo-central.png?v=7`} alt="Central GA" sx={{ width: 280, height: 'auto', mb: 1.5 }} />
      <Typography sx={{ fontWeight: 500, letterSpacing: '0.04em', color: 'text.secondary', mb: 2 }}>Meridian Finance</Typography>
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 500 }}>
        Em desenvolvimento
      </Typography>
      <Typography variant="h5">{titulo}</Typography>
    </Box>
  )
}
