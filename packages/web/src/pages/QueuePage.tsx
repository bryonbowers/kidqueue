import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  Button,
  CircularProgress,
} from '@mui/material'
import { Refresh } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/FirebaseAuthContext'
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore'
import { db } from '../config/firebase'
import useQueue from '../hooks/useQueue'

export default function QueuePage() {
  const { user } = useAuth()
  
  // Use unified queue hook for consistent data access
  const { currentUserQueueEntries: queueEntries, isLoading, refreshQueue, formatEstimatedTime } = useQueue()

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Queue Status</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={refreshQueue}
        >
          Refresh
        </Button>
      </Box>

      {!queueEntries || queueEntries.length === 0 ? (
        <Alert severity="info">
          No students currently in pickup queue. Use the mobile app or have a teacher scan your QR code to join the queue.
        </Alert>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Students in Queue
          </Typography>
          <List>
            {queueEntries.map((entry: any, index: number) => {
              const estimatedTime = formatEstimatedTime(entry?.queuePosition || index + 1)
              return (
                <ListItem key={entry.id} divider={index < queueEntries.length - 1}>
                  <ListItemText
                    primary={entry?.student?.name || 'Unknown Student'}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Position {entry?.queuePosition || 0} • Entered at {entry?.enteredAt ? new Date(entry.enteredAt).toLocaleTimeString() : 'Unknown time'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 'bold', mt: 0.5 }}>
                          📅 Estimated pickup: {estimatedTime}
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip
                    label={entry.status === 'waiting' ? 'Waiting' : 'Called for Pickup'}
                    color={entry.status === 'waiting' ? 'warning' : 'success'}
                  />
                </ListItem>
              )
            })}
          </List>
        </Paper>
      )}
    </Box>
  )
}