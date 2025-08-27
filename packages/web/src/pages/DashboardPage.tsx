import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  Container,
  alpha,
  useTheme,
  Avatar,
  LinearProgress,
  Fade,
  Grow,
} from '@mui/material'
import { School, School as SchoolIcon, DirectionsCar, Queue, QrCode, Add, Remove, Clear, ViewList, TrendingUp, Speed, Person } from '@mui/icons-material'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { useSchool } from '../contexts/SchoolContext'
import { useAnalytics } from '../hooks/useAnalytics'
import useSchoolFirebase from '../hooks/useSchoolFirebase'
import useQueue from '../hooks/useQueue'
import QRScanner from '../components/QRScanner'
import LicensePlateScanner from '../components/LicensePlateScanner'
import SchoolSelector from '../components/SchoolSelector'
import ActiveUsersDisplay from '../components/ActiveUsersDisplay'

export default function DashboardPage() {
  const { user } = useAuth()
  const { currentSchool } = useSchool()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const schoolFirebase = useSchoolFirebase()
  const theme = useTheme()
  const { 
    trackFeatureUsed, 
    trackQueueJoined, 
    trackQueueLeft, 
    trackQueueCleared, 
    trackQRCodeScanned, 
    trackError,
    trackConversion,
    trackNavigation
  } = useAnalytics()
  
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerAction, setScannerAction] = useState<'add' | 'remove' | null>(null)
  const [licensePlateScannerOpen, setLicensePlateScannerOpen] = useState(false)
  const [queueMessage, setQueueMessage] = useState<string | null>(null)
  const [showScanOptions, setShowScanOptions] = useState(false)

  const { data: students } = useQuery({
    queryKey: ['students', user?.id, currentSchool?.id],
    queryFn: schoolFirebase.getStudents,
    enabled: !!user?.id && !!currentSchool?.id,
  })

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', user?.id, currentSchool?.id],
    queryFn: schoolFirebase.getVehicles,
    enabled: !!user?.id && !!currentSchool?.id,
  })

  // Use unified queue hook for consistent data access - showing ALL school queue entries like kiosk
  const { allQueueEntries: queueEntries, refreshQueue, formatEstimatedTime } = useQueue()

  // Queue mutations
  const addToQueueMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      console.log('[DASHBOARD DEBUG] Starting add to queue process...')
      console.log('[DASHBOARD DEBUG] User:', { id: user?.id, schoolId: user?.schoolId, name: user?.name })
      console.log('[DASHBOARD DEBUG] QR Code:', qrCode)
      
      if (!user?.id) {
        console.error('[DASHBOARD DEBUG] User not authenticated')
        throw new Error('User not authenticated')
      }
      
      if (!user?.schoolId) {
        console.warn('[DASHBOARD DEBUG] User missing schoolId, using default')
        // Use a default school ID for now - in production, users should select their school
        const defaultSchoolId = 'default-school'
        console.log('[DASHBOARD DEBUG] Using default school ID:', defaultSchoolId)
      }
      
      // Get vehicle by QR code
      console.log('[DASHBOARD DEBUG] Looking up vehicle by QR code...')
      const vehicle = await schoolFirebase.getVehicleByQRCode(qrCode)
      console.log('[DASHBOARD DEBUG] Found vehicle:', vehicle)
      
      // Add vehicle and students to queue
      console.log('[DASHBOARD DEBUG] Adding vehicle to queue...')
      const result = await schoolFirebase.addVehicleToQueue(vehicle.id)
      console.log('[DASHBOARD DEBUG] Queue addition result:', result)
      
      return result
    },
    onSuccess: (queueEntries) => {
      console.log('[DASHBOARD DEBUG] Add to queue SUCCESS:', queueEntries)
      setQueueMessage(`✅ Added ${queueEntries.length} student(s) to pickup queue!`)
      
      // Track successful queue join
      trackQueueJoined({
        studentIds: queueEntries.map((entry: any) => entry.studentId),
        vehicleId: queueEntries[0]?.vehicleId || '',
        schoolId: currentSchool?.id || 'no-school',
        method: 'qr_scan',
        queuePosition: queueEntries[0]?.queuePosition || 0
      })
      
      // Track conversion - joining queue is a key success metric
      trackConversion('queue_joined', queueEntries.length, {
        students_count: queueEntries.length,
        method: 'qr_scan'
      })
      
      refreshQueue()
      setTimeout(() => setQueueMessage(null), 3000)
    },
    onError: (error: any) => {
      console.error('[DASHBOARD DEBUG] Add to queue ERROR:', error)
      setQueueMessage(`❌ Error: ${error.message}`)
      
      // Track queue join failure
      trackError('queue_join_failed', error.message, {
        method: 'qr_scan',
        user_id: user?.id,
        school_id: currentSchool?.id
      })
      
      setTimeout(() => setQueueMessage(null), 5000)
    }
  })

  const removeFromQueueMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      // Get vehicle by QR code
      const vehicle = await schoolFirebase.getVehicleByQRCode(qrCode)
      
      // Remove vehicle and students from queue
      return await schoolFirebase.removeVehicleFromQueue(vehicle.id)
    },
    onSuccess: (removedCount) => {
      setQueueMessage(`✅ Removed ${removedCount} student(s) from pickup queue!`)
      
      // Track queue removal
      trackQueueLeft('cancelled', removedCount)
      
      refreshQueue()
      setTimeout(() => setQueueMessage(null), 3000)
    },
    onError: (error: any) => {
      setQueueMessage(`❌ Error: ${error.message}`)
      setTimeout(() => setQueueMessage(null), 5000)
    }
  })

  const clearQueueMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated')
      
      console.log('[DASHBOARD DEBUG] Starting clear queue process...')
      console.log('[DASHBOARD DEBUG] Clearing queue for school:', currentSchool?.id)
      
      return await schoolFirebase.clearAllQueue()
    },
    onSuccess: (clearedCount) => {
      console.log('[DASHBOARD DEBUG] Clear queue SUCCESS:', clearedCount)
      setQueueMessage(`✅ Cleared ${clearedCount} student(s) from the pickup queue!`)
      
      // Track queue clearing
      trackQueueCleared(clearedCount, currentSchool?.id || 'no-school')
      
      refreshQueue()
      setTimeout(() => setQueueMessage(null), 3000)
    },
    onError: (error: any) => {
      console.error('[DASHBOARD DEBUG] Clear queue ERROR:', error)
      setQueueMessage(`❌ Error clearing queue: ${error.message}`)
      setTimeout(() => setQueueMessage(null), 5000)
    }
  })

  // Scanner handlers
  const handleScanQR = (result: string) => {
    setScannerOpen(false)
    
    // Track QR scan success
    trackQRCodeScanned('vehicle', 'camera', true)
    
    if (scannerAction === 'add') {
      trackFeatureUsed('queue_add_qr_scan')
      addToQueueMutation.mutate(result)
    } else if (scannerAction === 'remove') {
      trackFeatureUsed('queue_remove_qr_scan')
      removeFromQueueMutation.mutate(result)
    }
    
    setScannerAction(null)
  }

  const openAddScanner = () => {
    trackFeatureUsed('open_add_scanner')
    setScannerAction('add')
    setScannerOpen(true)
  }

  const openRemoveScanner = () => {
    trackFeatureUsed('open_remove_scanner')
    setScannerAction('remove')
    setScannerOpen(true)
  }

  const openLicensePlateScanner = () => {
    trackFeatureUsed('open_license_plate_scanner')
    setLicensePlateScannerOpen(true)
  }

  const handleLicensePlateComplete = async (result: { vehicleId: string; studentIds: string[] }) => {
    try {
      console.log('[DASHBOARD] License plate scan complete:', result)
      
      // Add vehicle and students to queue using the existing logic
      const queueResult = await schoolFirebase.addVehicleToQueue(result.vehicleId)
      
      // Show success message
      setQueueMessage(`✅ Added vehicle to pickup queue with ${result.studentIds.length} student(s)!`)
      
      // Track successful queue addition from license plate
      trackQueueJoined({
        studentIds: result.studentIds,
        vehicleId: result.vehicleId,
        schoolId: currentSchool?.id || 'no-school',
        method: 'qr_scan', // Using same method for consistency
        queuePosition: 0 // Will be determined by the service
      })
      
      // Track license plate to queue conversion
      trackConversion('license_plate_to_queue', result.studentIds.length, {
        students_count: result.studentIds.length,
        method: 'license_plate_scan'
      })
      
      // Refresh queue data
      refreshQueue()
      setTimeout(() => setQueueMessage(null), 3000)
      
    } catch (error: any) {
      console.error('[DASHBOARD] Error adding license plate vehicle to queue:', error)
      setQueueMessage(`❌ Error: ${error.message}`)
      
      trackError('license_plate_queue_failed', error.message, {
        vehicle_id: result.vehicleId,
        student_count: result.studentIds.length,
        school_id: currentSchool?.id
      })
      
      setTimeout(() => setQueueMessage(null), 5000)
    }
  }

  const handleClearQueue = () => {
    const confirmed = window.confirm('Are you sure you want to clear the entire queue? This will remove all students from the pickup queue and cannot be undone.')
    
    if (confirmed) {
      console.log('[DASHBOARD DEBUG] User confirmed queue clear')
      clearQueueMutation.mutate()
    } else {
      console.log('[DASHBOARD DEBUG] User cancelled queue clear')
    }
  }

  const stats = [
    {
      title: 'Students',
      value: students?.length || 0,
      icon: <School />,
      color: theme.palette.primary.main,
      gradient: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
      action: () => navigate('/students'),
    },
    {
      title: 'Vehicles',
      value: vehicles?.length || 0,
      icon: <DirectionsCar />,
      color: theme.palette.success.main,
      gradient: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
      action: () => navigate('/vehicles'),
    },
    {
      title: 'In Queue',
      value: Array.isArray(queueEntries) ? queueEntries.length : 0,
      icon: <Queue />,
      color: theme.palette.warning.main,
      gradient: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
      action: () => navigate('/kiosk'),
    },
  ]

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      {/* Hero Header Section */}
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 3, md: 4 },
          mb: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          zIndex: 0
        }} />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ flex: 1, minWidth: 300 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ 
                  width: 56, 
                  height: 56,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  boxShadow: theme.shadows[3]
                }}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      fontWeight: 700, 
                      color: theme.palette.grey[900],
                      fontSize: { xs: '1.75rem', md: '2.25rem' },
                      lineHeight: 1.2,
                      mb: 0.5
                    }}
                  >
                    Welcome back, {user?.name?.split(' ')[0] || 'User'}! 👋
                  </Typography>
                  {currentSchool && (
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: theme.palette.grey[600],
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        fontSize: { xs: '1rem', md: '1.125rem' }
                      }}
                    >
                      <SchoolIcon fontSize="small" />
                      {currentSchool.name}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Typography 
                variant="body1" 
                sx={{ 
                  color: theme.palette.grey[600],
                  maxWidth: 500,
                  lineHeight: 1.6
                }}
              >
                Manage your school pickup queue with smart, efficient tools. Everything you need is right here.
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              {user?.role === 'admin' && (
                <ActiveUsersDisplay 
                  showAllUsers={true} 
                  compact={true} 
                />
              )}
              <SchoolSelector variant="button" showRole={true} />
            </Box>
          </Box>
        </Box>
      </Paper>

      {(!students || students.length === 0) && (
        <Fade in timeout={800}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: 4,
              borderRadius: 3,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.light, 0.05)} 100%)`,
              '& .MuiAlert-icon': { fontSize: '1.5rem' },
              p: 2.5
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
              Ready to get started? 🚀
            </Typography>
            <Typography variant="body2">
              Add your students and vehicles to start managing your pickup queue efficiently.
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Grow in timeout={500 + (index * 200)}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  background: alpha(theme.palette.background.paper, 0.9),
                  backdropFilter: 'blur(20px)',
                  border: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: `0 20px 40px ${alpha(stat.color, 0.15)}`,
                    border: `1px solid ${alpha(stat.color, 0.3)}`,
                    '& .stat-icon': {
                      transform: 'scale(1.1)'
                    },
                    '& .stat-bg': {
                      transform: 'scale(1.2) rotate(10deg)'
                    }
                  }
                }}
                onClick={stat.action}
              >
                {/* Background decoration */}
                <Box className="stat-bg" sx={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: alpha(stat.color, 0.1),
                  transition: 'transform 0.3s ease-in-out',
                  zIndex: 0
                }} />
                
                <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Box className="stat-icon" sx={{
                      width: 56,
                      height: 56,
                      borderRadius: 3,
                      background: stat.gradient,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 8px 32px ${alpha(stat.color, 0.3)}`,
                      transition: 'transform 0.3s ease-in-out',
                      '& svg': {
                        fontSize: '1.75rem'
                      }
                    }}>
                      {stat.icon}
                    </Box>
                    <TrendingUp sx={{ color: alpha(stat.color, 0.6), fontSize: '1.25rem' }} />
                  </Box>
                  
                  <Box>
                    <Typography 
                      variant="h3" 
                      sx={{ 
                        fontWeight: 800,
                        color: theme.palette.grey[900],
                        fontSize: '2.5rem',
                        lineHeight: 1,
                        mb: 0.5
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{
                        color: theme.palette.grey[600],
                        fontWeight: 600,
                        fontSize: '1rem'
                      }}
                    >
                      {stat.title}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grow>
          </Grid>
        ))}

        <Grid item xs={12} md={6}>
          <Fade in timeout={1000}>
            <Paper sx={{ 
              p: 4,
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: theme.shadows[3]
                }}>
                  <Person />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.grey[900] }}>
                  Recent Students
                </Typography>
              </Box>
              
              <Box sx={{ flex: 1 }}>
                {students && Array.isArray(students) && students.length > 0 ? (
                  <List sx={{ py: 0 }}>
                    {students.slice(0, 5).filter(Boolean).map((student: any, index: number) => (
                      <ListItem 
                        key={student?.id || Math.random()} 
                        divider={index < 4}
                        sx={{
                          px: 0,
                          py: 1.5,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                            borderRadius: 2
                          }
                        }}
                      >
                        <Avatar sx={{ 
                          mr: 2,
                          width: 36,
                          height: 36,
                          background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
                          fontSize: '0.875rem',
                          fontWeight: 600
                        }}>
                          {student?.name?.charAt(0)?.toUpperCase() || 'S'}
                        </Avatar>
                        <ListItemText
                          primary={
                            <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.grey[900] }}>
                              {student?.name || 'Unknown Student'}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" sx={{ color: theme.palette.grey[600] }}>
                              Grade {student?.grade || 'Unknown'} • {student?.school?.name || 'No school'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 4,
                    textAlign: 'center'
                  }}>
                    <Box sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: alpha(theme.palette.grey[300], 0.5),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      mb: 2
                    }}>
                      👥
                    </Box>
                    <Typography variant="body1" sx={{ color: theme.palette.grey[600], mb: 1 }}>
                      No students yet
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500], maxWidth: 280 }}>
                      Add your first student to get started with managing your pickup queue.
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.grey[200], 0.5)}` }}>
                <Button 
                  variant="contained" 
                  size="large"
                  startIcon={<School />}
                  onClick={() => {
                    trackNavigation('dashboard', '/students', 'click')
                    navigate('/students')
                  }}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`
                  }}
                >
                  Manage Students
                </Button>
              </Box>
            </Paper>
          </Fade>
        </Grid>

        <Grid item xs={12} md={6}>
          <Fade in timeout={1200}>
            <Paper sx={{ 
              p: 4,
              background: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(20px)',
              border: `1px solid ${alpha(theme.palette.grey[200], 0.5)}`,
              borderRadius: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: theme.shadows[3]
                }}>
                  <Queue />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.grey[900] }}>
                  Queue Status
                </Typography>
                {Array.isArray(queueEntries) && queueEntries.length > 0 && (
                  <Chip
                    label={`${queueEntries.length} active`}
                    color="warning"
                    size="small"
                    sx={{ 
                      ml: 'auto',
                      fontWeight: 600,
                      background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`,
                      color: 'white'
                    }}
                  />
                )}
              </Box>
              
              <Box sx={{ flex: 1 }}>
                {queueEntries && Array.isArray(queueEntries) && queueEntries.length > 0 ? (
                  <List sx={{ py: 0 }}>
                    {queueEntries.slice(0, 4).filter(Boolean).map((entry: any, index: number) => {
                      const studentName = entry?.student?.name || entry?.studentId || 'Unknown Student'
                      const vehicle = entry?.vehicle
                      const vehicleInfo = vehicle 
                        ? `${vehicle.licensePlate} • ${vehicle.make} ${vehicle.model}, ${vehicle.color}`
                        : 'No vehicle info'
                      const estimatedTime = formatEstimatedTime(entry?.queuePosition || index + 1)
                      const isNextUp = index === 0
                      const isCalled = entry?.status === 'called'
                      
                      return (
                        <ListItem 
                          key={entry?.id || Math.random()} 
                          divider={index < 3}
                          sx={{
                            px: 0,
                            py: 1.5,
                            borderRadius: 2,
                            mb: 1,
                            background: isCalled 
                              ? alpha(theme.palette.success.main, 0.08)
                              : isNextUp
                                ? alpha(theme.palette.warning.main, 0.08)
                                : 'transparent',
                            border: isCalled 
                              ? `1px solid ${alpha(theme.palette.success.main, 0.2)}`
                              : isNextUp
                                ? `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                                : '1px solid transparent',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          <Box sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: isCalled 
                              ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
                              : isNextUp
                                ? `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.warning.dark} 100%)`
                                : `linear-gradient(135deg, ${theme.palette.grey[400]} 0%, ${theme.palette.grey[600]} 100%)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                            mr: 2,
                            boxShadow: theme.shadows[2]
                          }}>
                            {index + 1}
                          </Box>
                          <ListItemText
                            primary={
                              <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.grey[900] }}>
                                {studentName}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="caption" sx={{ fontSize: '0.75rem', color: theme.palette.grey[600], display: 'block' }}>
                                  {vehicleInfo}
                                </Typography>
                                <Typography variant="caption" sx={{ 
                                  fontSize: '0.8rem', 
                                  color: theme.palette.primary.main, 
                                  fontWeight: 600, 
                                  display: 'block',
                                  mt: 0.5
                                }}>
                                  ⏱️ {estimatedTime}
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip
                            label={isCalled ? '🔔 Called' : isNextUp ? '⏳ Next' : '⏱️ Waiting'}
                            color={isCalled ? 'success' : isNextUp ? 'warning' : 'default'}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem'
                            }}
                          />
                        </ListItem>
                      )
                    })}
                    {queueEntries.length > 4 && (
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.grey[500], 
                        textAlign: 'center', 
                        py: 1,
                        fontStyle: 'italic'
                      }}>
                        +{queueEntries.length - 4} more in queue
                      </Typography>
                    )}
                  </List>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 4,
                    textAlign: 'center'
                  }}>
                    <Box sx={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: alpha(theme.palette.grey[300], 0.5),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      mb: 2
                    }}>
                      🚗
                    </Box>
                    <Typography variant="body1" sx={{ color: theme.palette.grey[600], mb: 1 }}>
                      Queue is empty
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.grey[500], maxWidth: 280 }}>
                      Students will appear here when they join the pickup queue.
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha(theme.palette.grey[200], 0.5)}` }}>
                <Button 
                  variant="outlined" 
                  size="large"
                  startIcon={<ViewList />}
                  onClick={() => {
                    trackNavigation('dashboard', '/kiosk', 'click')
                    navigate('/kiosk')
                  }}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2 }
                  }}
                >
                  View Full Queue
                </Button>
              </Box>
            </Paper>
          </Fade>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<School />}
                  onClick={() => {
                    trackNavigation('dashboard', '/students', 'click')
                    navigate('/students')
                  }}
                  sx={{ py: 2 }}
                >
                  Manage Students
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<DirectionsCar />}
                  onClick={() => {
                    trackNavigation('dashboard', '/vehicles', 'click')
                    navigate('/vehicles')
                  }}
                  sx={{ py: 2 }}
                >
                  Manage Vehicles
                </Button>
              </Grid>
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    size="large"
                    startIcon={<QrCode />}
                    onClick={() => {
                      trackNavigation('dashboard', '/teacher', 'click')
                      navigate('/teacher')
                    }}
                    sx={{ py: 2 }}
                  >
                    Teacher Dashboard
                  </Button>
                </Grid>
              )}
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<ViewList />}
                  onClick={() => {
                    trackNavigation('dashboard', '/kiosk', 'click')
                    navigate('/kiosk')
                  }}
                  sx={{ py: 2 }}
                  color="secondary"
                >
                  Show Kiosk
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Mobile Queue Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              📱 Mobile Queue Actions
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use your mobile device to scan vehicle QR codes OR license plates with camera OCR to manage the pickup queue
            </Typography>
            
            {queueMessage && (
              <Alert 
                severity={queueMessage.includes('✅') ? 'success' : 'error'} 
                sx={{ mb: 2 }}
              >
                {queueMessage}
              </Alert>
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Add />}
                  onClick={() => setShowScanOptions(true)}
                  disabled={addToQueueMutation.isPending}
                  sx={{ py: 2 }}
                  color="success"
                >
                  {addToQueueMutation.isPending ? 'Adding...' : 'ADD TO QUEUE'}
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center', fontWeight: 'medium' }}>
                  📱 Scan vehicle QR code OR 🚗 license plate with camera
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Remove />}
                  onClick={openRemoveScanner}
                  disabled={removeFromQueueMutation.isPending}
                  sx={{ py: 2 }}
                  color="warning"
                >
                  {removeFromQueueMutation.isPending ? 'Removing...' : 'REMOVE FROM QUEUE'}
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                  Scan vehicle QR to remove students from queue
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={<Clear />}
                  onClick={handleClearQueue}
                  disabled={clearQueueMutation.isPending}
                  sx={{ py: 2 }}
                  color="error"
                >
                  {clearQueueMutation.isPending ? 'Clearing...' : 'CLEAR QUEUE'}
                </Button>
                <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                  Remove all students from pickup queue
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={scannerOpen}
        onScan={handleScanQR}
        onClose={() => {
          setScannerOpen(false)
          setScannerAction(null)
        }}
      />

      {/* License Plate Scanner Modal */}
      <LicensePlateScanner
        isOpen={licensePlateScannerOpen}
        onComplete={handleLicensePlateComplete}
        onClose={() => setLicensePlateScannerOpen(false)}
      />

      {/* Scan Options Dialog */}
      <Dialog
        open={showScanOptions}
        onClose={() => setShowScanOptions(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Add />
            Add to Queue
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<QrCode />}
                onClick={() => {
                  setShowScanOptions(false)
                  openAddScanner()
                }}
                sx={{ py: 2, mb: 1 }}
                color="success"
              >
                📱 SCAN QR CODE
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Traditional QR code scanning - point camera at vehicle's printed QR code
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<DirectionsCar />}
                onClick={() => {
                  setShowScanOptions(false)
                  openLicensePlateScanner()
                }}
                sx={{ py: 2, mb: 1 }}
                color="primary"
              >
                🚗 SCAN LICENSE PLATE
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                Advanced OCR scanning - point camera at license plate to automatically find vehicle
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Container>
  )
}