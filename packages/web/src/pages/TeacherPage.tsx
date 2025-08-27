import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore'
import { db } from '../config/firebase'
import useQueue from '../hooks/useQueue'
import ActiveUsersDisplay from '../components/ActiveUsersDisplay'

export default function TeacherPage() {
  const { user } = useAuth()

  // Use unified queue hook for consistent data access
  const { allQueueEntries: queueData, refreshQueue, formatEstimatedTime } = useQueue()

  const { data: history } = useQuery({
    queryKey: ['queue-history', user?.schoolId],
    queryFn: async () => {
      if (!user?.schoolId) return { entries: [] }
      try {
        const schoolId = user.schoolId
        const q = query(
          collection(db, 'queue'),
          where('schoolId', '==', schoolId),
          where('status', '==', 'picked_up'),
          orderBy('pickedUpAt', 'desc')
        )
        const snapshot = await getDocs(q)
        const entries = await Promise.all(
          snapshot.docs.slice(0, 10).map(async (docSnap) => {
            const entry = { id: docSnap.id, ...docSnap.data() }
            
            // Get student and parent details
            const entryData = entry as any
            const [studentDoc, parentDoc] = await Promise.all([
              entryData.studentId ? getDoc(doc(db, 'students', entryData.studentId)) : null,
              entryData.parentId ? getDoc(doc(db, 'users', entryData.parentId)) : null
            ])
            
            return {
              ...entry,
              student: studentDoc?.exists() ? { id: studentDoc.id, ...studentDoc.data() } : null,
              parent: parentDoc?.exists() ? { id: parentDoc.id, ...parentDoc.data() } : null
            }
          })
        )
        
        return { entries }
      } catch (error) {
        console.error('[TEACHER DEBUG] Error fetching history:', error)
        return { entries: [] }
      }
    },
    enabled: !!user?.schoolId,
  })

  if (!user?.schoolId) {
    return (
      <Alert severity="warning">
        You need to be assigned to a school to access the teacher dashboard. Please contact your administrator.
      </Alert>
    )
  }

  const queue = queueData?.filter((entry: any) => entry.status === 'waiting' || entry.status === 'called') || []
  const waitingStudents = queue?.filter((entry: any) => entry.status === 'waiting') || []
  const calledStudents = queue?.filter((entry: any) => entry.status === 'called') || []

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Teacher Dashboard</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <ActiveUsersDisplay 
            showAllUsers={user?.role === 'admin'} 
            compact={true} 
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={refreshQueue}
          >
            Refresh Queue
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                Waiting
              </Typography>
              <Typography variant="h3">
                {waitingStudents.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students in queue
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Called
              </Typography>
              <Typography variant="h3">
                {calledStudents.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ready for pickup
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="info.main">
                Today's Total
              </Typography>
              <Typography variant="h3">
                {(history?.entries?.length || 0) + (queue?.length || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Students processed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box mt={4}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Use the mobile app to scan QR codes and manage the pickup queue. Students will appear here in real-time.
        </Alert>

        <Paper sx={{ mb: 3 }}>
          <Box p={2}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Current Queue
            </Typography>
            {!queue || queue.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No students currently in queue.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Position</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Parent</TableCell>
                      <TableCell>Vehicle</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Estimated Pickup</TableCell>
                      <TableCell>Time in Queue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {queue.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.queuePosition}</TableCell>
                        <TableCell>{entry.student.name}</TableCell>
                        <TableCell>{entry.parent.name}</TableCell>
                        <TableCell>
                          {entry.vehicle ? 
                            `${entry.vehicle.make} ${entry.vehicle.model} - ${entry.vehicle.licensePlate}` :
                            'Walk-up'
                          }
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={entry.status === 'waiting' ? 'Waiting' : 'Called'}
                            color={entry.status === 'waiting' ? 'warning' : 'success'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {formatEstimatedTime(entry.queuePosition)}
                        </TableCell>
                        <TableCell>
                          {Math.round((Date.now() - new Date(entry.enteredAt).getTime()) / 60000)} min
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>

        <Paper>
          <Box p={2}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Pickups
            </Typography>
            {!history?.entries || history.entries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No recent pickups.
              </Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Student</TableCell>
                      <TableCell>Parent</TableCell>
                      <TableCell>Picked Up</TableCell>
                      <TableCell>Teacher</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.entries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.student.name}</TableCell>
                        <TableCell>{entry.parent.name}</TableCell>
                        <TableCell>
                          {new Date(entry.pickedUpAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>{entry.teacher?.name || 'Unknown'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  )
}