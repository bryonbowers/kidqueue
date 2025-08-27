import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Paper,
  Chip,
  Container,
  Button,
  Alert,
  alpha,
  useTheme,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Fade,
} from '@mui/material'
import { Add, Refresh } from '@mui/icons-material'
import useQueue from '../hooks/useQueue'
import QueueService from '../services/queueService'

export default function KioskPage() {
  const theme = useTheme()
  
  // Use the unified queue hook that all pages use
  const { 
    allQueueEntries: queueEntries, 
    isLoading, 
    refreshQueue, 
    stats, 
    currentSchool, 
    user,
    formatEstimatedTime 
  } = useQueue()
  
  const handleCreateTestData = async () => {
    try {
      const schoolId = currentSchool?.id || user?.schoolId || 'default-school'
      await QueueService.createTestData(schoolId)
      refreshQueue() // Use unified refresh function
      console.log('[KIOSK] Test data created!')
    } catch (error) {
      console.error('[KIOSK] Error creating test data:', error)
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '60vh',
          gap: 3
        }}>
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            animation: 'pulse 2s infinite'
          }}>
            🚗
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.grey[700] }}>
            Loading Pickup Queue...
          </Typography>
          <LinearProgress sx={{ width: 200, borderRadius: 1 }} />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 3, md: 4 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
            backdropFilter: 'blur(20px)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            borderRadius: 4
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
            <Box>
              <Typography 
                variant="h2" 
                sx={{ 
                  fontWeight: 700, 
                  color: theme.palette.grey[900],
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  mb: 1
                }}
              >
                🚗 Pickup Queue
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: theme.palette.grey[600],
                  fontSize: { xs: '1rem', md: '1.125rem' }
                }}
              >
                Real-time student pickup display • {queueEntries?.length || 0} in queue
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={refreshQueue}
                sx={{ 
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  borderWidth: 2,
                  '&:hover': { borderWidth: 2 }
                }}
              >
                Refresh
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateTestData}
                  sx={{ 
                    borderRadius: 2,
                    px: 3,
                    py: 1.5
                  }}
                >
                  Add Test Data
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 4, 
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            '& .MuiAlert-icon': { fontSize: '1.5rem' }
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>Debug Mode:</Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            School: {currentSchool?.name || 'Unknown School'} ({currentSchool?.id || user?.schoolId || 'default-school'}) • 
            Queue Entries: {Array.isArray(queueEntries) ? queueEntries.length : 0}
          </Typography>
        </Alert>
      )}

      {/* Queue Display */}
      {queueEntries && Array.isArray(queueEntries) && queueEntries.length > 0 ? (
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
          {queueEntries.map((entry: any, index: number) => {
            const studentName = entry?.student?.name || entry?.studentId || 'Unknown Student'
            const vehicle = entry?.vehicle
            const vehicleInfo = vehicle 
              ? `${vehicle.licensePlate} • ${vehicle.make} ${vehicle.model}, ${vehicle.color}`
              : 'No vehicle info'
            const estimatedTime = formatEstimatedTime(entry?.queuePosition || index + 1)
            const isNextUp = index === 0
            const isCalled = entry?.status === 'called'
            
            return (
              <Fade in={true} key={entry?.id || Math.random()} timeout={300 + (index * 100)}>
                <Card
                  sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    border: isCalled 
                      ? `3px solid ${theme.palette.success.main}` 
                      : isNextUp 
                        ? `3px solid ${theme.palette.warning.main}`
                        : `2px solid ${alpha(theme.palette.grey[300], 0.5)}`,
                    background: isCalled 
                      ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`
                      : isNextUp
                        ? `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.light, 0.05)} 100%)`
                        : theme.palette.background.paper,
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4]
                    }
                  }}
                >
                  {/* Position Number */}
                  <Box sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: isCalled 
                      ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
                      : isNextUp
                        ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`
                        : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    boxShadow: theme.shadows[3]
                  }}>
                    {index + 1}
                  </Box>

                  <CardContent sx={{ p: 4, pr: 6 }}>
                    {/* Status Chip */}
                    <Box sx={{ mb: 3 }}>
                      <Chip
                        label={isCalled ? '🔔 CALLED FOR PICKUP' : isNextUp ? '⏳ NEXT UP' : '⏱️ WAITING'}
                        color={isCalled ? 'success' : isNextUp ? 'warning' : 'default'}
                        sx={{ 
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          px: 2,
                          py: 0.5,
                          height: 32
                        }}
                      />
                    </Box>

                    {/* Student Info */}
                    <Box sx={{ mb: 3 }}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          fontWeight: 700,
                          color: theme.palette.grey[900],
                          mb: 1,
                          fontSize: { xs: '1.75rem', md: '2rem' }
                        }}
                      >
                        {studentName}
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: theme.palette.grey[600],
                          fontSize: '1rem',
                          lineHeight: 1.6
                        }}
                      >
                        {vehicleInfo}
                      </Typography>
                    </Box>

                    {/* Estimated Time */}
                    <Box sx={{
                      p: 3,
                      background: alpha(theme.palette.primary.main, 0.08),
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`
                    }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: theme.palette.grey[600],
                          fontSize: '0.875rem',
                          mb: 0.5
                        }}
                      >
                        Estimated pickup time:
                      </Typography>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: theme.palette.primary.main,
                          fontWeight: 700,
                          fontSize: '1.125rem'
                        }}
                      >
                        {estimatedTime}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            )
          })}
        </Box>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: 8,
          textAlign: 'center'
        }}>
          <Box sx={{
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: alpha(theme.palette.grey[300], 0.5),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '3rem',
            mb: 3
          }}>
            🚗
          </Box>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600,
              color: theme.palette.grey[600],
              mb: 2
            }}
          >
            No students in pickup queue
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              color: theme.palette.grey[500],
              maxWidth: 400,
              lineHeight: 1.6
            }}
          >
            Students will appear here when they join the pickup queue. The display updates automatically in real-time.
          </Typography>
        </Box>
      )}
    </Container>
  )
}